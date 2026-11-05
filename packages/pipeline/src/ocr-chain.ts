/**
 * ocr-chain.ts — منسّق السلسلة الكاملة: direct pdf-parse → Tesseract → Gemini keypool.
 *
 * نقل منطق pipeline.py (arabic-pdf-to-book) إلى pipeline TS:
 *   - التوجيه الأصلي (native) عبر document-router.routeDocument/decideRoute.
 *   - المزوّدات عبر OcrManager بترتيب resolveOcrChainOrder (محلي أولًا).
 *   - بوابة QA الكاملة evaluateQaGates بعد كل نتيجة OCR.
 *   - عند فشل QA وكان المصدر OCR (لا native، ولا وضع text)، إعادة واحدة
 *     بقطع 6 صفحات (GEMINI_RETRY_CHUNK_SIZE) ثم إعادة تقييم — نفس pipeline.py:
 *     "🔁 إعادة OCR بقطع 6 صفحات ثم إعادة البناء…".
 *   - لا يُعاد إن كان المحرك محليًا فقط دون Gemini (كما في الأصل:
 *     ocr_engine != "local")، ولا يُعاد أكثر من مرة.
 *
 * الاستخدام في workers/ocr-worker:
 *   split: routeDocument() → nativeText/skipOcr
 *   ocr:   runOcrChain() → نتيجة + تقرير qa + retried flag
 *   clean/generate: runQaOnResult() لتوثيق qa.json (لا إسقاط صامت).
 */

import { evaluateQaGates, type QaReport } from "./qa-gates";
import { OcrManager, resolveOcrChainOrder, buildOcrChain } from "./ocr-provider";
import {
  GeminiOcrProvider,
  GEMINI_RETRY_CHUNK_SIZE,
  retryChunkSizeOnQaFailure,
} from "./ocr-providers/gemini";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";
import type { OcrEngineResult, PipelineConfig } from "./types";

const logger = baseLogger.child({ module: "ocr-chain" });

export { buildOcrChain, resolveOcrChainOrder, GEMINI_RETRY_CHUNK_SIZE };

export const OCR_CHAIN_STEPS = ["direct-pdf-parse", "tesseract", "gemini-keypool"] as const;

export interface OcrChainInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  pageGetters?: (() => Promise<Buffer>)[];
  nativeText?: string;
  skipOcr?: boolean;
}

export interface OcrChainOutput {
  result: OcrEngineResult;
  qa: QaReport;
  route: "native" | "ocr";
  retried: boolean;
  retryChunkSize?: number;
  chain: string[];
}

/** هل يمكن إعادة OCR بقطع أصغر بعد فشل QA؟ (نفس شروط pipeline.py في §5). */
export function shouldRetryChunkOnQaFailure(
  qa: QaReport,
  opts: { route: "native" | "ocr"; engine?: string; noRetry?: boolean },
): boolean {
  if (qa.pass) return false;
  if (opts.noRetry) return false;
  if (opts.route === "native") return false; // النص الأصلي لا يُعاد OCR — الأصل: used_ocr فقط
  // المحلي وحده لا يُعاد (الأصل: ocr_engine != "local")
  if (opts.engine && (opts.engine === "tesseract" || opts.engine === "surya")) {
    // المحرك المحلي وحده لا يُعاد — لكن إن كان Gemini ضمن السلسلة ونتيجة
    // المحاولة الأولى من Gemini، فهي تُعاد أدناه.
    return false;
  }
  return true;
}

/** تقييم QA لنتيجة OCR (نصّ مقابل عدد صفحات). */
export function runQaOnResult(
  result: OcrEngineResult,
  inputPages: number,
  lang: "ar" | "en" = "ar",
): QaReport {
  const pages = result.pages?.length || 1;
  // qa-gates تقع فاصل ---PAGEBREAK--- (countPagedBlocks) — نحوّل نتيجة OCR لذلك الشكل.
  const md = result.pages?.length
    ? result.pages.map((p) => p.text).join("\n---PAGEBREAK---\n")
    : result.text;
  return evaluateQaGates({
    md,
    raw: result.text,
    inputPages: inputPages || pages,
    outputPages: pages,
    options: { lang, visual: false },
  });
}

/**
 * تشغيل السلسلة: native إن وُجد، وإلا OcrManager (tesseract→…) + QA + retry chunk 6.
 *
 * - pageGetters موجودة ⇒ extractPages (صفحات مقسّمة من split).
 * - وإلا ⇒ extractText من الـPDF الكامل (Gemini يقطّع داخليًا 10→6).
 * - retry: نسخة config بحجم قطعة 6 تُستدعى بمزوّد Gemini مباشرة؛ أي خطأ أثناء
 *   الإعادة لا يُسقط النتيجة الأولى — يُرجع الأفضل مع needsReview عبر qa.
 */
