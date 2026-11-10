/**
 * Verbatim spans — stretches of text the cleaner must copy through unchanged.
 *
 * Two kinds, for two different reasons:
 *
 * 1. Citations `﴿ ﴾` (Quran) and `« »` / `‹ ›` (hadith, named quotations). The
 *    letters inside are the cited wording, so `أعْرَضَ → اعرض` would silently
 *    rewrite the ayah.
 * 2. Honorific and formulaic phrases (صلى الله عليه وسلم، رضي الله عنه…). These
 *    are recited as fixed strings, and `normalizeArabicLetters` mangles them
 *    (`صلى` → `صلي`) — including the very spellings `expandPuaHonorifics()`
 *    emits one pass earlier, so the cleaner would destroy its own output.
 *
 * Repository rule: the produced file is a faithful copy of the source, so this
 * is the fidelity gate, not a formatting preference.
 */

const CITATION_PAIRS = new Map<string, string>([
  ["﴿", "﴾"],
  ["«", "»"],
  ["‹", "›"],
]);

/** Fixed religious/formulaic phrases, longest first so an alternation prefers the longer reading. */
export const VERBATIM_PHRASES: readonly string[] = [
  "صلى الله عليه وآله وسلم",
  "صلى الله عليه وسلّم",
  "صلى الله عليه وسلم",
  "صلى الله وآله وسلم",
  "عليه الصلاة والسلام",
  "رضي الله عنهما",
  "رضي الله عنهم",
  "رضي الله عنها",
  "رضي الله عنه",
  "رحمه الله",
  "رحمة الله عليه",
  "عز وجل",
  "جل جلاله",
  "تبارك وتعالى",
  "سبحانه وتعالى",
  "الله تعالى",
  "أرسله الله",
  "آمين",
];

interface ProtectedRegion {
  readonly start: number;
  readonly end: number;
}

const OPENER_RE = /[﴿«‹]/g;
const PHRASE_RE = new RegExp(VERBATIM_PHRASES.join("|"), "g");

function nextCitation(text: string, from: number): number {
  OPENER_RE.lastIndex = from;
  const match = OPENER_RE.exec(text);
  return match ? match.index : -1;
}

function nextPhrase(text: string, from: number): ProtectedRegion | null {
  PHRASE_RE.lastIndex = from;
  const match = PHRASE_RE.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/**
 * Apply `fn` to every part of `text` that is not verbatim.
 *
 * Verbatim regions are copied byte-for-byte. An unterminated citation opener is
 * protected to the end of the text: when the cleaner cannot tell where a
 * quotation ends it must leave the text alone rather than guess.
 */
export function mapOutsideVerbatim(text: string, fn: (chunk: string) => string): string {
  if (!text) return text;

  let out = "";
  let cursor = 0;

  while (cursor < text.length) {
    const citeStart = nextCitation(text, cursor);
    const phrase = nextPhrase(text, cursor);

    // Whichever verbatim region starts first wins. -1 means "none", so the two
    // candidates are compared only when both exist.
    if (citeStart < 0 && !phrase) {
      return out + fn(text.slice(cursor));
    }
    const start =
      citeStart < 0 ? phrase!.start : !phrase ? citeStart : Math.min(citeStart, phrase.start);

    if (start > cursor) {
      out += fn(text.slice(cursor, start));
    }

    if (start === citeStart) {
      const closer = CITATION_PAIRS.get(text[citeStart]!)!;
      const close = text.indexOf(closer, citeStart + 1);
      if (close < 0) {
        // Unbalanced quote: emit the rest untouched rather than rewriting it.
        return out + text.slice(citeStart);
      }
      out += text.slice(citeStart, close + closer.length);
      cursor = close + closer.length;
    } else {
      out += text.slice(phrase!.start, phrase!.end);
      cursor = phrase!.end;
    }
  }

  return out;
}
