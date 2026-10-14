import { CapturePolicy } from "@/core/capture-policy";
import { FrozenClock } from "@/core/clock";
import { MAX_NOTE_CHARS } from "@/core/models";

describe("CapturePolicy", () => {
  it("rejects empty captures", () => {
    const policy = new CapturePolicy(new FrozenClock(1_000));
    expect(policy.prepare("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("truncates oversized captures", () => {
    const policy = new CapturePolicy(new FrozenClock(1_000));
    const huge = "a".repeat(MAX_NOTE_CHARS + 50);
    const result = policy.prepare(huge);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.truncated).toBe(true);
      expect(result.text.endsWith("…")).toBe(true);
      expect(result.text.length).toBe(MAX_NOTE_CHARS + 1);
    }
  });

  it("rejects the same text captured twice inside the duplicate window", () => {
    const clock = new FrozenClock(5_000);
    const policy = new CapturePolicy(clock);
    expect(policy.prepare("hello").ok).toBe(true);
    expect(policy.prepare("hello")).toEqual({ ok: false, reason: "duplicate" });
    clock.advance(2_001);
    expect(policy.prepare("hello").ok).toBe(true);
  });

  it("allows a different capture immediately", () => {
    const policy = new CapturePolicy(new FrozenClock(1_000));
    expect(policy.prepare("one").ok).toBe(true);
    expect(policy.prepare("two").ok).toBe(true);
  });
});
