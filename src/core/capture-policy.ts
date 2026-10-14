import { DUPLICATE_WINDOW_MS, MAX_NOTE_CHARS } from "./models";
import type { Clock } from "./clock";

export type CaptureReject = "empty" | "duplicate";

export type CaptureDecision =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; reason: CaptureReject };

export class CapturePolicy {
  private last: { text: string; at: number } | null = null;

  constructor(
    private readonly clock: Clock,
    private readonly duplicateWindowMs = DUPLICATE_WINDOW_MS,
    private readonly maxChars = MAX_NOTE_CHARS,
  ) {}

  prepare(text: string): CaptureDecision {
    const normalized = normalizeCapturedText(text);
    if (!normalized) {
      return { ok: false, reason: "empty" };
    }

    const truncated = normalized.length > this.maxChars;
    const clipped = truncated
      ? `${normalized.slice(0, this.maxChars)}…`
      : normalized;

    const now = this.clock.nowMs();
    if (
      this.last &&
      this.last.text === clipped &&
      now - this.last.at < this.duplicateWindowMs
    ) {
      return { ok: false, reason: "duplicate" };
    }

    this.last = { text: clipped, at: now };
    return { ok: true, text: clipped, truncated };
  }

  reset(): void {
    this.last = null;
  }
}

export function normalizeCapturedText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}
