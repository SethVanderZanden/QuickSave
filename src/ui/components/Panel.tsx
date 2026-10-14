import { notesBySection } from "@/core/search";
import type { Note } from "@/core/models";
import {
  BookMarked,
  Keyboard,
  Minus,
  MoreHorizontal,
  Power,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isDesktopShell } from "../bridge";
import { useApp } from "../hooks/use-app";
import { cn, isTypingTarget } from "../lib/utils";
import { CommandPalette } from "./CommandPalette";
import { Composer } from "./Composer";
import { ConfirmDialog, LogbookDialog, SettingsDialog, ShortcutSheet } from "./Dialogs";
import { Hud } from "./Hud";
import { NoteCard } from "./NoteCard";
import { SketchEditor } from "./SketchEditor";

export function Panel() {
  const { controller, workspace, ui } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const desktop = isDesktopShell(controller.bridge);
  const hits = controller.session.search(ui.query);
  const notes = hits.map((hit) => hit.note);
  const grouped = useMemo(() => {
    const view = workspace.activeView;
    if (view.type === "section") {
      const section = workspace.sections.find((item) => item.id === view.id) ?? null;
      return [{ section, notes }];
    }
    const groups = notesBySection(notes, workspace.sections);
    if (ui.query.trim()) {
      return groups.filter((group) => group.notes.length > 0);
    }
    return groups;
  }, [notes, workspace, ui.query]);

  const orderedIds = notes.map((note) => note.id);

  useEffect(() => {
    const theme = workspace.settings.theme;
    const root = document.documentElement;
    if (theme === "system") {
      root.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      root.dataset.theme = theme;
    }
  }, [workspace.settings.theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "q") {
        event.preventDefault();
        void controller.bridge.quit();
        return;
      }
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        controller.patchUi({ paletteOpen: !ui.paletteOpen });
        return;
      }
      if (meta && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (meta && event.key.toLowerCase() === "n") {
        event.preventDefault();
        document.querySelector<HTMLTextAreaElement>("[data-testid=composer]")?.focus();
        return;
      }
      if (meta && event.key === ",") {
        event.preventDefault();
        controller.patchUi({ settingsOpen: true });
        return;
      }
      if (meta && event.key === "/") {
        event.preventDefault();
        controller.patchUi({ shortcutsOpen: true });
        return;
      }
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) controller.session.redo();
        else controller.session.undo();
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void controller.copySelection("list");
        return;
      }
      if (meta && event.key.toLowerCase() === "c" && !isTypingTarget(event.target)) {
        event.preventDefault();
        void controller.copySelection("plain");
        return;
      }
      if (meta && event.key.toLowerCase() === "e") {
        event.preventDefault();
        controller.session.toggleExpand(ui.selectedIds);
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        controller.session.mergeNotes(ui.selectedIds);
        return;
      }
      if (meta && event.shiftKey && event.key === "]") {
        event.preventDefault();
        controller.session.cycleView(1);
        return;
      }
      if (meta && event.shiftKey && event.key === "[") {
        event.preventDefault();
        controller.session.cycleView(-1);
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        controller.patchUi({ sketchOpen: true, sketchNoteId: null });
        return;
      }
      if (event.key === "Escape") {
        if (ui.paletteOpen || ui.settingsOpen || ui.shortcutsOpen || ui.logbookOpen || ui.sketchOpen) {
          controller.patchUi({
            paletteOpen: false,
            settingsOpen: false,
            shortcutsOpen: false,
            logbookOpen: false,
            sketchOpen: false,
            editingId: null,
          });
          return;
        }
        if (ui.selectedIds.length || ui.editingId) {
          controller.patchUi({ selectedIds: [], editingId: null });
          return;
        }
        void controller.bridge.hide();
        return;
      }
      if (isTypingTarget(event.target) || ui.paletteOpen) return;
      if (event.key === " " && ui.selectedIds.length) {
        event.preventDefault();
        controller.session.toggleDone(ui.selectedIds);
      }
      if (event.key === "Enter" && ui.selectedIds.length === 1) {
        controller.patchUi({ editingId: ui.selectedIds[0] ?? null });
      }
      if ((event.key === "Delete" || event.key === "Backspace") && ui.selectedIds.length) {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) controller.session.archiveNotes(ui.selectedIds);
        else {
          controller.patchUi({
            confirm: {
              title: "Delete notes",
              body: `Delete ${ui.selectedIds.length} note${ui.selectedIds.length === 1 ? "" : "s"}? This cannot be undone from the logbook.`,
              action: () => controller.session.deleteNotes(ui.selectedIds),
            },
          });
        }
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(event.key === "ArrowDown" ? 1 : -1, event.shiftKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function moveSelection(delta: number, extend: boolean) {
    if (orderedIds.length === 0) return;
    const current = ui.selectedIds[ui.selectedIds.length - 1];
    const index = Math.max(0, orderedIds.indexOf(current ?? orderedIds[0] ?? ""));
    const next = orderedIds[Math.min(orderedIds.length - 1, Math.max(0, index + delta))];
    if (!next) return;
    if (extend) controller.select(next, "range", orderedIds);
    else controller.select(next, "replace", orderedIds);
  }

  const view = workspace.activeView;
  const title =
    view.type === "all"
      ? "All"
      : view.type === "logbook"
        ? "Logbook"
        : (workspace.sections.find((section) => section.id === view.id)?.name ?? "QuickSave");

  return (
    <div
      className={cn(
        "panel-shell relative flex h-full w-full flex-col overflow-hidden",
        desktop ? "min-h-0 rounded-[var(--radius-panel)]" : "min-h-[520px] rounded-[var(--radius-panel)]",
      )}
      data-testid="panel"
    >
      <header className="drag-region flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[17px] leading-none tracking-[-0.02em] text-[var(--ink)]">
            QuickSave
          </p>
          <button
            type="button"
            data-testid="active-section"
            className="mt-1 block max-w-full truncate text-left text-[12px] text-[var(--muted)] no-drag hover:text-[var(--accent-soft)]"
            onClick={() => controller.patchUi({ paletteOpen: true })}
          >
            {title}
          </button>
        </div>
        <div className="relative no-drag">
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-[var(--muted)] hover:bg-[var(--fill)] hover:text-[var(--ink)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-[12px] border border-[var(--line)] bg-[var(--bg-elev)] p-1.5 text-[13px] shadow-[var(--shadow)]">
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  controller.patchUi({ paletteOpen: true });
                }}
              >
                Switch section
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  controller.session.clearDone();
                }}
              >
                Clear done
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  void controller.copySelection("list");
                }}
              >
                Copy all as list
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  controller.patchUi({ logbookOpen: true });
                }}
              >
                <BookMarked className="h-3.5 w-3.5" /> Logbook
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  controller.patchUi({ shortcutsOpen: true });
                }}
              >
                <Keyboard className="h-3.5 w-3.5" /> Shortcuts
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  controller.patchUi({ settingsOpen: true });
                }}
              >
                <Settings className="h-3.5 w-3.5" /> Settings
              </MenuItem>
              {desktop ? (
                <>
                  <MenuItem
                    onClick={() => {
                      setMenuOpen(false);
                      void controller.bridge.hide();
                    }}
                  >
                    <Minus className="h-3.5 w-3.5" /> Hide to tray
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenuOpen(false);
                      void controller.bridge.quit();
                    }}
                  >
                    <Power className="h-3.5 w-3.5" /> Quit QuickSave
                  </MenuItem>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        {desktop ? (
          <div className="no-drag flex items-center pl-1">
            <button
              type="button"
              aria-label="Minimize"
              data-testid="window-minimize"
              className="caption-btn"
              onClick={() => void controller.bridge.hide()}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Close QuickSave"
              data-testid="window-close"
              className="caption-btn caption-close"
              onClick={() => void controller.bridge.quit()}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </header>

      <div className="no-drag border-b border-[var(--line)] px-4 py-3">
        <label className="flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--fill)] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[var(--muted)]" />
          <input
            ref={searchRef}
            data-testid="search"
            value={ui.query}
            onChange={(event) => controller.patchUi({ query: event.target.value })}
            placeholder="Search"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)]"
          />
            <kbd className="whitespace-nowrap">Ctrl+K</kbd>
        </label>
      </div>

      <div
        className="scrollbar-thin min-h-0 flex-1 overflow-auto px-3 py-3"
        onClick={() => controller.patchUi({ selectedIds: [], editingId: null })}
      >
        {workspace.notes.length === 0 && workspace.sections.length === 0 ? (
          <EmptyState
            onSample={() => seedSample(controller)}
            onCapture={() => void controller.captureFromSystem()}
          />
        ) : notes.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--muted)]">
            Nothing in {title} yet. Capture something, or type below.
          </div>
        ) : (
          grouped.map((group) => {
            if (group.section?.collapsed && workspace.activeView.type === "all" && !ui.query.trim()) {
              return (
                <button
                  key={group.section.id}
                  type="button"
                  className="mb-1 flex w-full items-center justify-between rounded-[var(--radius-control)] px-2.5 py-2 text-left text-[12px] text-[var(--muted)] hover:bg-[var(--fill)]"
                  onClick={(event) => {
                    event.stopPropagation();
                    controller.session.toggleSectionCollapse(group.section!.id);
                  }}
                >
                  <span>▸ {group.section.name}</span>
                  <span>{group.notes.length}</span>
                </button>
              );
            }
            return (
              <section key={group.section?.id ?? "inbox"} className="mb-3">
                {workspace.activeView.type === "all" ? (
                  <div className="flex items-center justify-between px-2 pb-1">
                    <button
                      type="button"
                      className="text-[11px] tracking-[0.08em] text-[var(--muted)]"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (group.section) {
                          controller.session.setView({ type: "section", id: group.section.id });
                        }
                      }}
                    >
                      {group.section?.name ?? "Inbox"}
                    </button>
                    {group.section ? (
                      <button
                        type="button"
                        className="text-[11px] text-[var(--muted)]"
                        onClick={(event) => {
                          event.stopPropagation();
                          controller.session.toggleSectionCollapse(group.section!.id);
                        }}
                      >
                        Collapse
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  {group.notes.map((note) =>
                    ui.editingId === note.id ? (
                      <NoteEditor
                        key={note.id}
                        note={note}
                        onSave={(body) => {
                          controller.session.updateNote(note.id, body);
                          controller.patchUi({ editingId: null });
                        }}
                        onCancel={() => controller.patchUi({ editingId: null })}
                      />
                    ) : (
                      <NoteCard
                        key={note.id}
                        note={note}
                        selected={ui.selectedIds.includes(note.id)}
                        onSelect={(event) => {
                          event.stopPropagation();
                          const mode = event.shiftKey ? "range" : event.ctrlKey || event.metaKey ? "toggle" : "replace";
                          controller.select(note.id, mode, orderedIds);
                        }}
                        onToggleDone={() => controller.session.toggleDone([note.id])}
                        onCopy={() => {
                          controller.patchUi({ selectedIds: [note.id] });
                          void controller.copySelection("plain");
                        }}
                        onEdit={() => controller.patchUi({ editingId: note.id, selectedIds: [note.id] })}
                        onExpand={() => controller.session.toggleExpand([note.id])}
                        onOpenSketch={() =>
                          controller.patchUi({ sketchOpen: true, sketchNoteId: note.id })
                        }
                        onContextMenu={(event) => {
                          event.preventDefault();
                          controller.select(note.id, ui.selectedIds.includes(note.id) ? "toggle" : "replace", orderedIds);
                          controller.patchUi({ paletteOpen: true });
                        }}
                      />
                    ),
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      <Composer
        value={ui.composer}
        onChange={(composer) => controller.patchUi({ composer })}
        onSubmit={() => controller.submitComposer()}
        onOpenSketch={() => controller.patchUi({ sketchOpen: true, sketchNoteId: null })}
        onOpenPalette={() => controller.patchUi({ paletteOpen: true })}
        onFiles={(files) => void controller.attachFiles(ui.selectedIds[0] ?? null, files)}
      />

      <CommandPalette />
      <SettingsDialog />
      <ShortcutSheet />
      <LogbookDialog />
      <ConfirmDialog />
      <SketchEditor />
      <Hud />
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2.5 py-2 text-left hover:bg-[var(--fill)]"
    >
      {children}
    </button>
  );
}

function NoteEditor({
  note,
  onSave,
  onCancel,
}: {
  note: Note;
  onSave: (body: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(note.body);
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--accent)] bg-[var(--fill)] p-3" onClick={(event) => event.stopPropagation()}>
      <textarea
        autoFocus
        data-testid="note-editor"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onSave(value);
        }}
        className="h-24 w-full resize-none bg-transparent text-[13.5px] outline-none"
      />
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" className="text-[12px] text-[var(--muted)]" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="rounded-[var(--radius-control)] bg-[var(--accent)] px-2.5 py-1 text-[12px] text-[var(--accent-ink)]"
          onClick={() => onSave(value)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onSample, onCapture }: { onSample: () => void; onCapture: () => void }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center" data-testid="empty-state">
      <div>
        <p className="font-serif text-[22px] leading-7 text-[var(--ink)]">Keep what matters.</p>
        <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
          Select text in any app and double-tap Left Shift. Queue the next prompts here, copy them back
          into ChatGPT, Claude, or Cursor, and check them off as you go.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={onCapture}
            className="rounded-[var(--radius-control)] border border-[var(--line)] px-3.5 py-2 text-[12px]"
          >
            Capture clipboard
          </button>
          <button
            type="button"
            data-testid="load-sample"
            onClick={onSample}
            className="rounded-[var(--radius-control)] bg-[var(--accent)] px-3.5 py-2 text-[12px] text-[var(--accent-ink)]"
          >
            Load sample
          </button>
        </div>
      </div>
    </div>
  );
}

function seedSample(controller: ReturnType<typeof useApp>["controller"]): void {
  controller.session.submitComposer("# Chrome");
  controller.session.captureText("https://shadcn.com/copper");
  controller.session.captureText("Keep the part about local-only notes — no account, no sync.");
  controller.session.submitComposer("# Cursor");
  controller.session.submitComposer("Extract the capture hook into its own module.");
  controller.session.submitComposer("Write tests for duplicate-capture suppression.");
  controller.session.submitComposer("# Docs");
  controller.session.submitComposer("Draft Windows install steps for the README.");
  controller.session.setView({ type: "all" });
}
