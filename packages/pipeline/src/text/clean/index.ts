/**
 * واجهة التنظيف العربية الصغيرة: `cleanArabicText` + `enhanceArabicText`
 * ومراحل الدمج (unicode/numbers/whitespace/html/structure) مع تدقيقات
 * البنية والسياق. كل الأسماء المصدَّرة علنية — لا يُضاف سطح جديد دون تحديث
 * `text/index.ts` (يُستورد منه مباشرة؛ `clean.ts` حاجز توافق فقط).
 */
import { detectDocumentType } from "../analyze";

import {
  normalizeUnicode,
  normalizeArabicLetters,
  reglueFloatingMarks,
  removeTashkeel,
  removeTatweel,
} from "./unicode";
import { normalizeDigits } from "./numbers";
import { normalizeWhitespace } from "./whitespace";
import {
  removeBrokenHtml,
  removeAsciiNoise,
  normalizeArabicPunctuation,
  finalCleanup,
} from "./html";
import {
  collapseRepeatedParagraphs,
  reconstructArabicLines,
  detectArabicHeadings,
  detectPostReconstructionHeadings,
  removePageNoise,
  removeRepeatedTokens,
  removeGarbageSymbols,
  removeIsolatedFragments,
  collapseRepeatedWords,
} from "./structure";
import { applyQuranicFixes } from "./quranic";
import { mapOutsideVerbatim } from "./verbatim-spans";
import { applyStructuralFixes } from "./structural";
import { DEFAULT_OPTIONS, EXAM_OPTIONS, type CleanOptions } from "../constants";

export { analyzeText } from "../analyze";
export type { CleanOptions } from "../constants";
export { diacritizeArabic } from "./diacritize";

export interface CleanArabicTextOptions extends CleanOptions {
  confidence?: number;
  quranicFixes?: boolean;
  structuralCheck?: boolean;
  structuralFixes?: boolean;
}

export {
  normalizeUnicode,
  normalizePresentationForms,
  repairMojibake,
  expandPuaHonorifics,
  normalizeArabicLetters,
  reglueFloatingMarks,
  removeTashkeel,
  removeTatweel,
  consonantSpine,
  toHarakaPattern,
  containsHaraka,
  harakaOrderProblem,
} from "./unicode";

export { AZHAR_CORRECTION_RULES, applyQuranicFixes } from "./quranic";

export {
  auditStructuralIntegrity,
  auditStructural,
  checkStructuralIntegrity,
  checkStructural,
  validateStructural,
  validateStructure,
  structuralAudit,
  analyzeStructuralIntegrity,
  analyzeStructure,
  detectStructuralIssues,
  applyStructuralFixes,
  normalizeStructural,
  type StructuralAuditResult,
  type StructuralAuditIssue,
} from "./structural";

export { normalizeDigits } from "./numbers";

// Canonical Arabic detection surface (single source of truth lives in ../constants)
export {
  ARABIC_LETTER_RANGES,
  ARABIC_LETTER_CLASS,
  ARABIC_STRONG_MIN_RATIO,
  MIN_KNOWN_TEXT_SHARE,
  isGarbageLine,
  MIN_ARABIC_CHARS_FOR_RTL,
  TASHKEEL_SOURCE,
  TATWEEL_SOURCE,
  TASHKEEL,
  TATWEEL,
  arabicLetterRegex,
  containsArabic,
  countArabicLetters,
  arabicLetterRatio,
  hasArabicContent,
} from "../constants";

export { normalizeWhitespace } from "./whitespace";

export {
  removeBrokenHtml,
  removeAsciiNoise,
  normalizeArabicPunctuation,
  finalCleanup,
} from "./html";

export {
  similarity,
  collapseRepeatedParagraphs,
  reconstructArabicLines,
  detectArabicHeadings,
  detectPostReconstructionHeadings,
  removePageNoise,
  removeRepeatedTokens,
  removeGarbageSymbols,
  removeIsolatedFragments,
  collapseRepeatedWords,
} from "./structure";

