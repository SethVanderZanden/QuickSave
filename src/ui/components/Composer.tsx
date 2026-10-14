import { Hash, PenLine } from "lucide-react";
import { useEffect, useRef } from "react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onOpenSketch: () => void;
  onOpenPalette: () => void;
  onFiles: (files: File[]) => void;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onOpenSketch,
  onOpenPalette,
  onFiles,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div
      className="border-t border-[var(--line)] p-3 no-drag"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const files = [...event.dataTransfer.files];
        if (files.length) onFiles(files);
      }}
    >
      <div className="flex items-end gap-2 rounded-xl border border-[var(--line)] bg-[var(--fill)] px-3 py-2">
        <textarea
          ref={ref}
          data-testid="composer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="A prompt, a snippet, or # section"
          rows={1}
          className="max-h-40 min-h-6 w-full resize-none bg-transparent text-[13.5px] leading-5 outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="button"
          title="Sections and commands"
          onClick={onOpenPalette}
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
        >
          <Hash className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Sketch"
          onClick={onOpenSketch}
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
        >
          <PenLine className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] tracking-wide text-[var(--muted)]">
        Enter to save · Shift+Enter for a new line · drop files here
      </p>
    </div>
  );
}
