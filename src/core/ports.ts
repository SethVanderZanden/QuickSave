import type { Workspace } from "./models";

export interface WorkspaceStore {
  load(): Promise<Workspace>;
  save(workspace: Workspace): Promise<void>;
}

export interface ClipboardPort {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
  writeImage?(pngBytes: Uint8Array): Promise<void>;
}

export interface CapturePort {
  captureSelection(): Promise<string | null>;
}

export interface AttachmentPort {
  save(input: {
    id: string;
    name: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<{ relativePath: string; size: number }>;
  read(relativePath: string): Promise<Uint8Array>;
}

export interface HudPort {
  show(message: string, kind?: "ok" | "empty" | "error"): void;
}

export type DomainEvent =
  | { type: "captured"; noteId: string }
  | { type: "rejected"; reason: "empty" | "duplicate" }
  | { type: "changed" };
