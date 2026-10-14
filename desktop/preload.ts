import { contextBridge, ipcRenderer } from "electron";
import type { BridgeEvent, QuickSaveBridge } from "../src/ui/bridge";
import type { Attachment, Workspace } from "../src/core/models";

const bridge: QuickSaveBridge = {
  isDesktop: true,
  load: () => ipcRenderer.invoke("workspace:load") as Promise<Workspace>,
  save: (workspace: Workspace) => ipcRenderer.invoke("workspace:save", workspace),
  captureSelection: () => ipcRenderer.invoke("capture:selection") as Promise<string | null>,
  writeClipboard: (text: string) => ipcRenderer.invoke("clipboard:write", text),
  writeClipboardImage: (pngBytes: Uint8Array) => ipcRenderer.invoke("clipboard:write-image", pngBytes),
  hide: () => ipcRenderer.invoke("window:hide"),
  show: () => ipcRenderer.invoke("window:show"),
  quit: () => ipcRenderer.invoke("window:quit"),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke("window:always-on-top", value),
  setLaunchAtStartup: (value: boolean) => ipcRenderer.invoke("app:launch-at-startup", value),
  exportFile: (name: string, contents: string) => ipcRenderer.invoke("file:export", name, contents),
  saveAttachment: (input) => ipcRenderer.invoke("attachment:save", input) as Promise<Attachment>,
  openDataFolder: () => ipcRenderer.invoke("folder:open"),
  onEvent(handler) {
    const listener = (_event: unknown, payload: BridgeEvent) => handler(payload);
    ipcRenderer.on("quicksave:event", listener);
    return () => ipcRenderer.removeListener("quicksave:event", listener);
  },
};

contextBridge.exposeInMainWorld("quicksave", bridge);
