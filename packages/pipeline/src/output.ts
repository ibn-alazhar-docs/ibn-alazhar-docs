import { analyzeText, cleanArabicText } from "./text";
import type { CleanedText } from "./types";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake/js/Printer").default;
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import path from "path";

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

export interface GenerateMdOptions {
  title?: string;
  includeMetadata?: boolean;
  pageSeparator?: string;
  pageCount?: number;
}

export function generateMarkdown(rawText: string, options: GenerateMdOptions = {}): CleanedText {
  const cleanedTextContent = cleanArabicText(rawText);
  const analysis = analyzeText(cleanedTextContent, options.pageCount);

  const mdLines: string[] = [];

  if (options.includeMetadata === true && analysis.wordCount > 0) {
    mdLines.push("---");
    mdLines.push(`generated: ${new Date().toISOString()}`);
    mdLines.push(`total_pages: ${analysis.pageCount}`);
    mdLines.push(`total_words: ${analysis.wordCount}`);
    mdLines.push(`total_headings: ${analysis.headingCount}`);
    mdLines.push(`headings_level1: ${analysis.level1HeadingCount}`);
    mdLines.push(`headings_level2: ${analysis.level2HeadingCount}`);
    mdLines.push(`headings_level3: ${analysis.level3HeadingCount}`);
    mdLines.push(`arabic_ratio: ${(analysis.arabicRatio * 100).toFixed(1)}%`);
    mdLines.push(`garbage_ratio: ${(analysis.garbageRatio * 100).toFixed(1)}%`);
    mdLines.push(`paragraphs: ${analysis.paragraphCount}`);
    mdLines.push(`quality_score: ${analysis.qualityScore}`);
    mdLines.push("---");
    mdLines.push("");
  }

  if (options.title) {
    mdLines.push(`# ${options.title}`);
    mdLines.push("");
  }

  const lines = cleanedTextContent.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    const trimmed = line.trim();

    if (!trimmed) {
      mdLines.push("");
      i++;
      continue;
    }

    // Preserve existing markdown headings
    if (/^#{1,6}\s/.test(trimmed)) {
      mdLines.push("");
      mdLines.push(trimmed);
      mdLines.push("");
      i++;
      continue;
    }

    // Detect table rows (lines with |)
    if (trimmed.includes("|") && trimmed.split("|").length > 2) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const tl = lines[i];
        if (!tl || !tl.trim().includes("|")) break;
        tableLines.push(tl.trim());
        i++;
      }
      // Ensure proper markdown table format
      if (tableLines.length >= 1) {
        mdLines.push("");
        for (const tl of tableLines) {
          // Skip separator rows that are just |---|---|
          if (/^[\s|:-]+$/.test(tl)) {
            const cols = tl.split("|").filter((c) => c.trim()).length;
            mdLines.push("| " + Array(cols).fill("---").join(" | ") + " |");
          } else {
            mdLines.push(tl);
          }
        }
        mdLines.push("");
      }
      continue;
    }

    // Detect blockquotes
    if (/^[>\u00BB\u203B]\s/.test(trimmed)) {
      mdLines.push(trimmed.replace(/^[>\u00BB\u203B]\s/, "> "));
      i++;
      continue;
    }

    // Detect bullet list items
    if (/^[•·\-\u2013\u2014*]\s/.test(trimmed)) {
      mdLines.push(trimmed.replace(/^[•·\-\u2013\u2014*]\s/, "- "));
      i++;
      continue;
    }

    // Detect numbered lists
    if (/^\d+[.)]\s/.test(trimmed)) {
      mdLines.push(trimmed);
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (i < lines.length) {
      const currentLine = lines[i];
      if (!currentLine) break;
      const currentTrimmed = currentLine.trim();
      if (
        !currentTrimmed ||
        /^#{1,6}\s/.test(currentTrimmed) ||
        (currentTrimmed.includes("|") && currentTrimmed.split("|").length > 2) ||
        /^[>\u00BB\u203B]\s/.test(currentTrimmed) ||
        /^[•·\-\u2013\u2014*]\s/.test(currentTrimmed) ||
        /^\d+[.)]\s/.test(currentTrimmed)
      ) {
        break;
      }
      paraLines.push(currentTrimmed);
      i++;
    }
    if (paraLines.length === 0) {
      // If we didn't process any paragraph lines, we must increment i to avoid an infinite loop
      // This handles cases where a line didn't match table logic but broke paragraph logic
      i++;
    } else {
      mdLines.push(paraLines.join("\n"));
    }
  }

  const markdown = mdLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    raw: rawText,
    cleaned: cleanedTextContent,
    markdown,
    metadata: {
      pageCount: analysis.pageCount,
      headingCount: analysis.headingCount,
      wordCount: analysis.wordCount,
      charCount: analysis.charCount,
      confidence: analysis.arabicRatio,
      garbageRatio: analysis.garbageRatio,
      htmlFragmentCount: analysis.htmlFragmentCount,
      paragraphCount: analysis.paragraphCount,
      qualityScore: analysis.qualityScore,
    },
  };
}

