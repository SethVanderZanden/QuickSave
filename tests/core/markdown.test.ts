import { markdownToPlain, parseInlineMarkdown, splitPreview } from "@/core/markdown";

describe("parseInlineMarkdown", () => {
  it("parses bold, italic, strike, and code without underscore emphasis", () => {
    const nodes = parseInlineMarkdown("**bold** *em* ~~no~~ `code` snake_case");
    expect(nodes).toEqual([
      { type: "strong", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " " },
      { type: "em", children: [{ type: "text", value: "em" }] },
      { type: "text", value: " " },
      { type: "strike", children: [{ type: "text", value: "no" }] },
      { type: "text", value: " " },
      { type: "code", value: "code" },
      { type: "text", value: " snake_case" },
    ]);
  });

  it("does not treat __dunder__ as emphasis", () => {
    const nodes = parseInlineMarkdown("call __init__ please");
    expect(nodes).toEqual([{ type: "text", value: "call __init__ please" }]);
  });

  it("extracts http(s) links", () => {
    const nodes = parseInlineMarkdown("see https://shadcn.com/copper for the original.");
    expect(nodes.some((node) => node.type === "link")).toBe(true);
  });

  it("round-trips to plain text", () => {
    expect(markdownToPlain("**Keep** this `snippet`")).toBe("Keep this snippet");
  });

  it("splits long notes for collapsed preview", () => {
    const body = ["one", "two", "three", "four", "five"].join("\n");
    const split = splitPreview(body, 4);
    expect(split.overflow).toBe(true);
    expect(split.preview).toBe("one\ntwo\nthree\nfour");
    expect(split.rest).toBe("five");
  });
});
