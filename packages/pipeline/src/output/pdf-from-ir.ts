import type { DocumentIR } from "@ibn-al-azhar-docs/shared";
import type { CleanedText } from "../types";
import { FormatGenerator, GeneratorOptions } from "./generator-base";
import { MarkdownGenerator } from "./markdown-generator";
import { generatePdf } from "./pdf";
import type { PageGeometry } from "./page-geometry";

function markdownToCleanedText(markdown: string): CleanedText {
  return {
    raw: markdown,
    cleaned: markdown,
    markdown,
    metadata: {
      pageCount: 1,
      headingCount: 0,
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
      charCount: markdown.length,
      confidence: 1,
      garbageRatio: 0,
      htmlFragmentCount: 0,
      paragraphCount: 0,
      qualityScore: 1,
    },
  };
}

/**
 * PDF generator driven by the IR. The IR is rendered to Markdown (which already
 * encodes heading hierarchy and lists) and that Markdown becomes semantic HTML
 * laid out by WeasyPrint, so structure, Arabic shaping and RTL direction all
 * survive to the page (Requirement 1.7, 2.4).
 */
export class PdfGenerator implements FormatGenerator {
  private markdown = new MarkdownGenerator();

  async generate(
    ir: DocumentIR,
    options?: GeneratorOptions & {
      fontSize?: number;
      watermark?: string;
      rtl?: boolean;
      geometry?: PageGeometry;
    },
  ): Promise<Buffer> {
    const md = await this.markdown.generate(ir, options);
    const mdStr = md.toString("utf-8");
    return generatePdf(markdownToCleanedText(mdStr), {
      fontSize: options?.fontSize,
      watermark: options?.watermark,
      rtl: options?.rtl,
      geometry: options?.geometry,
    });
  }

  getMimeType(): string {
    return "application/pdf";
  }

  getExtension(): string {
    return ".pdf";
  }
}

export function generatePdfFromIR(
  ir: DocumentIR,
  options?: GeneratorOptions & {
    fontSize?: number;
    watermark?: string;
    /** هندسةُ صفحات الأصل؛ غائبةً يبقى `@page` كما كان: A4 بهامش ٢ سم. */
    geometry?: PageGeometry;
  },
): Promise<Buffer> {
  return new PdfGenerator().generate(ir, options);
}
