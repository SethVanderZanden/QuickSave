import type { Note, Workspace } from "./models";
import { notesBySection } from "./search";

export function copyPlain(notes: Note[]): string {
  return notes.map((note) => note.body).join("\n\n");
}

export function copyAsList(notes: Note[]): string {
  return notes.map((note) => `- ${note.body.replace(/\n/g, "\n  ")}`).join("\n");
}

export function exportMarkdown(workspace: Workspace): string {
  const lines: string[] = ["# QuickSave export", ""];
  const grouped = notesBySection(workspace.notes, workspace.sections);

  for (const group of grouped) {
    lines.push(`## ${group.section?.name ?? "Inbox"}`, "");
    if (group.notes.length === 0) {
      lines.push("_Empty_", "");
      continue;
    }
    for (const note of group.notes) {
      const mark = note.done ? "x" : " ";
      const body = note.body.replace(/\n/g, "\n  ");
      lines.push(`- [${mark}] ${body}`);
      for (const file of note.attachments) {
        lines.push(`  - attachment: ${file.name}`);
      }
    }
    lines.push("");
  }

  if (workspace.logbook.length > 0) {
    lines.push("## Logbook", "");
    for (const note of workspace.logbook) {
      lines.push(`- ${note.body.replace(/\n/g, " ")}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function mergeBodies(notes: Note[]): string {
  return notes.map((note) => note.body).join("\n\n");
}
