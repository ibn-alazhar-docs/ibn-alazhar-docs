import {
  BIDI_CONTROL,
  TASHKEEL,
  TATWEEL,
  ALEF_PATTERNS,
  YAA_PATTERNS,
  KAF_PATTERNS,
  ARABIC_LETTER_RANGES,
} from "../constants";

/**
 * Arabic Presentation Forms blocks:
 *   U+FB50–U+FDFF  Arabic Presentation Forms-A
 *   U+FE70–U+FEFF  Arabic Presentation Forms-B
 */
const ARABIC_PRESENTATION_FORMS = /[\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/** Detached definite article: "ال كتاب" → "الكتاب" (canonical Arabic range). */
const DETACHED_AL = new RegExp(
  `(^|[^${ARABIC_LETTER_RANGES}])ال\\s+(?=[${ARABIC_LETTER_RANGES}])`,
  "g",
);

/**
 * A haraka left off its letter by a stray space ("فَتْ حَ"). One rule, used both by
 * repairMojibake and after any pass that deletes characters, so gluing never depends
 * on which deletion happened first.
 */
const FLOATING_MARK = /\s+([\u064B-\u065F\u0670])/g;

/**
 * Microsoft proprietary font PUA honorifics -> standard Arabic prose.
 */
const PUA_HONORIFIC_REPLACEMENTS: [RegExp, string][] = [
  [/\uF074/g, " (رضي الله عنه) "],
  [/\uF072/g, " (صلى الله عليه وسلم) "],
  [/\uF073/g, " (عليه السلام) "],
  [/\uF075/g, " (رحمه الله) "],
  [/\uF076/g, " (عز وجل) "],
  [/\uFDFA/g, " صلى الله عليه وسلم "],
  [/\uFDFB/g, " جل جلاله "],
  [/\uFDF0/g, " صلعم "],
  [/\uFDF1/g, " عليه السلام "],
  [/\uFDFD/g, " بسم الله الرحمن الرحيم "],
];

/**
 * Damaged OCR mojibake, reversed punctuation, broken ligatures, and font artifacts
 * (excluding the PUA honorifics handled by {@link expandPuaHonorifics}).
 */
const DAMAGED_OCR_REPLACEMENTS: [RegExp, string][] = [
  // Specific OCR artifacts and corrupted Latin/Arabic transitions
  [/يفid/g, "يفيد"],
  [/الحكم\);/g, "الحكم)؛"],
  [/([أ-ي])؛([a-zA-Z])/g, "$1؛ $2"],

  // Mojibake and encoding corruption (e.g. windows-1256 / UTF-8 misinterpretation)
  [/Ø§Ù„/g, "ال"],
  [/Ø£Ù/g, "أ"],
  [/Ø¥Ù/g, "إ"],
  [/ÙÙŠ/g, "في"],
  [/Ù…Ù†/g, "من"],
  [/Ø¹Ù„Ù‰/g, "على"],
  [/Ù‡Ø°Ø§/g, "هذا"],
  [/Ø§Ù„Ù„Ù‡/g, "الله"],
  [/Ø±Ø¶ÙŠ/g, "رضي"],
  [/Ø¹Ù†Ù‡/g, "عنه"],
  [/ØµÙ„Ù‰/g, "صلى"],
  [/Ø¹Ù„ÙŠÙ‡/g, "عليه"],
  [/ÙˆØ³Ù„Ù…/g, "وسلم"],
  [/Ø¨Ù†/g, "بن"],
  [/Ø¹Ø¨Ø¯/g, "عبد"],

  // Inverted / misplaced punctuation inside Arabic passages
  [/([أ-ي])\s*\?\s*([أ-ي])/g, "$1؟ $2"],
  [/([أ-ي])\s*;([أ-ي])/g, "$1؛ $2"],
  [/([أ-ي])\s*,([أ-ي])/g, "$1، $2"],
  [/([أ-ي])\s*\?$/gm, "$1؟"],
  [/([أ-ي])\s*;$/gm, "$1؛"],
  [/([أ-ي])\s*,$/gm, "$1،"],

  // Common broken OCR character confusions in Arabic.
  // Adjacent-only (no \s*): unlike the converter's OCR-only pass, this cleaner
  // runs on all pipeline text, so a spaced variant would corrupt legitimate
  // sequences like "كلمة0 كلمة1" (test: very long text). Glued forms only.
  [/([أ-ي])l([أ-ي])/g, "$1ا$2"],
  [/([أ-ي])1([أ-ي])/g, "$1ا$2"],
  [/([أ-ي])0([أ-ي])/g, "$1ه$2"],
  [/([أ-ي])\|([أ-ي])/g, "$1ا$2"],

  // Tatweel / Kashida abuse from OCR (excessive stretching like ســـــــــلام)
  [/ـ{2,}/g, "ـ"],

  // Broken or orphaned Arabic diacritics / tashkeel floating on whitespace
  [FLOATING_MARK, "$1"],

  // Detached definite article from PDF/OCR extraction ("ال كتاب"). A repair, not a
  // spelling choice, so it belongs with the artifacts and survives every preset —
  // it used to ride along inside the alef/ya maps and stopped working the moment
  // `normalizeArabic` was turned off.
  [DETACHED_AL, "$1ال"],

  // Damaged quotes and brackets
  [/«\s+/g, "«"],
  [/\s+»/g, "»"],
  [/\(\s+/g, "("],
  [/\s+\)/g, ")"],

  // Clean Zero-Width, replacement characters, and BOM artifacts that cause rendering glitches.
  // ZWJ (U+200D) is stripped separately: it forms joined sequences with surrounding
  // characters, which no-misleading-character-class forbids inside a class.
  [/[\u200B\u200C\uFEFF\uFFFD]/g, ""],
  [/\u200D/g, ""],

  // Repeated garbage symbols from poor scans like ?????? (but NOT dot runs:
  // "......" is a legitimate fill-in-the-blank marker in exams and must survive)
  [/\?{2,}/g, "؟"],
  [/؛{2,}/g, "؛"],
  [/،{2,}/g, "،"],
  [/_{3,}/g, "___"],
];

