import { classifyWindowHotkey } from "@/core/window-hotkeys";

describe("classifyWindowHotkey", () => {
  it("treats Ctrl+C as copy even when Electron reports key C or code KeyC", () => {
    expect(classifyWindowHotkey({ type: "keyDown", key: "c", control: true, shift: false })).toBe(
      "copy-plain",
    );
    expect(classifyWindowHotkey({ type: "keyDown", key: "C", control: true, shift: false })).toBe(
      "copy-plain",
    );
    expect(classifyWindowHotkey({ type: "keyDown", key: "", code: "KeyC", control: true })).toBe(
      "copy-plain",
    );
    expect(classifyWindowHotkey({ type: "keydown", key: "c", ctrlKey: true })).toBe("copy-plain");
  });

  it("treats Ctrl+Shift+C as copy-as-list", () => {
    expect(
      classifyWindowHotkey({ type: "keyDown", key: "c", control: true, shift: true }),
    ).toBe("copy-list");
  });

  it("treats Ctrl+Q as quit", () => {
    expect(classifyWindowHotkey({ type: "keyDown", key: "q", control: true })).toBe("quit");
    expect(classifyWindowHotkey({ type: "keyDown", code: "KeyQ", meta: true })).toBe("quit");
  });

  it("ignores keyup, auto-repeat, and Alt chords", () => {
    expect(classifyWindowHotkey({ type: "keyUp", key: "c", control: true })).toBeNull();
    expect(classifyWindowHotkey({ type: "keyDown", key: "c", control: true, isAutoRepeat: true })).toBeNull();
    expect(classifyWindowHotkey({ type: "keyDown", key: "c", control: true, alt: true })).toBeNull();
  });
});
