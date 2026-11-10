// Unicode control characters that corrupt Arabic OCR output
export const BIDI_CONTROL = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFFF0-\uFFFF\u00AD\u061C]/g;

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Arabic letter/diacritic ranges — SINGLE SOURCE OF TRUTH.
//
// Decision recorded in docs/MERGE_PLAN.md (تحديث 2026-11-04 — تقرير ZIP):
// the reference converter app carried four divergent Arabic-detection families
// (`[\u0600-\u06FF]`, the 3-block family, `>= latin*0.4`, `> 20` raw counts) and
// four threshold spellings (0.3x / 0.4x / >20). Inside this repo the same
// split had started to appear (narrow class in qa-gates.ts, wide class in
// text/**). Everything in the pipeline now imports these definitions — never
// re-declare an Arabic character class or an Arabic-detection threshold.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Unicode blocks that carry Arabic characters.
 *
 * The ranges are measured against Unicode 15.0 with `unicodedata.category`, not
 * copied from a regex someone liked: U+0600-06FF (Arabic), U+0750-077F
 * (Arabic Supplement — 48/48 assigned code points are letters), U+0870-08FF
 * (Extended-B then Extended-A).
 *
 * Extended-B was missing from this class until now. Its 30 letters at
 * U+0870-088E are the old-manuscript alef and ha variants, so a manuscript page
 * written with them scored those letters as *non-Arabic* — enough of them could
 * drop the line below the strong-Arabic gate and cost the document its RTL
 * direction, in the one block Unicode added for exactly that text.
 *
 * Presentation forms (U+FB50-FDFF, U+FE70-FEFF) stay out on purpose: they are
 * not a second script, they are this one already shaped, and three gates ask
 * whether shaping is still present — `SHAPING_FORM` (qa-gates.ts), `PRESENTATION`
 * (verify-quotes.ts) and the searchable-PDF text-layer assertion. A letter class
 * that counted shaped glyphs as letters would let every "did normalization
 * actually run?" check pass while the delivered text was still unusable.
 */
export const ARABIC_LETTER_RANGES = "\\u0600-\\u06FF\\u0750-\\u077F\\u0870-\\u08FF";

/** Bracketed class ready to embed, e.g. `new RegExp(ARABIC_LETTER_CLASS + "+")`. */
export const ARABIC_LETTER_CLASS = `[${ARABIC_LETTER_RANGES}]`;

/**
 * Tashkeel + Quranic annotation marks (code-point source for class building).
 *
 * Every Unicode category-Mn range inside the Arabic blocks, measured rather
 * than assumed. It used to stop at U+08D4, so U+08CA-08D3 and U+08E3-08FF —
 * the small high letters and waqf marks a printed Qur'an page is full of —
 * survived `removeTashkeel` and went unmatched through similarity and
 * verification, where the mark set is supposed to be invisible.
 */
export const TASHKEEL_SOURCE =
  "\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0898-\\u089F\\u08CA-\\u08E1\\u08E3-\\u08FF";
/** Tatweel / kashida (code-point source for class building). */
export const TATWEEL_SOURCE = "\\u0640";

/** Build the canonical Arabic-letter regex; pass "" for a stateless test regex. */
export function arabicLetterRegex(flags: "g" | "" = "g"): RegExp {
  return new RegExp(ARABIC_LETTER_CLASS, flags);
}

const ARABIC_PRESENT = new RegExp(ARABIC_LETTER_CLASS);

/**
 * Does this text carry any Arabic letter at all?
 *
 * This is the primitive every direction/routing gate actually wants, and it was
 * missing — which is why `[\u0600-\u06FF]` kept being re-typed by hand in
 * book-factory, the paragraph detector, the DOCX script splitter and the OCR
 * providers, each time with a slightly different set of blocks.
 */
export function containsArabic(text: string): boolean {
  return ARABIC_PRESENT.test(text);
}

/** Arabic letters in `text` (canonical 3-block range). */
export function countArabicLetters(text: string): number {
  return (text.match(arabicLetterRegex("g")) ?? []).length;
}

/** Share of non-whitespace characters that are Arabic letters (0..1). */
export function arabicLetterRatio(text: string): number {
  const total = text.replace(/\s/g, "").length;
  return total === 0 ? 0 : countArabicLetters(text) / total;
}

/** Converter-app contract: Arabic-bearing text needs this many Arabic letters. */
export const MIN_ARABIC_CHARS_FOR_RTL = 20;

export function hasArabicContent(
  text: string,
  minArabicChars: number = MIN_ARABIC_CHARS_FOR_RTL,
): boolean {
  return countArabicLetters(text) >= minArabicChars;
}