export function generateTxt(cleanedText: CleanedText, includeMetadata: boolean = false): string {
  const parts: string[] = [];

  if (includeMetadata) {
    parts.push("=".repeat(60));
    parts.push(`Ibn Al-Azhar Docs — OCR Export`);
    parts.push(`Generated: ${new Date().toISOString()}`);
    parts.push(`Pages: ${cleanedText.metadata.pageCount}`);
    parts.push(`Words: ${cleanedText.metadata.wordCount}`);
    parts.push(`Confidence: ${(cleanedText.metadata.confidence * 100).toFixed(1)}%`);
    parts.push("=".repeat(60));
    parts.push("");
  }

  // Convert markdown to plain text
  const plainText = cleanedText.markdown
    .replace(/^---\n[\s\S]*?\n---\n/gm, "")
    .replace(/^### /gm, "")
    .replace(/^## /gm, "")
    .replace(/^# /gm, "")
    .replace(/^- /gm, "• ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  parts.push(plainText);
  return parts.join("\n");
}

export function generateJson(cleanedText: CleanedText, sourceFileName?: string): string {
  return JSON.stringify(
    {
      source: sourceFileName ?? "unknown",
      generatedAt: new Date().toISOString(),
      metadata: cleanedText.metadata,
      content: {
        raw: cleanedText.raw,
        cleaned: cleanedText.cleaned,
      },
      markdown: cleanedText.markdown,
    },
    null,
    2,
  );
}

export async function generateDocx(cleanedText: CleanedText): Promise<Buffer> {
  const markdownText = cleanedText.markdown || cleanedText.cleaned;
  const tempDir = await mkdtemp(path.join(tmpdir(), "pandoc-"));
  try {
    const mdPath = path.join(tempDir, "input.md");
    const docxPath = path.join(tempDir, "output.docx");

    await writeFile(mdPath, markdownText, "utf8");

    await execFileAsync(
      "pandoc",
      [mdPath, "-o", docxPath, "-M", "dir=rtl", "-M", "title=Document"],
      { timeout: 30000 },
    );

    return await readFile(docxPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function generateEpub(cleanedText: CleanedText): Promise<Buffer> {
  const markdownText = cleanedText.markdown || cleanedText.cleaned;
  const tempDir = await mkdtemp(path.join(tmpdir(), "pandoc-"));
  try {
    const mdPath = path.join(tempDir, "input.md");
    const epubPath = path.join(tempDir, "output.epub");

    await writeFile(mdPath, markdownText, "utf8");

    await execFileAsync("pandoc", [
      mdPath,
      "-o",
      epubPath,
      "-M",
      "dir=rtl",
      "-M",
      "title=Document",
    ]);

    return await readFile(epubPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function generatePdf(
  cleanedText: CleanedText,
  options: { fontSize?: number; watermark?: string } = {},
): Promise<Buffer> {
  const fonts = {
    Cairo: {
      normal: require.resolve("@fontsource/cairo/files/cairo-arabic-400-normal.woff"),
      bold: require.resolve("@fontsource/cairo/files/cairo-arabic-700-normal.woff"),
      italics: require.resolve("@fontsource/cairo/files/cairo-arabic-400-normal.woff"),
      bolditalics: require.resolve("@fontsource/cairo/files/cairo-arabic-700-normal.woff"),
    },
  };

  const Printer = PdfPrinter as unknown as new (fonts: Record<string, Record<string, string>>) => {
    createPdfKitDocument: (docDefinition: TDocumentDefinitions) => {
      on: (event: string, callback: (chunk: Buffer) => void) => void;
      end: () => void;
    };
  };
  const printer = new Printer(fonts);

  const markdownText = cleanedText.markdown || cleanedText.cleaned;
  const blocks = markdownText.split("\n\n").filter(Boolean);

  const content: Content[] = [];

  for (const block of blocks) {
    if (!block.trim()) continue;

    if (block.trim().startsWith("#")) {
      const level = block.match(/^#+/)?.[0]?.length ?? 1;
      const cleanText = block.replace(/^#+\s*/, "");
      const fontSize = 24 - level * 2; // Simple scaling

      content.push({
        text: cleanText,
        fontSize: Math.max(12, fontSize),
        bold: true,
        margin: [0, 10, 0, 5],
        alignment: "right",
      });
    } else {
      content.push({
        text: block,
        fontSize: options.fontSize || 14,
        margin: [0, 0, 0, 10],
        alignment: "right",
      });
    }
  }

  const docDefinition: TDocumentDefinitions = {
    content: (content.length > 0 ? content : [{ text: "" }]) as Content,
    defaultStyle: {
      font: "Cairo",
      fontSize: options.fontSize || 14,
      alignment: "right",
    },
  };

  if (options.watermark) {
    docDefinition.watermark = {
      text: options.watermark,
      color: "gray",
      opacity: 0.3,
      bold: true,
      italics: false,
    };
  }

  const pdfDoc = await printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}
