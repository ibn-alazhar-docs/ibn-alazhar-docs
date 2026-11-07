export { cleanArabicText, enhanceArabicText, diacritizeArabic } from "./clean";
export {
  normalizeUnicode,
  normalizePresentationForms,
  repairMojibake,
  expandPuaHonorifics,
  normalizeArabicLetters,
  removeTashkeel,
  removeTatweel,
} from "./clean";
export { AZHAR_CORRECTION_RULES, applyQuranicFixes } from "./clean";
export {
  auditStructuralIntegrity,
  applyStructuralFixes,
  type StructuralAuditResult,
  type StructuralAuditIssue,
} from "./clean";
export type { CleanOptions, CleanArabicTextOptions } from "./clean";
export { analyzeText, detectDocumentType } from "./analyze";
export type { TextAnalysis, DocumentType } from "./analyze";
// Canonical Arabic detection — the only Arabic character class / threshold set
// the pipeline may use (docs/MERGE_PLAN.md, تحديث 2026-11-04 — تقرير ZIP).
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
} from "./constants";
export {
  DEFAULT_OPTIONS,
  EXAM_OPTIONS,
  EXAM_QUESTION_PATTERN,
  EXAM_ANSWER_PATTERN,
  EXAM_CHOICE_PATTERN,
  EXAM_FILL_PATTERN,
  EXAM_MCQ_PATTERN,
} from "./constants";
export {
  UTHMANI_DATASET,
  UTHMANI_SOURCE,
  uthmaniSkeleton,
  getUthmaniAyah,
  findUthmaniMatches,
  verifyQuranicText,
  normalizeForSimilarity,
  calculateArabicSimilarity,
  microscopicDiff,
  MICROSCOPIC_DIFF_MAX_CHARS,
  auditContextualGrammar,
  checkContextualGrammar,
  contextualAudit,
  auditContextual,
  runSevenStageAudit,
  textCleaner,
  type UthmaniAyah,
  type UthmaniMatch,
  type UthmaniVerification,
  type ArabicSimilarityResult,
  type DiffOp,
  type DiffOpType,
  type MicroscopicDiffResult,
  type ContextualIssue,
  type ContextualSeverity,
  type ContextualAuditResult,
  type StageResult,
  type SevenStageAuditOptions,
  type SevenStageAuditReport,
  type TextCleaner,
} from "./clean";

// Tashkeel (diacritization) module — honest engines only: real deterministic
// rule engine + probe-gated Python backend; unavailable => coded failure.
export {
  diacritizeText,
  isDiacritizerAvailable,
  probeDiacritizers,
  probePythonDiacritizer,
  createPythonDiacritizer,
  probePythonBackend,
  deterministicDiacritizer,
  deterministicDiacritize,
  computeCoverage,
  DiacritizeError,
} from "./diacritize";
export type {
  Diacritizer,
  DiacritizeOptions,
  DiacritizeResult,
  DiacritizeEngineId,
  DiacritizeEnginePreference,
  DiacritizeErrorCode,
  DiacritizeWarningCode,
  PythonBackendProbe,
  DiacritizersStatus,
  DiacritizeAvailability,
} from "./diacritize";
