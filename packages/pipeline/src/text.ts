interface CleanOptions {
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

const DEFAULT_OPTIONS: CleanOptions = {
  normalizeUnicode: true,
  normalizeArabic: true,
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

// Unicode control characters that corrupt Arabic OCR output
const BIDI_CONTROL = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFFF0-\uFFFF\u00AD\u061C]/g;

// Tashkeel (diacritics)
const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1]/g;
const TATWEEL = /[\u0640]/g;

// Arabic letter normalization maps
const ALEF_PATTERNS = /[\u0622\u0623\u0625]/g; // آ أ إ → ا
const YAA_PATTERNS = /[\u064A\u0649\u06CC]/g; // ي ى → ي (standard ya)

const KAF_PATTERNS = /[\u06A9\u06AA]/g; // Normalize Persian/Urdu Keheh and Swash Kaf to Arabic Kaf

// OCR artifact: exclamation mark between Arabic letters (broken character mapping)
const OCR_EXCLAMATION = /([\u0600-\u06FF])!+([\u0600-\u06FF])/g;

// Line-ending connectives that force merge with next line
const LINE_END_CONTINUATIVE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+\s+(من|في|عن|على|إلى|حتى|مذ|منذ|لدى|مع|غير|سوى|بين|تحت|فوق|دون|قبل|بعد|عند|نحو|حول|أو|أم|ثم|بل|لا|قد|هل|لم|لن|إن|أن|ما|هذا|هذه|ذلك|تلك|هو|هي|هم|هن|الذين|التي|الذي)\s*$/;

// Line-start connectives that suggest continuation from previous line
const LINE_START_CONTINUATIVE =
  /^(و|ف|ب|ل|ك|فـ|بال|فلـ|ولـ|بل|هل|قد|سـ|فسـ|وسـ|لن|لم|لما|إن|أن|فإن|فأن|فقد|فهل|ولا|فلا|ولن|فلم|بأن|لكن|لعل|ليت|حيث|حين|عند|بين|بعد|قبل|تحت|فوق|مع|منذ|من|في|عن|على|إلى|حتى|حول|خلال|دون|نحو|غير|سوى|مثل|بسبب|بعدما|قبلما|حينما|كلما|أين|أينما|كيف|كيفما|أي|أيها|أيتها|يا)\s/;

// ASCII bullet characters that mark lists
const BULLET_START = /^[•·‣⁃\-–—]\s/;

// Garbage ratio threshold — lines exceeding this are filtered
const GARBAGE_THRESHOLD = 0.35;

// Allowed trailing punctuation (not stripped)
const ALLOWED_TRAILING =
  /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z0-9\s.,!?:;،؟؛()\]}\-'"»«﴿﴾]+$/g;

// Page number patterns
const PAGE_NUM_PATTERNS = [
  /^\d+$/,
  /^-\s*\d+\s*-$/,
  /^\d+\s*\/\s*\d+$/,
  /^\d+\s*-\s*\d+$/,
  /^\[?\d+\]?$/,
  /^\d+\s*$/,
  /^(Page|صفحة|ص)\s*\d+$/i,
  /^\d+\s*(of|من)\s*\d+$/i,
];

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
    // Rejoin broken definite articles (ال كتاب → الكتاب)
    // Only match when ال starts a word (preceded by non-Arabic or start of string)
    text = text.replace(
      /(^|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])ال\s+(?=[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])/g,
      "$1ال",
    );

    // Fix common OCR death date symbol misrecognition (e.g. ")© 430 ه)." -> "(ت 430 هـ)")
    text = text.replace(/[)\](]?\s*©\s*(?=\d+\s*ه)/g, "(ت ");
    // Fix Hijri year suffix (ه). -> هـ).)
    text = text.replace(/(\d+)\s*ه\s*[)\]]/g, "$1 هـ)");
  }

  if (opts.removeTashkeel) {
    text = text.replace(TASHKEEL, "");
  }

  if (opts.removeTatweel) {
    text = text.replace(TATWEEL, "");
  }

  if (opts.normalizeDigits) {
    // Arabic-Indic digits (٠-٩) → Western digits (0-9)
    text = text.replace(/[\u0660-\u0669]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x0660 + 0x0030),
    );
    // Eastern Arabic-Indic digits (۰-۹) → Western
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

  if (opts.removeBrokenHtml) {
    text = removeBrokenHtml(text);
  }

  if (opts.removeAsciiNoise) {
    text = removeAsciiNoise(text);
  }

  if (opts.removeRepeatedTokens) {
    text = removeRepeatedTokens(text);
  }

  if (opts.removeGarbageSymbols) {
    text = removeGarbageSymbols(text);
  }

  if (opts.normalizePunctuation) {
    text = normalizeArabicPunctuation(text);
  }

  if (opts.removeIsolatedFragments) {
    text = removeIsolatedFragments(text);
  }

  if (opts.collapseRepeatedWords) {
    text = collapseRepeatedWords(text);
  }

  if (opts.detectHeadings) {
    text = detectArabicHeadings(text);
  }

  if (opts.reconstructLines) {
    text = reconstructArabicLines(text);
    text = detectPostReconstructionHeadings(text);
  }

  if (opts.removePageNoise) {
    text = removePageNoise(text);
  }

  if (opts.collapseRepeatedParagraphs) {
    text = collapseRepeatedParagraphs(text);
  }

  if (opts.finalCleanup) {
    text = finalCleanup(text);
  }

  return text;
}

