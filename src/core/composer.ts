export type ComposerIntent =
  | { type: "empty" }
  | { type: "note"; body: string }
  | { type: "section"; name: string; fresh: boolean };

const SECTION_LINE = /^(#{1,2})\s+(\S.*)$/;

export function parseComposer(raw: string): ComposerIntent {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.trim()) {
    return { type: "empty" };
  }

  if (!text.includes("\n")) {
    const match = text.trim().match(SECTION_LINE);
    if (match) {
      const hashes = match[1] ?? "#";
      const name = (match[2] ?? "").trim();
      if (name) {
        return { type: "section", name, fresh: hashes === "##" };
      }
    }
  }

  return { type: "note", body: text.replace(/[ \t]+$/gm, "").replace(/\n+$/, "") };
}

export function isSectionCommand(raw: string): boolean {
  return parseComposer(raw).type === "section";
}