// Tashkeel (diacritics)
export const TASHKEEL = new RegExp(`[${TASHKEEL_SOURCE}]`, "g");
export const TATWEEL = new RegExp(`[${TATWEEL_SOURCE}]`, "g");

// Arabic letter normalization maps
export const ALEF_PATTERNS = /[\u0622\u0623\u0625]/g;
export const YAA_PATTERNS = /[\u064A\u0649\u06CC]/g;
export const KAF_PATTERNS = /[\u06A9\u06AA]/g;

// OCR artifact: exclamation mark between Arabic letters
export const OCR_EXCLAMATION = new RegExp(
  `(${ARABIC_LETTER_CLASS})!+(${ARABIC_LETTER_CLASS})`,
  "g",
);

// Line-ending connectives that force merge with next line
export const LINE_END_CONTINUATIVE = new RegExp(
  `${ARABIC_LETTER_CLASS}+\\s+` +
    "(من|في|عن|على|إلى|حتى|مذ|منذ|لدى|مع|غير|سوى|بين|تحت|فوق|دون|قبل|بعد|عند|نحو|حول|أو|أم|ثم|بل|لا|قد|هل|لم|لن|إن|أن|ما|هذا|هذه|ذلك|تلك|هو|هي|هم|هن|الذين|التي|الذي)\\s*$",
);

// Line-start connectives that suggest continuation from previous line
export const LINE_START_CONTINUATIVE =
  /^(و|ف|ب|ل|ك|فـ|بال|فلـ|ولـ|بل|هل|قد|سـ|فسـ|وسـ|لن|لم|لما|إن|أن|فإن|فأن|فقد|فهل|ولا|فلا|ولن|فلم|بأن|لكن|لعل|ليت|حيث|حين|عند|بين|بعد|قبل|تحت|فوق|مع|منذ|من|في|عن|على|إلى|حتى|حول|خلال|دون|نحو|غير|سوى|مثل|بسبب|بعدما|قبلما|حينما|كلما|أين|أينما|كيف|كيفما|أي|أيها|أيتها|يا)\s/;

// ASCII bullet characters that mark lists
export const BULLET_START = /^[•·‣⁃\-–—]\s/;

// Garbage ratio threshold
export const GARBAGE_THRESHOLD = 0.35;

/**
 * Canonical Arabic-detection thresholds (one spelling each — do NOT re-inline).
 *
 * - ARABIC_STRONG_MIN_RATIO: a line at/above this share is treated as real
 *   Arabic prose, so stray 1-2 letter Latin tokens are noise (clean/html.ts).
 *   The converter app spelled the same gate 0.4 in three places and `> 20`
 *   chars in another; the ratio form is kept and MIN_ARABIC_CHARS_FOR_RTL is
 *   the count form for short snippets.
 * - MIN_KNOWN_TEXT_SHARE: below this share of readable characters a line is OCR
 *   garbage (see {@link isGarbageLine}).
 */
export const ARABIC_STRONG_MIN_RATIO = 0.4;
export const MIN_KNOWN_TEXT_SHARE = 0.5;

/**
 * Characters a reader can actually use: letters of any script, the diacritics and
 * Quranic marks that attach to them, digits, and punctuation. Symbol runs (■■■■◆◆),
 * control bytes and private-use mojibake fall outside, which is what makes them
 * detectable. Combining marks MUST be in here: a fully vowelled Qur'an line is
 * mostly marks, and an Arabic-only share would call it garbage.
 */
const KNOWN_TEXT_CHAR = /[\p{L}\p{M}\p{N}\p{P}]/u;

/**
 * Is this line OCR garbage rather than text? Measured on the characters themselves,
 * so the answer is the same for Arabic, Latin, or digits. It used to be "Arabic
 * share < 0.3", which charged every legitimate Latin line — an English commentary,
 * a French title, a Latin transliteration — as garbage and put `garbageRatio: 1`
 * with `qualityScore: 0` in front of the user for perfectly clean input.
 */
export function isGarbageLine(line: string): boolean {
  const chars = line.replace(/\s/g, "");
  if (chars.length < 5) return false;
  let known = 0;
  for (const char of chars) {
    if (KNOWN_TEXT_CHAR.test(char)) known++;
  }
  return known / chars.length < MIN_KNOWN_TEXT_SHARE;
}

