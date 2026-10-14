import { Command } from "cmdk";
import {
  BookMarked,
  CheckCheck,
  Copy,
  Download,
  FolderOpen,
  Keyboard,
  Layers,
  PenLine,
  Plus,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../hooks/use-app";

export function CommandPalette() {
  const { controller, workspace, ui } = useApp();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (ui.paletteOpen) setSearch("");
  }, [ui.paletteOpen]);

  if (!ui.paletteOpen) return null;

  const close = () => {
    setSearch("");
    controller.patchUi({ paletteOpen: false });
  };
  const query = search;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[var(--bg-elev)] no-drag">
      <Command
        className="flex h-full flex-col"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            close();
          }
        }}
      >
        <Command.Input
          autoFocus
          value={search}
          onValueChange={setSearch}
          placeholder="Switch section, run a command…"
          className="h-14 w-full border-b border-[var(--line)] bg-transparent px-5 text-[14px] outline-none"
        />
        <Command.List className="min-h-0 flex-1 overflow-auto p-2 scrollbar-thin">
          <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--muted)]">
            Nothing matches
          </Command.Empty>
          <Command.Group heading="Sections">
            <Item
              icon={Layers}
              label="Show all"
              onSelect={() => {
                controller.session.setView({ type: "all" });
                close();
              }}
            />
            {workspace.sections.map((section) => (
              <Item
                key={section.id}
                icon={Layers}
                label={section.name}
                onSelect={() => {
                  controller.session.setView({ type: "section", id: section.id });
                  close();
                }}
              />
            ))}
            <Item
              icon={Plus}
              label={query.trim() ? `Create section “${query.trim()}”` : "Create section"}
              onSelect={() => {
                const name = query.trim() || "New section";
                controller.session.upsertSection(name);
                close();
              }}
            />
          </Command.Group>
          {ui.selectedIds.length > 0 ? (
            <Command.Group heading="Move">
              <Item
                icon={Layers}
                label="Move to Inbox"
                onSelect={() => {
                  controller.session.moveNotes(ui.selectedIds, null);
                  close();
                }}
              />
              {workspace.sections.map((section) => (
                <Item
                  key={`move-${section.id}`}
                  icon={Layers}
                  label={`Move to ${section.name}`}
                  onSelect={() => {
                    controller.session.moveNotes(ui.selectedIds, section.id);
                    close();
                  }}
                />
              ))}
            </Command.Group>
          ) : null}
          <Command.Group heading="Commands">
            <Item
              icon={PenLine}
              label="New sketch"
              onSelect={() => {
                controller.patchUi({ paletteOpen: false, sketchOpen: true, sketchNoteId: null });
              }}
            />
            <Item
              icon={BookMarked}
              label="Open logbook"
              onSelect={() => {
                controller.patchUi({ paletteOpen: false, logbookOpen: true });
              }}
            />
            <Item
              icon={CheckCheck}
              label="Clear done"
              onSelect={() => {
                controller.session.clearDone();
                close();
              }}
            />
            <Item
              icon={Copy}
              label="Copy all as list"
              onSelect={() => {
                void controller.copySelection("list");
                close();
              }}
            />
            <Item
              icon={Download}
              label="Export markdown"
              onSelect={() => {
                void controller.bridge.exportFile("quicksave-export.md", controller.session.exportMarkdown());
                close();
              }}
            />
            <Item
              icon={FolderOpen}
              label="Reveal data folder"
              onSelect={() => {
                void controller.bridge.openDataFolder();
                close();
              }}
            />
            <Item
              icon={Keyboard}
              label="Keyboard shortcuts"
              onSelect={() => controller.patchUi({ paletteOpen: false, shortcutsOpen: true })}
            />
            <Item
              icon={Settings}
              label="Settings"
              onSelect={() => controller.patchUi({ paletteOpen: false, settingsOpen: true })}
            />
          </Command.Group>
        </Command.List>
        <p className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--muted)]">
          Esc to close
        </p>
      </Command>
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: typeof Layers;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2.5 text-[13px] text-[var(--ink)] data-[selected=true]:bg-[var(--fill)]"
    >
      <Icon className="h-3.5 w-3.5 text-[var(--muted)]" />
      {label}
    </Command.Item>
  );
}