function removeBrokenHtml(text: string): string {
  // Remove <br>, <br/>, <br /> tags (common in OCR PDF extraction)
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Remove paired HTML tags: <u>...</u>, <b>...</b>, <i>...</i>, <em>...</em>, <strong>...</strong>
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
  // Remove any remaining HTML tags
  text = text.replace(/<[a-zA-Z][^>]{0,50}>/g, "");
  // Clean up extra newlines from br removal
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

      // If line is primarily Arabic (>40%), remove isolated Latin characters (OCR garbage)
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

  // Normalize comma: replace English comma with Arabic comma only if adjacent to Arabic text
  text = text.replace(new RegExp(`(${arabicRange}\\s*),`, "g"), "$1،");
  text = text.replace(new RegExp(`,\\s*(${arabicRange})`, "g"), "، $1");
  text = text.replace(/[،，]/g, "،");

  // Normalize semicolon: replace English semicolon with Arabic semicolon only if adjacent to Arabic text
  text = text.replace(new RegExp(`(${arabicRange}\\s*);`, "g"), "$1؛");
  text = text.replace(new RegExp(`;\\s*(${arabicRange})`, "g"), "؛ $1");
  text = text.replace(/[؛；]/g, "؛");

  // Normalize question mark: replace English question mark with Arabic question mark only if adjacent to Arabic text
  text = text.replace(new RegExp(`(${arabicRange}\\s*)\\?`, "g"), "$1؟");
  text = text.replace(new RegExp(`\\?\\s*(${arabicRange})`, "g"), "؟ $1");
  text = text.replace(/[؟？]/g, "؟");

  // Normalize Arabic colon variants → :
  text = text.replace(/[:：]/g, ":");
  // Normalize parentheses variants → () and ()
  text = text.replace(/[（]/g, "(");
  text = text.replace(/[）]/g, ")");
  // Normalize quotation marks variants
  text = text.replace(/[«»‹›〈〉]/g, (m) => (m === "«" || m === "‹" ? "" : ""));
  // Normalize dash variants → –
  text = text.replace(/[—ー‒]/g, "–");
  // Normalize ellipsis variants → … (U+2026)
  text = text.replace(/[.]{3,}|[…⋯⋯]{1,}/g, "…");
  // Clean up triple punctuation (،،، → ،)
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

      // Skip headings and bullets
      if (trimmed.startsWith("#") || trimmed.startsWith("- ") || trimmed.startsWith("> "))
        return line;

      // Remove lines with only 2-3 characters that are mostly symbols (not Arabic letters)
      if (trimmed.length <= 3) {
        const arabic = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
        const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
        const symbols = (trimmed.match(/[^a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g) || [])
          .length;
        // Only remove if it's all symbols (no real letters)
        if (arabic === 0 && latin === 0 && symbols > 0) return "";
      }

      return line;
    })
    .join("\n");
}

