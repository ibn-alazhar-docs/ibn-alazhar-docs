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
} from "../constants";

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
    const isShort = trimmed.length < 40;
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

    if (isShort && !startsContinuative && !prevEndsContinuative && !endsContinuative) {
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

      for (const pattern of PAGE_NUM_PATTERNS) {
        if (pattern.test(trimmed)) return false;
      }

      if (/^[•·\-–—*]+$/.test(trimmed)) return false;
      if (/^[\d\s\-–—|/\\]+$/.test(trimmed)) return false;
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

      const chars = trimmed.replace(/\s/g, "");
      if (chars.length < 2) return line;

      const arabic = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
      const latin = (chars.match(/[a-zA-Z]/g) || []).length;
      const digits = (chars.match(/[0-9]/g) || []).length;
      const symbols = (chars.match(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z0-9\s]/g) || [])
        .length;

      const realContent = arabic + latin + digits;

      if (chars.length > 5 && symbols / chars.length > symbolThreshold && realContent < 2) {
        return "";
      }

      if (/^[？？！.،،،\-\s]{5,}$/.test(trimmed)) {
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
        const arabic = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
        const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
        const digits = (trimmed.match(/[0-9]/g) || []).length;
        const symbols = (
          trimmed.match(/[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g) || []
        ).length;

        if (arabic > 0 || latin > 0 || digits > 0) return line;

        if (symbols > 0 && arabic === 0 && latin === 0 && digits === 0) return "";
      }

      return line;
    })
    .join("\n");
}

export function collapseRepeatedWords(text: string): string {
  text = text.replace(/([\u0600-\u06FF]{2,})(\s+\1){2,}/g, "$1");
  text = text.replace(/((?:[\u0600-\u06FF]+\s+){1,3}[\u0600-\u06FF]+)(\s+\1){2,}/g, "$1");
  return text;
}
