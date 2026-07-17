import type { ParagraphNode } from "@ibn-al-azhar-docs/shared";
import type { RawBlock } from "../converter-base";
import { parseInline, normalizeInline } from "../utils";

export interface ParagraphDetectionResult {
  node: ParagraphNode;
  consumed: number;
}

/**
 * Group consecutive `count` raw blocks (already filtered to be non-heading,
 * non-list, non-empty) into a single paragraph, preserving inline emphasis.
 * Alignment is inferred from the first block's text direction heuristic.
 */
export function detectParagraph(blocks: RawBlock[], count: number): ParagraphDetectionResult {
  const slice = blocks.slice(0, count);
  const texts = slice.map((b) => b.text.trim());

  const inline = normalizeInline(texts.flatMap((t) => parseInline(t)));

  const alignment = inferAlignment(texts.join(" "));

  return {
    node: {
      type: "paragraph",
      content: inline,
      ...(alignment ? { alignment } : {}),
    },
    consumed: count,
  };
}

export function inferAlignment(text: string): ParagraphNode["alignment"] {
  if (!text) return undefined;
  const arabic = (text.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-ﹿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  // Treat predominantly Arabic text as right-aligned for RTL documents.
  if (arabic >= latin && arabic > 0) return "right";
  if (latin > arabic) return "left";
  return undefined;
}
