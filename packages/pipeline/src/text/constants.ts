// Unicode control characters that corrupt Arabic OCR output
export const BIDI_CONTROL = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFFF0-\uFFFF\u00AD\u061C]/g;

// Tashkeel (diacritics)
export const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1]/g;
export const TATWEEL = /[\u0640]/g;

// Arabic letter normalization maps
export const ALEF_PATTERNS = /[\u0622\u0623\u0625]/g;
export const YAA_PATTERNS = /[\u064A\u0649\u06CC]/g;
export const KAF_PATTERNS = /[\u06A9\u06AA]/g;

// OCR artifact: exclamation mark between Arabic letters
export const OCR_EXCLAMATION = /([\u0600-\u06FF])!+([\u0600-\u06FF])/g;

// Line-ending connectives that force merge with next line
export const LINE_END_CONTINUATIVE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+\s+(من|في|عن|على|إلى|حتى|مذ|منذ|لدى|مع|غير|سوى|بين|تحت|فوق|دون|قبل|بعد|عند|نحو|حول|أو|أم|ثم|بل|لا|قد|هل|لم|لن|إن|أن|ما|هذا|هذه|ذلك|تلك|هو|هي|هم|هن|الذين|التي|الذي)\s*$/;

// Line-start connectives that suggest continuation from previous line
export const LINE_START_CONTINUATIVE =
  /^(و|ف|ب|ل|ك|فـ|بال|فلـ|ولـ|بل|هل|قد|سـ|فسـ|وسـ|لن|لم|لما|إن|أن|فإن|فأن|فقد|فهل|ولا|فلا|ولن|فلم|بأن|لكن|لعل|ليت|حيث|حين|عند|بين|بعد|قبل|تحت|فوق|مع|منذ|من|في|عن|على|إلى|حتى|حول|خلال|دون|نحو|غير|سوى|مثل|بسبب|بعدما|قبلما|حينما|كلما|أين|أينما|كيف|كيفما|أي|أيها|أيتها|يا)\s/;

// ASCII bullet characters that mark lists
export const BULLET_START = /^[•·‣⁃\-–—]\s/;

// Garbage ratio threshold
export const GARBAGE_THRESHOLD = 0.35;

// Allowed trailing punctuation (not stripped)
export const ALLOWED_TRAILING =
  /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z0-9\s.,!?:;،؟؛()\]}\-'"»«﴿﴾]+$/;

// Page number patterns
export const PAGE_NUM_PATTERNS = [
  /^\d+$/,
  /^-\s*\d+\s*-$/,
  /^\d+\s*\/\s*\d+$/,
  /^\d+\s*-\s*\d+$/,
  /^\[?\d+\]?$/,
  /^\d+\s*$/,
  /^(Page|صفحة|ص)\s*\d+$/i,
  /^\d+\s*(of|من)\s*\d+$/i,
];

// Heading detection patterns
export const HEADING_NUMBERED_PAREN = /^\(\d+\)\s/;
export const HEADING_NUMBERED = /^\d+[.)–—]\s+/;
export const HEADING_EXAMPLE = /^(المثال)\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس)/;
export const HEADING_PARTICIPATION = /^(المشاركة)\s+(الأولى|الأول|الثانية|الثاني|الثالثة|الثالث)/;
export const HEADING_MAJOR =
  /^(الفصل\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|[0-9]+)|الباب\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|المبحث\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|المطلب\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|[0-9]+)|القسم\s+(الأول|الاول|الثاني|الثالث|الرابع|[0-9]+)|الجزء\s+(الأول|الاول|الثاني|الثالث|الرابع|[0-9]+)|الدرس\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|الوحدة\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+))/;
export const HEADING_SUB =
  /^(سورة\s|الحديث\s|الخاتمة|المقدمة|المراجع|المصادر|الملاحق|النتائج|التوصيات|ملخص|خلاصة|تمهيد|مدخل|ملحوظة|تنبيه|فائدة|تتمة|تكملة|هامش|أسئلة|تمارين|تدريبات|أهداف|مقدمة|خاتمة)/;
