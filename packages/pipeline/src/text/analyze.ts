import {
  EXAM_QUESTION_PATTERN,
  EXAM_ANSWER_PATTERN,
  EXAM_CHOICE_PATTERN,
  EXAM_FILL_PATTERN,
  EXAM_MCQ_PATTERN,
} from "./constants";

export type DocumentType = "exam" | "general";

/**
 * Detect whether a raw OCR text is an exam / Q&A document.
 * Uses a simple scoring heuristic: count how many exam-specific
 * patterns appear in the first 3000 characters (fast, representative sample).
 */
export function detectDocumentType(text: string): DocumentType {
  const sample = text.slice(0, 3000);
  let score = 0;
  if (EXAM_QUESTION_PATTERN.test(sample)) score += 3;
  if (EXAM_ANSWER_PATTERN.test(sample)) score += 2;
  if (EXAM_CHOICE_PATTERN.test(sample)) score += 2;
  if (EXAM_FILL_PATTERN.test(sample)) score += 1;
  if (EXAM_MCQ_PATTERN.test(sample)) score += 2;
  // Count occurrence density: multiple question markers = strong signal
  // Support both س\d+ (Hindu-Arabic numerals) and س[\u0660-\u0669] (Arabic-Indic numerals)
  const qCount = (sample.match(/س\s*[\d\u0660-\u0669\u06F0-\u06F9]+/g) || []).length;
  if (qCount >= 3) score += 3;
  return score >= 4 ? "exam" : "general";
}

export interface TextAnalysis {
  pageCount: number;
  headingCount: number;
  level1HeadingCount: number;
  level2HeadingCount: number;
  level3HeadingCount: number;
  wordCount: number;
  charCount: number;
  arabicRatio: number;
  garbageRatio: number;
  htmlFragmentCount: number;
  paragraphCount: number;
  qualityScore: number;
}

export function analyzeText(text: string, knownPageCount?: number): TextAnalysis {
  const lines = text.split("\n").filter(Boolean);
  const level1Headings = lines.filter((l) => l.startsWith("# ")).length;
  const level2Headings = lines.filter((l) => l.startsWith("## ")).length;
  const level3Headings = lines.filter((l) => l.startsWith("### ")).length;
  const headings = level1Headings + level2Headings + level3Headings;
  const words = text.split(/\s+/).filter(Boolean);
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  const arabicRatio = totalChars > 0 ? arabicChars / totalChars : 0;

  const nonEmptyLines = lines.filter((l) => l.trim().length > 5);
  const garbageLines = nonEmptyLines.filter((l) => {
    const chars = l.replace(/\s/g, "");
    if (chars.length < 5) return false;
    const arabicCount = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    return arabicCount / chars.length < 0.3;
  });
  const garbageRatio = nonEmptyLines.length > 0 ? garbageLines.length / nonEmptyLines.length : 0;

  const htmlFragments = (text.match(/<[a-zA-Z][^>]{0,50}>/g) || []).length;

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 10);

  const arabicScore = Math.min(1, arabicRatio / 0.9) * 30;
  const headingScore = Math.min(1, headings / Math.max(1, Math.ceil(words.length / 500))) * 20;
  const garbagePenalty = garbageRatio * 20;
  const paragraphScore = paragraphs.length > 1 ? 15 : paragraphs.length === 1 ? 5 : 0;
  const sizeScore = words.length > 100 ? 15 : (words.length / 100) * 15;
  const qualityScore = Math.round(
    Math.max(
      0,
      Math.min(100, arabicScore + headingScore + paragraphScore + sizeScore - garbagePenalty),
    ),
  );

  return {
    pageCount:
      knownPageCount && knownPageCount > 0
        ? knownPageCount
        : Math.max(1, Math.ceil(words.length / 250)),
    headingCount: headings,
    level1HeadingCount: level1Headings,
    level2HeadingCount: level2Headings,
    level3HeadingCount: level3Headings,
    wordCount: words.length,
    charCount: text.length,
    arabicRatio: totalChars > 0 ? arabicChars / totalChars : 0,
    garbageRatio,
    htmlFragmentCount: htmlFragments,
    paragraphCount: paragraphs.length,
    qualityScore,
  };
}
