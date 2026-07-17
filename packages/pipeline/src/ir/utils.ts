import type { BlockNode, InlineNode, TextNode } from "@ibn-al-azhar-docs/shared";

/**
 * Lightweight emphasis parser. Splits a text run into inline nodes carrying
 * bold/italic/strikethrough flags. Handles nested `**bold**`, `*italic*`,
 * `~~strike~~` and mixed runs. Does not support overlapping emphasis.
 */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(makeText(text.slice(lastIndex, match.index)));
    }
    const raw = match[0];
    if (raw.startsWith("**")) {
      nodes.push(makeText(match[2] ?? "", { bold: true }));
    } else if (raw.startsWith("~~")) {
      nodes.push(makeText(match[4] ?? "", { strikethrough: true }));
    } else {
      nodes.push(makeText(match[3] ?? "", { italic: true }));
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(makeText(text.slice(lastIndex)));
  }

  return nodes.length > 0 ? nodes : [makeText("")];
}

export function makeText(
  content: string,
  emphasis?: TextNode["emphasis"],
  extra?: Partial<TextNode>,
): TextNode {
  return {
    type: "text",
    content,
    ...(emphasis ? { emphasis } : {}),
    ...extra,
  };
}

/**
 * Count leading spaces to approximate indentation level (4 spaces = 1 level).
 */
export function indentationOf(line: string): number {
  const leading = line.match(/^[\s]+/)?.[0] ?? "";
  const expanded = leading.replace(/\t/g, "    ");
  return Math.floor(expanded.length / 4);
}

/**
 * Estimate average font size across blocks for relative heading heuristics.
 * Without layout metadata we assume a normalized 12pt body; callers that have
 * real metrics can override via the RawBlock fontSize field.
 */
export function estimateAverageFontSize(blocks: { fontSize?: number }[]): number {
  const sizes = blocks.map((b) => b.fontSize).filter((s): s is number => typeof s === "number");
  if (sizes.length === 0) return 12;
  return sizes.reduce((a, b) => a + b, 0) / sizes.length;
}

/**
 * Map a relative font size to a heading level (1..6). Larger text => smaller
 * level number (higher prominence).
 */
export function fontSizeToHeadingLevel(fontSize: number, avg: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const ratio = fontSize / Math.max(avg, 1);
  if (ratio >= 2.0) return 1;
  if (ratio >= 1.6) return 2;
  if (ratio >= 1.3) return 3;
  if (ratio >= 1.2) return 4;
  if (ratio >= 1.1) return 5;
  return 6;
}

/**
 * Merge consecutive inline text nodes that share identical emphasis, keeping
 * the IR compact and export output clean.
 */
export function normalizeInline(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    const last = out[out.length - 1];
    if (
      last &&
      last.type === "text" &&
      node.type === "text" &&
      JSON.stringify(last.emphasis) === JSON.stringify(node.emphasis) &&
      last.fontSize === node.fontSize &&
      last.fontWeight === node.fontWeight
    ) {
      last.content += node.content;
    } else {
      out.push({ ...node });
    }
  }
  return out;
}

export function blockToText(block: BlockNode): string {
  switch (block.type) {
    case "heading":
      return inlineToPlain(block.content);
    case "paragraph":
      return inlineToPlain(block.content);
    case "list":
      return block.items.map((item) => inlineToPlain(item.content)).join(" / ");
    case "code-block":
      return block.content;
    default:
      return "";
  }
}

export function inlineToPlain(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === "text" ? n.content : ""))
    .join("")
    .trim();
}
