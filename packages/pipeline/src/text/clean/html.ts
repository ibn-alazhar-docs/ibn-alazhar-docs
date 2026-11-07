import {
  OCR_EXCLAMATION,
  BULLET_START,
  ALLOWED_TRAILING,
  GARBAGE_THRESHOLD,
  ARABIC_LETTER_CLASS,
  ARABIC_LETTER_RANGES,
  ARABIC_STRONG_MIN_RATIO,
  countArabicLetters,
} from "../constants";

/**
 * A standalone one-letter Latin token on an Arabic-dominant line is OCR noise
 * ("كلمات a b c"), not a word. Known limit: an English article "a" inside a
 * code-switched phrase is removed too — the same trade the layer always made,
 * now confined to single letters instead of the old {1,2} sweep.
 */
const STANDALONE_SINGLE_LATIN = /(?<=^|\s)[a-zA-Z](?=\s|$)/g;
/** "كلمrnبع": a Latin run glued inside an Arabic word is an OCR seam, not a unit. */
const GLUED_LATIN = new RegExp(
  `(?<=[${ARABIC_LETTER_RANGES}])[a-zA-Z]{1,2}(?=[${ARABIC_LETTER_RANGES}])`,
  "g",
);

export function removeBrokenHtml(text: string): string {
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?u>/gi, "");
  text = text.replace(/<\/?b>/gi, "");
  text = text.replace(/<\/?i>/gi, "");
  text = text.replace(/<\/?em>/gi, "");
  text = text.replace(/<\/?strong>/gi, "");
  text = text.replace(/<\/?span[^>]*>/gi, "");
  text = text.replace(/<\/?div[^>]*>/gi, "");
  text = text.replace(/<\/?p>/gi, "\n");
  // Cell and row ends are structure. Stripping them fused neighbours into one
  // non-word ("<td>الكتاب</td><td>المؤلف</td>" → "الكتابالمؤلف") and let the line
  // reconstruction merge whole rows. Cells become the same `|` shape the pipeline
  // already protects; `</tr>` becomes the line break that keeps rows apart.
  text = text.replace(/<t[dh][^>]*>/gi, " | ");
  text = text.replace(/<\/t[dh]>/gi, "");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/?font[^>]*>/gi, "");
  text = text.replace(/<\/?a[^>]*>/gi, "");
  text = text.replace(/<\/?sup>/gi, "");
  text = text.replace(/<\/?sub>/gi, "");
  text = text.replace(/<[a-zA-Z][^>]{0,50}>/g, "");
  // Closing tags carry a "/" right after "<", so the pattern above never matched
  // them: `</td>` survived, and the ASCII-noise pass then ate "td" out of it,
  // leaving `</>` inside table cells.
  text = text.replace(/<\/[a-zA-Z][^>]{0,50}>/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}

export function removeAsciiNoise(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#") || trimmed.startsWith("---")) return line;

      const arabicChars = countArabicLetters(trimmed);
      const totalChars = trimmed.replace(/\s/g, "").length;
      if (totalChars === 0) return line;

      const arabicRatio = arabicChars / totalChars;

      if (arabicRatio > ARABIC_STRONG_MIN_RATIO) {
        // Fidelity rule: a space-separated Latin token is content, not noise —
        // "25 mg" is a dose and "IBM" is a name — so the old blanket
        // `\b[a-zA-Z]{1,2}\b` deletion is gone. Two shapes remain, and neither
        // has an Arabic reading: a lone Latin letter between Arabic words, and
        // a Latin run GLUED inside an Arabic word (كلمrnبع).
        return trimmed
          .replace(STANDALONE_SINGLE_LATIN, "")
          .replace(GLUED_LATIN, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      return line;
    })
    .join("\n");
}

/**
 * قاعدة الأمانة: « » ‹ › marks that exist in the source are content — verify-quotes.ts
 * anchors hadith detection on them (`HADITH_RE = /«([^»]{25,600})»/g`) and footnote
 * reconstruction matches quoted book names inside «…». They must survive untouched.
 * Straight ASCII double quotes are converted only when the mapping is reliable
 * (balanced pair on one line, Arabic-bearing span, at most one guillemet level);
 * every unreliable case is left exactly as-is — never guessed, never deleted.
 * Single quotes/apostrophes are never touched (they carry Latin possessives).
 */
