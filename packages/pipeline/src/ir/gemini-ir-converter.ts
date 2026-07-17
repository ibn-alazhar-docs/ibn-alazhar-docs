import type { DocumentIR, BlockNode } from "@ibn-al-azhar-docs/shared";
import { buildMetadata, type IRConverter, type RawBlock } from "./converter-base";
import { estimateAverageFontSize, indentationOf, parseInline, normalizeInline } from "./utils";
import { detectHeading } from "./detection/heading-detector";
import { detectList, isListMarker } from "./detection/list-detector";
import { inferAlignment } from "./detection/paragraph-detector";

/**
 * Converts markdown-flavoured OCR output (the real output of the Gemini/Tesseract
 * providers in this platform) into the canonical `DocumentIR` structure.
 *
 * The converter is line-oriented and tolerant: it never throws on malformed
 * input, falling back to paragraph blocks so a document can always be exported.
 */
export class MarkdownIRConverter implements IRConverter {
  convert(source: string, metadata: Partial<DocumentIR["metadata"]> = {}): DocumentIR {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const blocks: RawBlock[] = lines.map((line) => ({
      text: line,
      indentation: indentationOf(line),
    }));
    const avgFontSize = estimateAverageFontSize(blocks);

    const content = this.detectStructure(blocks, avgFontSize);
    const ir: DocumentIR = {
      version: "1.0",
      metadata: buildMetadata(metadata),
      content,
    };
    return ir;
  }

  private detectStructure(blocks: RawBlock[], avgFontSize: number): BlockNode[] {
    const result: BlockNode[] = [];
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];
      const text = block.text.trim();

      if (text === "") {
        i++;
        continue;
      }

      // Code fence
      if (text.startsWith("```")) {
        const captured: string[] = [];
        i++;
        while (i < blocks.length && !blocks[i].text.trim().startsWith("```")) {
          captured.push(blocks[i].text);
          i++;
        }
        i++; // skip closing fence
        result.push({ type: "code-block", language: undefined, content: captured.join("\n") });
        continue;
      }

      // Heading (ATX or font metrics)
      const heading = detectHeading(block, avgFontSize);
      if (heading) {
        result.push({
          type: "heading",
          level: heading.level,
          content: [{ type: "text", content: heading.title }],
        });
        i++;
        continue;
      }

      // Horizontal rule separates sections — skip
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
        i++;
        continue;
      }

      // List (possibly multi-line, possibly nested via indentation)
      if (isListMarker(text) || this.isIndentedListContinuation(blocks, i)) {
        const remainingLines = blocks.slice(i).map((b) => b.text);
        const detection = detectList(remainingLines);
        if (detection && detection.node.items.length > 0) {
          result.push(detection.node);
          i += detection.consumed;
          continue;
        }
      }

      // Table block (markdown pipe table)
      if (text.includes("|") && this.looksLikeTable(blocks, i)) {
        const tableLines: string[] = [];
        while (i < blocks.length && blocks[i].text.trim().includes("|")) {
          tableLines.push(blocks[i].text.trim());
          i++;
        }
        result.push(this.tableToParagraph(tableLines));
        continue;
      }

      // Default: paragraph — consume this and following non-structural lines
      const { node, consumed } = this.gatherParagraph(blocks, i);
      result.push(node);
      i += consumed;
    }

    return result;
  }

  private isIndentedListContinuation(blocks: RawBlock[], i: number): boolean {
    if (i === 0) return false;
    const prev = blocks[i - 1];
    return indentationOf(blocks[i].text) > indentationOf(prev.text) && isListMarker(prev.text);
  }

  private looksLikeTable(blocks: RawBlock[], i: number): boolean {
    const line = blocks[i].text.trim();
    const cells = line.split("|").filter((c) => c.trim()).length;
    if (cells < 2) return false;
    const next = blocks[i + 1]?.text.trim();
    return next ? /^\s*\|?[\s:|-]+\|?\s*$/.test(next) : cells >= 2;
  }

  private tableToParagraph(tableLines: string[]): BlockNode {
    const rows = tableLines
      .filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
      .map((l) =>
        l
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim())
          .join(" | "),
      );
    return {
      type: "paragraph",
      content: [{ type: "text", content: rows.join("\n") }],
    };
  }

  private gatherParagraph(
    blocks: RawBlock[],
    start: number,
  ): { node: BlockNode; consumed: number } {
    const parts: string[] = [];
    let i = start;
    while (i < blocks.length) {
      const text = blocks[i].text.trim();
      if (text === "") break;
      if (detectHeading(blocks[i], estimateAverageFontSize(blocks))) break;
      if (isListMarker(text)) break;
      if (text.startsWith("#")) break;
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) break;
      if (text.includes("|") && this.looksLikeTable(blocks, i)) break;
      parts.push(text);
      i++;
    }
    const joined = parts.join("\n");
    const alignment = inferAlignment(joined);
    return {
      node: {
        type: "paragraph",
        content: normalizeInline(parseInline(joined)),
        ...(alignment ? { alignment } : {}),
      },
      consumed: Math.max(1, i - start),
    };
  }
}

export function convertMarkdownToIR(
  source: string,
  metadata: Partial<DocumentIR["metadata"]> = {},
): DocumentIR {
  return new MarkdownIRConverter().convert(source, metadata);
}
