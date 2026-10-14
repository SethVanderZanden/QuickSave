import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, normalize, relative, resolve } from "node:path";
import { sanitizeFileName } from "@/core/hydrate";
import { MAX_ATTACHMENT_BYTES } from "@/core/models";
import type { AttachmentPort } from "@/core/ports";

export class FileAttachmentStore implements AttachmentPort {
  constructor(private readonly root: string) {}

  async save(input: {
    id: string;
    name: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<{ relativePath: string; size: number }> {
    if (input.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error("Attachment exceeds the 8 MB limit.");
    }
    await mkdir(this.root, { recursive: true });
    const safe = sanitizeFileName(input.name);
    const relativePath = `${input.id}-${safe}`;
    const target = this.resolveSafe(relativePath);
    await writeFile(target, input.bytes);
    return { relativePath, size: input.bytes.byteLength };
  }

  async read(relativePath: string): Promise<Uint8Array> {
    const target = this.resolveSafe(relativePath);
    const buffer = await readFile(target);
    return new Uint8Array(buffer);
  }

  private resolveSafe(relativePath: string): string {
    if (
      relativePath.includes("..") ||
      relativePath.includes("/") ||
      relativePath.includes("\\") ||
      relativePath.length === 0
    ) {
      throw new Error("Invalid attachment path.");
    }
    const cleaned = basename(relativePath);
    if (cleaned !== relativePath) {
      throw new Error("Invalid attachment path.");
    }
    const target = resolve(join(this.root, cleaned));
    const root = resolve(this.root);
    const rel = relative(root, target);
    if (rel.startsWith("..") || normalize(rel) !== cleaned) {
      throw new Error("Invalid attachment path.");
    }
    return target;
  }
}
