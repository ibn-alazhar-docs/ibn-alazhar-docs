import {
  BIDI_CONTROL,
  TASHKEEL,
  TATWEEL,
  ALEF_PATTERNS,
  YAA_PATTERNS,
  KAF_PATTERNS,
  OCR_EXCLAMATION,
  LINE_END_CONTINUATIVE,
  LINE_START_CONTINUATIVE,
  BULLET_START,
  GARBAGE_THRESHOLD,
  ALLOWED_TRAILING,
  PAGE_NUM_PATTERNS,
  HEADING_NUMBERED_PAREN,
  HEADING_NUMBERED,
  HEADING_EXAMPLE,
  HEADING_PARTICIPATION,
  HEADING_MAJOR,
  HEADING_SUB,
  HEADING_ORDINAL,
  DEFAULT_OPTIONS,
  type CleanOptions,
} from "./constants";

export type { CleanOptions };

function removeBrokenHtml(text: string): string {
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?u>/gi, "");
  text = text.replace(/<\/?b>/gi, "");
  text = text.replace(/<\/?i>/gi, "");
  text = text.replace(/<\/?em>/gi, "");
  text = text.replace(/<\/?strong>/gi, "");
  text = text.replace(/<\/?span[^>]*>/gi, "");
  text = text.replace(/<\/?div[^>]*>/gi, "");
  text = text.replace(/<\/?p>/gi, "\n");
  text = text.replace(/<\/?font[^>]*>/gi, "");
  text = text.replace(/<\/?a[^>]*>/gi, "");
  text = text.replace(/<\/?sup>/gi, "");
  text = text.replace(/<\/?sub>/gi, "");
  text = text.replace(/<[a-zA-Z][^>]{0,50}>/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}

function removeAsciiNoise(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#") || trimmed.startsWith("---")) return line;

      const arabicChars = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || [])
        .length;
      const totalChars = trimmed.replace(/\s/g, "").length;
      if (totalChars === 0) return line;

      const arabicRatio = arabicChars / totalChars;

      if (arabicRatio > 0.4) {
        return trimmed
          .replace(/\b[a-zA-Z]{1,2}\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      return line;
    })
    .join("\n");
}

function removeRepeatedTokens(text: string): string {
  return text.replace(/\b(\S+)(\s+\1){3,}\b/g, "$1");
}

function removeGarbageSymbols(text: string): string {
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

      if (chars.length > 5 && symbols / chars.length > 0.6 && realContent < 3) {
        return "";
      }

      if (/^[؟?!.،،،\-\s]{4,}$/.test(trimmed)) {
        return "";
      }

      return line;
    })
    .join("\n");
}

function normalizeArabicPunctuation(text: string): string {
  const arabicRange = "[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]";

  text = text.replace(new RegExp(`(${arabicRange}\\s*),`, "g"), "$1،");
  text = text.replace(new RegExp(`,\\s*(${arabicRange})`, "g"), "، $1");
  text = text.replace(/[،，]/g, "،");

  text = text.replace(new RegExp(`(${arabicRange}\\s*);`, "g"), "$1؛");
  text = text.replace(new RegExp(`;\\s*(${arabicRange})`, "g"), "؛ $1");
  text = text.replace(/[؛；]/g, "؛");

  text = text.replace(new RegExp(`(${arabicRange}\\s*)\\?`, "g"), "$1؟");
  text = text.replace(new RegExp(`\\?\\s*(${arabicRange})`, "g"), "؟ $1");
  text = text.replace(/[؟？]/g, "؟");

  text = text.replace(/[:：]/g, ":");
  text = text.replace(/[（]/g, "(");
  text = text.replace(/[）]/g, ")");
  text = text.replace(/[«»‹›〈〉]/g, (m) => (m === "«" || m === "‹" ? "" : ""));
  text = text.replace(/[—ー‒]/g, "–");
  text = text.replace(/[.]{3,}|[…⋯⋯]{1,}/g, "…");
  text = text.replace(/،{2,}/g, "،");
  text = text.replace(/؛{2,}/g, "؛");
  return text;
}

function removeIsolatedFragments(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#") || trimmed.startsWith("- ") || trimmed.startsWith("> "))
        return line;

      if (trimmed.length <= 3) {
        const arabic = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
        const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
        const symbols = (trimmed.match(/[^a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g) || [])
          .length;
        if (arabic === 0 && latin === 0 && symbols > 0) return "";
      }

      return line;
    })
    .join("\n");
}

function collapseRepeatedWords(text: string): string {
  text = text.replace(/([\u0600-\u06FF]{2,})(\s+\1){2,}/g, "$1");
  text = text.replace(/((?:[\u0600-\u06FF]+\s+){1,3}[\u0600-\u06FF]+)(\s+\1){2,}/g, "$1");
  return text;
}

