import { hydrateWorkspace, sanitizeFileName } from "@/core/hydrate";

describe("hydrateWorkspace", () => {
  it("returns an empty workspace for garbage input", () => {
    expect(hydrateWorkspace(null).notes).toEqual([]);
    expect(hydrateWorkspace("nope").notes).toEqual([]);
  });

  it("drops malformed notes and keeps valid ones", () => {
    const workspace = hydrateWorkspace({
      notes: [{ id: "1", body: "ok" }, { id: 2 }, null],
      sections: [{ id: "s", name: "A", order: 0 }],
      settings: { theme: "glass", markDoneOnCopy: true, unknown: true },
    });
    expect(workspace.notes).toHaveLength(1);
    expect(workspace.sections).toHaveLength(1);
    expect(workspace.settings.theme).toBe("glass");
    expect(workspace.settings.markDoneOnCopy).toBe(true);
    expect(workspace.settings.keepOnTop).toBe(true);
  });

  it("sanitizes attachment names", () => {
    expect(sanitizeFileName("../secret.txt")).toBe("__secret.txt");
    expect(sanitizeFileName("a/b\\c:d")).toBe("a_b_c_d");
    expect(sanitizeFileName("")).toBe("file");
  });
});
