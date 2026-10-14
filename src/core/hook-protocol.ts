import type { ShiftTapEvent } from "./shift-tap";

export type HookMessage = "capture" | "toggle" | "sketch";

export type ParsedHookLine =
  | { type: "ready" }
  | { type: "copied" }
  | { type: "error"; detail: string }
  | { type: "legacy"; message: HookMessage }
  | { type: "tap"; event: ShiftTapEvent };

export function parseHookLine(line: string): HookMessage | null {
  const value = line.trim().toLowerCase();
  if (value === "capture" || value === "toggle" || value === "sketch") {
    return value;
  }
  return null;
}

export function parseShiftHookLine(line: string, at = Date.now()): ParsedHookLine | null {
  const value = line.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "ready") return { type: "ready" };
  if (lower === "copied") return { type: "copied" };
  if (lower.startsWith("error")) {
    return { type: "error", detail: value.slice(5).trim() };
  }
  const legacy = parseHookLine(lower);
  if (legacy) return { type: "legacy", message: legacy };

  if (lower === "other") return { type: "tap", event: { type: "other", at } };

  const down = /^down\s+(left|right|l|r)$/.exec(lower);
  if (down) {
    return { type: "tap", event: { type: "down", side: asSide(down[1]), at } };
  }
  const up = /^up\s+(left|right|l|r)$/.exec(lower);
  if (up) {
    return { type: "tap", event: { type: "up", side: asSide(up[1]), at } };
  }
  return null;
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function asSide(value: string | undefined): "left" | "right" {
  return value === "right" || value === "r" ? "right" : "left";
}
