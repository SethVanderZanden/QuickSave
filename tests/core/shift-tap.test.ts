import {
  SCAN_LSHIFT,
  SCAN_RSHIFT,
  ShiftTapDetector,
  VK_LSHIFT,
  VK_RSHIFT,
  VK_SHIFT,
  classifyKey,
} from "@/core/shift-tap";

function tap(detector: ShiftTapDetector, type: "down" | "up", side: "left" | "right", at: number) {
  return detector.push({ type, side, at });
}

describe("classifyKey", () => {
  it("uses left/right virtual keys when Windows reports them", () => {
    expect(classifyKey(VK_LSHIFT, 0)).toEqual({ kind: "shift", side: "left" });
    expect(classifyKey(VK_RSHIFT, 0)).toEqual({ kind: "shift", side: "right" });
  });

  it("distinguishes generic VK_SHIFT via scan code", () => {
    expect(classifyKey(VK_SHIFT, SCAN_LSHIFT)).toEqual({ kind: "shift", side: "left" });
    expect(classifyKey(VK_SHIFT, SCAN_RSHIFT)).toEqual({ kind: "shift", side: "right" });
  });

  it("treats bare VK_SHIFT as left so capture still fires", () => {
    expect(classifyKey(VK_SHIFT, 0)).toEqual({ kind: "shift", side: "left" });
  });

  it("ignores unrelated keys", () => {
    expect(classifyKey(0x41, 0x1e)).toEqual({ kind: "other" });
  });
});

describe("ShiftTapDetector", () => {
  it("captures on a second left-shift tap within the window", () => {
    const detector = new ShiftTapDetector(400);
    expect(tap(detector, "down", "left", 1000)).toBeNull();
    expect(tap(detector, "up", "left", 1080)).toBeNull();
    expect(tap(detector, "down", "left", 1200)).toBeNull();
    expect(tap(detector, "up", "left", 1280)).toBe("capture");
  });

  it("toggles on a second right-shift tap within the window", () => {
    const detector = new ShiftTapDetector(400);
    tap(detector, "down", "right", 1000);
    tap(detector, "up", "right", 1080);
    tap(detector, "down", "right", 1200);
    expect(tap(detector, "up", "right", 1280)).toBe("toggle");
  });

  it("ignores auto-repeat keydown while Shift is held", () => {
    const detector = new ShiftTapDetector(400);
    expect(tap(detector, "down", "left", 1000)).toBeNull();
    expect(tap(detector, "down", "left", 1030)).toBeNull();
    expect(tap(detector, "down", "left", 1060)).toBeNull();
    expect(tap(detector, "up", "left", 1100)).toBeNull();
  });

  it("does not fire when the second tap is too slow", () => {
    const detector = new ShiftTapDetector(400);
    tap(detector, "down", "left", 1000);
    tap(detector, "up", "left", 1100);
    tap(detector, "down", "left", 1600);
    expect(tap(detector, "up", "left", 1700)).toBeNull();
  });

  it("resets when another key is pressed between taps", () => {
    const detector = new ShiftTapDetector(400);
    tap(detector, "down", "left", 1000);
    tap(detector, "up", "left", 1080);
    detector.push({ type: "other", at: 1120 });
    tap(detector, "down", "left", 1200);
    expect(tap(detector, "up", "left", 1280)).toBeNull();
  });

  it("does not treat left then right as a double tap", () => {
    const detector = new ShiftTapDetector(400);
    tap(detector, "down", "left", 1000);
    tap(detector, "up", "left", 1080);
    tap(detector, "down", "right", 1200);
    expect(tap(detector, "up", "right", 1280)).toBeNull();
  });
});
