import { rm, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPython } from "./utils/python-runner";
/**
 * document-router.ts — توجيه المستند داخل سلسلة OCR الموحّدة.
 *
 * السلسلة الكاملة (docs/IMPLEMENTATION_OCR_CHAIN.md):
 *   1. Direct pdf-parse (extractNativePdfText) — مجاني، بلا OCR إن لسطت النص سليمة.
 *   2. Tesseract (محلي، بلا حصة) — عبر OcrManager عند ترتيب المزوّدين.
 *   3. Gemini keypool (سحابي) — آخر السلسلة، فقط إن بقيت خانات (مفتاح × موديل).
 *
 * قاعدة التوجيه (decideRoute): native فقط إن:
 *   - التصنيف pdf-text وعدد الصفحات كافٍ (تغطية ≥60% صفحات بنصّ ≥50 حرفًا)،
 *   - ومتوسط الكلمات/صفحة ≥25 (حارس text_layer في gemini_ocr.py الأصلي)،
 *   - ونسبة lam-swap <6% إن توفّرت عينة كافية (طبقة مقلوبة ⇒ OCR).
 * أي مسار ملف (image/docx/txt/unknown) يذهب OCR أو يبقى كما هو في الـsplit.
 */

import {
  NATIVE_CONTROL_MAX_PER_K,
  NATIVE_SHAPED_GLYPH_MAX_PCT,
  controlCharRate,
  lamSwapRate,
  shapedGlyphRate,
} from "./qa-gates";

/**
 * PyMuPDF ≥ 1.28 writes a deprecation notice to **stdout** the moment `fitz` is
 * imported. Any payload read back from stdout was therefore corrupted before it
 * could be parsed — `JSON.parse` threw, the native text layer was declared
 * unavailable, and every text PDF went to cloud OCR instead of being read free.
 * So the import prefers the modern module name and every result travels through
 * a file, which no library can print into.
 */
const PYMUPDF_IMPORT = `
try:
    import pymupdf as fitz
except ImportError:
    import fitz
`;

export interface DocumentClassification {
  type: "pdf-text" | "pdf-scan" | "image" | "docx" | "txt" | "unknown";
  hasEmbeddedText: boolean;
  pageCount?: number;
  confidence: number;
}

export interface NativeTextResult {
  text: string;
  pageCount: number;
  confidence: number;
}

/** Wire format of the PyMuPDF helper — one JSON document, never stdout noise. */
interface NativeTextPayload {
  pages?: { number: number; text: string }[];
  pageCount?: number;
  error?: string;
}

/**
 * Classify a document by inspecting its magic bytes and structure.
 * Pure detection — no external APIs.
 */
export async function classifyDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<DocumentClassification> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return classifyPdf(buffer);
  }

  if (mimeType.startsWith("image/") || /\.(png|jpg|jpeg|tiff?|bmp|webp)$/i.test(lowerName)) {
    return {
      type: "image",
      hasEmbeddedText: false,
      confidence: 1.0,
    };
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return {
      type: "docx",
      hasEmbeddedText: true,
      confidence: 1.0,
    };
  }

  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md")
  ) {
    return {
      type: "txt",
      hasEmbeddedText: true,
      confidence: 1.0,
    };
  }

  return {
    type: "unknown",
    hasEmbeddedText: false,
    confidence: 0.0,
  };
}

