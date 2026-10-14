import { SHORTCUTS } from "@/core/shortcuts";
import type { ThemeName } from "@/core/models";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "../hooks/use-app";
import { formatRelative } from "../lib/utils";

export function SettingsDialog() {
  const { controller, workspace, ui } = useApp();
  if (!ui.settingsOpen) return null;
  const settings = workspace.settings;

  return (
    <Modal title="Settings" onClose={() => controller.patchUi({ settingsOpen: false })}>
      <Toggle
        label="Keep on top"
        checked={settings.keepOnTop}
        onChange={(keepOnTop) => {
          controller.session.patchSettings({ keepOnTop });
          void controller.bridge.setAlwaysOnTop(keepOnTop);
        }}
      />
      <Toggle
        label="Mark notes done when copied"
        checked={settings.markDoneOnCopy}
        onChange={(markDoneOnCopy) => controller.session.patchSettings({ markDoneOnCopy })}
      />
      <Toggle
        label="Restore clipboard after capture"
        checked={settings.restoreClipboardAfterCapture}
        onChange={(restoreClipboardAfterCapture) =>
          controller.session.patchSettings({ restoreClipboardAfterCapture })
        }
      />
      <Toggle
        label="Double-Shift capture (Windows hook)"
        checked={settings.enableDoubleShift}
        onChange={(enableDoubleShift) => controller.session.patchSettings({ enableDoubleShift })}
      />
      <Toggle
        label="Start with Windows"
        checked={settings.launchAtStartup}
        onChange={(launchAtStartup) => {
          controller.session.patchSettings({ launchAtStartup });
          void controller.bridge.setLaunchAtStartup(launchAtStartup);
        }}
      />
      <div className="mt-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Theme</p>
        <div className="grid grid-cols-4 gap-1.5">
          {(["dark", "light", "glass", "system"] as ThemeName[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => controller.session.patchSettings({ theme })}
              className={`rounded-lg border px-2 py-1.5 text-[12px] capitalize ${
                settings.theme === theme
                  ? "border-[var(--color-copper)] text-[var(--color-copper-soft)]"
                  : "border-[var(--line)]"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function ShortcutSheet() {
  const { controller, ui } = useApp();
  if (!ui.shortcutsOpen) return null;
  return (
    <Modal title="Shortcuts" onClose={() => controller.patchUi({ shortcutsOpen: false })}>
      <ul className="space-y-2">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.id} className="flex items-start justify-between gap-4 text-[13px]">
            <span>{shortcut.action}</span>
            <span className="shrink-0 text-right">
              <kbd>{shortcut.keys}</kbd>
              {shortcut.fallback ? (
                <>
                  {" "}
                  <kbd>{shortcut.fallback}</kbd>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export function LogbookDialog() {
  const { controller, workspace, ui } = useApp();
  if (!ui.logbookOpen) return null;
  return (
    <Modal title="Logbook" onClose={() => controller.patchUi({ logbookOpen: false })}>
      {workspace.logbook.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Cleared notes land here.</p>
      ) : (
        <ul className="space-y-2">
          {workspace.logbook.map((note) => (
            <li key={note.id} className="rounded-xl border border-[var(--line)] p-2.5">
              <p className="text-[13px] leading-5">{note.body}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>{formatRelative(note.updatedAt)}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="hover:text-[var(--ink)]"
                    onClick={() => controller.session.restoreNote(note.id)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="hover:text-[var(--danger)]"
                    onClick={() => controller.session.purgeLogbook([note.id])}
                  >
                    Delete
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function ConfirmDialog() {
  const { controller, ui } = useApp();
  if (!ui.confirm) return null;
  return (
    <Modal title={ui.confirm.title} onClose={() => controller.patchUi({ confirm: null })}>
      <p className="text-sm text-[var(--muted)]">{ui.confirm.body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--fill)]"
          onClick={() => controller.patchUi({ confirm: null })}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-sm text-white"
          onClick={() => {
            ui.confirm?.action();
            controller.patchUi({ confirm: null });
          }}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-5 w-9 rounded-full p-0.5 transition ${
          checked ? "bg-[var(--color-copper)]" : "bg-[var(--line)]"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/35 p-5 no-drag" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[80%] w-full overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shadow)] scrollbar-thin"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-[var(--fill)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
