import type { Attachment, Workspace } from "@/core/models";

export type BridgeEvent =
  | { type: "capture-request" }
  | { type: "toggle-request" }
  | { type: "sketch-request" }
  | { type: "captured-empty" }
  | { type: "captured-text"; text: string };

export interface QuickSaveBridge {
  isDesktop: boolean;
  load(): Promise<Workspace>;
  save(workspace: Workspace): Promise<void>;
  captureSelection(): Promise<string | null>;
  writeClipboard(text: string): Promise<void>;
  writeClipboardImage?(pngBytes: Uint8Array): Promise<void>;
  hide(): Promise<void>;
  show(): Promise<void>;
  quit(): Promise<void>;
  setAlwaysOnTop(value: boolean): Promise<void>;
  setLaunchAtStartup(value: boolean): Promise<void>;
  exportFile(name: string, contents: string): Promise<void>;
  saveAttachment(input: {
    name: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<Attachment>;
  openDataFolder(): Promise<void>;
  onEvent(handler: (event: BridgeEvent) => void): () => void;
}

declare global {
  interface Window {
    quicksave?: QuickSaveBridge;
  }
}

export function getBridge(): QuickSaveBridge | null {
  return window.quicksave ?? null;
}

export function isDesktopRuntime(): boolean {
  return Boolean(window.quicksave?.isDesktop);
}
