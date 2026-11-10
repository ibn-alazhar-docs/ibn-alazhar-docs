import {
  BULLET_START,
  LINE_END_CONTINUATIVE,
  LINE_START_CONTINUATIVE,
  PAGE_NUM_PATTERNS,
  HEADING_NUMBERED_PAREN,
  HEADING_NUMBERED,
  HEADING_EXAMPLE,
  HEADING_PARTICIPATION,
  HEADING_MAJOR,
  HEADING_SUB,
  HEADING_ORDINAL,
  ARABIC_LETTER_CLASS,
  ARABIC_LETTER_RANGES,
  DIGIT_CLASS,
  countArabicLetters,
} from "../constants";

/** Non-content characters (canonical Arabic letters, Latin, digits excluded). */
const SYMBOL_CHARS = new RegExp(`[^${ARABIC_LETTER_RANGES}a-zA-Z0-9\\s]`, "g");
/** A line that is only digits and rules is page furniture in any digit family. */
const ONLY_DIGITS_AND_RULES = new RegExp(`^[${DIGIT_CLASS}\\s\\-–—|/\\\\]+$`);
/** Arabic word/phrase echo runs produced by OCR line doubling. */
// The capture group must wrap the whole repeated word: `(${ARABIC_LETTER_CLASS}){2,}` would
// capture a single letter, making the `\1` backref match one char and `$1` delete the word.
const REPEATED_ARABIC_WORD = new RegExp(`(${ARABIC_LETTER_CLASS}{2,})(\\s+\\1){2,}`, "g");
const REPEATED_ARABIC_PHRASE = new RegExp(
  `((?:${ARABIC_LETTER_CLASS}+\\s+){1,3}${ARABIC_LETTER_CLASS}+)(\\s+\\1){2,}`,
  "g",
);

/**
 * A line starting with `|` is one table row. It is structure, so no pass may treat it
 * as garbage, page furniture, or a paragraph to merge — including the "| --- |" delimiter
 * row, which is what makes the header parse as a table at all.
 */
function isTableRow(trimmed: string): boolean {
  return trimmed.startsWith("|");
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function collapseRepeatedParagraphs(text: string): string {
  const paragraphs = text.split("\n\n");
  const result: string[] = [];
  let prevParagraph = "";

  for (const para of paragraphs) {
    const normalized = para.trim().replace(/\s+/g, " ");
    if (prevParagraph && normalized.length > 20 && similarity(normalized, prevParagraph) > 0.7) {
      continue;
    }
    result.push(para);
    prevParagraph = normalized;
  }

  return result.join("\n\n");
}

export function reconstructArabicLines(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let buffer: string[] = [];
  let prevEndsContinuative = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push("");
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("# ") || trimmed.startsWith("### ")) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    if (BULLET_START.test(trimmed)) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    // Table rows are structural: each line is one row, so merging them into a
    // paragraph (or severing a cell in half) destroys the table.
    if (isTableRow(trimmed)) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    // Page-noise lines (e.g. "صفحة 5", "- 5 -", standalone digit) must stay
    // standalone so removePageNoise (which runs after reconstruction) can
    // drop them. Without this they get merged into the buffered paragraph
    // ("بسم الله صفحة 5") and survive as content.
    if (PAGE_NUM_PATTERNS.some((p) => p.test(trimmed))) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    if (
      /^\[?\s*\d+\s*\]?[\s\-.)]/.test(trimmed) ||
      /^\(\d+\)/.test(trimmed) ||
      /^[\u00B9\u00B2\u00B3]/.test(trimmed)
    ) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    const endsWithPunct = /[.?!،.؟\u060C\u061F!]$/.test(trimmed);
    const startsContinuative = LINE_START_CONTINUATIVE.test(trimmed);
    const endsContinuative = LINE_END_CONTINUATIVE.test(trimmed);

    if (endsWithPunct && !startsContinuative && !prevEndsContinuative) {
      if (buffer.length > 0) {
        buffer.push(trimmed);
        result.push(buffer.join(" "));
        buffer = [];
      } else {
        result.push(trimmed);
      }
      prevEndsContinuative = endsContinuative;
      continue;
    }

    // A short line that neither starts nor ends continuative used to FLUSH the
    // buffer here. That split a paragraph whenever its last line was long: the
    // flush left the buffer empty, so the sentence-final line was pushed on its
    // own and only merged on a second pass — the pipeline had no fixed point.
    // Short lines now take the same path as every other content line.
    buffer.push(trimmed);
    prevEndsContinuative = endsContinuative;
  }

  if (buffer.length > 0) {
    result.push(buffer.join(" "));
  }

  return result.join("\n");
}

