import { FrozenClock } from "@/core/clock";
import { SequentialIds } from "@/core/ids";
import { emptyWorkspace } from "@/core/models";
import { WorkspaceSession } from "@/core/session";
import { MemoryStore } from "@/persist/memory-store";

function makeSession() {
  const clock = new FrozenClock(Date.parse("2026-10-14T12:00:00.000Z"));
  const session = new WorkspaceSession(
    new MemoryStore(emptyWorkspace()),
    clock,
    new SequentialIds(),
    emptyWorkspace(),
  );
  return { session, clock };
}

describe("WorkspaceSession", () => {
  it("captures into the active section and supports todo + copy", () => {
    const { session } = makeSession();
    session.upsertSection("Docs review");
    session.captureText("Write the component API table");
    session.captureText("Add usage examples");
    expect(session.snapshot().notes).toHaveLength(2);
    expect(session.snapshot().notes[0]?.sectionId).toBe("id-1");
    session.toggleDone([session.snapshot().notes[0]?.id ?? ""]);
    expect(session.snapshot().notes[0]?.done).toBe(true);
    expect(session.copyPayload([], "list")).toContain("- Add usage examples");
  });

  it("uses # Name in the composer to switch sections", () => {
    const { session } = makeSession();
    session.submitComposer("# Cursor");
    session.submitComposer("Follow up: extract the hook");
    session.submitComposer("# Chrome");
    session.submitComposer("Keep this article");
    const workspace = session.snapshot();
    expect(workspace.sections.map((section) => section.name)).toEqual(["Cursor", "Chrome"]);
    expect(workspace.notes[0]?.sectionId).toBe(workspace.sections[1]?.id);
    expect(workspace.notes[1]?.sectionId).toBe(workspace.sections[0]?.id);
  });

  it("## Name starts a fresh collapsed workspace", () => {
    const { session } = makeSession();
    session.submitComposer("# Old");
    session.submitComposer("stale");
    session.submitComposer("## New sprint");
    const workspace = session.snapshot();
    expect(workspace.sections.find((section) => section.name === "Old")?.collapsed).toBe(true);
    expect(workspace.activeView).toEqual({
      type: "section",
      id: workspace.sections.find((section) => section.name === "New sprint")?.id,
    });
  });

  it("archives done notes into the logbook and can restore them", () => {
    const { session } = makeSession();
    session.addNote("done later");
    const id = session.snapshot().notes[0]?.id ?? "";
    session.toggleDone([id]);
    session.clearDone();
    expect(session.snapshot().notes).toHaveLength(0);
    expect(session.snapshot().logbook).toHaveLength(1);
    session.restoreNote(id);
    expect(session.snapshot().notes).toHaveLength(1);
    expect(session.snapshot().logbook).toHaveLength(0);
  });

  it("merges selected notes, undoes, and redoes", () => {
    const { session } = makeSession();
    session.addNote("alpha");
    session.addNote("beta");
    const ids = session.snapshot().notes.map((note) => note.id);
    session.mergeNotes([ids[1] ?? "", ids[0] ?? ""]);
    expect(session.snapshot().notes).toHaveLength(1);
    expect(session.snapshot().notes[0]?.body).toBe("alpha\n\nbeta");
    expect(session.undo()).toBe(true);
    expect(session.snapshot().notes).toHaveLength(2);
    expect(session.redo()).toBe(true);
    expect(session.snapshot().notes).toHaveLength(1);
  });

  it("guards duplicate captures and empty ones", () => {
    const { session } = makeSession();
    expect(session.captureText("   ").ok).toBe(false);
    expect(session.captureText("keep").ok).toBe(true);
    expect(session.captureText("keep").reason).toBe("duplicate");
    expect(session.snapshot().notes).toHaveLength(1);
  });

  it("exports markdown checklists grouped by section", () => {
    const { session } = makeSession();
    session.submitComposer("# Ship");
    session.addNote("Write README");
    session.toggleDone([session.snapshot().notes[0]?.id ?? ""]);
    const md = session.exportMarkdown();
    expect(md).toContain("## Ship");
    expect(md).toContain("- [x] Write README");
  });

  it("deletes a section while keeping its notes in the inbox", () => {
    const { session } = makeSession();
    const sectionId = session.upsertSection("Temp");
    session.addNote("stay");
    session.deleteSection(sectionId, true);
    expect(session.snapshot().sections).toHaveLength(0);
    expect(session.snapshot().notes[0]?.sectionId).toBeNull();
  });

  it("searches body, section name, and attachment names", () => {
    const { session } = makeSession();
    session.upsertSection("Agents");
    const note = session.addNote("route this to the docs agent");
    session.attach(note.id, {
      id: "a1",
      name: "spec.pdf",
      mimeType: "application/pdf",
      size: 12,
    });
    expect(session.search("docs")).toHaveLength(1);
    expect(session.search("spec")).toHaveLength(1);
    expect(session.search("nope")).toHaveLength(0);
  });
});