function collapseRepeatedWords(text: string): string {
  // Collapse immediately repeated words: "الله الله الله" → "الله"
  // Use character class instead of \b for Arabic word boundaries
  text = text.replace(/([\u0600-\u06FF]{2,})(\s+\1){2,}/g, "$1");
  // Collapse repeated phrases (2+ words repeated 3+ times)
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

    // Already-marked headings (# ## ###) — flush buffer and keep separate
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ") || trimmed.startsWith("### ")) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    // Bullet-starting lines — flush buffer and keep separate
    if (BULLET_START.test(trimmed)) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      result.push(trimmed);
      continue;
    }

    // Footnote or list-starting lines — flush buffer and keep separate
    if (/^\[?\s*\d+\s*\]?[\s\-.)]/.test(trimmed) || /^\(\d+\)/.test(trimmed) || /^[\u00B9\u00B2\u00B3]/.test(trimmed)) {
      if (buffer.length > 0) {
        result.push(buffer.join(" "));
        buffer = [];
      }
      prevEndsContinuative = false;
      // Ensure footnote numbers are formatted like Markdown footnotes if they look like [1]
      // Actually, just keep it separate for now
      result.push(trimmed);
      continue;
    }

    const endsWithPunct = /[.?!،.؟\u060C\u061F!]$/.test(trimmed);
    const isShort = trimmed.length < 40;
    const startsContinuative = LINE_START_CONTINUATIVE.test(trimmed);

    // Check if this line ends with a continuative (preposition/conjunction)
    const endsContinuative = LINE_END_CONTINUATIVE.test(trimmed);

    // Flush buffer if line is a clear paragraph boundary
    // (unless previous line ended with a continuative)
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

    // Short line — keep standalone unless continuing from previous line
    // or this line ends with a continuative (should merge with next)
    if (isShort && !startsContinuative && !prevEndsContinuative && !endsContinuative) {
      if (buffer.length > 0) {
        buffer.push(trimmed);
        result.push(buffer.join(" "));
        buffer = [];
      } else {
        result.push(trimmed);
      }
      // Update prevEndsContinuative even for short standalone lines
      // This handles: short preposition line followed by its object
      prevEndsContinuative = endsContinuative;
      continue;
    }

    // Merge into current paragraph
    buffer.push(trimmed);
    prevEndsContinuative = endsContinuative;
  }

  if (buffer.length > 0) {
    result.push(buffer.join(" "));
  }

  return result.join("\n");
}

function detectArabicHeadings(text: string): string {
  // Major headings (level 2): chapters, sections, major divisions
  const MAJOR_HEADING =
    /^(الفصل\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|[0-9]+)|الباب\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|المبحث\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|المطلب\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|[0-9]+)|القسم\s+(الأول|الاول|الثاني|الثالث|الرابع|[0-9]+)|الجزء\s+(الأول|الاول|الثاني|الثالث|الرابع|[0-9]+)|الدرس\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|الوحدة\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+))/;

  // Sub-headings (level 3): smaller divisions, appendices
  const SUB_HEADING =
    /^(سورة\s|الحديث\s|الخاتمة|المقدمة|المراجع|المصادر|الملاحق|النتائج|التوصيات|ملخص|خلاصة|تمهيد|مدخل|ملحوظة|تنبيه|فائدة|تتمة|تكملة|هامش|أسئلة|تمارين|تدريبات|أهداف)/;

  const NUMBERED_PAREN = /^\(\d+\)\s/;

  // Section markers: "المثال الأول", "المثال الثاني", etc.
  const EXAMPLE_HEADING = /^(المثال)\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس)/;

  // Participation markers: "المشاركة الأولى", "المشاركة الثانية", etc.
  const PARTICIPATION_HEADING = /^(المشاركة)\s+(الأولى|الأول|الثانية|الثاني|الثالثة|الثالث)/;

  // Ordinal sub-headings (after alef normalization: اولا, ثانيا, etc.)
  const ORDINAL_HEADING =
    /^(اولاً?|ثانياً?|ثالثاً?|رابعاً?|خامساً?|سادساً?|سابعاً?|ثامناً?|تاسعاً?|عاشراً?|أخيراً?|أخيرا)\s*[.:]?\s+/;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("## ") || trimmed.startsWith("# ") || trimmed.startsWith("### "))
        return line;

      const isNumbered = /^\d+[.\-)–—]\s/.test(trimmed);
      const isParenNumbered = NUMBERED_PAREN.test(trimmed);
      const isMajorHeading = MAJOR_HEADING.test(trimmed);
      const isSubHeading = SUB_HEADING.test(trimmed);
      const isExampleHeading = EXAMPLE_HEADING.test(trimmed);
      const isParticipationHeading = PARTICIPATION_HEADING.test(trimmed);
      const isOrdinalHeading = ORDINAL_HEADING.test(trimmed);

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
  const MAJOR_KW =
    /^(الفصل\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|[0-9]+)|الباب\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|المبحث\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|المطلب\s+(الأول|الاول|الثاني|الثالث|الرابع|[0-9]+)|الدرس\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+)|الوحدة\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|[0-9]+))/;

  const SUB_KW =
    /^(سورة\s|الحديث\s|الخاتمة|المقدمة|المراجع|المصادر|الملاحق|النتائج|التوصيات|ملخص|خلاصة|تمهيد|مدخل|ملحوظة|تنبيه|فائدة|تتمة|تكملة|هامش|أسئلة|تمارين|تدريبات|أهداف|مقدمة|خاتمة)/;

  const NUMBERED_PAREN = /^\(\d+\)\s/;
  const NUMBERED_HEADING = /^\d+[.)–—]\s+/;
  const EXAMPLE_HEADING = /^(المثال)\s+(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس)/;
  const PARTICIPATION_HEADING = /^(المشاركة)\s+(الأولى|الأول|الثانية|الثاني|الثالثة|الثالث)/;

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
        MAJOR_KW.test(trimmed) ||
        NUMBERED_PAREN.test(trimmed) ||
        NUMBERED_HEADING.test(trimmed) ||
        EXAMPLE_HEADING.test(trimmed) ||
        PARTICIPATION_HEADING.test(trimmed)
      ) {
        return `## ${trimmed}`;
      }

      if (SUB_KW.test(trimmed)) return `### ${trimmed}`;

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

      // Remove standalone page numbers
      for (const pattern of PAGE_NUM_PATTERNS) {
        if (pattern.test(trimmed)) return false;
      }

      // Remove common OCR artifacts
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
      // Remove OCR artifact exclamation marks between Arabic letters
      l = l.replace(OCR_EXCLAMATION, "$1$2");
      // Only strip leading non-Arabic noise but preserve heading and bullet markers
      if (
        !l.startsWith("## ") &&
        !l.startsWith("# ") &&
        !l.startsWith("### ") &&
        !l.startsWith("- ") &&
        !l.startsWith("> ") &&
        !BULLET_START.test(l)
      ) {
        l = l.replace(/^[^\u0600-\u06FF\w\d]+/g, "");
      }
      // Remove trailing noise but preserve common punctuation
      l = l.replace(ALLOWED_TRAILING, "");
      return l;
    })
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      // Remove lines with only punctuation/symbols
      if (/^[\s\-–—•·*]+$/.test(trimmed)) return false;
      // Garbage ratio: lines with > threshold non-standard chars are likely garbage
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

