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
    // Preprocess: convert any HTML tables embedded in the IR-rendered Markdown
    // into Markdown tables before handing the text to Pandoc, so Pandoc does not
    // drop or misrender them (HTML tables are not part of Pandoc's Markdown
    // table grammar and would otherwise be stripped).
    const converted = convertHtmlTablesToMarkdown(mdStr);
    // TODO(bidi/fonts): RTL paragraph direction (w:bidi) and Arabic complex-script
    // fonts (cs/hAnsi/eastAsia) must be configured in the Pandoc template /
    // reference doc (--reference-doc / --template), NOT re-implemented as manual
    // docx post-processing here. The IR->Pandoc path stays authoritative; only
    // preprocessing happens above. Pass template/referenceDoc via pandoc options
    // when wiring a custom Arabic template.
    return pandocDocx({ markdown: converted, cleaned: converted });
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

/**
 * Splits a mixed Arabic/Latin/digit string into runs of uniform script.
 * Ported from the converter project's `segmentByScript` helper. Kept here for
 * callers that need run-level segmentation before Pandoc; the IR-driven path
 * above is unaffected and continues to render Markdown first.
 */
export interface ScriptSegment {
  text: string;
  isArabic: boolean;
}

const isArabicSegment = (text: string): boolean =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);

export function segmentByScript(text: string): ScriptSegment[] {
  if (!text) return [];
  const segments: ScriptSegment[] = [];
  let buffer = "";
  let bufferIsArabic: boolean | null = null;

  for (const char of text) {
    const charIsArabic = isArabicSegment(char);
    const isNeutralOrLatin = /[0-9A-Za-z\s.,:;!?()[\]{}'"«»\-–—/\\%*+=<>@#&_]/.test(char);

    let effective = charIsArabic;
    if (!charIsArabic && isNeutralOrLatin && bufferIsArabic !== null) {
      effective = bufferIsArabic;
    }

    if (bufferIsArabic === null) {
      bufferIsArabic = effective;
      buffer = char;
      continue;
    }

    if (effective === bufferIsArabic) {
      buffer += char;
    } else {
      segments.push({ text: buffer, isArabic: bufferIsArabic });
      buffer = char;
      bufferIsArabic = effective;
    }
  }

  if (buffer) segments.push({ text: buffer, isArabic: bufferIsArabic === true });
  return segments;
}

/**
 * Converts any HTML tables (`<table>...</table>`) embedded in OCR/AI/IR output
 * into clean Markdown (GFM) tables, so they survive the IR -> Pandoc path.
 *
 * Ported from the converter project's `convertHtmlTablesToMarkdown` helper.
 * Exported for direct unit testing of the preprocessing step.
 */
export function convertHtmlTablesToMarkdown(text: string): string {
  if (!text || !text.includes("<table")) return text;
  return text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];
    const trMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (!trMatches) return "";
    for (const tr of trMatches) {
      const cells: string[] = [];
      const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
      if (cellMatches) {
        for (const cell of cellMatches) {
          let cellText = cell.replace(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi, "$1");
          // Strip script/style blocks until stable (nested tags can't survive),
          // then strip any remaining tags and escape residual angle brackets.
          let previous: string;
          do {
            previous = cellText;
            // codeql[js/incomplete-multi-character-sanitization]
            cellText = cellText
              .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, "")
              .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, "")
              .replace(/<[^>]+>/g, "");
          } while (cellText !== previous);
          cellText = cellText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\r?\n+/g, " ")
            .trim();
          cells.push(cellText);
        }
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    if (rows.length === 0) return "";
    const maxCols = Math.max(...rows.map((r) => r.length));
    const padRows = rows.map((r) => {
      const copy = [...r];
      while (copy.length < maxCols) copy.push("");
      return copy;
    });
    const header = padRows[0];
    if (!header) return "";
    const sep = Array(maxCols).fill("---");
    const mdLines = [
      `| ${header.join(" | ")} |`,
      `| ${sep.join(" | ")} |`,
      ...padRows.slice(1).map((r) => `| ${r.join(" | ")} |`),
    ];
    return "\n\n" + mdLines.join("\n") + "\n\n";
  });
}
