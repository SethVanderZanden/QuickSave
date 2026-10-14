import { isSafeExternalUrl } from "@/core/hook-protocol";
import { parseInlineMarkdown, type InlineNode } from "@/core/markdown";

export function MarkdownText({ text }: { text: string }) {
  return (
    <span className="md whitespace-pre-wrap break-words">
      {text.split("\n").map((line, index, lines) => (
        <span key={index}>
          {parseInlineMarkdown(line).map((node, nodeIndex) => (
            <Inline key={nodeIndex} node={node} />
          ))}
          {index < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </span>
  );
}

function Inline({ node }: { node: InlineNode }) {
  switch (node.type) {
    case "text":
      return <>{node.value}</>;
    case "code":
      return <code>{node.value}</code>;
    case "strong":
      return (
        <strong>
          {node.children.map((child, index) => (
            <Inline key={index} node={child} />
          ))}
        </strong>
      );
    case "em":
      return (
        <em>
          {node.children.map((child, index) => (
            <Inline key={index} node={child} />
          ))}
        </em>
      );
    case "strike":
      return (
        <s>
          {node.children.map((child, index) => (
            <Inline key={index} node={child} />
          ))}
        </s>
      );
    case "link":
      if (!isSafeExternalUrl(node.href)) return <>{node.value}</>;
      return (
        <a href={node.href} target="_blank" rel="noreferrer noopener">
          {node.value}
        </a>
      );
    default:
      return null;
  }
}
