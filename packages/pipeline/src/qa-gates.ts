/**
 * qa-gates.ts — بوابة جودة قابلة للقياس قبل اعتماد أي كتاب.
 *
 * نقل من SKILLS/arabic-pdf-to-book/scripts/qa_gates.py (v2.9.0، 348 سطرًا).
 * العتبات وقواعد التحذير (warn) منقولة حرفيًا — هي إصلاحات إيجابيات كاذبة
 * مكتسبة بجهد (تشغيل صغير، وضع بصري، نسب 0.85 نص / 0.5 ناتج).
 *
 * الحكم = رمز الخروج:
 *   0  نجحت كل البوابات
 *   1  فشل بند واحد أو أكثر (التفاصيل في التقرير)
 *   2  خطأ استعمال/ملف مفقود — يُرجعه الطبقة الرقيقة (runQaGatesOnFile)
 *
 * fail = !ok && !warn — التحذيرات لا تُسقط البناء أبدًا.
 *
 * البنية: دوال نقية (mdMetrics / tableProblems / lamSwapRate / evaluateQaGates)
 * + طبقة IO رقيقة (runQaGatesOnFile). عدّ pdfinfo → pdf-lib، وعدّ OMML
 * يبقى حيلة عدّ `<m:oMath` في word/document.xml لكن عبر نصّه الجاهز
 * (docxDocumentXml) فلا حاجة لمكتبة zip هنا.
 */

import { ARABIC_LETTER_CLASS, ARABIC_LETTER_RANGES, countArabicLetters } from "./text/constants";
import type { SevenStageAuditReport } from "./text/clean/text-cleaner";

export type QaExitCode = 0 | 1 | 2;

export interface QaCheck {
  name: string;
  ok: boolean;
  detail: string;
  warn: boolean;
}

export interface MdMetrics {
  lines: number;
  chars: number;
  headings: number;
  pages: number;
  duplicateLines: number;
  duplicateRatio: number;
  pagebreakLeak: boolean;
  badMarkup: boolean;
  camscanner: boolean;
  arabicRatio: number;
  placeholders: number;
  latinRatio: number;
  punctIssues: number;
  hamzaIssues: number;
  headingJumps: number;
}

export interface CleanReport {
  pages?: number;
  chars_per_page?: number;
  short_line_ratio?: number;
  solo_diacritics?: number;
  lines?: number;
  row_ratio?: number;
  [key: string]: unknown;
}

export interface DocxMetrics {
  paragraphs: number;
  chars: number;
  arabic: boolean;
  badMarkup: boolean;
}

export interface QaGatesOptions {
  lang?: "ar" | "en";
  minCpp?: number; // افتراضي 250
  maxShort?: number; // افتراضي 0.28 (ar) / 0.45 (en)
  maxSolo?: number; // افتراضي 20
  minPageRatio?: number; // افتراضي 0.85 — تغطية النص مقابل الأصل
  minOutputRatio?: number; // افتراضي 0.5 — حد أدنى لصفحات الناتج
  maxDup?: number; // افتراضي 0.20
  requireHeadings?: boolean;
  visual?: boolean; // كتاب بصري: نقص النص تحذير لا فشل
  reflow?: boolean; // ناتج معاد تدفقه (بوكليت): تُحكم الجودة بالحروف/التغطية لا بعدّ الصفحات
}

export interface QaGatesInput {
  md: string;
  raw?: string;
  cleanReport?: CleanReport;
  inputPages: number; // عدد صفحات الأصل الفعلي
  outputPages?: number; // صفحات الناتج إن لم يوجد تقرير تنظيف
  pdfOutPages?: number | null; // صفحات PDF الناتج (null = لم يُطلب)
  docx?: DocxMetrics | null; // null = لم يُطلب DOCX
  docxDocumentXml?: string; // word/document.xml لعدّ OMML
  options?: QaGatesOptions;
}

export interface QaReport {
  pass: boolean;
  exitCode: QaExitCode;
  inputPages: number;
  outputPages: number;
  charsPerPage: number;
  metrics: MdMetrics;
  checks: QaCheck[];
}

/**
 * Canonical QA-gate thresholds — SINGLE SOURCE OF TRUTH.
 *
 * Ported verbatim from `SKILLS/arabic-pdf-to-book/scripts/qa_gates.py` (v2.9.0);
 * the numbers are earned false-positive fixes and must not be re-inlined in
 * callers or duplicated by future converter ports.
 */
