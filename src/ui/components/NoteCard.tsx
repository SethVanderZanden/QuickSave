import { splitPreview } from "@/core/markdown";
import type { Note } from "@/core/models";
import { Check, ChevronDown, Copy, Image as ImageIcon, Paperclip } from "lucide-react";
import { MarkdownText } from "./MarkdownText";
import { cn } from "../lib/utils";

interface NoteCardProps {
  note: Note;
  selected: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onToggleDone: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onExpand: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onOpenSketch?: () => void;
}

export function NoteCard({
  note,
  selected,
  onSelect,
  onToggleDone,
  onCopy,
  onEdit,
  onExpand,
  onContextMenu,
  onOpenSketch,
}: NoteCardProps) {
  const split = splitPreview(note.body);
  const body = note.expanded || !split.overflow ? note.body : split.preview;

  return (
    <article
      data-testid={`note-${note.id}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
      onContextMenu={onContextMenu}
      className={cn(
        "group relative rounded-[var(--radius-card)] border px-3.5 py-3 transition-colors",
        selected
          ? "border-[color-mix(in_oklab,var(--accent)_50%,var(--line))] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
          : "border-transparent hover:border-[var(--line)] hover:bg-[var(--fill)]",
        note.done && "note-done",
      )}
    >
      <div className="flex gap-2.5">
        <button
          type="button"
          aria-label={note.done ? "Mark not done" : "Mark done"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleDone();
          }}
          className={cn(
            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border no-drag",
            note.done
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
              : "border-[color-mix(in_oklab,var(--muted)_70%,transparent)] bg-transparent text-transparent hover:border-[var(--accent-soft)]",
          )}
        >
          <Check className={cn("h-3 w-3", note.done ? "opacity-100" : "opacity-0")} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          {note.kind === "sketch" ? (
            <button
              type="button"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-[var(--muted)] no-drag"
              onClick={(event) => {
                event.stopPropagation();
                onOpenSketch?.();
              }}
            >
              <ImageIcon className="h-3 w-3" />
              Sketch
            </button>
          ) : null}
          <div className={cn("text-[13.5px] leading-5", note.done && "opacity-60")}>
            <MarkdownText text={body} />
          </div>
          {split.overflow ? (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--muted)] no-drag"
              onClick={(event) => {
                event.stopPropagation();
                onExpand();
              }}
            >
              <ChevronDown className={cn("h-3 w-3 transition", note.expanded && "rotate-180")} />
              {note.expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
          {note.attachments.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {note.attachments.map((file) => (
                <li
                  key={file.id}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--fill)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[140px] truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Copy note"
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          className="h-8 w-8 shrink-0 rounded-[var(--radius-control)] text-[var(--muted)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--fill)] hover:text-[var(--ink)] no-drag"
        >
          <Copy className="mx-auto h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
