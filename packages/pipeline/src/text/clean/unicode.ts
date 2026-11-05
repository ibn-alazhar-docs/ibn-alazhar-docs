import {
  BIDI_CONTROL,
  TASHKEEL,
  TATWEEL,
  ALEF_PATTERNS,
  YAA_PATTERNS,
  KAF_PATTERNS,
} from "../constants";

/**
 * Arabic Presentation Forms blocks:
 *   U+FB50–U+FDFF  Arabic Presentation Forms-A
 *   U+FE70–U+FEFF  Arabic Presentation Forms-B
 */
const ARABIC_PRESENTATION_FORMS = /[\uFB50-\uFDFF\uFE70-\uFEFF]/g;

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
  [/\s+([\u064B-\u065F\u0670])/g, "$1"],

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

export function normalizeArabicLetters(text: string): string {
  text = text.replace(ALEF_PATTERNS, "ا");
  // A madda (U+0653) directly after a bare alef is the decomposed spelling of
  // alef-with-madda (آ). Normalizing it away keeps cleanArabicText idempotent:
  // without it, NFKC on a second pass recomposes ا + U+0653 back into آ.
  text = text.replace(/ا\u0653/g, "ا");
  text = text.replace(YAA_PATTERNS, "ي");
  text = text.replace(KAF_PATTERNS, "ك");
  text = text.replace(
    /(^|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])ال\s+(?=[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])/g,
    "$1ال",
  );
  text = text.replace(/[)\](]?\s*©\s*(?=\d+\s*ه)/g, "(ت ");
  text = text.replace(/(\d+)\s*ه\s*[)\]]/g, "$1 هـ)");
  return text;
}

export function removeTashkeel(text: string): string {
  return text.replace(TASHKEEL, "");
}

export function removeTatweel(text: string): string {
  return text.replace(TATWEEL, "");
}
