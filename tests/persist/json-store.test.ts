import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyWorkspace } from "@/core/models";
import { JsonFileStore } from "@/persist/json-store";

describe("JsonFileStore", () => {
  it("round-trips a workspace through an atomic write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "quicksave-"));
    const path = join(dir, "workspace.json");
    const store = new JsonFileStore(path);
    const workspace = emptyWorkspace();
    workspace.notes.push({
      id: "n1",
      body: "hello",
      done: false,
      sectionId: null,
      kind: "text",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      expanded: false,
      attachments: [],
      sketch: null,
    });
    await store.save(workspace);
    const loaded = await store.load();
    expect(loaded.notes[0]?.body).toBe("hello");
    const raw = await readFile(path, "utf8");
    expect(raw.startsWith("{")).toBe(true);
  });

  it("recovers from corrupt JSON by replacing the file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "quicksave-"));
    const path = join(dir, "workspace.json");
    await writeFile(path, "{not json", "utf8");
    const store = new JsonFileStore(path);
    const loaded = await store.load();
    expect(loaded.notes).toEqual([]);
  });
});