export async function runOcrChain(
  config: PipelineConfig,
  input: OcrChainInput,
  opts: { lang?: "ar" | "en"; noRetry?: boolean; chunkSize?: number } = {},
): Promise<OcrChainOutput> {
  const chain = buildOcrChain(config);
  const lang = opts.lang ?? (config.ocr.language === "en" ? "en" : "ar");

  if (input.skipOcr && input.nativeText && input.nativeText.trim()) {
    const result: OcrEngineResult = {
      text: input.nativeText,
      pages: [{ number: 1, text: input.nativeText, confidence: 0.95 }],
      confidence: 0.95,
      engine: "gemini",
    };
    const inputPages = input.pageGetters?.length ?? result.pages.length;
    const qa = runQaOnResult(result, inputPages, lang);
    return { result, qa, route: "native", retried: false, chain };
  }

  const manager = new OcrManager(config);
  const inputPages = input.pageGetters?.length ?? 0;
  let result: OcrEngineResult;
  if (input.pageGetters && input.pageGetters.length > 0) {
    result = await manager.extractPages(config, input.pageGetters, input.fileName);
  } else {
    result = await manager.extractText(config, input.fileBuffer, input.fileName, input.mimeType);
  }
  const pagesCount = inputPages || result.pages?.length || 1;
  const qa = runQaOnResult(result, pagesCount, lang);

  // فشل QA ⇒ retry chunk 6 (مرة واحدة، وGemini فقط) — pipeline.py §5
  const canRetry = shouldRetryChunkOnQaFailure(qa, {
    route: "ocr",
    engine: result.engine,
    noRetry: opts.noRetry,
  });
  if (!canRetry) {
    return { result, qa, route: "ocr", retried: false, chain };
  }

  const currentChunk = opts.chunkSize ?? config.gemini.nativeChunkSize ?? 10;
  const retryChunk = retryChunkSizeOnQaFailure(currentChunk);
  if (retryChunk >= currentChunk) {
    return { result, qa, route: "ocr", retried: false, chain };
  }

  logger.warn(
    { chunk: currentChunk, retryChunk, engine: result.engine },
    `QA failed (exit=${qa.exitCode}) — retry OCR chunk ${retryChunk}`,
  );
  const retryConfig: PipelineConfig = {
    ...config,
    gemini: { ...config.gemini, nativeChunkSize: retryChunk },
  };
  try {
    let retried: OcrEngineResult;
    if (input.pageGetters && input.pageGetters.length > 0) {
      const gemini = new GeminiOcrProvider();
      const available = await gemini.isAvailable(retryConfig);
      if (!available) {
        return { result, qa, route: "ocr", retried: false, retryChunkSize: retryChunk, chain };
      }
      retried = await gemini.extractPages(retryConfig, input.pageGetters, input.fileName);
    } else {
      const gemini = new GeminiOcrProvider();
      const available = await gemini.isAvailable(retryConfig);
      if (!available) {
        return { result, qa, route: "ocr", retried: false, retryChunkSize: retryChunk, chain };
      }
      retried = await gemini.extractPdfChunksNative(
        retryConfig,
        input.fileBuffer,
        input.fileName,
        retryChunk,
      );
    }
    const retriedPages = retried.pages?.length || pagesCount;
    const retriedQa = runQaOnResult(retried, retriedPages, lang);
    // الاحتفاظ بالأفضل: نجاح retry ⇒ اعتمادها؛ ما زالت فاشلة ⇒ الأفضل بينهما.
    const picked = retriedQa.pass || !qa.pass ? retried : result;
    const pickedQa = retriedQa.pass || !qa.pass ? retriedQa : qa;
    if (retriedQa.pass) {
      logger.info(`Retry chunk ${retryChunk} passed QA`);
    } else {
      logger.warn(`Retry chunk ${retryChunk} still fails QA — proceeding degraded`);
    }
    return {
      result: picked,
      qa: pickedQa,
      route: "ocr",
      retried: true,
      retryChunkSize: retryChunk,
      chain,
    };
  } catch (err) {
    logger.warn(
      { error: err instanceof Error ? err.message : String(err), retryChunk },
      "QA retry chunk 6 failed — proceeding with first OCR result",
    );
    return { result, qa, route: "ocr", retried: true, retryChunkSize: retryChunk, chain };
  }
}