export function detectArabicHeadings(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("## ") || trimmed.startsWith("# ") || trimmed.startsWith("### "))
        return line;

      const isNumbered = /^\d+[.\-)–—]\s/.test(trimmed);
      const isParenNumbered = HEADING_NUMBERED_PAREN.test(trimmed);
      const isMajorHeading = HEADING_MAJOR.test(trimmed);
      const isSubHeading = HEADING_SUB.test(trimmed);
      const isExampleHeading = HEADING_EXAMPLE.test(trimmed);
      const isParticipationHeading = HEADING_PARTICIPATION.test(trimmed);
      const isOrdinalHeading = HEADING_ORDINAL.test(trimmed);

      if (
        isMajorHeading ||
        isNumbered ||
        isParenNumbered ||
        isExampleHeading ||
        isParticipationHeading
      ) {
        return `## ${trimmed}`;
      }

      if (isSubHeading || isOrdinalHeading) {
        return `### ${trimmed}`;
      }

      return line;
    })
    .join("\n");
}

export function detectPostReconstructionHeadings(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("## ") ||
        trimmed.startsWith("# ") ||
        trimmed.startsWith("### ")
      )
        return line;

      if (
        HEADING_MAJOR.test(trimmed) ||
        HEADING_NUMBERED_PAREN.test(trimmed) ||
        HEADING_NUMBERED.test(trimmed) ||
        HEADING_EXAMPLE.test(trimmed) ||
        HEADING_PARTICIPATION.test(trimmed)
      ) {
        return `## ${trimmed}`;
      }

      if (HEADING_SUB.test(trimmed)) return `### ${trimmed}`;

      return line;
    })
    .join("\n");
}

export function removePageNoise(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (isTableRow(trimmed)) return true;

      for (const pattern of PAGE_NUM_PATTERNS) {
        if (pattern.test(trimmed)) return false;
      }

      if (/^[•·\-–—*]+$/.test(trimmed)) return false;
      if (ONLY_DIGITS_AND_RULES.test(trimmed)) return false;
      if (/^[A-Z\s]{3,}$/.test(trimmed) && trimmed.length < 20) return false;

      return true;
    })
    .join("\n");
}

export function removeRepeatedTokens(text: string): string {
  return text.replace(/\b(\S+)(\s+\1){3,}\b/g, "$1");
}

export function removeGarbageSymbols(text: string, confidence?: number): string {
  const aggressiveness = confidence !== undefined ? 1.0 - confidence : 0.5;
  const symbolThreshold = 0.6 + aggressiveness * 0.2;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (isTableRow(trimmed)) return line;

      const chars = trimmed.replace(/\s/g, "");
      if (chars.length < 2) return line;

      const arabic = countArabicLetters(chars);
      const latin = (chars.match(/[a-zA-Z]/g) || []).length;
      const digits = (chars.match(/[0-9]/g) || []).length;
      const symbols = (chars.match(SYMBOL_CHARS) || []).length;

      const realContent = arabic + latin + digits;

      if (chars.length > 5 && symbols / chars.length > symbolThreshold && realContent < 2) {
        return "";
      }

      // Pure-punctuation lines are noise: includes Arabic ؟ and ؛ alongside the
      // fullwidth/ASCII marks. Threshold {4,} so a "؟؟؟؟" line is dropped while
      // short ellipsis fragments stay untouched.
      if (/^[？？！.،؛؟\-\s]{4,}$/.test(trimmed)) {
        return "";
      }

      return line;
    })
    .join("\n");
}

export function removeIsolatedFragments(text: string, confidence?: number): string {
  const minLength = confidence !== undefined && confidence > 0.8 ? 2 : 3;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#") || trimmed.startsWith("- ") || trimmed.startsWith("> "))
        return line;

      if (trimmed.length <= minLength) {
        const arabic = countArabicLetters(trimmed);
        const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
        const digits = (trimmed.match(/[0-9]/g) || []).length;
        const symbols = (trimmed.match(SYMBOL_CHARS) || []).length;

        if (arabic > 0 || latin > 0 || digits > 0) return line;

        if (symbols > 0 && arabic === 0 && latin === 0 && digits === 0) return "";
      }

      return line;
    })
    .join("\n");
}

export function collapseRepeatedWords(text: string): string {
  text = text.replace(REPEATED_ARABIC_WORD, "$1");
  text = text.replace(REPEATED_ARABIC_PHRASE, "$1");
  return text;
}
