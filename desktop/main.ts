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
import { captureSelectedText, sendCopyChord } from "./selection";
import { startShiftHook, type ShiftHookHandle } from "./shift-hook";
import { installWindowHotkeys } from "./window-hotkeys";

const e2eUserData = process.env.QUICKSAVE_E2E_USER_DATA;
if (e2eUserData) {
  app.setPath("userData", e2eUserData);
}

function isE2E(): boolean {
  return process.env.QUICKSAVE_E2E === "1";
}

app.setName("QuickSave");
if (process.platform === "win32") {
  app.setAppUserModelId("com.quicksave.desktop");
}
if (isE2E()) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-dev-shm-usage");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let hook: ShiftHookHandle | null = null;
let quitting = false;
let settings: Settings = emptyWorkspace().settings;
const store = () => new JsonFileStore(workspacePath());
const attachments = () => new FileAttachmentStore(attachmentsDir());

function createWindow(frame: Workspace["window"]): BrowserWindow {
  const win32 = process.platform === "win32";
  const win = new BrowserWindow({
    width: frame.width,
    height: frame.height,
    x: isE2E() ? 80 : frame.x >= 0 ? frame.x : undefined,
    y: isE2E() ? 80 : frame.y >= 0 ? frame.y : undefined,
    minWidth: 360,
    minHeight: 480,
    show: isE2E(),
    frame: false,
    transparent: win32 || isE2E() ? false : true,
    backgroundColor: win32 || isE2E() ? "#121317" : "#00000000",
    hasShadow: true,
    alwaysOnTop: isE2E() ? true : settings.keepOnTop,
    skipTaskbar: !isE2E(),
    roundedCorners: true,
    thickFrame: win32 ? false : undefined,
    maximizable: false,
    minimizable: true,
    closable: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: !isE2E(),
      spellcheck: false,
    },
  });

  win.removeMenu();
  win.setMenuBarVisibility(false);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error("[QuickSave] failed to load", code, description, url);
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.on("close", () => {
    quitting = true;
  });
  win.on("closed", () => {
    if (window === win) window = null;
    if (quitting) app.quit();
  });

  installWindowHotkeys(win, {
    copyPlain: () => emit({ type: "copy-request" }),
    copyList: () => emit({ type: "copy-list-request" }),
    quit: () => quitApp(),
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

async function sendCopy(): Promise<void> {
  if (hook) {
    try {
      await hook.sendCopy();
      return;
    } catch (error) {
      console.error("[QuickSave] hook copy failed, falling back", error);
    }
  }
  await sendCopyChord();
}

async function runCapture(): Promise<void> {
  const text = await captureSelectedText(settings.restoreClipboardAfterCapture, sendCopy);
  if (text) emit({ type: "captured-text", text });
  else emit({ type: "captured-empty" });
}

function quitApp(): void {
  quitting = true;
  hook?.stop();
  hook = null;
  app.quit();
}

function syncShiftHook(enabled: boolean): void {
  if (isE2E()) return;
  if (enabled && !hook) {
    hook = startShiftHook((message) => {
      if (message === "capture") void runCapture();
      if (message === "toggle") void togglePanel();
      if (message === "sketch") {
        window?.show();
        emit({ type: "sketch-request" });
      }
    });
    return;
  }
  if (!enabled && hook) {
    hook.stop();
    hook = null;
  }
}

function registerShortcuts(): void {
  globalShortcut.unregisterAll();
  if (isE2E()) return;
  globalShortcut.register("CommandOrControl+Shift+Space", () => {
    void togglePanel();
  });
  globalShortcut.register("CommandOrControl+Shift+C", () => {
    if (window?.isVisible() && window.isFocused()) {
      emit({ type: "copy-list-request" });
      return;
    }
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
      { label: "Hide", click: () => window?.hide() },
      { label: "Capture selection", click: () => void runCapture() },
      { type: "separator" },
      {
        label: "Quit QuickSave",
        click: () => quitApp(),
      },
    ]),
  );
  tray.on("click", () => void togglePanel());
}

function wireIpc(): void {
  ipcMain.handle("workspace:load", async () => {
    await mkdir(dataDir(), { recursive: true });
    const workspace = await store().load();
    settings = workspace.settings;
    syncShiftHook(settings.enableDoubleShift);
    return workspace;
  });
  ipcMain.handle("workspace:save", async (_event, workspace: Workspace) => {
    const next = hydrateWorkspace(workspace);
    settings = next.settings;
    await store().save(next);
    window?.setAlwaysOnTop(Boolean(settings.keepOnTop));
    syncShiftHook(settings.enableDoubleShift);
  });
  ipcMain.handle("capture:selection", async () => {
    return captureSelectedText(settings.restoreClipboardAfterCapture, sendCopy);
  });
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
    quitApp();
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
  Menu.setApplicationMenu(null);
  await mkdir(dataDir(), { recursive: true });
  const workspace = await store().load();
  settings = workspace.settings;
  wireIpc();
  window = createWindow(workspace.window);
  createTray();
  registerShortcuts();
  syncShiftHook(settings.enableDoubleShift);
  if (!isE2E()) {
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup });
  }
});

app.on("second-instance", () => {
  window?.show();
  window?.focus();
});

app.on("before-quit", () => {
  quitting = true;
  hook?.stop();
  hook = null;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  hook?.stop();
  hook = null;
});

app.on("window-all-closed", () => {
  quitting = true;
  app.quit();
});

function resolvePreload(): string {
  const dir = join(__dirname, "../preload");
  const names = ["index.js", "index.mjs", "preload.js", "preload.mjs"];
  return names.map((name) => join(dir, name)).find((path) => existsSync(path)) ?? join(dir, "index.js");
}

const TRAY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVR4nO3OsQkAIBAEwZj/0MIezMRc4QaGfWB3ZgAAAAAAAAAA4D9r7gN/YgGq0gMdkQAAAABJRU5ErkJggg==";
