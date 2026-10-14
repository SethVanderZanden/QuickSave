import { parseComposer } from "@/core/composer";

describe("parseComposer", () => {
  it("ignores empty and whitespace-only input", () => {
    expect(parseComposer("")).toEqual({ type: "empty" });
    expect(parseComposer("   \n")).toEqual({ type: "empty" });
  });

  it("creates a section from # Name", () => {
    expect(parseComposer("# Project Alpha")).toEqual({
      type: "section",
      name: "Project Alpha",
      fresh: false,
    });
  });

  it("creates a fresh section from ## Name", () => {
    expect(parseComposer("## Sprint 12")).toEqual({
      type: "section",
      name: "Sprint 12",
      fresh: true,
    });
  });

  it("treats multiline hashes as a note, not a section", () => {
    expect(parseComposer("# Heading\nmore")).toEqual({
      type: "note",
      body: "# Heading\nmore",
    });
  });

  it("does not treat a hash without a name as a section", () => {
    expect(parseComposer("#")).toEqual({ type: "note", body: "#" });
    expect(parseComposer("# ")).toEqual({ type: "note", body: "#" });
  });

  it("captures ordinary prompts as notes", () => {
    expect(parseComposer("Rewrite this in the voice of a senior engineer")).toEqual({
      type: "note",
      body: "Rewrite this in the voice of a senior engineer",
    });
  });
});
