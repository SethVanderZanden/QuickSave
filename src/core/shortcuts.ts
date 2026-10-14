export interface Shortcut {
  id: string;
  action: string;
  keys: string;
  fallback?: string;
  scope: "global" | "panel";
}

export const SHORTCUTS: Shortcut[] = [
  {
    id: "capture",
    action: "Capture the current selection",
    keys: "Left Shift ×2",
    fallback: "Ctrl+Shift+C",
    scope: "global",
  },
  {
    id: "toggle",
    action: "Show or hide QuickSave",
    keys: "Right Shift ×2",
    fallback: "Ctrl+Shift+Space",
    scope: "global",
  },
  {
    id: "palette",
    action: "Command palette / switch section",
    keys: "Ctrl+K",
    scope: "panel",
  },
  {
    id: "search",
    action: "Focus search",
    keys: "Ctrl+F",
    scope: "panel",
  },
  {
    id: "compose",
    action: "Focus composer",
    keys: "Ctrl+N",
    scope: "panel",
  },
  {
    id: "copy",
    action: "Copy selected notes",
    keys: "Ctrl+C",
    scope: "panel",
  },
  {
    id: "copy-list",
    action: "Copy selected notes as a list",
    keys: "Ctrl+Shift+C",
    scope: "panel",
  },
  {
    id: "done",
    action: "Toggle done",
    keys: "Space",
    scope: "panel",
  },
  {
    id: "edit",
    action: "Edit selected note",
    keys: "Enter",
    scope: "panel",
  },
  {
    id: "delete",
    action: "Delete selected notes",
    keys: "Delete",
    scope: "panel",
  },
  {
    id: "archive",
    action: "Move selected notes to the logbook",
    keys: "Ctrl+Backspace",
    scope: "panel",
  },
  {
    id: "expand",
    action: "Expand or collapse selected notes",
    keys: "Ctrl+E",
    scope: "panel",
  },
  {
    id: "merge",
    action: "Merge selected notes",
    keys: "Ctrl+Shift+M",
    scope: "panel",
  },
  {
    id: "next-section",
    action: "Next section",
    keys: "Ctrl+Shift+]",
    scope: "panel",
  },
  {
    id: "prev-section",
    action: "Previous section",
    keys: "Ctrl+Shift+[",
    scope: "panel",
  },
  {
    id: "sketch",
    action: "Open sketch editor",
    keys: "Ctrl+Shift+D",
    scope: "global",
  },
  {
    id: "shortcuts",
    action: "Keyboard shortcuts",
    keys: "Ctrl+/",
    scope: "panel",
  },
  {
    id: "settings",
    action: "Settings",
    keys: "Ctrl+,",
    scope: "panel",
  },
  {
    id: "undo",
    action: "Undo",
    keys: "Ctrl+Z",
    scope: "panel",
  },
  {
    id: "redo",
    action: "Redo",
    keys: "Ctrl+Shift+Z",
    scope: "panel",
  },
  {
    id: "hide",
    action: "Hide panel",
    keys: "Esc",
    scope: "panel",
  },
  {
    id: "quit",
    action: "Quit QuickSave",
    keys: "Ctrl+Q",
    scope: "panel",
  },
];
