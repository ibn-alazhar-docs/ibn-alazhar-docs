import { analyzeText, cleanArabicText } from "../text";
import type { CleanedText } from "../types";

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

    if (/^#{1,6}\s/.test(trimmed)) {
      mdLines.push("");
      mdLines.push(trimmed);
      mdLines.push("");
      i++;
      continue;
    }

    if (trimmed.includes("|") && trimmed.split("|").length > 2) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const tl = lines[i];
        if (!tl || !tl.trim().includes("|")) break;
        tableLines.push(tl.trim());
        i++;
      }
      if (tableLines.length >= 1) {
        mdLines.push("");
        for (const tl of tableLines) {
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

    if (/^[>\u00BB\u203B]\s/.test(trimmed)) {
      mdLines.push(trimmed.replace(/^[>\u00BB\u203B]\s/, "> "));
      i++;
      continue;
    }

    if (/^[•·\-\u2013\u2014*]\s/.test(trimmed)) {
      mdLines.push(trimmed.replace(/^[•·\-\u2013\u2014*]\s/, "- "));
      i++;
      continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      mdLines.push(trimmed);
      i++;
      continue;
    }

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
