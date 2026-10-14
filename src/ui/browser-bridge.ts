import { sanitizeFileName } from "@/core/hydrate";
import { MAX_ATTACHMENT_BYTES, type Attachment, type Workspace } from "@/core/models";
import { LocalStorageStore } from "@/persist/local-storage-store";
import type { BridgeEvent, QuickSaveBridge } from "./bridge";

export function createBrowserBridge(): QuickSaveBridge {
  const store = new LocalStorageStore();
  const listeners = new Set<(event: BridgeEvent) => void>();

  return {
    isDesktop: false,
    load: () => store.load(),
    save: (workspace: Workspace) => store.save(workspace),
    async captureSelection() {
      try {
        const text = await navigator.clipboard.readText();
        return text || null;
      } catch {
        return null;
      }
    },
    async writeClipboard(text: string) {
      await navigator.clipboard.writeText(text);
    },
    async hide() {
      /* browser preview stays visible */
    },
    async show() {
      /* no-op */
    },
    async quit() {
      /* no-op */
    },
    async setAlwaysOnTop() {
      /* no-op */
    },
    async setLaunchAtStartup() {
      /* no-op */
    },
    async exportFile(name: string, contents: string) {
      const blob = new Blob([contents], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    async saveAttachment(input) {
      if (input.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
        throw new Error("Attachment exceeds the 8 MB limit.");
      }
      const binary = Array.from(input.bytes, (byte) => String.fromCharCode(byte)).join("");
      const dataUrl = `data:${input.mimeType};base64,${btoa(binary)}`;
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        name: sanitizeFileName(input.name),
        mimeType: input.mimeType,
        size: input.bytes.byteLength,
        dataUrl,
      };
      return attachment;
    },
    async openDataFolder() {
      /* no-op in the browser */
    },
    onEvent(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  };
}