export interface TextAnalysis {
  pageCount: number;
  headingCount: number;
  level1HeadingCount: number;
  level2HeadingCount: number;
  level3HeadingCount: number;
  wordCount: number;
  charCount: number;
  arabicRatio: number;
  garbageRatio: number;
  htmlFragmentCount: number;
  paragraphCount: number;
  qualityScore: number;
}

export function analyzeText(text: string, knownPageCount?: number): TextAnalysis {
  const lines = text.split("\n").filter(Boolean);
  const level1Headings = lines.filter((l) => l.startsWith("# ")).length;
  const level2Headings = lines.filter((l) => l.startsWith("## ")).length;
  const level3Headings = lines.filter((l) => l.startsWith("### ")).length;
  const headings = level1Headings + level2Headings + level3Headings;
  const words = text.split(/\s+/).filter(Boolean);
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  const arabicRatio = totalChars > 0 ? arabicChars / totalChars : 0;

  // Garbage ratio: lines where < 30% are Arabic
  const nonEmptyLines = lines.filter((l) => l.trim().length > 5);
  const garbageLines = nonEmptyLines.filter((l) => {
    const chars = l.replace(/\s/g, "");
    if (chars.length < 5) return false;
    const arabicCount = (chars.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    return arabicCount / chars.length < 0.3;
  });
  const garbageRatio = nonEmptyLines.length > 0 ? garbageLines.length / nonEmptyLines.length : 0;

  // HTML fragment count
  const htmlFragments = (text.match(/<[a-zA-Z][^>]{0,50}>/g) || []).length;

  // Paragraph count (double-newline separated blocks)
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 10);

  // Quality score (0-100)
  const arabicScore = Math.min(1, arabicRatio / 0.9) * 30;
  const headingScore = Math.min(1, headings / Math.max(1, Math.ceil(words.length / 500))) * 20;
  const garbagePenalty = garbageRatio * 20;
  const paragraphScore = paragraphs.length > 1 ? 15 : paragraphs.length === 1 ? 5 : 0;
  const sizeScore = words.length > 100 ? 15 : (words.length / 100) * 15;
  const qualityScore = Math.round(
    Math.min(100, arabicScore + headingScore + paragraphScore + sizeScore - garbagePenalty),
  );

  return {
    pageCount:
      knownPageCount && knownPageCount > 0
        ? knownPageCount
        : Math.max(1, Math.ceil(words.length / 250)),
    headingCount: headings,
    level1HeadingCount: level1Headings,
    level2HeadingCount: level2Headings,
    level3HeadingCount: level3Headings,
    wordCount: words.length,
    charCount: text.length,
    arabicRatio: totalChars > 0 ? arabicChars / totalChars : 0,
    garbageRatio,
    htmlFragmentCount: htmlFragments,
    paragraphCount: paragraphs.length,
    qualityScore,
  };
}
