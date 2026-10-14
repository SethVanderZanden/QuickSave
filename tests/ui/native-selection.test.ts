import { nativeSelectedText } from "@/ui/lib/native-selection";

describe("nativeSelectedText", () => {
  it("returns the selected slice of an input", () => {
    const input = document.createElement("input");
    input.value = "hello world";
    input.selectionStart = 6;
    input.selectionEnd = 11;
    expect(nativeSelectedText(input)).toBe("world");
  });

  it("returns empty when a textarea has a caret but no range", () => {
    const area = document.createElement("textarea");
    area.value = "prompt";
    area.selectionStart = 6;
    area.selectionEnd = 6;
    expect(nativeSelectedText(area)).toBe("");
  });
});
