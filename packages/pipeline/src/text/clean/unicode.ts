import {
  BIDI_CONTROL,
  TASHKEEL,
  TATWEEL,
  ALEF_PATTERNS,
  YAA_PATTERNS,
  KAF_PATTERNS,
} from "../constants";

export function normalizeUnicode(text: string): string {
  return text.normalize("NFKC").replace(BIDI_CONTROL, "");
}

export function normalizeArabicLetters(text: string): string {
  text = text.replace(ALEF_PATTERNS, "ا");
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
