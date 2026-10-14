import { expect, test, _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeClickScreen, nativeCtrlC, nativeDoubleLeftShift } from "./win32-sendinput";

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const electronExecutable = require("electron") as string;

function startCaptureSource(text: string): { stop(): void; ready: Promise<void> } {
  const child: ChildProcess = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(repoRoot, "tests/electron/source-window.ps1"),
      "-Text",
      text,
    ],
    { windowsHide: false, stdio: ["pipe", "pipe", "pipe"] },
  );
  let resolved = false;
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("source window did not become ready"));
      }
    }, 20_000);
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      if (!resolved && chunk.includes("SOURCE_READY")) {
        resolved = true;
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      const text = chunk.trim();
      if (text) console.error("[source-window]", text);
    });
    child.once("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`source window exited (${code ?? "?"})`));
      }
    });
    child.once("error", (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(error);
      }
    });
  });
  return {
    ready,
    stop() {
      if (!child.killed) child.kill();
    },
  };
}

async function launchApp(
  options: { hook?: boolean } = {},
): Promise<{ app: ElectronApplication; page: Page; userData: string }> {
  const userData = mkdtempSync(join(tmpdir(), "quicksave-e2e-"));
  const logs: string[] = [];
  const app = await electron.launch({
    executablePath: electronExecutable,
    args: [repoRoot, "--no-sandbox", "--disable-gpu"],
    cwd: repoRoot,
    env: {
      ...process.env,
      QUICKSAVE_E2E: "1",
      QUICKSAVE_E2E_USER_DATA: userData,
      QUICKSAVE_E2E_HOOK: options.hook ? "1" : "",
      QUICKSAVE_HOOK_ACCEPT_INJECTED: options.hook ? "1" : "",
      QUICKSAVE_E2E_KEEP_ON_TOP: options.hook ? "0" : "1",
      ELECTRON_RENDERER_URL: "",
      ELECTRON_ENABLE_LOGGING: "1",
    },
    timeout: 60_000,
  });
  const collect = (chunk: Buffer | string) => {
    const text = String(chunk);
    logs.push(text);
    const trimmed = text.trim();
    if (trimmed && !/Debugger listening|For help, see:/.test(trimmed)) {
      console.error("[electron]", trimmed);
    }
  };
  app.process().stdout?.on("data", collect);
  app.process().stderr?.on("data", collect);
  const page = await app.firstWindow();
  page.on("pageerror", (error) => {
    console.error("[e2e pageerror]", error);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error("[e2e console]", message.text());
  });
  try {
    await page.waitForSelector("[data-testid=panel]", { timeout: 30_000 });
  } catch (error) {
    try {
      console.error("[e2e url]", page.url());
      console.error("[e2e content]", (await page.content()).slice(0, 2000));
    } catch (dumpError) {
      console.error("[e2e dump failed]", dumpError);
    }
    throw error;
  }
  if (options.hook) {
    await expect
      .poll(() => existsSync(join(userData, "hook-ready")) || logs.join("").includes("shift hook ready"), {
        timeout: 25_000,
      })
      .toBe(true);
  }
  return { app, page, userData };
}

async function closeApp(app: ElectronApplication, userData: string): Promise<void> {
  try {
    await app.close();
  } catch {
    /* already exited */
  }
  rmSync(userData, { recursive: true, force: true });
}

async function screenPointForTestId(
  app: ElectronApplication,
  page: Page,
  testId: string,
): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`missing ${testId}`);
  return app.evaluate(async ({ BrowserWindow, screen }, rect) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error("no window");
    win.moveTop();
    win.focus();
    const content = win.getContentBounds();
    return screen.dipToScreenPoint({
      x: content.x + rect.x + rect.width / 2,
      y: content.y + rect.y + rect.height / 2,
    });
  }, box);
}

async function windowVisible(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return Boolean(win?.isVisible());
  });
}

test.describe.configure({ mode: "serial" });

test("caption buttons are not inside a drag region", async () => {
  const { app, page, userData } = await launchApp();
  try {
    const nested = await page.evaluate(() => {
      const close = document.querySelector("[data-testid=window-close]");
      const minimize = document.querySelector("[data-testid=window-minimize]");
      return {
        closeInDrag: Boolean(close?.closest(".drag-region")),
        minimizeInDrag: Boolean(minimize?.closest(".drag-region")),
        closeRegion: close ? getComputedStyle(close).getPropertyValue("-webkit-app-region") : "",
        controlsRegion: getComputedStyle(
          document.querySelector("[data-testid=window-controls]") as Element,
        ).getPropertyValue("-webkit-app-region"),
      };
    });
    expect(nested.closeInDrag).toBe(false);
    expect(nested.minimizeInDrag).toBe(false);
    expect(["no-drag", "none"]).toContain(nested.closeRegion);
    expect(["no-drag", "none"]).toContain(nested.controlsRegion);
  } finally {
    await closeApp(app, userData);
  }
});

test("native Windows mouse click on minimize hides the window", async () => {
  test.skip(process.platform !== "win32", "SendInput validation is Windows-only");
  const { app, page, userData } = await launchApp();
  try {
    expect(await windowVisible(app)).toBe(true);
    const point = await screenPointForTestId(app, page, "window-minimize");
    nativeClickScreen(point.x, point.y);
    await expect.poll(() => windowVisible(app)).toBe(false);
  } finally {
    await closeApp(app, userData);
  }
});

test("native Windows mouse click on close quits the app", async () => {
  test.skip(process.platform !== "win32", "SendInput validation is Windows-only");
  const { app, page, userData } = await launchApp();
  try {
    const child = app.process();
    const exited = new Promise<void>((resolve, reject) => {
      child.once("exit", () => resolve());
      child.once("error", reject);
    });
    const point = await screenPointForTestId(app, page, "window-close");
    nativeClickScreen(point.x, point.y);
    await exited;
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

test("double-tap Left Shift in another app captures a note", async () => {
  test.skip(process.platform !== "win32", "Shift hook is Windows-only");
  test.setTimeout(90_000);
  const marker = `QuickSaveCapture${Date.now()}`;
  const { app, page, userData } = await launchApp({ hook: true });
  const source = startCaptureSource(marker);
  try {
    await source.ready;
    await new Promise((resolve) => setTimeout(resolve, 400));
    nativeDoubleLeftShift();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 15_000 });
  } finally {
    source.stop();
    await closeApp(app, userData);
  }
});

test("native Windows Ctrl+C copies the selected note", async () => {
  test.skip(process.platform !== "win32", "SendInput validation is Windows-only");
  const { app, page, userData } = await launchApp();
  try {
    await page.getByTestId("load-sample").click();
    const note = page.getByText("Draft Windows install steps for the README.");
    await expect(note).toBeVisible();
    await note.click();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    await app.evaluate(({ BrowserWindow, clipboard }) => {
      BrowserWindow.getAllWindows()[0]?.focus();
      clipboard.writeText("e2e-before-copy");
    });
    nativeCtrlC();
    await expect
      .poll(async () => app.evaluate(({ clipboard }) => clipboard.readText()))
      .toContain("Draft Windows install steps for the README.");
  } finally {
    await closeApp(app, userData);
  }
});
