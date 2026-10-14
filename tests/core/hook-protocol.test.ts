import { isSafeExternalUrl, parseHookLine } from "@/core/hook-protocol";

describe("hook protocol", () => {
  it("accepts only the three shift-hook verbs", () => {
    expect(parseHookLine("CAPTURE\n")).toBe("capture");
    expect(parseHookLine(" toggle ")).toBe("toggle");
    expect(parseHookLine("sketch")).toBe("sketch");
    expect(parseHookLine("keydown a")).toBeNull();
    expect(parseHookLine("")).toBeNull();
  });

  it("allows only http(s) URLs", () => {
    expect(isSafeExternalUrl("https://shadcn.com/copper")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
  });
});
