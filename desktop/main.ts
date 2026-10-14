import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hydrateWorkspace } from "../src/core/hydrate";
import { emptyWorkspace, type Settings, type Workspace } from "../src/core/models";
import { JsonFileStore } from "../src/persist/json-store";
import { FileAttachmentStore } from "../src/persist/attachment-store";
import { firstExisting, iconCandidates } from "./packaged-paths";
import { attachmentsDir, dataDir, workspacePath } from "./paths";
import { captureSelectedText } from "./selection";
import { startShiftHook } from "./shift-hook";

app.setName("QuickSave");
if (process.platform === "win32") {
  app.setAppUserModelId("com.quicksave.desktop");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let stopHook: (() => void) | null = null;
let quitting = false;
let settings: Settings = emptyWorkspace().settings;
const store = () => new JsonFileStore(workspacePath());
const attachments = () => new FileAttachmentStore(attachmentsDir());

function createWindow(frame: Workspace["window"]): BrowserWindow {
  const win = new BrowserWindow({
    width: frame.width,
    height: frame.height,
    x: frame.x >= 0 ? frame.x : undefined,
    y: frame.y >= 0 ? frame.y : undefined,
    minWidth: 360,
    minHeight: 480,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: true,
    alwaysOnTop: settings.keepOnTop,
    skipTaskbar: true,
    roundedCorners: true,
    backgroundMaterial: process.platform === "win32" ? "acrylic" : undefined,
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

function emit(payload: unknown): void {
  window?.webContents.send("quicksave:event", payload);
}

async function togglePanel(): Promise<void> {
  if (!window) return;
  if (window.isVisible()) window.hide();
  else {
    window.show();
    window.focus();
  }
}

async function runCapture(): Promise<void> {
  const text = await captureSelectedText(settings.restoreClipboardAfterCapture);
  if (text) emit({ type: "captured-text", text });
  else emit({ type: "captured-empty" });
}

function registerShortcuts(): void {
  globalShortcut.unregisterAll();
  globalShortcut.register("CommandOrControl+Shift+Space", () => {
    void togglePanel();
  });
  globalShortcut.register("CommandOrControl+Shift+C", () => {
    void runCapture();
  });
  globalShortcut.register("CommandOrControl+Shift+D", () => {
    if (window && !window.isVisible()) window.show();
    emit({ type: "sketch-request" });
  });
}

function createTray(): void {
  const iconPath = firstExisting(
    iconCandidates({
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
      cwd: process.cwd(),
      moduleDir: __dirname,
    }),
  );
  const image = iconPath
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createFromDataURL(TRAY_PNG);
  tray = new Tray(image.isEmpty() ? nativeImage.createFromDataURL(TRAY_PNG) : image.resize({ width: 16, height: 16 }));
  tray.setToolTip("QuickSave");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show QuickSave", click: () => window?.show() },
      { label: "Capture selection", click: () => void runCapture() },
      { type: "separator" },
      { label: "Quit", click: () => {
        quitting = true;
        app.quit();
      } },
    ]),
  );
  tray.on("click", () => void togglePanel());
}

function wireIpc(): void {
  ipcMain.handle("workspace:load", async () => {
    await mkdir(dataDir(), { recursive: true });
    const workspace = await store().load();
    settings = workspace.settings;
    return workspace;
  });
  ipcMain.handle("workspace:save", async (_event, workspace: Workspace) => {
    const next = hydrateWorkspace(workspace);
    settings = next.settings;
    await store().save(next);
  });
  ipcMain.handle("capture:selection", async () => captureSelectedText(settings.restoreClipboardAfterCapture));
  ipcMain.handle("clipboard:write", async (_event, text: string) => {
    clipboard.writeText(String(text ?? ""));
  });
  ipcMain.handle("clipboard:write-image", async (_event, bytes: Uint8Array) => {
    const image = nativeImage.createFromBuffer(Buffer.from(bytes));
    clipboard.writeImage(image);
  });
  ipcMain.handle("window:hide", async () => window?.hide());
  ipcMain.handle("window:show", async () => window?.show());
  ipcMain.handle("window:quit", async () => {
    quitting = true;
    app.quit();
  });
  ipcMain.handle("window:always-on-top", async (_event, value: boolean) => {
    window?.setAlwaysOnTop(Boolean(value));
  });
  ipcMain.handle("app:launch-at-startup", async (_event, value: boolean) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(value) });
  });
  ipcMain.handle("file:export", async (_event, name: string, contents: string) => {
    if (!window) return;
    const result = await dialog.showSaveDialog(window, {
      defaultPath: join(app.getPath("documents"), String(name || "quicksave-export.md")),
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (result.canceled || !result.filePath) return;
    await writeFile(result.filePath, String(contents ?? ""), "utf8");
  });
  ipcMain.handle(
    "attachment:save",
    async (_event, input: { name: string; bytes: Uint8Array; mimeType: string }) => {
      const id = crypto.randomUUID();
      const saved = await attachments().save({
        id,
        name: String(input.name),
        bytes: Uint8Array.from(input.bytes),
        mimeType: String(input.mimeType || "application/octet-stream"),
      });
      return {
        id,
        name: input.name,
        mimeType: input.mimeType,
        size: saved.size,
        relativePath: saved.relativePath,
      };
    },
  );
  ipcMain.handle("folder:open", async () => {
    await mkdir(dataDir(), { recursive: true });
    await shell.openPath(dataDir());
  });
}

app.whenReady().then(async () => {
  await mkdir(dataDir(), { recursive: true });
  const workspace = await store().load();
  settings = workspace.settings;
  window = createWindow(workspace.window);
  createTray();
  wireIpc();
  registerShortcuts();
  if (settings.enableDoubleShift) {
    stopHook = startShiftHook((message) => {
      if (message === "capture") void runCapture();
      if (message === "toggle") void togglePanel();
      if (message === "sketch") {
        window?.show();
        emit({ type: "sketch-request" });
      }
    });
  }
  window.once("ready-to-show", () => window?.show());
  app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup });
});

app.on("second-instance", () => {
  window?.show();
  window?.focus();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopHook?.();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    /* stay in tray */
  }
});

function resolvePreload(): string {
  const dir = join(__dirname, "../preload");
  const names = ["index.js", "index.mjs", "preload.js", "preload.mjs"];
  return names.map((name) => join(dir, name)).find((path) => existsSync(path)) ?? join(dir, "index.js");
}

const TRAY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVR4nO3OsQkAIBAEwZj/0MIezMRc4QaGfWB3ZgAAAAAAAAAA4D9r7gN/YgGq0gMdkQAAAABJRU5ErkJggg==";