// Allowed trailing punctuation (not stripped)
// `|` keeps markdown table row ends intact; `‹›` are the nested quotation marks.
export const ALLOWED_TRAILING = new RegExp(
  `[^${ARABIC_LETTER_RANGES}a-zA-Z0-9\\s.,!?:;،؟؛()\\]}\\-'"»«‹›﴿﴾|]+$`,
);

// Page number patterns
// Written with PAGE_DIGIT, not `\d`: `\d` is ASCII-only, so Arabic-Indic page
// furniture ("٢١٢", "صفحة ١٢٠١") survived cleaning while its ASCII twin was dropped.
export const DIGIT_CLASS = "0-9\\u0660-\\u0669\\u06F0-\\u06F9";
const PAGE_DIGIT = `[${DIGIT_CLASS}]`;
export const PAGE_NUM_PATTERNS = [
  new RegExp(`^${PAGE_DIGIT}+$`),
  new RegExp(`^-\\s*${PAGE_DIGIT}+\\s*-$`),
  new RegExp(`^${PAGE_DIGIT}+\\s*/\\s*${PAGE_DIGIT}+$`),
  new RegExp(`^${PAGE_DIGIT}+\\s*-\\s*${PAGE_DIGIT}+$`),
  new RegExp(`^\\[?${PAGE_DIGIT}+\\]?$`),
  new RegExp(`^${PAGE_DIGIT}+\\s*$`),
  new RegExp(`^${PAGE_DIGIT}+(?:\\s+${PAGE_DIGIT}+)+$`),
  new RegExp(`^(Page|صفحة|ص)\\s*${PAGE_DIGIT}+$`, "i"),
  new RegExp(`^${PAGE_DIGIT}+\\s*(of|من)\\s*${PAGE_DIGIT}+$`, "i"),
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
  // Aمانة rule: the delivered file is a copy of the source, so the letters that
  // carry meaning stay as printed. Flattening أإآ→ا (and ى→ي) was inherited from
  // the search design, but search is normalized in SQL by `normalize_arabic()`
  // (see document.repository.ts), so nothing needs the JS flattening — and with it
  // ON, a vowelled page came out of the pipeline as "اِنَّا اَعْطَيْنَٰكَ", which no
  // Azhari reader accepts as a copy of their book. Callers that genuinely want the
  // folded spelling (comparison, dedupe) pass `normalizeArabic: true` explicitly.
  normalizeArabic: false,
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
  // Preserve أإآ so MCQ labels (أ)(ب)(ج)(د) and stems keep their hamza/madda —
  // normalizing to bare ا mangles answer choices (see text-exam-cleaning tests).
  normalizeArabic: false,
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
  // Preserve fill-in-the-blank dot runs (......) — don't collapse them to …
  normalizePunctuation: false,
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
// Support both Arabic numerals (١٢٣) and Hindu-Arabic/Western numerals (123)
// Parenthetical question form requires a colon ("(3): ...") — bare "(1) title"
// is general-doc heading numbering (HEADING_NUMBERED_PAREN), not an exam marker.
// Without this, "(1) عنوان" double-counts as question+choice → misclassified exam.
export const EXAM_QUESTION_PATTERN =
  /^(س\s*[\d\u0660-\u0669\u06F0-\u06F9]+|سؤال\s*[\d\u0660-\u0669\u06F0-\u06F9]*|س\s*[:：]|\(\d+\)\s*[:：])/m;
export const EXAM_ANSWER_PATTERN = /^(ج\s*[:：]|جواب\s*[:：]|الإجابة\s*[:：]|الجواب\s*[:：])/m;
export const EXAM_CHOICE_PATTERN =
  /^\s*[([]\s*[أابجدهوزحطيكلمنسعفصقرشت١٢٣٤٥٦٧٨٩\u0660-\u0669\u06F0-\u06F90-9]\s*[)\]]/m;
export const EXAM_FILL_PATTERN = /\.{3,}|…{2,}|\[\.+\]|[(]\s*\.\.\.\s*[)]/m;
// A parenthesized single Arabic letter is an answer choice. A parenthesized
// digit is NOT enough on its own: in scholarly prose "(١)" is a footnote
// marker, and one per line would score the whole book as an exam paper.
// Digit options therefore have to appear in pairs on the SAME line
// ("(١) أول … (٢) ثانٍ"), which is the shape an option list actually takes.
export const EXAM_MCQ_PATTERN = /[([][أ-ي][)\]]/m;
export const EXAM_DIGIT_OPTIONS_PATTERN =
  /[([]\s*[\d\u0660-\u0669\u06F0-\u06F9]\s*[)\]][^\n[]*[([]\s*[\d\u0660-\u0669\u06F0-\u06F9]\s*[)\]]/;