function collapseRepeatedParagraphs(text: string): string {
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

function similarity(a: string, b: string): number {
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

function reconstructArabicLines(text: string): string {
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

function detectArabicHeadings(text: string): string {
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

function detectPostReconstructionHeadings(text: string): string {
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

function removePageNoise(text: string): string {
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

function finalCleanup(text: string): string {
  return text
    .split("\n")
    .map((line) => {
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
        l = l.replace(/^[^\u0600-\u06FF\w\d]+/, "");
      }
      l = l.replace(ALLOWED_TRAILING, "");
      return l;
    })
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^[\s\-–—•·*]+$/.test(trimmed)) return false;
      const chars = trimmed.replace(/\s/g, "");
      if (chars.length < 3) return true;
      const arabic = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
      const english = (chars.match(/[a-zA-Z0-9]/g) || []).length;
      const punct = (chars.match(/[-.,!?:;،؟؛\](){}"'>&*%=@#«»]/g) || []).length;
      const known = arabic + english + punct;
      const ratio = chars.length > 0 ? known / chars.length : 1;
      return ratio >= 1 - GARBAGE_THRESHOLD;
    })
    .join("\n");
}

export function cleanArabicText(raw: string, options: CleanOptions = DEFAULT_OPTIONS): string {
  let text = raw;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (opts.normalizeUnicode) {
    text = text.normalize("NFKC");
    text = text.replace(BIDI_CONTROL, "");
  }

  if (opts.normalizeArabic) {
    text = text.replace(ALEF_PATTERNS, "ا");
    text = text.replace(YAA_PATTERNS, "ي");
    text = text.replace(KAF_PATTERNS, "ك");
    text = text.replace(
      /(^|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])ال\s+(?=[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])/g,
      "$1ال",
    );
    text = text.replace(/[)\](]?\s*©\s*(?=\d+\s*ه)/g, "(ت ");
    text = text.replace(/(\d+)\s*ه\s*[)\]]/g, "$1 هـ)");
  }

  if (opts.removeTashkeel) text = text.replace(TASHKEEL, "");
  if (opts.removeTatweel) text = text.replace(TATWEEL, "");

  if (opts.normalizeDigits) {
    text = text.replace(/[\u0660-\u0669]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x0660 + 0x0030),
    );
    text = text.replace(/[\u06F0-\u06F9]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x06f0 + 0x0030),
    );
  }

  if (opts.normalizeWhitespace) {
    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/\r/g, "\n");
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text
      .split("\n")
      .map((l) => l.trim())
      .join("\n");
    text = text.trim();
  }

  if (opts.removeBrokenHtml) text = removeBrokenHtml(text);
  if (opts.removeAsciiNoise) text = removeAsciiNoise(text);
  if (opts.removeRepeatedTokens) text = removeRepeatedTokens(text);
  if (opts.removeGarbageSymbols) text = removeGarbageSymbols(text);
  if (opts.normalizePunctuation) text = normalizeArabicPunctuation(text);
  if (opts.removeIsolatedFragments) text = removeIsolatedFragments(text);
  if (opts.collapseRepeatedWords) text = collapseRepeatedWords(text);
  if (opts.detectHeadings) text = detectArabicHeadings(text);
  if (opts.reconstructLines) {
    text = reconstructArabicLines(text);
    text = detectPostReconstructionHeadings(text);
  }
  if (opts.removePageNoise) text = removePageNoise(text);
  if (opts.collapseRepeatedParagraphs) text = collapseRepeatedParagraphs(text);
  if (opts.finalCleanup) text = finalCleanup(text);

  return text;
}

export async function enhanceArabicText(text: string): Promise<string> {
  // 1. Restore diacritics via Python script
  const { execFile } = await import("child_process");
  const { mkdtemp, writeFile, rm } = await import("fs/promises");
  const { join, dirname } = await import("path");
  const { tmpdir } = await import("os");
  const { fileURLToPath } = await import("url");

  const tempDir = await mkdtemp(join(tmpdir(), "diacritics-"));
  const inputPath = join(tempDir, "input.json");
  const scriptPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "scripts",
    "diacritics.py",
  );

  try {
    await writeFile(inputPath, JSON.stringify({ texts: [text] }));

    const pythonCommand = process.env.PYTHON_CMD || "python3";
    const resultJson = await new Promise<string>((resolve, reject) => {
      const proc = execFile(
        pythonCommand,
        [scriptPath, inputPath],
        { timeout: 300_000 },
        (err, stdout) => {
          if (err) {
            reject(new Error(`DIACRITICS_EXECUTION_FAILED: ${err.message}`));
            return;
          }
          resolve(stdout.trim());
        },
      );
      proc.on("error", reject);
    });

    const parsed = JSON.parse(resultJson);
    if (parsed.error) {
      throw new Error(`DIACRITICS_SCRIPT_ERROR: ${parsed.error}`);
    }

    const enhanced = parsed.results?.[0] || text;

    // 2. Contextual LLM OCR Error Correction
    // In a fully configured environment, we would inject Gemini API keys or a local LLM client here
    // Example: enhanced = await validateWithContextualLLM(enhanced, config);
    // This serves as the integration point for Phase 4.

    return enhanced;
  } catch {
    // Fallback to original text if enhancement fails to ensure pipeline resilience
    return text;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