function convertStraightQuotesInLine(line: string): string {
  const straight: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') straight.push(i);
  }
  // Odd count: a quote opened before this line or runs past it — pairing here
  // would be guesswork, so leave the whole line alone.
  if (straight.length === 0 || straight.length % 2 !== 0) return line;

  // Unbalanced guillemets already on the line ⇒ the nesting depth of any
  // straight pair cannot be known — leave the whole line alone.
  const openMarks = (line.match(/[«‹]/g) ?? []).length;
  const closeMarks = (line.match(/[»›]/g) ?? []).length;
  if (openMarks !== closeMarks) return line;

  // Guillemet nesting depth at each index: 0 = outside any quoted region,
  // 1 = directly inside «…» (inner level → ‹…›, so nesting is not flattened).
  const depthAt: number[] = [];
  let depth = 0;
  for (const ch of line) {
    depthAt.push(depth);
    if (ch === "«" || ch === "‹") depth++;
    else if (ch === "»" || ch === "›") depth = Math.max(0, depth - 1);
  }

  let out = "";
  let cursor = 0;
  for (let k = 0; k < straight.length; k += 2) {
    const open = straight[k]!;
    const close = straight[k + 1]!;
    const inner = line.slice(open + 1, close);
    const core = inner.trim();
    const level = depthAt[open]!;
    // A pair whose span crosses an existing guillemet boundary is ambiguous — skip.
    const crossesGuillemet = /[«»‹›]/.test(inner);
    const convertible =
      core.length > 0 && countArabicLetters(core) > 0 && level <= 1 && !crossesGuillemet;
    let segment = inner;
    if (convertible) {
      const openMark = level === 0 ? "«" : "‹";
      const closeMark = level === 0 ? "»" : "›";
      const lead = inner.slice(0, inner.length - inner.trimStart().length);
      const trail = inner.slice(inner.trimEnd().length);
      segment = lead + openMark + core + closeMark + trail;
    } else {
      segment = `"${inner}"`;
    }
    out += line.slice(cursor, open) + segment;
    cursor = close + 1;
  }
  return out + line.slice(cursor);
}

export function normalizeArabicPunctuation(text: string): string {
  const arabicRange = ARABIC_LETTER_CLASS;

  text = text.replace(new RegExp(`(${arabicRange}\\s*),`, "g"), "$1،");
  text = text.replace(new RegExp(`,\\s*(${arabicRange})`, "g"), "، $1");
  text = text.replace(/[،،]/g, "،");

  text = text.replace(new RegExp(`(${arabicRange}\\s*);`, "g"), "$1؛");
  text = text.replace(new RegExp(`;\\s*(${arabicRange})`, "g"), "؛ $1");
  text = text.replace(/[؛；]/g, "؛");

  text = text.replace(new RegExp(`(${arabicRange}\\s*)\\?`, "g"), "$1؟");
  text = text.replace(new RegExp(`\\?\\s*(${arabicRange})`, "g"), "؟ $1");
  text = text.replace(/[؟？]/g, "؟");

  text = text.replace(/[:：]/g, ":");
  text = text.replace(/[（]/g, "(");
  text = text.replace(/[）]/g, ")");
  // « » ‹ › are KEPT (content). Only 〈〉 (CJK corner brackets, U+3008/3009) stay
  // deleted: they never occur in Arabic sources — always an OCR/mojibake artifact.
  text = text.replace(/[〈〉]/g, "");
  // Dash and dot runs are CONTENT, not decoration: an em dash in the original
  // stays an em dash, and "......" is a fill-in-the-blank in exams. Rewriting
  // either is not a repair — it is a difference from the source. Only the
  // katakana chōonpu (U+30FC) is mapped: it cannot occur in an Arabic source
  // and always means a misread stretch mark.
  text = text.replace(/\u30FC/g, "\u2013");
  text = text.replace(/،{2,}/g, "،");
  text = text.replace(/؛{2,}/g, "؛");
  text = text.split("\n").map(convertStraightQuotesInLine).join("\n");
  return text;
}

/**
 * Leading OCR junk: anything that is not an Arabic letter (canonical range), word
 * or digit. Arabic quotation/ornament brackets («»‹›﴿﴾) are content — a line
 * legitimately starts with ﴿… or «… and must not be stripped (same أمانة rule
 * as normalizeArabicPunctuation). Round and square brackets are in the same class:
 * they open scholarly footnote markers — "(١) قال المحقق", "[2] انظر" — and eating
 * the opener leaves an unbalanced bracket and a corrupted reference.
 */
const LEADING_JUNK = new RegExp(`^[^${ARABIC_LETTER_RANGES}\\w\\d«»‹›﴿﴾|()\\[\\]]+`);

export function finalCleanup(text: string): string {
  const mapped = text.split("\n").map((line) => {
    let l = line;
    l = l.replace(OCR_EXCLAMATION, "$1$2");
    if (
      !l.startsWith("## ") &&
      !l.startsWith("# ") &&
      !l.startsWith("### ") &&
      !l.startsWith("- ") &&
      !l.startsWith("> ") &&
      !BULLET_START.test(l)
    ) {
      l = l.replace(LEADING_JUNK, "");
    }
    l = l.replace(ALLOWED_TRAILING, "");
    return l;
  });
  // Keep paragraph breaks: blank lines are the separators that
  // reconstructArabicLines / collapseRepeatedParagraphs produce. Dropping
  // them here made cleanArabicText non-idempotent — a second pass merged
  // the (now adjacent) short paragraphs into one line. Collapse runs of
  // blank lines to a single separator and trim the edges instead.
  const kept: string[] = [];
  for (const line of mapped) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (kept.length > 0 && kept[kept.length - 1] !== "") kept.push("");
      continue;
    }
    if (/^[\s\-–—•·*]+$/.test(trimmed)) continue;
    const chars = trimmed.replace(/\s/g, "");
    if (chars.length >= 3) {
      const arabic = countArabicLetters(chars);
      const english = (chars.match(/[a-zA-Z0-9]/g) || []).length;
      const punct = (chars.match(/[-.,!?:;،؟؛\]{}">'>&*%=@#«»‹›﴿﴾]/g) || []).length;
      const known = arabic + english + punct;
      const ratio = chars.length > 0 ? known / chars.length : 1;
      if (ratio < 1 - GARBAGE_THRESHOLD) continue;
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}
