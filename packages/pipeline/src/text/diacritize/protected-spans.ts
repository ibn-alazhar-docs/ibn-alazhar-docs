import { ARABIC_LETTER_CLASS, TASHKEEL_SOURCE } from "../constants";

/**
 * Protected-span handling — the TS port of the (correct) principles encoded
 * in scripts/diacritics.py: Quranic/quoted spans and legal citations are
 * never re-vowelized, and text that is already heavily vocalized is left
 * alone entirely. The Python file itself stays untouched (its fate is being
 * decided separately).
 */

const TASHKEEL_GLOBAL = new RegExp(`[${TASHKEEL_SOURCE}]`, "g");
const LETTER_ONE = new RegExp(ARABIC_LETTER_CLASS, "u");
const MARK_ONE = new RegExp(`[${TASHKEEL_SOURCE}]`, "u");

/**
 * Count of diacritic marks over true Arabic letters (0..∞); 0 when no letters.
 * The canonical letter class covers whole blocks, so marks/tatweel matching it
 * are filtered out — otherwise already-placed harakat would inflate the letter
 * count and mask the very text this gate exists to protect.
 */
export function vocalizationRatio(text: string): number {
  let letters = 0;
  for (const ch of text) {
    if (ch === "\u0640") continue; // tatweel
    if (LETTER_ONE.test(ch) && !MARK_ONE.test(ch)) letters += 1;
  }
  if (letters === 0) return 0;
  const marks = (text.match(TASHKEEL_GLOBAL) ?? []).length;
  return marks / letters;
}

/** Opening/closing pairs whose inner content may need protection. */
const QUOTE_PAIRS: readonly [open: string, close: string][] = [
  ["﴿", "﴾"], // Quranic verse markers — always protected
  ["«", "»"], // Arabic quotation marks
  ["“", "”"],
  ["(", ")"],
];

/** Legal citations: المادة 15 / قانون رقم 4 / مرسوم … / قرار … */
const LEGAL_CITATION = /(المادة|قانون|مرسوم|قرار)\s*(رقم|عدد)?\s*[٠-٩0-9]+/g;

export interface TextSegment {
  text: string;
  /** True for Quranic/legal spans and quoted vocalized text — copy verbatim. */
  protected: boolean;
}

/**
 * Ratio gate mirroring the threshold in diacritics.py `is_quranic()`: more
 * than 30% of the Arabic letters carry a diacritic mark => the text is
 * already vocalized; machine vowels on top of real ones are strictly worse
 * than doing nothing. Verse markers are handled per-span by
 * `extractProtectedSpans`, NOT here — one quoted ayah must not freeze a
 * whole unvocalized document (the Python stub's over-broad gate).
 */
export function isHeavilyVocalized(text: string, ratio: number = 0.3): boolean {
  return vocalizationRatio(text) > ratio;
}

function mergeSpans(spans: [number, number][]): [number, number][] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([span[0], span[1]]);
    }
  }
  return merged;
}

/**
 * Spans a diacritizer must copy through byte-for-byte. Bracketed spans are
 * protected when they are Quranic (﴿ ﴾) or already vocalized inside — the
 * same test the Python heuristic applied to each match individually.
 */
export function extractProtectedSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];

  for (const [open, close] of QUOTE_PAIRS) {
    let from = 0;
    for (;;) {
      const start = text.indexOf(open, from);
      if (start === -1) break;
      const end = text.indexOf(close, start + open.length);
      if (end === -1) break;
      const full = text.slice(start, end + close.length);
      const isVerse = open === "﴿";
      if (isVerse || vocalizationRatio(full) > 0.3) {
        spans.push([start, end + close.length]);
      }
      from = end + close.length;
    }
  }

  for (const match of text.matchAll(LEGAL_CITATION)) {
    if (match.index !== undefined) {
      spans.push([match.index, match.index + match[0].length]);
    }
  }

  return mergeSpans(spans);
}

/** Split `text` into protected / processable segments, order preserved. */
export function splitByProtectedSpans(text: string): TextSegment[] {
  const spans = extractProtectedSpans(text);
  if (spans.length === 0) {
    return [{ text, protected: false }];
  }
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [start, end] of spans) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), protected: false });
    }
    segments.push({ text: text.slice(start, end), protected: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), protected: false });
  }
  return segments;
}
