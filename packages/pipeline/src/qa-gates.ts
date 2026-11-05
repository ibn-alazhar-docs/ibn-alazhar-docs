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

const PAGEBREAK_LEAK = /-{2,}\s*PAGE[\s_]?BREAK\s*-{1,3}>?/i;
const REV_PAREN = /\)[^\s()[\]{}]{1,40}\(/g;
const BAD_MARKUP = /(```|<br\s*\/?>)/i;
const CAM = /CamScanner/i;
const ARABIC = /[\u0600-\u06FF]/g;

export function countPagedBlocks(text: string): number {
  return text.split("---PAGEBREAK---").filter((p) => p.trim().length > 40).length;
}

export function mdMetrics(md: string): MdMetrics {
  const lines = md.split("\n").map((l) => l.replace(/\s+$/, ""));
  const nonempty = lines.filter((l) => l.trim());
  const eligible = nonempty.filter(
    (l) =>
      l.length >= 40 &&
      (l.match(/[A-Za-z\u0600-\u06FF]/g) ?? []).length >= 15 &&
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
    arabicRatio: Math.round(((md.match(ARABIC) ?? []).length / nonSpaceLen) * 1000) / 1000,
    placeholders: (md.match(/\[؟\]/g) ?? []).length,
    latinRatio: Math.round(((md.match(/[A-Za-z]/g) ?? []).length / nonSpaceLen) * 1000) / 1000,
    punctIssues: (md.match(/\s[،؛؟.!]|([،؛:؟])(?=[A-Za-z\u0600-\u066F])/g) ?? []).length,
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
  const words = text.match(/[\u0600-\u06FF]{3,}/g) ?? [];
  if (words.length < 1500) return null;
  const hits = words.filter((w) => GARBLED.test(w)).length;
  return (100 * hits) / words.length;
}

export function evaluateQaGates(input: QaGatesInput): QaReport {
  const o: Required<QaGatesOptions> = {
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
    ...input.options,
  };
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
    const small = (clean.lines ?? m.lines) < 50 || inPages < 12;
    const limit = o.lang === "en" ? 0.45 : o.maxShort;
    const rows = clean.row_ratio ?? 0;
    check(
      "short-lines",
      small || rows > 0.3 || short <= limit,
      `نسبة الأسطر القصيرة ${(short * 100).toFixed(0)}% (≤ ${Math.round(limit * 100)}%)`,
      small || rows > 0.3,
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

  if (o.lang === "ar" && m.latinRatio > 0.15) {
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
