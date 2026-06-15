import { analyzeText, cleanArabicText } from "./text";
import type { CleanedText } from "./types";

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

  if (options.includeMetadata !== false && analysis.wordCount > 0) {
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
    if (!line) { i++; continue; }
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
        currentTrimmed.includes("|") ||
        /^[>\u00BB\u203B]\s/.test(currentTrimmed) ||
        /^[•·\-\u2013\u2014*]\s/.test(currentTrimmed) ||
        /^\d+[.)]\s/.test(currentTrimmed)
      ) {
        break;
      }
      paraLines.push(currentTrimmed);
      i++;
    }
    if (paraLines.length > 0) {
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

export function generateTxt(cleanedText: CleanedText, includeMetadata: boolean = true): string {
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

export async function generateDocx(_cleanedText: CleanedText): Promise<Buffer> {
  throw new Error(
    "DOCX_EXPORT_NOT_AVAILABLE: Install 'docx' package (npm install docx) to enable DOCX generation",
  );
}
