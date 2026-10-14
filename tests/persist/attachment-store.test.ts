import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileAttachmentStore } from "@/persist/attachment-store";

describe("FileAttachmentStore", () => {
  it("rejects path traversal on read", async () => {
    const dir = await mkdtemp(join(tmpdir(), "quicksave-att-"));
    const store = new FileAttachmentStore(dir);
    await expect(store.read("../secrets.txt")).rejects.toThrow(/Invalid attachment path/);
  });

  it("writes a sanitized file and reads it back", async () => {
    const dir = await mkdtemp(join(tmpdir(), "quicksave-att-"));
    const store = new FileAttachmentStore(dir);
    const saved = await store.save({
      id: "abc",
      name: "shot.png",
      bytes: new Uint8Array([1, 2, 3, 4]),
      mimeType: "image/png",
    });
    expect(saved.relativePath).toBe("abc-shot.png");
    const bytes = await store.read(saved.relativePath);
    expect([...bytes]).toEqual([1, 2, 3, 4]);
  });
});