async function classifyPdf(buffer: Buffer): Promise<DocumentClassification> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pdf-classify-"));
  const pdfPath = join(tmpDir, "input.pdf");
  const scriptPath = join(tmpDir, "classify.py");
  const outPath = join(tmpDir, "classify.out");

  try {
    await writeFile(pdfPath, buffer);
    await writeFile(
      scriptPath,
      `
import sys, json
${PYMUPDF_IMPORT}
try:
    doc = fitz.open(sys.argv[1])
    payload = {"pages": len(doc), "text_len": sum(len(page.get_text()) for page in doc)}
    doc.close()
except Exception as e:
    payload = {"error": str(e)}
with open(sys.argv[2], "w", encoding="utf-8") as handle:
    handle.write(json.dumps(payload, ensure_ascii=False))
`,
      "utf-8",
    );

    await runPython({
      args: [scriptPath, pdfPath, outPath],
      timeout: 30_000,
    });

    const payloadJson = await readFile(outPath, "utf-8").catch(() => "");
    let parsed: { pages?: number; text_len?: number; error?: string } = {};
    try {
      parsed = JSON.parse(payloadJson) as typeof parsed;
    } catch {
      parsed = {};
    }
    if (parsed.error || typeof parsed.pages !== "number" || typeof parsed.text_len !== "number") {
      return {
        type: "pdf-scan",
        hasEmbeddedText: false,
        pageCount: undefined,
        confidence: 0.5,
      };
    }

    const pageCount = parsed.pages;
    const textLen = parsed.text_len;

    // Heuristic: if more than ~200 chars of embedded text per page, treat as text-native
    const hasEmbeddedText = textLen > pageCount * 200;

    return {
      type: hasEmbeddedText ? "pdf-text" : "pdf-scan",
      hasEmbeddedText,
      pageCount,
      confidence: hasEmbeddedText ? 0.95 : 0.85,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Extract embedded text from a text-native PDF without OCR.
 * Uses PyMuPDF to extract text per page.
 */
export async function extractNativePdfText(
  buffer: Buffer,
  maxPages: number = 2000,
): Promise<NativeTextResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pdf-native-"));
  const pdfPath = join(tmpDir, "input.pdf");
  const scriptPath = join(tmpDir, "native_text.py");
  const outPath = join(tmpDir, "native_text.json");

  try {
    await writeFile(pdfPath, buffer);
    await writeFile(
      scriptPath,
      `
import sys, json
${PYMUPDF_IMPORT}
max_pages = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
try:
    doc = fitz.open(sys.argv[1])
    pages = []
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        pages.append({"number": i + 1, "text": page.get_text()})
    payload = {"pages": pages, "pageCount": len(pages)}
    doc.close()
except Exception as e:
    payload = {"error": str(e)}
with open(sys.argv[2], "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False)
`,
      "utf-8",
    );

    await runPython({
      args: [scriptPath, pdfPath, outPath, String(maxPages)],
      timeout: 60_000,
    });

    const payloadJson = await readFile(outPath, "utf-8").catch(() => "");
    let parsed: NativeTextPayload;
    try {
      parsed = JSON.parse(payloadJson) as NativeTextPayload;
    } catch {
      throw new Error("PDF_NATIVE_TEXT_FAILED: مخرجات PyMuPDF غير صالحة");
    }
    if (parsed.error) {
      throw new Error(`PDF_NATIVE_TEXT_FAILED: ${parsed.error}`);
    }
    if (!Array.isArray(parsed.pages)) {
      throw new Error("PDF_NATIVE_TEXT_FAILED: لا توجد صفحات في مخرجات PyMuPDF");
    }

    const text = parsed.pages
      .map((p) => `===PAGE_BREAK===\n${p.text}`)
      .join("\n")
      .replace(/^===PAGE_BREAK===\n/, "");

    return {
      text,
      pageCount: parsed.pageCount ?? parsed.pages.length,
      confidence: 0.95,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** حدّا التوجيه — منقولان من text_layer في gemini_ocr.py + عتبة 60% (ZIP pdf-to-word). */
export const NATIVE_MIN_COVERAGE = 0.6; // ≥60% صفحات بنصّ
export const NATIVE_MIN_WORDS_PER_PAGE = 25; // متوسط كلمات/صفحة
export const NATIVE_PAGE_MIN_CHARS = 50; // صفحة "مغطاة" ≥50 حرفًا
export const NATIVE_GARBLED_MAX_PCT = 6; // lam-swap ≥6% ⇒ طبقة مقلوبة ⇒ OCR
// عتبات الترتيب والترميم (متشكّل/تحكمي) في qa-gates: NATIVE_SHAPED_GLYPH_MAX_PCT،
// NATIVE_CONTROL_MAX_PER_K — مُقاسة على ملفات حقيقية، لا مُقدَّرة.

export interface OcrRouteDecision {
  route: "native" | "ocr";
  reason: string;
  classification: DocumentClassification;
  nativeText?: string;
  pageCoverage?: number;
  garbledRate?: number | null;
  avgWordsPerPage?: number;
  /** نسبة الحروف المتشكّلة — دليل أن الطبقة مخزّنة بالترتيب البصري المعكوس. */
  shapedGlyphPct?: number;
  /** حروف تحكمية لكل ألف حرف — دليل ToUnicode مكسور. */
  controlCharsPerK?: number;
}

/**
 * قرار نقي (بلا IO): هل طبقة النصّ المستخرجة تصلح مسار native؟
 * يُختبر مباشرة بلا Python. nativeText الافتراضي من extractNativePdfText.
 */
export function decideRoute(
  classification: DocumentClassification,
  native?: { text: string; pageCount: number } | undefined,
): OcrRouteDecision {
  if (classification.type !== "pdf-text" || !classification.hasEmbeddedText) {
    return {
      route: "ocr",
      reason: `classification=${classification.type} — لا طبقة نصّ: OCR`,
      classification,
    };
  }
  if (!native || !native.text.trim()) {
    return {
      route: "ocr",
      reason: "native text فارغة — OCR",
      classification,
    };
  }
  const pageCount = Math.max(1, native.pageCount || classification.pageCount || 1);
  // تغطية: صفحات بفواصل ===PAGE_BREAK=== تحتوي ≥50 حرفًا / الكل
  const chunks = native.text.split("===PAGE_BREAK===").filter((c) => c.trim().length > 0);
  const covered = chunks.filter((c) => c.trim().length >= NATIVE_PAGE_MIN_CHARS).length;
  const pageCoverage = covered / pageCount;
  const words = native.text.split(/\s+/).filter((w) => w.length > 0).length;
  const avgWordsPerPage = words / pageCount;
  const metrics = {
    classification,
    nativeText: native.text,
    pageCoverage,
    garbledRate: lamSwapRate(native.text),
    avgWordsPerPage,
    shapedGlyphPct: shapedGlyphRate(native.text),
    controlCharsPerK: controlCharRate(native.text),
  };
  const ocr = (reason: string): OcrRouteDecision => ({ route: "ocr", reason, ...metrics });

  if (pageCoverage < NATIVE_MIN_COVERAGE) {
    return ocr(
      `تغطية النص ${Math.round(pageCoverage * 100)}% < ${Math.round(NATIVE_MIN_COVERAGE * 100)}% — OCR`,
    );
  }
  if (avgWordsPerPage < NATIVE_MIN_WORDS_PER_PAGE) {
    return ocr(
      `متوسط ${avgWordsPerPage.toFixed(1)} كلمة/صفحة < ${NATIVE_MIN_WORDS_PER_PAGE} — OCR`,
    );
  }
  // الترتيب البصري: طبقة مخزّنة بالأشكال المتشكّلة تُقرأ مقلوبة — «نسخة طبق
  // الأصل» تقتضي رفضها لا تسليمها.
  if (metrics.shapedGlyphPct >= NATIVE_SHAPED_GLYPH_MAX_PCT) {
    return ocr(
      `طبقة نصّ بالترتيب البصري المعكوس (${metrics.shapedGlyphPct.toFixed(1)}% متشكّل ≥ ${NATIVE_SHAPED_GLYPH_MAX_PCT}%) — OCR`,
    );
  }
  // خريطة ترميز مكسورة: حروف تحكمية وسط النص = الحروف نفسها غير موثوقة.
  if (metrics.controlCharsPerK >= NATIVE_CONTROL_MAX_PER_K) {
    return ocr(
      `طبقة نصّ بترميز مكسور (${metrics.controlCharsPerK.toFixed(1)} تحكمي/ألف حرف ≥ ${NATIVE_CONTROL_MAX_PER_K}) — OCR`,
    );
  }
  if (metrics.garbledRate !== null && metrics.garbledRate >= NATIVE_GARBLED_MAX_PCT) {
    return ocr(
      `طبقة نصّ مقلوبة الحروف (${metrics.garbledRate.toFixed(1)}% ≥ ${NATIVE_GARBLED_MAX_PCT}%) — OCR`,
    );
  }
  return {
    route: "native",
    reason: `نصّ أصلي سليم (تغطية ${Math.round(pageCoverage * 100)}%، ${avgWordsPerPage.toFixed(0)} كلمة/صفحة) — بلا OCR`,
    ...metrics,
  };
}

/**
 * توجيه كامل مع IO: classify → (pdf-text) extract → decide.
 * يُرجع القرار ومعه النصّ الأصلي إن وُجد. أي فشل Python ⇒ route=ocr
 * (الـsplit سيقسّم الصفحات ويذهب Tesseract→Gemini) — لا يُسقط المهمة هنا.
 */
export async function routeDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<OcrRouteDecision> {
  const classification = await classifyDocument(buffer, mimeType, fileName);
  if (classification.type !== "pdf-text" || !classification.hasEmbeddedText) {
    return decideRoute(classification);
  }
  try {
    const native = await extractNativePdfText(buffer);
    return decideRoute(classification, {
      text: native.text,
      pageCount: native.pageCount || classification.pageCount || 1,
    });
  } catch {
    return {
      route: "ocr",
      reason: "extractNativePdfText فشل — OCR (Tesseract→Gemini)",
      classification,
    };
  }
}
