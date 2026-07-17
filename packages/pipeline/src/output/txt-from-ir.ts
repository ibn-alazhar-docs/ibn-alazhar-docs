import type { DocumentIR, BlockNode, InlineNode } from "@ibn-al-azhar-docs/shared";
import { FormatGenerator, GeneratorOptions } from "./generator-base";

function inlineToPlain(nodes: InlineNode[]): string {
  return nodes.map((n) => (n.type === "text" ? n.content : "")).join("");
}

function blockToTxt(block: BlockNode, depth = 0): string {
  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.level)} ${inlineToPlain(block.content)}`;
    case "paragraph":
      return inlineToPlain(block.content);
    case "list": {
      const indent = "  ".repeat(depth);
      return block.items
        .map((item, idx) => {
          const marker = block.ordered
            ? `${block.startNumber ? block.startNumber + idx : idx + 1}.`
            : "•";
          const text = inlineToPlain(item.content);
          const children = item.children?.length
            ? "\n" + item.children.map((c) => blockToTxt(c, depth + 1)).join("\n")
            : "";
          return `${indent}${marker} ${text}${children}`;
        })
        .join("\n");
    }
    case "code-block":
      return block.content;
    default:
      return "";
  }
}

/**
 * Semantic plain-text renderer. Unlike the legacy generator that strips all
 * structure, this keeps headings (`#`) and list indentation so TXT exports
 * remain navigable (Requirement 1.5 / 10.5).
 */
export class TxtGenerator implements FormatGenerator {
  generate(ir: DocumentIR, _options?: GeneratorOptions): Buffer {
    const text = ir.content
      .map((b) => blockToTxt(b))
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return Buffer.from(text, "utf-8");
  }

  getMimeType(): string {
    return "text/plain";
  }

  getExtension(): string {
    return ".txt";
  }
}

export function generateTxtFromIR(ir: DocumentIR): Buffer {
  return new TxtGenerator().generate(ir);
}
