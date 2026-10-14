export const VK_SHIFT = 0x10;
export const VK_LSHIFT = 0xa0;
export const VK_RSHIFT = 0xa1;
export const SCAN_LSHIFT = 0x2a;
export const SCAN_RSHIFT = 0x36;
export const DEFAULT_SHIFT_TAP_MS = 400;

export type ShiftSide = "left" | "right";
export type ShiftTapAction = "capture" | "toggle";

export interface KeyClassification {
  kind: "shift" | "other";
  side?: ShiftSide;
}

export interface ShiftTapEvent {
  type: "down" | "up" | "other";
  side?: ShiftSide;
  at: number;
}

/**
 * Windows low-level hooks often report generic VK_SHIFT (0x10) instead of
 * VK_LSHIFT / VK_RSHIFT. Prefer explicit left/right codes, then scan codes
 * (0x2A left, 0x36 right), then fall back to left for generic VK_SHIFT.
 */
export function classifyKey(vkCode: number, scanCode: number): KeyClassification {
  if (vkCode === VK_LSHIFT) return { kind: "shift", side: "left" };
  if (vkCode === VK_RSHIFT) return { kind: "shift", side: "right" };
  if (scanCode === SCAN_RSHIFT) return { kind: "shift", side: "right" };
  if (scanCode === SCAN_LSHIFT) return { kind: "shift", side: "left" };
  if (vkCode === VK_SHIFT) return { kind: "shift", side: "left" };
  return { kind: "other" };
}

export class ShiftTapDetector {
  private leftDown = false;
  private rightDown = false;
  private lastLeftUp = 0;
  private lastRightUp = 0;

  constructor(private readonly windowMs: number = DEFAULT_SHIFT_TAP_MS) {}

  push(event: ShiftTapEvent): ShiftTapAction | null {
    if (event.type === "other") {
      this.lastLeftUp = 0;
      this.lastRightUp = 0;
      return null;
    }

    const side = event.side;
    if (!side) return null;

    if (event.type === "down") {
      if (side === "left") {
        if (this.leftDown) return null;
        this.leftDown = true;
      } else {
        if (this.rightDown) return null;
        this.rightDown = true;
      }
      return null;
    }

    if (side === "left") {
      this.leftDown = false;
      const previous = this.lastLeftUp;
      this.lastLeftUp = event.at;
      this.lastRightUp = 0;
      if (previous > 0 && event.at - previous <= this.windowMs) {
        this.lastLeftUp = 0;
        return "capture";
      }
      return null;
    }

    this.rightDown = false;
    const previous = this.lastRightUp;
    this.lastRightUp = event.at;
    this.lastLeftUp = 0;
    if (previous > 0 && event.at - previous <= this.windowMs) {
      this.lastRightUp = 0;
      return "toggle";
    }
    return null;
  }

  reset(): void {
    this.leftDown = false;
    this.rightDown = false;
    this.lastLeftUp = 0;
    this.lastRightUp = 0;
  }
}
