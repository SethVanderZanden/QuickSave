import { expect, test, _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeClickScreen, nativeCtrlC } from "./win32-sendinput";

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const electronExecutable = require("electron") as string;

async function launchApp(): Promise<{ app: ElectronApplication; page: Page; userData: string }> {
  const userData = mkdtempSync(join(tmpdir(), "quicksave-e2e-"));
  const app = await electron.launch({
    executablePath: electronExecutable,
    args: [repoRoot, "--no-sandbox", "--disable-gpu"],
    cwd: repoRoot,
    env: {
      ...process.env,
      QUICKSAVE_E2E: "1",
      QUICKSAVE_E2E_USER_DATA: userData,
      ELECTRON_RENDERER_URL: "",
      ELECTRON_ENABLE_LOGGING: "1",
    },
    timeout: 60_000,
  });
  app.process().stderr?.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text && !/Debugger listening|For help, see:/.test(text)) {
      console.error("[electron]", text);
    }
  });
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
