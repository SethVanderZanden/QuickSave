export type HookMessage = "capture" | "toggle" | "sketch";

export function parseHookLine(line: string): HookMessage | null {
  const value = line.trim().toLowerCase();
  if (value === "capture" || value === "toggle" || value === "sketch") {
    return value;
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
