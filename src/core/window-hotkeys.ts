export type WindowHotkey = "copy-plain" | "copy-list" | "quit";

export interface WindowHotkeyInput {
  type?: string;
  key?: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  control?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  repeat?: boolean;
  isAutoRepeat?: boolean;
}

export function classifyWindowHotkey(input: WindowHotkeyInput): WindowHotkey | null {
  if (input.type && input.type !== "keyDown" && input.type !== "keydown") return null;
  if (input.repeat || input.isAutoRepeat) return null;

  const control = Boolean(input.control ?? input.ctrlKey);
  const meta = Boolean(input.meta ?? input.metaKey);
  const shift = Boolean(input.shift ?? input.shiftKey);
  const alt = Boolean(input.alt ?? input.altKey);
  if (alt || !(control || meta)) return null;

  const key = (input.key ?? "").toLowerCase();
  const code = input.code ?? "";
  const isC = key === "c" || code === "KeyC";
  const isQ = key === "q" || code === "KeyQ";

  if (isQ && !shift) return "quit";
  if (isC) return shift ? "copy-list" : "copy-plain";
  return null;
}
