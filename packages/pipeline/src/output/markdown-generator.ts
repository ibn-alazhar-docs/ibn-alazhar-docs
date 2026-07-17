import type { DocumentIR, BlockNode, InlineNode } from "@ibn-al-azhar-docs/shared";
import { FormatGenerator, GeneratorOptions } from "./generator-base";

function inlineToMarkdown(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "line-break") return "  \n";
      let text = node.content;
      const e = node.emphasis;
      if (e?.bold) text = `**${text}**`;
      if (e?.italic) text = `*${text}*`;
      if (e?.strikethrough) text = `~~${text}~~`;
      return text;
    })
    .join("");
}

function blockToMarkdown(block: BlockNode, depth = 0): string {
  switch (block.type) {
    case "heading": {
      const prefix = "#".repeat(block.level);
      return `${prefix} ${inlineToMarkdown(block.content)}`;
    }
    case "paragraph": {
      const text = inlineToMarkdown(block.content);
      return text;
    }
    case "list": {
      const indent = "  ".repeat(depth);
      return block.items
        .map((item, idx) => {
          const m = block.ordered
            ? `${block.startNumber ? block.startNumber + idx : idx + 1}.`
            : "-";
          const text = inlineToMarkdown(item.content);
          const children = item.children?.length
            ? "\n" + item.children.map((c) => blockToMarkdown(c, depth + 1)).join("\n")
            : "";
          return `${indent}${m} ${text}${children}`;
        })
        .join("\n");
    }
    case "code-block": {
      return "```\n" + block.content + "\n```";
    }
    default:
      return "";
  }
}

export class MarkdownGenerator implements FormatGenerator {
  async generate(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> {
    const parts: string[] = [];
    if (options?.title) {
      parts.push(`# ${options.title}`, "");
    }
    parts.push(...ir.content.map((b) => blockToMarkdown(b)));
    const markdown = parts
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return Buffer.from(markdown, "utf-8");
  }

  getMimeType(): string {
    return "text/markdown";
  }

  getExtension(): string {
    return ".md";
  }
}

export function generateMarkdownFromIR(
  ir: DocumentIR,
  options?: GeneratorOptions,
): Promise<Buffer> {
  return new MarkdownGenerator().generate(ir, options);
}
