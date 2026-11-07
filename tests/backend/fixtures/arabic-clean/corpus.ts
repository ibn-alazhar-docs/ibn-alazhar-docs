/**
 * Shared loader for the Arabic text-cleaning golden corpus (fix/pipeline-runtime-fixes).
 *
 * Every fixture lives next to this file as `<id>.txt`. Human-reviewable expectations
 * live as `<id>.<target>.expected.txt` and contain the exact output of the recorded
 * transformation (a single trailing newline is a file convention, not content).
 *
 * A golden is written only after its output has been read against the source and judged
 * CORRECT — never to freeze a bug. The citation, page-furniture, table and footnote
 * hazards that used to be left unpinned (they corrupted output) are fixed in
 * packages/pipeline/src/text/clean/** and now carry full-pipeline baselines; the ones
 * that are still wrong stay out of the goldens and are asserted red in
 * tests/backend/text-clean-defects.test.ts instead.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cleanArabicText,
  normalizeUnicode,
  normalizeArabicLetters,
  removeTashkeel,
  removeTatweel,
  applyQuranicFixes,
} from "@ibn-al-azhar-docs/pipeline/text";
import {
  normalizeDigits,
  normalizeWhitespace,
  removeBrokenHtml,
  removeAsciiNoise,
  normalizeArabicPunctuation,
  finalCleanup,
  reconstructArabicLines,
  detectArabicHeadings,
  removePageNoise,
  removeRepeatedTokens,
  removeGarbageSymbols,
  removeIsolatedFragments,
  collapseRepeatedWords,
  collapseRepeatedParagraphs,
} from "@ibn-al-azhar-docs/pipeline/text/clean/index";
import { EXAM_OPTIONS } from "@ibn-al-azhar-docs/pipeline/text/constants";

export type StageFn = (text: string) => string;

export const TARGETS: Record<string, StageFn> = {
  unicode: normalizeUnicode,
  "normalize-arabic": normalizeArabicLetters,
  "remove-tashkeel": removeTashkeel,
  "remove-tatweel": removeTatweel,
  digits: normalizeDigits,
  whitespace: normalizeWhitespace,
  html: removeBrokenHtml,
  "ascii-noise": removeAsciiNoise,
  punctuation: normalizeArabicPunctuation,
  "collapse-words": collapseRepeatedWords,
  "repeated-tokens": removeRepeatedTokens,
  "garbage-symbols": removeGarbageSymbols,
  "isolated-fragments": removeIsolatedFragments,
  "detect-headings": detectArabicHeadings,
  "reconstruct-lines": reconstructArabicLines,
  "page-noise": removePageNoise,
  "collapse-paragraphs": collapseRepeatedParagraphs,
  "final-cleanup": finalCleanup,
  "quranic-fixes": applyQuranicFixes,
  "pipeline-default": (text) => cleanArabicText(text),
  "pipeline-preserve": (text) => cleanArabicText(text, { normalizeArabic: false }),
  "pipeline-preserve-punct": (text) =>
    cleanArabicText(text, { normalizeArabic: false, normalizePunctuation: false }),
  "pipeline-exam": (text) => cleanArabicText(text, { ...EXAM_OPTIONS }),
};

export const FIXTURE_IDS = [
  "quran-ayah",
  "hadith-quotes",
  "page-noise-ascii",
  "page-noise-arabic-indic",
  "ocr-line-split",
  "heading-body",
  "table-mixed",
  "ocr-stutter",
  "tatweel-kashida",
  "orphan-diacritics",
  "mixed-latin",
  "footnotes-marginalia",
  "dupe-paragraph",
  "mojibake-ocr",
] as const;

export type FixtureId = (typeof FIXTURE_IDS)[number];

export function readFixture(id: FixtureId): string {
  return readFileSync(join(__dirname, `${id}.txt`), "utf8");
}

export function readExpected(id: FixtureId, target: string): string {
  const raw = readFileSync(join(__dirname, `${id}.${target}.expected.txt`), "utf8");
  return raw.endsWith("\n") ? raw.slice(0, -1) : raw;
}

/** Exact ﴿...﴾ citation spans found in a text, in order. */
export function quranicSpans(text: string): string[] {
  return text.match(/﴿[^﴾]*﴾/g) ?? [];
}

/**
 * Strict Arabic letters (excludes tatweel U+0640, tashkeel U+064B-U+065F/U+0670,
 * Quranic service marks, digits and punctuation). Used for the "letter count never
 * decreases outside documented noise removal" invariant — the canonical
 * countArabicLetters() block class would count diacritics/tatweel as letters.
 */
const STRICT_LETTERS = /[\u0621-\u063F\u0641-\u064A\u0671-\u06D3]/g;

export function countStrictArabicLetters(text: string): number {
  return (text.match(STRICT_LETTERS) ?? []).length;
}