export function normalizePresentationForms(text: string): string {
  if (!text) return text;
  return text.replace(ARABIC_PRESENTATION_FORMS, (char) => char.normalize("NFKC"));
}

export function expandPuaHonorifics(text: string): string {
  if (!text) return text;
  let cleaned = text;
  for (const [pattern, replacement] of PUA_HONORIFIC_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

export function repairMojibake(text: string): string {
  if (!text) return text;
  let cleaned = text;
  for (const [pattern, replacement] of DAMAGED_OCR_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

export function normalizeUnicode(text: string): string {
  text = normalizePresentationForms(text);
  text = text.normalize("NFKC");
  text = repairMojibake(text);
  text = expandPuaHonorifics(text);
  return text.replace(BIDI_CONTROL, "");
}

/** Safety bound for the map/NFKC fixed-point loop; real text settles in ≤ 3. */
const LETTER_MARK_NORMALIZATION_MAX_PASSES = 6;

function applyArabicLetterMaps(text: string): string {
  text = text.replace(ALEF_PATTERNS, "ا");
  text = text.replace(YAA_PATTERNS, "ي");
  text = text.replace(KAF_PATTERNS, "ك");
  text = text.replace(/[)\](]?\s*©\s*(?=\d+\s*ه)/g, "(ت ");
  text = text.replace(/(\d+)\s*ه\s*[)\]]/g, "$1 هـ)");
  return text;
}

/** Re-glue harakat stranded by a character-deleting pass (tatweel, noise, fragments). */
export function reglueFloatingMarks(text: string): string {
  return text.replace(FLOATING_MARK, "$1");
}

/**
 * Flattening a composed letter (آ → ا) is the exact inverse of canonical
 * composition (ا + ٓ → آ): the mark the letter carried is released free, then the
 * next pass recomposes and flattens it again, so the cleaner lost one hamza/madda
 * per call. Alternating maps and NFKC until the text settles makes the pair a
 * fixed point — every spelling of alef/ya/waw + hamza/madda lands on the same
 * result in one pass instead of drifting.
 */
export function normalizeArabicLetters(text: string): string {
  let current = text;
  for (let pass = 0; pass < LETTER_MARK_NORMALIZATION_MAX_PASSES; pass++) {
    const next = applyArabicLetterMaps(current).normalize("NFKC");
    if (next === current) return next;
    current = next;
  }
  return current;
}

export function removeTashkeel(text: string): string {
  return text.replace(TASHKEEL, "");
}

export function removeTatweel(text: string): string {
  return text.replace(TATWEEL, "");
}

/**
 * Diacritic-insensitive matching for Quranic correction rules.
 *
 * Integrated as data from the pdf-to-word converter's `shared/arabicPattern.ts`
 * (specs/012-amazing-merge US3 / T031; zip source:
 * `pdf-to-word--markdown---text-converter.zip` → `shared/arabicPattern.ts`).
 * Pure helpers only — `cleanArabicText` does not call them yet; Quranic
 * pattern matching consumes them so OCR text with partial or reordered
 * harakat can match a rule whose literal spells every mark.
 *
 * Two defects this fixes without touching any replacement string:
 *  1. MISSING HARAKAT — OCR output varies in which diacritics survive.
 *     `toHarakaPattern` drops harakat from the literal and makes harakat
 *     optional after every letter, so one rule matches every rendering.
 *  2. HARAKA ORDER — in NFC Arabic a vowel precedes the shadda, so a literal
 *     spelled shadda-then-vowel can never match real text. Dropping harakat
 *     from the literal removes the order dependency entirely.
 *
 * Base letters are never loosened: matching on a skeleton alone would let a
 * rule fire on a different word sharing consonants, which in religious text
 * is worse than not firing at all. Only diacritics (no lexical identity here)
 * are treated as optional. Presentation Forms are deliberately excluded —
 * they are pre-shaped letters, not diacritics, and are normalized away by
 * `normalizePresentationForms` before any rule runs.
 */
const HARAKAT_CLASS = "\\u064B-\\u0652\\u0670";

const isHaraka = (cp: number) => (cp >= 0x064b && cp <= 0x0652) || cp === 0x0670;

/**
 * Reduces an Arabic literal to its ordered consonant spine: strips the
 * harakat and the tolerant-class scaffolding (`[\u064B-\u0652\u0670]*`) so
 * rules can be located by name regardless of how vowels are spelled.
 */
export function consonantSpine(text: string): string {
  return text
    .replace(/\[\\u064B-\\u0652\\u0670\]\*/g, "")
    .replace(/\[\\u064B-\\u0652\\u0670\]/g, "")
    .replace(/[ً-ْٰٟ]/g, "");
}

function escapeRegexLiteral(ch: string): string {
  return /[.*+?^${}()|[\]\\/]/.test(ch) ? `\\${ch}` : ch;
}

/**
 * Builds a regex fragment matching `literal` regardless of which diacritics
 * are present. Harakat in the source literal are absorbed (they contribute
 * nothing); tatweel (U+0640) becomes optional; every letter may carry
 * diacritics, whether or not the literal showed them.
 */
export function toHarakaPattern(literal: string): string {
  let out = "";
  for (const ch of literal) {
    const cp = ch.codePointAt(0)!;
    if (isHaraka(cp)) continue;
    if (cp === 0x0640) {
      out += "\\u0640*";
      continue;
    }
    out += escapeRegexLiteral(ch);
    out += `[${HARAKAT_CLASS}]*`;
  }
  return out;
}

/**
 * True when the string contains any haraka at all. The zip's `containsHaraka`
 * used U+0610–U+0670, which also matches Arabic letters — narrowed here to
 * the haraka block only (U+064B–U+065F + U+0670), matching `TASHKEEL`.
 */
export const containsHaraka = (s: string): boolean => /[\u064B-\u065F\u0670]/.test(s);

/**
 * Reports a haraka sequence normalized Arabic never produces: a shadda
 * immediately followed by another haraka. Used to flag literals for
 * correction, not to rewrite input text.
 */
export function harakaOrderProblem(literal: string): string | null {
  const cp = [...literal].map((c) => c.codePointAt(0)!);
  for (let i = 0; i < cp.length - 1; i++) {
    const cur = cp[i];
    const next = cp[i + 1];
    if (cur === 0x0651 && next !== undefined && isHaraka(next)) {
      return `shadda at index ${i} is followed by U+${next.toString(16).toUpperCase()}`;
    }
  }
  return null;
}
