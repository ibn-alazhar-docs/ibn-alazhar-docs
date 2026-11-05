import { unlink, mkdtemp, writeFile } from "node:fs/promises";
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

import { lamSwapRate } from "./qa-gates";

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

  try {
    await writeFile(pdfPath, buffer);
    await writeFile(
      scriptPath,
      `
import sys
try:
    import fitz
    doc = fitz.open(sys.argv[1])
    text_len = sum(len(page.get_text()) for page in doc)
    print(f"pages={len(doc)};text_len={text_len}")
    doc.close()
except Exception as e:
    print(f"error={e}")
    sys.exit(1)
`,
      "utf-8",
    );

    const result = await runPython({
      args: [scriptPath, pdfPath],
      timeout: 30_000,
    });

    const match = result.stdout.match(/pages=(\d+);text_len=(\d+)/);
    if (!match) {
      return {
        type: "pdf-scan",
        hasEmbeddedText: false,
        pageCount: undefined,
        confidence: 0.5,
      };
    }

    const pageCount = Number(match[1]);
    const textLen = Number(match[2]);

    // Heuristic: if more than ~200 chars of embedded text per page, treat as text-native
    const hasEmbeddedText = textLen > pageCount * 200;

    return {
      type: hasEmbeddedText ? "pdf-text" : "pdf-scan",
      hasEmbeddedText,
      pageCount,
      confidence: hasEmbeddedText ? 0.95 : 0.85,
    };
  } finally {
    await unlink(pdfPath).catch(() => {});
    await unlink(tmpDir).catch(() => {});
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

  try {
    await writeFile(pdfPath, buffer);
    await writeFile(
      scriptPath,
      `
import sys, json
try:
    import fitz
    doc = fitz.open(sys.argv[1])
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
    pages = []
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        text = page.get_text()
        pages.append({"number": i + 1, "text": text})
    print(json.dumps({"pages": pages, "pageCount": len(pages)}, ensure_ascii=False))
    doc.close()
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`,
      "utf-8",
    );

    const result = await runPython({
      args: [scriptPath, pdfPath, String(maxPages)],
      timeout: 60_000,
    });

    const parsed = JSON.parse(result.stdout);
    if (parsed.error) {
      throw new Error(`PDF_NATIVE_TEXT_FAILED: ${parsed.error}`);
    }

    const text = parsed.pages
      .map((p: { number: number; text: string }) => `===PAGE_BREAK===\n${p.text}`)
      .join("\n")
      .replace(/^===PAGE_BREAK===\n/, "");

    return {
      text,
      pageCount: parsed.pageCount,
      confidence: 0.95,
    };
  } finally {
    await unlink(pdfPath).catch(() => {});
    await unlink(scriptPath).catch(() => {});
    await unlink(tmpDir).catch(() => {});
  }
}

/** حدّا التوجيه — منقولان من text_layer في gemini_ocr.py + عتبة 60% (ZIP pdf-to-word). */
export const NATIVE_MIN_COVERAGE = 0.6; // ≥60% صفحات بنصّ
export const NATIVE_MIN_WORDS_PER_PAGE = 25; // متوسط كلمات/صفحة
export const NATIVE_PAGE_MIN_CHARS = 50; // صفحة "مغطاة" ≥50 حرفًا
export const NATIVE_GARBLED_MAX_PCT = 6; // lam-swap ≥6% ⇒ طبقة مقلوبة ⇒ OCR

export interface OcrRouteDecision {
  route: "native" | "ocr";
  reason: string;
  classification: DocumentClassification;
  nativeText?: string;
  pageCoverage?: number;
  garbledRate?: number | null;
  avgWordsPerPage?: number;
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
  const garbledRate = lamSwapRate(native.text);

  if (pageCoverage < NATIVE_MIN_COVERAGE) {
    return {
      route: "ocr",
      reason: `تغطية النص ${Math.round(pageCoverage * 100)}% < ${Math.round(NATIVE_MIN_COVERAGE * 100)}% — OCR`,
      classification,
      nativeText: native.text,
      pageCoverage,
      garbledRate,
      avgWordsPerPage,
    };
  }
  if (avgWordsPerPage < NATIVE_MIN_WORDS_PER_PAGE) {
    return {
      route: "ocr",
      reason: `متوسط ${avgWordsPerPage.toFixed(1)} كلمة/صفحة < ${NATIVE_MIN_WORDS_PER_PAGE} — OCR`,
      classification,
      nativeText: native.text,
      pageCoverage,
      garbledRate,
      avgWordsPerPage,
    };
  }
  if (garbledRate !== null && garbledRate >= NATIVE_GARBLED_MAX_PCT) {
    return {
      route: "ocr",
      reason: `طبقة نصّ مقلوبة الحروف (${garbledRate.toFixed(1)}% ≥ ${NATIVE_GARBLED_MAX_PCT}%) — OCR`,
      classification,
      nativeText: native.text,
      pageCoverage,
      garbledRate,
      avgWordsPerPage,
    };
  }
  return {
    route: "native",
    reason: `نصّ أصلي سليم (تغطية ${Math.round(pageCoverage * 100)}%، ${avgWordsPerPage.toFixed(0)} كلمة/صفحة) — بلا OCR`,
    classification,
    nativeText: native.text,
    pageCoverage,
    garbledRate,
    avgWordsPerPage,
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
