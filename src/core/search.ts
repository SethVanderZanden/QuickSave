import type { Note, Section, Workspace } from "./models";

export interface SearchHit {
  note: Note;
  sectionName: string | null;
}

export function filterNotes(workspace: Workspace, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  const sectionName = new Map(
    workspace.sections.map((section) => [section.id, section.name]),
  );

  return visibleNotes(workspace)
    .filter((note) => (q ? matches(note, q, sectionName.get(note.sectionId ?? "") ?? null) : true))
    .map((note) => ({
      note,
      sectionName: sectionName.get(note.sectionId ?? "") ?? null,
    }));
}

export function visibleNotes(workspace: Workspace): Note[] {
  if (workspace.activeView.type === "logbook") {
    return workspace.logbook;
  }
  if (workspace.activeView.type === "section") {
    const id = workspace.activeView.id;
    return workspace.notes.filter((note) => note.sectionId === id);
  }
  return workspace.notes;
}

function matches(note: Note, q: string, sectionName: string | null): boolean {
  if (note.body.toLowerCase().includes(q)) return true;
  if (sectionName?.toLowerCase().includes(q)) return true;
  return note.attachments.some((file) => file.name.toLowerCase().includes(q));
}

export function notesBySection(
  notes: Note[],
  sections: Section[],
): { section: Section | null; notes: Note[] }[] {
  const grouped = new Map<string | null, Note[]>();
  grouped.set(null, []);
  for (const section of [...sections].sort((a, b) => a.order - b.order)) {
    grouped.set(section.id, []);
  }
  for (const note of notes) {
    const key = note.sectionId && grouped.has(note.sectionId) ? note.sectionId : null;
    grouped.get(key)?.push(note);
  }

  const result: { section: Section | null; notes: Note[] }[] = [];
  const inbox = grouped.get(null) ?? [];
  if (inbox.length > 0) {
    result.push({ section: null, notes: inbox });
  }
  for (const section of [...sections].sort((a, b) => a.order - b.order)) {
    result.push({ section, notes: grouped.get(section.id) ?? [] });
  }
  return result;
}

export function findSectionByName(
  sections: Section[],
  name: string,
): Section | undefined {
  const needle = name.trim().toLowerCase();
  return sections.find((section) => section.name.toLowerCase() === needle);
}
