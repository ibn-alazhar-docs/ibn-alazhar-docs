import type { DocumentIR } from "@ibn-al-azhar-docs/shared";
import { FormatGenerator, GeneratorOptions } from "./generator-base";
import { MarkdownGenerator } from "./markdown-generator";
import { generateDocx as pandocDocx, generateEpub as pandocEpub } from "./pandoc";

/**
 * DOCX generator driven by the IR. The IR is rendered to structured Markdown
 * (headings become `#` ATX headings, lists become `-`/`1.` markers) and then
 * converted to a styled .docx via Pandoc, preserving the document hierarchy
 * (Requirement 1.1, 1.4, 1.6).
 */
export class DocxGenerator implements FormatGenerator {
  private markdown = new MarkdownGenerator();

  async generate(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> {
    const md = await this.markdown.generate(ir, options);
    const mdStr = md.toString("utf-8");
    return pandocDocx({ markdown: mdStr, cleaned: mdStr });
  }

  getMimeType(): string {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  getExtension(): string {
    return ".docx";
  }
}

export class EpubGenerator implements FormatGenerator {
  private markdown = new MarkdownGenerator();

  async generate(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> {
    const md = await this.markdown.generate(ir, options);
    return pandocEpub({ markdown: md.toString("utf-8") });
  }

  getMimeType(): string {
    return "application/epub+zip";
  }

  getExtension(): string {
    return ".epub";
  }
}

export function generateDocxFromIR(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> {
  return new DocxGenerator().generate(ir, options);
}

export function generateEpubFromIR(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> {
  return new EpubGenerator().generate(ir, options);
}
