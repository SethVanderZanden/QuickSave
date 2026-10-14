import { isSafeExternalUrl, parseHookLine, parseShiftHookLine } from "@/core/hook-protocol";

describe("hook protocol", () => {
  it("accepts only the three shift-hook verbs", () => {
    expect(parseHookLine("CAPTURE\n")).toBe("capture");
    expect(parseHookLine(" toggle ")).toBe("toggle");
    expect(parseHookLine("sketch")).toBe("sketch");
    expect(parseHookLine("keydown a")).toBeNull();
    expect(parseHookLine("")).toBeNull();
  });

  it("parses raw tap events from the Windows sidecar", () => {
    expect(parseShiftHookLine("READY")).toEqual({ type: "ready" });
    expect(parseShiftHookLine("COPIED")).toEqual({ type: "copied" });
    expect(parseShiftHookLine("DOWN left", 42)).toEqual({
      type: "tap",
      event: { type: "down", side: "left", at: 42 },
    });
    expect(parseShiftHookLine("UP r", 42)).toEqual({
      type: "tap",
      event: { type: "up", side: "right", at: 42 },
    });
    expect(parseShiftHookLine("OTHER", 42)).toEqual({
      type: "tap",
      event: { type: "other", at: 42 },
    });
    expect(parseShiftHookLine("ERROR hook 5")).toEqual({ type: "error", detail: "hook 5" });
    expect(parseShiftHookLine("CAPTURE")).toEqual({ type: "legacy", message: "capture" });
  });

  it("allows only http(s) URLs", () => {
    expect(isSafeExternalUrl("https://shadcn.com/copper")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
  });
});
