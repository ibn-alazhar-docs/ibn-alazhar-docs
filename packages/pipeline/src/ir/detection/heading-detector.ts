import type { HeadingNode } from "@ibn-al-azhar-docs/shared";
import type { RawBlock } from "../converter-base";
import { fontSizeToHeadingLevel } from "../utils";

/**
 * Detect whether a block is a heading and return its level.
 *
 * Two signals are supported (the IR pipeline runs on both markdown OCR output
 * and raw layout metadata when available):
 *  1. Markdown ATX syntax (`#`, `##`, ... `######`).
 *  2. Font metrics: fontSize > avg * 1.3 OR fontWeight > 600.
 *
 * @returns { level: number; title: string } or null when not a heading.
 */
export function detectHeading(
  block: RawBlock,
  avgFontSize: number,
): { level: 1 | 2 | 3 | 4 | 5 | 6; title: string } | null {
  const trimmed = block.text.trim();

  const atx = trimmed.match(/^(#{1,6})\s+(.*)$/);
  if (atx && atx[1] && atx[2] !== undefined) {
    const level = Math.min(6, atx[1].length) as 1 | 2 | 3 | 4 | 5 | 6;
    return { level, title: atx[2].trim() };
  }

  const size = block.fontSize;
  const weight = block.fontWeight ?? 400;
  const ratio = size !== undefined ? size / Math.max(avgFontSize, 1) : 1;

  if ((size !== undefined && ratio > 1.3) || weight > 600) {
    const level =
      size !== undefined
        ? fontSizeToHeadingLevel(size, avgFontSize)
        : ((weight >= 800 ? 1 : 2) as 1 | 2 | 3 | 4 | 5 | 6);
    return { level, title: trimmed };
  }

  return null;
}

export function headingNode(level: 1 | 2 | 3 | 4 | 5 | 6, title: string): HeadingNode {
  return {
    type: "heading",
    level,
    content: [{ type: "text", content: title }],
  };
}