export const QA_GATE_DEFAULTS: Required<Omit<QaGatesOptions, "lang">> & { lang: "ar" } = {
  lang: "ar",
  minCpp: 250,
  maxShort: 0.28,
  maxSolo: 20,
  minPageRatio: 0.85,
  minOutputRatio: 0.5,
  maxDup: 0.2,
  requireHeadings: false,
  visual: false,
  reflow: false,
};

/** English documents tolerate more short lines than Arabic. */
export const MAX_SHORT_LINE_RATIO_BY_LANG: Record<"ar" | "en", number> = {
  ar: QA_GATE_DEFAULTS.maxShort,
  en: 0.45,
};
/** A table-heavy page (≥30% rows) is not judged by short-line ratio. */
export const ROW_RATIO_TABLE_EXEMPTION = 0.3;
/** Below this line/page count the short-line gate is not applicable. */
export const SHORT_LINES_MIN_SAMPLE = 50;
/** Latin share above which an Arabic book gets a warning. */
export const LATIN_RATIO_WARN_LIMIT = 0.15;

const PAGEBREAK_LEAK = /-{2,}\s*PAGE[\s_]?BREAK\s*-{1,3}>?/i;
const REV_PAREN = /\)[^\s()[\]{}]{1,40}\(/g;
const BAD_MARKUP = /(```|<br\s*\/?>)/i;
const CAM = /CamScanner/i;
/** Canonical Arabic letters (3-block range from text/constants). */
const LETTER_OR_ARABIC = new RegExp(`[A-Za-z${ARABIC_LETTER_RANGES}]`, "g");
/** Words long enough to judge the «ا+حرف+ل» inversion rate. */
export const LAM_SWAP_MIN_SAMPLE_WORDS = 1500;
/**
 * Canonical char-level preservation gates, ported from the converter app which
 * carried two divergent spellings (`>5000 → <0.8×raw` and `>8000 → <0.75×raw`).
 * One canonical pair: the longer the source, the more tolerance for reflow.
 * Used by {@link charPreservationCheck}; page-level coverage stays in
 * `minPageRatio` / `minOutputRatio`.
 */
export const CHAR_PRESERVATION_GATES = [
  { minRawChars: 8000, minRatio: 0.75 },
  { minRawChars: 5000, minRatio: 0.8 },
] as const;

export function countPagedBlocks(text: string): number {
  return text.split("---PAGEBREAK---").filter((p) => p.trim().length > 40).length;
}

export function mdMetrics(md: string): MdMetrics {
  const lines = md.split("\n").map((l) => l.replace(/\s+$/, ""));
  const nonempty = lines.filter((l) => l.trim());
  const eligible = nonempty.filter(
    (l) =>
      l.length >= 40 &&
      (l.match(LETTER_OR_ARABIC) ?? []).length >= 15 &&
      !l.startsWith("|") &&
      !/\s{2,}/.test(l),
  );
  const counts = new Map<string, number>();
  for (const line of eligible) counts.set(line, (counts.get(line) ?? 0) + 1);
  let dup = 0;
  for (const v of counts.values()) if (v > 1) dup += v - 1;

  const nonSpaceLen = Math.max(1, md.replace(/\s/g, "").length);
  // قفزات مستوى العنوان (## ← ####) — من qa_gates.py _heading_jumps
  const headingLevels = nonempty
    .filter((l) => /^#+/.test(l))
    .map((l) => l.match(/^#+/)?.[0].length ?? 0);
  let headingJumps = 0;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i]! > headingLevels[i - 1]! + 1) headingJumps++;
  }
  return {
    lines: nonempty.length,
    chars: md.length,
    headings: nonempty.filter((l) => l.startsWith("#")).length,
    pages: countPagedBlocks(md),
    duplicateLines: dup,
    duplicateRatio: Math.round((dup / Math.max(1, eligible.length)) * 1000) / 1000,
    pagebreakLeak: PAGEBREAK_LEAK.test(md),
    badMarkup: BAD_MARKUP.test(md),
    camscanner: CAM.test(md),
    arabicRatio: Math.round((countArabicLetters(md) / nonSpaceLen) * 1000) / 1000,
    placeholders: (md.match(/\[؟\]/g) ?? []).length,
    latinRatio: Math.round(((md.match(/[A-Za-z]/g) ?? []).length / nonSpaceLen) * 1000) / 1000,
    // النطاق القياسي كله: الأرقام العربية (٠-٩) داخليًا فتبقى محسوبة ك punct متّصل،
    // وكانت الصيغة القديمة `\u0600-\u066F` تُسقط كل حرف بعد U+066F (ء ٱ ۖ والحروف
    // الممتدة) فلا يُرى الترقيم الملصق قبلها.
    punctIssues: (
      md.match(new RegExp(`\\s[،؛؟.!]|([،؛:؟])(?=[A-Za-z${ARABIC_LETTER_RANGES}])`, "g")) ?? []
    ).length,
    hamzaIssues: (
      md.match(/(?:^|\s)(اي|الي|ان|ابو|احمد|اذا|ازهر)(?=\s|$|[.,:؛؟!«»()[\]{}])/g) ?? []
    ).length,
    headingJumps,
  };
}

/** جداول Markdown غير متساوية الأعمدة. */
export function tableProblems(md: string): string[] {
  const problems: string[] = [];
  let block: string[] = [];
  const flush = () => {
    if (block.length >= 2) {
      const cols = new Set(
        block.map(
          (row) =>
            row
              .trim()
              .replace(/^\||\|$/g, "")
              .split("|").length,
        ),
      );
      if (cols.size > 1) {
        problems.push(
          `جدول بأعمدة متفاوتة: ${[...cols].sort()} — أول سطر: ${block[0]!.slice(0, 40)}`,
        );
      }
    }
    block = [];
  };
  for (const line of [...md.split("\n"), ""]) {
    if (line.trim().startsWith("|")) {
      block.push(line);
      continue;
    }
    flush();
  }
  return problems;
}

const GARBLED = /^[اأإآ]([^\u064B-\u0652])ل/;

/**
 * نسبة الكلمات «ا + حرف + ل» المقلوبة (الصرف ← الرصف).
 * سليم <4% (الله/أولاً/أصل)، مقلوب ≥6%. None لعينة <1500 كلمة.
 * مكرّرة هنا بدل استيرادها من gemini_ocr (كما أوصى التدقيق) — 8 أسطر.
 */
export function lamSwapRate(text: string): number | null {
  const words = text.match(new RegExp(`${ARABIC_LETTER_CLASS}{3,}`, "g")) ?? [];
  if (words.length < LAM_SWAP_MIN_SAMPLE_WORDS) return null;
  const hits = words.filter((w) => GARBLED.test(w)).length;
  return (100 * hits) / words.length;
}

/**
 * Presentation forms that are *letter shapes* (isolated/initial/medial/final).
 * Three exclusions are deliberate content, not shaping: U+FD3E/F and U+FEFB/C
 * are the ornate Qur'an parentheses ﴿﴾, U+FDF0–FDFD are the religious ligatures
 * (ﷲ ﷺ ﷻ) a logically-encoded book legitimately contains, and U+FD50–FDFF are
 * the decorative name/date ligatures. None of them says anything about order.
 */
const SHAPING_FORM = /[\uFB50-\uFD3D\uFE70-\uFEFA]/;

/** الحرف العربي بحروفه الأصلية (نفس نطاق ARABIC_LETTER_CLASS، بلا علم g). */
const ARABIC_LETTER_ONLY = new RegExp(`[${ARABIC_LETTER_RANGES}]`);

/**
 * C0 controls that never appear in real text. Only \t \n \v \f \r are allowed —
 * the layout characters a page extraction legitimately emits. Counted by code
 * point rather than by regex, because ESLint forbids control-character patterns.
 */
function isStrayControl(code: number): boolean {
  if (code > 0x1f) return false;
  return code !== 0x09 && code !== 0x0a && code !== 0x0b && code !== 0x0c && code !== 0x0d;
}

/**
 * عتبة الحروف المتشكّلة — measured on real PDFs, not guessed:
 * a visual-order (Word/InDesign-era) PDF extracted as 97.9% shaping forms,
 * a logically-encoded PDF as 0%. Any meaningful share therefore proves the
 * stream stores glyphs in *display* order, so the words come out reversed.
 */
export const NATIVE_SHAPED_GLYPH_MAX_PCT = 2;

/**
 * عتبة الحروف التحكمية — a PDF whose ToUnicode CMap is broken extracts as
 * letters mapped onto C0 controls and stray Latin: measured 52 controls per
 * 1000 characters on such a file, 0 on a clean one.
 */
export const NATIVE_CONTROL_MAX_PER_K = 2;

/**
 * نسبة الحروف العربية المتشكّلة (presentation forms) — دليل ترتيب بصري معكوس.
 * العدّ على الحروف لا على الرموز: النصّ الكامل التشكيل (مصحف) يكرر الحرف نفسه،
 * والمقياس يبقى نسبة.
 */
export function shapedGlyphRate(text: string): number {
  let shaped = 0;
  let letters = 0;
  for (const char of text) {
    if (SHAPING_FORM.test(char)) shaped++;
    else if (ARABIC_LETTER_ONLY.test(char)) letters++;
  }
  const arabic = shaped + letters;
  return arabic === 0 ? 0 : (100 * shaped) / arabic;
}

/** عدد الحروف التحكمية الشاردة لكل ألف حرف — دليل خريطة ترميز مكسورة. */
export function controlCharRate(text: string): number {
  let stray = 0;
  let chars = 0;
  for (const char of text) {
    if (!/\s/.test(char)) chars++;
    if (isStrayControl(char.codePointAt(0) ?? 0)) stray++;
  }
  if (chars === 0) return 0;
  return (1000 * stray) / chars;
}

/**
 * Character-level preservation check — canonical home for the "did the
 * converter silently drop content?" gate. The converter app carried this as two
 * divergent spellings; {@link CHAR_PRESERVATION_GATES} is the single table.
 *
 * Pure and NOT wired into `evaluateQaGates` by default (the page-level gates are
 * ported verbatim from qa_gates.py and stay the contract); callers that have a
 * raw source and want the stricter char-level guard call this directly.
 */
export function charPreservationCheck(
  rawLength: number,
  outputLength: number,
): { applicable: boolean; ok: boolean; detail: string; minRatio: number } {
  const gate = CHAR_PRESERVATION_GATES.find((g) => rawLength > g.minRawChars);
  if (!gate) {
    return {
      applicable: false,
      ok: true,
      minRatio: 0,
      detail: `الأصل ${rawLength} حرفًا — دون أدنى بواب (${CHAR_PRESERVATION_GATES[CHAR_PRESERVATION_GATES.length - 1]!.minRawChars})، لا فحص`,
    };
  }
  const ratio = rawLength > 0 ? outputLength / rawLength : 0;
  return {
    applicable: true,
    ok: ratio >= gate.minRatio,
    minRatio: gate.minRatio,
    detail: `الناتج ${outputLength} / الأصل ${rawLength} حرفًا = ${Math.round(ratio * 100)}% (≥ ${
      gate.minRatio * 100
    }%)`,
  };
}

export function evaluateQaGates(input: QaGatesInput): QaReport {
  const o: Required<QaGatesOptions> = { ...QA_GATE_DEFAULTS, ...input.options };
  const md = input.md;
  const m = mdMetrics(md);
  const clean: CleanReport = input.cleanReport ?? {};
  const inPages = input.inputPages;
  const pages =
    input.pdfOutPages ??
    input.outputPages ??
    (typeof clean.pages === "number" ? clean.pages : undefined) ??
    m.pages ??
    0;

  // التغطية: من الخام أولًا، ثم التقرير، ثم فواصل الـ md — لا تُسقط البوابة أبدًا.
  const rawTxt = input.raw ?? "";
  const srcPages =
    countPagedBlocks(rawTxt) ||
    (typeof clean.pages === "number" ? clean.pages : 0) ||
    countPagedBlocks(md) ||
    0;
  const coverage = srcPages / Math.max(1, inPages);

  const checks: QaCheck[] = [];
  const check = (name: string, ok: boolean, detail: string, warn = false) =>
    checks.push({ name, ok: Boolean(ok), detail, warn });

  if (o.reflow) {
    check(
      "page-ratio",
      true,
      `إعادة تدفق بوكليت: ${pages}/${inPages} صفحة — تُحكم بالحروف/التغطية لا بعدّ الصفحات`,
    );
  } else {
    check(
      "page-ratio",
      pages >= inPages * o.minOutputRatio,
      `صفحات الناتج ${pages} / الأصل ${inPages} (≥ ${Math.round(o.minOutputRatio * 100)}%)`,
    );
  }

  if (!srcPages) {
    check(
      "ocr-coverage",
      false,
      `لا يمكن إثبات التغطية: لا علامات صفحات في الخام ولا في التقرير (الأصل ${inPages} صفحة) — حدّد raw أو أعد التصيير`,
      o.visual,
    );
  } else {
    check(
      "ocr-coverage",
      coverage >= o.minPageRatio,
      `صفحات النصّ ${srcPages} / الأصل ${inPages} = ${Math.round(coverage * 100)}% (≥ ${Math.round(o.minPageRatio * 100)}%)`,
      o.visual,
    );
  }

  const garble = lamSwapRate(rawTxt || md);
  if (garble !== null) {
    check(
      "no-garbled-layer",
      garble < 6.0,
      `كلمات «ا+حرف+ل» المقلوبة ${garble.toFixed(1)}% (منها الله وأولاً وأصل — السليم أقل من 4%)`,
    );
  }

  const cpp =
    typeof clean.chars_per_page === "number"
      ? clean.chars_per_page
      : Math.floor(m.chars / Math.max(1, pages));
  check("chars-per-page", cpp >= o.minCpp, `${cpp} حرفًا/صفحة (≥ ${o.minCpp})`, o.visual);

  const short = clean.short_line_ratio;
  if (typeof short === "number") {
    const small = (clean.lines ?? m.lines) < SHORT_LINES_MIN_SAMPLE || inPages < 12;
    const limit = o.lang === "en" ? MAX_SHORT_LINE_RATIO_BY_LANG.en : o.maxShort;
    const rows = clean.row_ratio ?? 0;
    check(
      "short-lines",
      small || rows > ROW_RATIO_TABLE_EXEMPTION || short <= limit,
      `نسبة الأسطر القصيرة ${(short * 100).toFixed(0)}% (≤ ${Math.round(limit * 100)}%)`,
      small || rows > ROW_RATIO_TABLE_EXEMPTION,
    );
  }

  const solo = clean.solo_diacritics;
  if (typeof solo === "number") {
    check("solo-diacritics", solo <= o.maxSolo, `${solo} سطرًا (≤ ${o.maxSolo})`);
  }

  check("no-pagebreak-leak", !m.pagebreakLeak, "لا فواصل صفحات متسرّبة");
  const rev = (md.match(REV_PAREN) ?? []).length;
  check("no-reversed-parens", rev === 0, `${rev} قوسًا معكوسًا من نوع «)أ(»`);
  check("no-bad-markup", !m.badMarkup, "لا وسوم تقنية متسرّبة");
  check("no-camscanner", !m.camscanner, "لا آثار ماسح");
  check(
    "punct-spacing",
    m.punctIssues === 0,
    `${m.punctIssues} مسافة ترقيم مخالفة (قبل ،؛؟.! أو ملتصقة بعدها)`,
    true,
  );
  check(
    "hamza-forms",
    m.hamzaIssues === 0,
    `${m.hamzaIssues} كلمة بلا همزة وصل/قطع (أي/إلى/إن/إذا/أبو/أحمد/أزهر)`,
    true,
  );
  check(
    "heading-levels",
    m.headingJumps === 0,
    `${m.headingJumps} قفزة مستوى عنوان (## ← ####)`,
    true,
  );
  check(
    "duplicates",
    m.duplicateRatio <= o.maxDup,
    `تكرار ${(m.duplicateRatio * 100).toFixed(0)}% (≤ ${Math.round(o.maxDup * 100)}%)`,
  );

  if (o.requireHeadings) {
    check("headings", m.headings > 0, `${m.headings} عنوانًا`);
  } else {
    check("headings", m.headings > 0, `${m.headings} عنوانًا`, true);
  }

  if (m.placeholders > 0) {
    check(
      "placeholders",
      m.placeholders <= Math.max(5, Math.floor(m.lines / 100)),
      `${m.placeholders} موضع «[؟]»`,
      true,
    );
  }

  if (o.lang === "ar" && m.latinRatio > LATIN_RATIO_WARN_LIMIT) {
    check("latin-ratio", false, `حروف لاتينية ${Math.round(m.latinRatio * 100)}%`, true);
  }

  if (input.raw) {
    const rawPages = rawTxt
      .split("---PAGEBREAK---")
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 80);
    const seen = new Map<string, number>();
    for (const pg of rawPages) {
      const key = pg.slice(0, 200);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    let dupPages = 0;
    for (const v of seen.values()) if (v > 1) dupPages += v - 1;
    const ratio = dupPages / Math.max(1, rawPages.length);
    check(
      "duplicate-pages",
      ratio <= 0.1,
      `${dupPages} صفحة مكرّرة (${Math.round(ratio * 100)}%)`,
      inPages <= 16,
    );
  }

  const mathSpans = (md.match(/\$[^$]+\$/g) ?? []).length;
  const omath = input.docxDocumentXml ? (input.docxDocumentXml.match(/<m:oMath/g) ?? []).length : 0;
  if (mathSpans) {
    check("equations", omath > 0, `${mathSpans} تعبيرًا · ${omath} معادلة Word`, mathSpans < 3);
    if (omath && omath < mathSpans * 0.95) {
      check("equations-count", false, `OMML ${omath} أقل من 95% من ${mathSpans}`, true);
    }
  }

  const tp = tableProblems(md);
  check("tables", tp.length === 0, `${tp.length} مشكلة جدول${tp[0] ? ` — ${tp[0]}` : ""}`);

  if (input.docx) {
    const dm = input.docx;
    const ok = dm.paragraphs >= 5 && (dm.arabic || o.lang === "en") && !dm.badMarkup;
    check("docx", ok, `فقرات ${dm.paragraphs} · عربي ${dm.arabic} · وسوم ${dm.badMarkup}`);
  }

  if (input.pdfOutPages === null || input.pdfOutPages === undefined) {
    check("pdf", true, "لم يُطلب PDF", true);
  } else {
    check("pdf", input.pdfOutPages > 0, `${input.pdfOutPages} صفحة`);
  }

  const failed = checks.filter((c) => !c.ok && !c.warn);
  return {
    pass: failed.length === 0,
    exitCode: failed.length === 0 ? 0 : 1,
    inputPages: inPages,
    outputPages: pages,
    charsPerPage: cpp,
    metrics: m,
    checks,
  };
}

/** طبقة IO رقيقة: ملفات + pdf-lib لعدّ الصفحات. رمز 2 = ملف مفقود. */
export async function runQaGatesOnFile(opts: {
  inputPdf: Buffer;
  md: string;
  raw?: string;
  cleanReport?: CleanReport;
  inputPages?: number;
  outputPages?: number;
  pdfOut?: Buffer | null;
  docx?: DocxMetrics | null;
  docxDocumentXml?: string;
  options?: QaGatesOptions;
}): Promise<QaReport> {
  const { PDFDocument } = await import("pdf-lib");
  const count = async (buf: Buffer): Promise<number> =>
    (await PDFDocument.load(buf)).getPageCount();
  const inputPages = opts.inputPages ?? (await count(opts.inputPdf));
  return evaluateQaGates({
    md: opts.md,
    raw: opts.raw,
    cleanReport: opts.cleanReport,
    inputPages,
    outputPages: opts.outputPages,
    pdfOutPages: opts.pdfOut ? await count(opts.pdfOut) : null,
    docx: opts.docx ?? null,
    docxDocumentXml: opts.docxDocumentXml,
    options: opts.options,
  });
}

// ---------------------------------------------------------------------------
// تكامل التدقيق السباعي (7-stage) مع بوابات الجودة
// ---------------------------------------------------------------------------
/**
 * تحويل تقرير التدقيق السباعي إلى فحوصات QaCheck قياسية حتى تُدمج
 * مراحل النص السبع في حكم البوابات الموحّد (fail = !ok && !warn).
 */
export function sevenStageToQaChecks(report: SevenStageAuditReport): QaCheck[] {
  return report.stages.map((s) => ({
    name: `seven-stage-${s.stage}-${s.name}`,
    ok: s.ok,
    detail: s.detail,
    warn: false,
  }));
}

/**
 * تقييم كامل: بوابات الملف (evaluateQaGates) + التدقيق السباعي على الـ md.
 * الحكم النهائي = نجاح الكل. يُرجع التقريرين معًا لتوثيق سبب أي فشل.
 */
export function evaluateQaGatesWithSevenStage(
  input: QaGatesInput,
  sevenStage: SevenStageAuditReport,
): { qa: QaReport; sevenStage: SevenStageAuditReport; pass: boolean } {
  const qa = evaluateQaGates(input);
  const sevenChecks = sevenStageToQaChecks(sevenStage);
  const sevenOk = sevenChecks.every((c) => c.ok || c.warn);
  return { qa, sevenStage, pass: qa.pass && sevenOk };
}