export async function enhanceArabicText(text: string): Promise<string> {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { fileURLToPath } = await import("node:url");
  const { runPython } = await import("../../utils/python-runner");

  const tempDir = await mkdtemp(join(tmpdir(), "diacritics-"));
  const inputPath = join(tempDir, "input.json");
  const scriptPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "scripts",
    "diacritics.py",
  );

  try {
    await writeFile(inputPath, JSON.stringify({ texts: [text] }));

    const result = await runPython({
      args: [scriptPath, inputPath],
      timeout: 300_000,
      cwd: tempDir,
    });

    const parsed = JSON.parse(result.stdout);
    if (parsed.error) {
      throw new Error(`DIACRITICS_SCRIPT_ERROR: ${parsed.error}`);
    }

    const enhanced = parsed.results?.[0] || text;

    return enhanced;
  } catch {
    return text;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function cleanArabicText(raw: string, options?: CleanArabicTextOptions): string {
  let text = raw;

  const shouldAutoDetect = !options || JSON.stringify(options) === JSON.stringify(DEFAULT_OPTIONS);
  let opts: CleanOptions;

  if (shouldAutoDetect) {
    const docType = detectDocumentType(raw);
    opts =
      docType === "exam" ? { ...EXAM_OPTIONS, ...options } : { ...DEFAULT_OPTIONS, ...options };
  } else {
    opts = { ...DEFAULT_OPTIONS, ...options };
  }

  const confidence = options?.confidence;

  if (opts.normalizeUnicode) {
    text = normalizeUnicode(text);
  }

  // Citations (﴿ ﴾, « », ‹ ›) and honorific formulas hold the cited wording, so
  // every pass below that rewrites letters, marks or punctuation runs only outside them.
  // Tatweel goes first: deleting a kashida can glue a letter to a hamza/madda mark, so
  // the letter pass must see that adjacency or the next pass recomposes it all over again.
  if (opts.removeTatweel) text = mapOutsideVerbatim(text, removeTatweel);
  // Same reason for the harakat the deletions below strand off their letter.
  text = mapOutsideVerbatim(text, reglueFloatingMarks);

  if (opts.normalizeArabic) {
    text = mapOutsideVerbatim(text, normalizeArabicLetters);
  }

  if (opts.removeTashkeel) text = mapOutsideVerbatim(text, removeTashkeel);

  if (opts.normalizeDigits) {
    text = mapOutsideVerbatim(text, normalizeDigits);
  }

  if (opts.normalizeWhitespace) {
    text = normalizeWhitespace(text);
  }

  if (opts.removeBrokenHtml) text = removeBrokenHtml(text);
  if (opts.removeAsciiNoise) text = removeAsciiNoise(text);
  if (opts.removeRepeatedTokens) text = removeRepeatedTokens(text);
  if (opts.removeGarbageSymbols) text = removeGarbageSymbols(text, confidence);
  if (opts.normalizePunctuation) text = mapOutsideVerbatim(text, normalizeArabicPunctuation);
  if (opts.removeIsolatedFragments) text = removeIsolatedFragments(text, confidence);
  if (opts.collapseRepeatedWords) text = mapOutsideVerbatim(text, collapseRepeatedWords);
  if (opts.detectHeadings) text = detectArabicHeadings(text);
  if (opts.reconstructLines) {
    text = reconstructArabicLines(text);
    text = detectPostReconstructionHeadings(text);
  }
  if (opts.removePageNoise) text = removePageNoise(text);
  if (opts.collapseRepeatedParagraphs) text = collapseRepeatedParagraphs(text);
  if (opts.finalCleanup) text = finalCleanup(text);

  if (options?.quranicFixes) {
    text = applyQuranicFixes(text);
  }

  if (options?.structuralFixes || options?.structuralCheck) {
    text = applyStructuralFixes(text);
  }

  return text;
}

export {
  UTHMANI_DATASET,
  UTHMANI_SOURCE,
  uthmaniSkeleton,
  getUthmaniAyah,
  findUthmaniMatches,
  verifyQuranicText,
  type UthmaniAyah,
  type UthmaniMatch,
  type UthmaniVerification,
} from "./uthmani";

export {
  normalizeForSimilarity,
  calculateArabicSimilarity,
  microscopicDiff,
  MICROSCOPIC_DIFF_MAX_CHARS,
  type ArabicSimilarityResult,
  type DiffOp,
  type DiffOpType,
  type MicroscopicDiffResult,
} from "./similarity";

export {
  auditContextualGrammar,
  checkContextualGrammar,
  contextualAudit,
  auditContextual,
  type ContextualIssue,
  type ContextualSeverity,
  type ContextualAuditResult,
} from "./contextual";

export {
  runSevenStageAudit,
  textCleaner,
  type StageResult,
  type SevenStageAuditOptions,
  type SevenStageAuditReport,
  type TextCleaner,
} from "./text-cleaner";