export const HEADING_ORDINAL =
  /^(اولاً?|ثانياً?|ثالثاً?|رابعاً?|خامساً?|سادساً?|سابعاً?|ثامناً?|تاسعاً?|عاشراً?|أخيراً?|أخيرا)\s*[.:]?\s+/;

export interface CleanOptions {
  normalizeUnicode?: boolean;
  normalizeArabic?: boolean;
  removeTashkeel?: boolean;
  removeTatweel?: boolean;
  normalizeDigits?: boolean;
  normalizeWhitespace?: boolean;
  removeBrokenHtml?: boolean;
  removeAsciiNoise?: boolean;
  removeRepeatedTokens?: boolean;
  removeGarbageSymbols?: boolean;
  normalizePunctuation?: boolean;
  removeIsolatedFragments?: boolean;
  collapseRepeatedWords?: boolean;
  reconstructLines?: boolean;
  detectHeadings?: boolean;
  removePageNoise?: boolean;
  collapseRepeatedParagraphs?: boolean;
  finalCleanup?: boolean;
}

export const DEFAULT_OPTIONS: CleanOptions = {
  normalizeUnicode: true,
  normalizeArabic: true,
  removeTashkeel: false,
  removeTatweel: true,
  normalizeDigits: false,
  normalizeWhitespace: true,
  removeBrokenHtml: true,
  removeAsciiNoise: true,
  removeRepeatedTokens: true,
  removeGarbageSymbols: true,
  normalizePunctuation: true,
  removeIsolatedFragments: true,
  collapseRepeatedWords: true,
  reconstructLines: true,
  detectHeadings: true,
  removePageNoise: true,
  collapseRepeatedParagraphs: true,
  finalCleanup: true,
};

/**
 * Options preset for exam/Q&A documents (امتحانات، أسئلة وأجوبة).
 * Disables destructive passes that mangle question numbering, answer
 * choices, and mixed Arabic/Latin content typical in exam papers.
 */
export const EXAM_OPTIONS: CleanOptions = {
  normalizeUnicode: true,
  normalizeArabic: true,
  removeTashkeel: false,
  removeTatweel: true,
  normalizeDigits: false,
  normalizeWhitespace: true,
  removeBrokenHtml: true,
  // Keep Latin chars — exam papers mix س١، س5، (أ)، (ب) with digits
  removeAsciiNoise: false,
  removeRepeatedTokens: true,
  // Keep lines that look like garbage — answer choices like (أ - ب - ج) score low
  removeGarbageSymbols: false,
  normalizePunctuation: true,
  // Don't drop short fragments — answer stubs are intentionally short
  removeIsolatedFragments: false,
  collapseRepeatedWords: true,
  // Don't merge lines — every question/answer must stay on its own line
  reconstructLines: false,
  // Don't auto-detect headings — question numbers like س١: become ## headings wrongly
  detectHeadings: false,
  removePageNoise: true,
  collapseRepeatedParagraphs: true,
  // Loosen final filter — exam lines often have high symbol/digit ratios
  finalCleanup: false,
};

// Patterns that identify exam/Q&A documents
export const EXAM_QUESTION_PATTERN = /^(س\s*\d+|سؤال\s*\d*|س\s*[:：]|\(\d+\)\s*[:：]?)/m;
export const EXAM_ANSWER_PATTERN = /^(ج\s*[:：]|جواب\s*[:：]|الإجابة\s*[:：]|الجواب\s*[:：])/m;
export const EXAM_CHOICE_PATTERN = /^\s*[\(\[]\s*[أابجدهوزحطيكلمنسعفصقرشت١٢٣٤٥٦٧٨٩0-9]\s*[\)\]]/m;
export const EXAM_FILL_PATTERN = /\.{3,}|…{2,}|\[\.+\]|\(\s*\.\.\.\s*\)/m;
export const EXAM_MCQ_PATTERN = /\([١٢٣٤-]\)|[\(\[][أ-ي][\)\]]/m;
