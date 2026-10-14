export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "strike"; children: InlineNode[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; value: string };

const URL_RE = /https?:\/\/[^\s<]+[^<>\s.,;:!?'")\]]/g;

export function parseInlineMarkdown(input: string): InlineNode[] {
  return parseDelimited(input);
}

function parseDelimited(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;

  while (i < input.length) {
    const rest = input.slice(i);

    if (rest.startsWith("`")) {
      const end = input.indexOf("`", i + 1);
      if (end !== -1) {
        nodes.push({ type: "code", value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    const pair = matchPair(input, i, "**") ?? matchPair(input, i, "~~");
    if (pair) {
      const inner = parseDelimited(input.slice(i + pair.delim.length, pair.end));
      nodes.push(
        pair.delim === "**"
          ? { type: "strong", children: inner }
          : { type: "strike", children: inner },
      );
      i = pair.end + pair.delim.length;
      continue;
    }

    if (input[i] === "*" && input[i + 1] !== "*" && input[i + 1] !== " ") {
      const end = findSingleStar(input, i + 1);
      if (end !== -1) {
        nodes.push({
          type: "em",
          children: parseDelimited(input.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }

    const nextSpecial = nextMarkupIndex(input, i);
    const chunk = input.slice(i, nextSpecial);
    pushPlain(nodes, chunk);
    if (nextSpecial === input.length) break;
    if (nextSpecial === i) {
      pushPlain(nodes, input[i] ?? "");
      i += 1;
      continue;
    }
    i = nextSpecial;
  }

  return nodes;
}

function matchPair(
  input: string,
  start: number,
  delim: string,
): { delim: string; end: number } | null {
  if (!input.startsWith(delim, start)) return null;
  const end = input.indexOf(delim, start + delim.length);
  if (end === -1 || end === start + delim.length) return null;
  return { delim, end };
}

function findSingleStar(input: string, from: number): number {
  for (let i = from; i < input.length; i += 1) {
    if (input[i] === "*" && input[i - 1] !== "*" && input[i + 1] !== "*") {
      return i;
    }
  }
  return -1;
}

function nextMarkupIndex(input: string, from: number): number {
  for (let i = from; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "`" || ch === "*" || (ch === "~" && input[i + 1] === "~")) {
      return i;
    }
  }
  return input.length;
}

function pushPlain(nodes: InlineNode[], chunk: string): void {
  if (!chunk) return;
  URL_RE.lastIndex = 0;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_RE.exec(chunk))) {
    if (match.index > last) {
      nodes.push({ type: "text", value: chunk.slice(last, match.index) });
    }
    const href = match[0];
    nodes.push({ type: "link", href, value: href });
    last = match.index + href.length;
  }
  if (last < chunk.length) {
    nodes.push({ type: "text", value: chunk.slice(last) });
  }
}

export function markdownToPlain(input: string): string {
  return input
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

export function splitPreview(body: string, maxLines = 4): {
  preview: string;
  rest: string;
  overflow: boolean;
} {
  const lines = body.split("\n");
  if (lines.length <= maxLines && body.length <= 280) {
    return { preview: body, rest: "", overflow: false };
  }
  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  const rest = lines.slice(maxLines).join("\n");
  return { preview, rest, overflow: rest.length > 0 || body.length > 280 };
}
