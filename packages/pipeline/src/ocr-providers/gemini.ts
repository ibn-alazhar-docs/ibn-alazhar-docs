import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";
import { getCloudOcrRemainingBudget, recordCloudOcrUsage } from "../cloud-cost-guard";
import { KeyPool, keyFingerprint, loadGeminiKeys } from "../keypool";

const logger = baseLogger.child({ module: "ocr-gemini" });

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("503") ||
      msg.includes("service unavailable") ||
      msg.includes("429") ||
      msg.includes("resource exhausted") ||
      msg.includes("rate limit") ||
      msg.includes("overloaded") ||
      msg.includes("high demand")
    );
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const MAX_ATTEMPTS = 3;
  let attempt = 0;
  // Intentional infinite retry loop: exits via return/throw below.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= MAX_ATTEMPTS || !isTransientError(err)) {
        throw err;
      }
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({ attempt, delay, error: errMsg }, `Retrying ${label} after transient error`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Rota عبر خانات (مفتاح × موديل) من KeyPool — نقل من arabic-pdf-to-book §3.
 * في الأصل (gemini_ocr.py) لم يُستخدم KeyPool فعليًا؛ هنا يُربط فعليًا:
 *   - consume(key, model) بعد كل نجاح (حصة يومية بالطلبات، بصمة sha256 لا المفتاح)
 *   - خطأ حصة/مفتاح (429/403/401) → تخطّي الخانة إلى التالية، لا إسقاط العملية
 *   - خطأ عابر → إعادة 3 مرات ثم الخانة التالية (سلوك fallback السابق)
 *   - خطأ غير عابر وغير حصة → يُرمى فورًا كما كان
 */
async function tryWithModelFallbacks<T>(
  config: PipelineConfig,
  fn: (modelId: string, apiKey: string) => Promise<T>,
  pages = 1,
): Promise<T> {
  const models = [config.gemini.model, ...config.gemini.modelFallbacks];
  const keys = [...new Set([config.gemini.apiKey, ...loadGeminiKeys()].filter(Boolean))];
  const pool = new KeyPool({ models, keys });
  const slots = pool.plan();
  const errors: { model: string; error: string }[] = [];

  if (keys.length > 0 && slots.length === 0) {
    throw new Error(
      "KEYPOOL_EXHAUSTED: no (key, model) slot left today — daily quota consumed; use Tesseract/local or wait for reset",
    );
  }

  // بلا مفاتيح مكتشفة: مسار قديم بمفتاح config الواحد (سيُرمى لاحقًا إن غاب).
  const attempts =
    slots.length > 0
      ? slots
      : models.map((model) => ({ key: config.gemini.apiKey, model, used: 0, left: 0 }));

  for (const slot of attempts) {
    try {
      const result = await withRetry(
        () => fn(slot.model, slot.key),
        `model ${slot.model} key ${keyFingerprint(slot.key)}`,
      );
      if (slots.length > 0) pool.consume(slot.key, slot.model, pages);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Model ${slot.model} failed: ${msg}`);
      errors.push({ model: slot.model, error: msg });

      if (KeyPool.isQuotaError(err) || KeyPool.isKeyError(err)) {
        continue; // نفاد/مفتاح ميت: خانة أخرى قد تنجح
      }
      if (!isTransientError(err)) {
        throw err;
      }
    }
  }

  const lastError = errors[errors.length - 1]?.error ?? "Unknown error";
  throw new Error(
    `ALL_GEMINI_MODELS_FAILED: ${errors.map((e) => `${e.model}:${e.error}`).join("; ")} (last: ${lastError})`,
  );
}

/**
 * Split a Gemini batch response on the PAGE_BREAK separator and produce
 * ordered page results. Pure function — no I/O, no SDK, easily unit-testable.
 *
 * @param text       Raw text returned by Gemini for one batch.
 * @param batchStart 0-based index of the first page in the batch.
 * @param expected   How many pages we expected from this batch.
 */
export function splitGeminiBatchPages(
  text: string,
  batchStart: number,
  expected: number,
): OcrPageResult[] {
  const pageTexts = text.split("===PAGE_BREAK===").map((t) => t.trim());
  const pages: OcrPageResult[] = [];
  for (let j = 0; j < expected; j++) {
    pages.push({
      number: batchStart + j + 1,
      text: pageTexts[j] || "",
      confidence: 1.0,
    });
  }
  return pages;
}

function estimateQualityMetrics(
  pages: OcrPageResult[],
  rawText: string,
): {
  arabicRatio: number;
  diacriticsRatio: number;
  tableHints: number;
  averageLength: number;
} {
  const arabic = (rawText.match(/[\u0600-\u06FF]/g) || []).length;
  const total = rawText.replace(/\s+/g, " ").length;
  const tableHints = (rawText.match(/\|/g) || []).length;
  const diacritics = rawText.match(/[\u064B-\u065F\u0670\u06D6-\u06DC]/g) || [];
  return {
    arabicRatio: total === 0 ? 0 : arabic / total,
    diacriticsRatio: rawText.length === 0 ? 0 : diacritics.length / rawText.length,
    tableHints,
    averageLength: pages.length === 0 ? 0 : rawText.length / pages.length,
  };
}

const PROMPTS = {
  arabic_scientific: `You are RAQIM ELITE, an elite scientific scribe specializing in Arabic manuscript digitization with chemical precision.

## PRIMARY DIRECTIVE
Convert the provided document into high-fidelity Markdown with ZERO information loss. Every character, diacritic, and structural element must be preserved.

## ARABIC PROTOCOLS
1. **100% Text Preservation**: Preserve every Arabic character, diacritic (tashkeel), and punctuation mark exactly as printed.
2. **RTL Integrity**: Maintain logical right-to-left reading order across all columns and pages.
3. **Context Bridging**: When Arabic text references scientific symbols, keep the symbol with its Arabic explanation on the same line.

## SCIENTIFIC PRECISION (CRITICAL)
1. **LaTeX for All Formulas**: Wrap ALL chemical formulas, mathematical equations, and scientific notation in LaTeX.
   - Inline: $H_2SO_4$, $C_6H_{12}O_6$, $\\int f(x)dx$
   - Block: $$2H_2 + O_2 \\rightarrow 2H_2O$$
   - States of matter: $(s)$, $(l)$, $(g)$, $(aq)$
2. **Subscripts/Superscripts**: Preserve all subscripts and superscripts in LaTeX.

## STRUCTURAL HIERARCHY
1. **Headings**: Use # for document title, ## for chapters/sections, ### for subsections.
2. **Tables**: Reconstruct as Markdown tables with aligned columns.
3. **Lists**: Use - for bullet points, 1. for numbered lists.
4. **Emphasis**: Preserve **bold** and *italic* formatting.

## PAGE TRANSITIONS
When processing multiple pages, separate each page's content with a horizontal rule (---) on its own line.

## NEGATIVE CONSTRAINTS
❌ NO introductory text, summaries, or commentary
❌ NO interpretation, translation, or paraphrasing
❌ NO correction of spelling or grammar in the original
❌ NO removal of "unimportant" sections
✅ ONLY raw, faithful transcription in Markdown format`,

  arabic_scientific_chunk: (start: number, end: number) =>
    `${PROMPTS.arabic_scientific}

## TARGET SCOPE
Process only pages ${start} to ${end} from the provided material. Maintain continuity with surrounding content.`,
};

/**
 * حجم القطعة القياسي 10 صفحات (gemini_ocr.py: --chunk 10)،
 * وحجم إعادة المحاولة بعد فشل QA = 6 صفحات (pipeline.py: --chunk 6).
 * 36 صفحة × (10 ثم 6) هي صيغة الأصل المثبتة عمليًّا.
 */
export const GEMINI_DEFAULT_CHUNK_SIZE = 10;
export const GEMINI_RETRY_CHUNK_SIZE = 6;
const DEFAULT_NATIVE_CHUNK_SIZE = GEMINI_DEFAULT_CHUNK_SIZE;

/**
 * حجم القطعة بعد فشل QA: إن كانت المحاولة الأولى (10 أو قيمة config)،
 * أعد بـ6؛ وإن كانت أصلًا 6 أو أصغر، لا صِغر أكثر — أبقها (لا تفيد إعادة
 * ثالثة أنحف، الأفضل القبول مع needsReview كما في الأصل).
 */
export function retryChunkSizeOnQaFailure(currentChunkSize: number): number {
  return currentChunkSize > GEMINI_RETRY_CHUNK_SIZE ? GEMINI_RETRY_CHUNK_SIZE : currentChunkSize;
}

/**
 * QA خفيف على مستوى قطعة واحدة (نصّ مقابل عدد صفحات متوقعة).
 * يُستخدم داخل extractPdfChunksNative لتسجيل القطع الفاشلة؛
 * الحكم النهائي ببوابة evaluateQaGates الكاملة في ocr-chain.
 */
export function isChunkQaFailed(text: string, expectedPages: number): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length > 12_000 * Math.max(1, expectedPages)) return true; // حلقة تكرار (gemini_ocr.generate)
  const charsPerPage = trimmed.length / Math.max(1, expectedPages);
  return charsPerPage < 250; // عتبة chars-per-page في qa-gates
}

export class GeminiOcrProvider implements OcrProvider {
  readonly name = "Gemini OCR (configurable model)";
  readonly type = "gemini" as OcrEngineType;

  isAvailable(config: PipelineConfig): boolean {
    if (!config.gemini?.apiKey) return false;

    const budget = config.ocr.cloudOcrDailyBudget ?? -1;
    if (budget >= 0) {
      const remaining = getCloudOcrRemainingBudget("gemini", budget);
      if (remaining <= 0) {
        logger.warn({ remaining }, "Gemini skipped: cloud OCR daily budget exhausted");
        return false;
      }
    }

    return true;
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    if (process.env.MOCK_OCR === "true") {
      const text = `هذا نص تجريبي مستخرج لا_أعلم_هويتي تفوق كبير وتألق`;
      return {
        text,
        pages: [{ number: 1, text, confidence: 0.99 }],
        confidence: 0.99,
        engine: "gemini",
      };
    }

    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const budget = config.ocr.cloudOcrDailyBudget ?? -1;
    if (budget >= 0) {
      const remaining = getCloudOcrRemainingBudget("gemini", budget);
      if (remaining <= 0) {
        throw new Error(
          `CLOUD_OCR_BUDGET_EXHAUSTED: Gemini daily budget exhausted (remaining=${remaining})`,
        );
      }
    }

    if (mimeType === "application/pdf") {
      const chunkSize = config.gemini.nativeChunkSize ?? GEMINI_DEFAULT_CHUNK_SIZE;
      return this.extractPdfChunksNative(config, fileBuffer, fileName, chunkSize);
    }

    const prompt = PROMPTS.arabic_scientific;

    return tryWithModelFallbacks(config, async (modelId, apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });

      logger.info(`Trying Gemini model ${modelId} for single-image OCR`);
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType,
          },
        },
      ]);

      const text = result.response.text();
      const metrics = estimateQualityMetrics([{ number: 1, text, confidence: 1.0 }], text);

      if (budget >= 0) {
        recordCloudOcrUsage("gemini", 1);
      }

      return {
        text: text,
        pages: [{ number: 1, text, confidence: 1.0 }],
        confidence: 1.0,
        engine: "gemini",
        quality: {
          arabicRatio: metrics.arabicRatio,
          diacriticsRatio: metrics.diacriticsRatio,
          tableHints: metrics.tableHints,
          averagePageLength: metrics.averageLength,
        },
      };
    });
  }

  /**
   * Native PDF fast path:
   * Splits the PDF into small native chunks and sends each chunk directly to
   * Gemini Vision. This preserves vector text, tables, and layout while
   * reducing payload size and API calls compared to rasterizing every page.
   */
  async extractPdfChunksNative(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    chunkSize = DEFAULT_NATIVE_CHUNK_SIZE,
    onProgress?: (processed: number, total: number) => void,
  ): Promise<OcrEngineResult> {
    if (process.env.MOCK_OCR === "true") {
      const text = `هذا نص تجريبي مستخرج لا_أعلم_هويتي تفوق كبير وتألق`;
      return {
        text,
        pages: [{ number: 1, text, confidence: 0.99 }],
        confidence: 0.99,
        engine: "gemini",
      };
    }

    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const budget = config.ocr.cloudOcrDailyBudget ?? -1;
    if (budget >= 0) {
      const remaining = getCloudOcrRemainingBudget("gemini", budget);
      if (remaining <= 0) {
        throw new Error(
          `CLOUD_OCR_BUDGET_EXHAUSTED: Gemini daily budget exhausted (remaining=${remaining})`,
        );
      }
    }

    return tryWithModelFallbacks(config, async (modelId, apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });

      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const totalPages = pdfDoc.getPageCount();
      const chunks: Buffer[] = [];
      const ranges: { start: number; end: number }[] = [];

      for (let start = 0; start < totalPages; start += chunkSize) {
        const end = Math.min(start + chunkSize, totalPages);
        ranges.push({ start, end });

        const chunk = await PDFDocument.create();
        const pages = await chunk.copyPages(
          pdfDoc,
          Array.from({ length: end - start }, (_, i) => start + i),
        );
        pages.forEach((page) => chunk.addPage(page));
        const bytes = await chunk.save();
        chunks.push(Buffer.from(bytes));
      }

      logger.info(
        `Native PDF chunking: ${totalPages} pages -> ${chunks.length} chunks on ${modelId}`,
      );

      const pages: OcrPageResult[] = [];
      let fullText = "";
      let processedPages = 0;
      const chunkQaFailed: { start: number; end: number; chars: number }[] = [];

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        const range = ranges[c];
        if (!chunk || !range) continue;
        const base64Chunk = chunk.toString("base64");
        const { start, end } = range;

        const promptText = PROMPTS.arabic_scientific_chunk(start + 1, end);

        const result = await model.generateContent([
          { text: promptText },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Chunk,
            },
          },
        ]);

        const text = result.response.text();
        // QA خفيف لكل قطعة: الفاشلة تُسجَّل (تُعيد ocr-chain كل المستند بـ6 عند فشل QA الكلي).
        if (isChunkQaFailed(text, end - start)) {
          chunkQaFailed.push({ start: start + 1, end, chars: text.length });
          logger.warn(
            `Chunk ${start + 1}-${end} QA-fail (chars=${text.length}, chunkSize=${chunkSize}) — retry policy: chunk ${GEMINI_RETRY_CHUNK_SIZE} عند فشل QA الكلي`,
          );
        }
        const chunkPages = splitGeminiBatchPages(text, start, end - start);
        pages.push(...chunkPages);
        for (const p of chunkPages) {
          fullText += p.text + "\n\n";
        }
        processedPages += chunkPages.length;

        if (budget >= 0) {
          recordCloudOcrUsage("gemini", chunkPages.length);
        }

        onProgress?.(processedPages, totalPages);

        if (c + 1 < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      const metrics = estimateQualityMetrics(pages, fullText);
      const confidence =
        pages.length > 0 ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length : 0;

      return {
        text: fullText.trim(),
        pages,
        confidence,
        engine: "gemini",
        quality: {
          arabicRatio: metrics.arabicRatio,
          diacriticsRatio: metrics.diacriticsRatio,
          tableHints: metrics.tableHints,
          averagePageLength: metrics.averageLength,
        },
      };
    });
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    _fileName: string,
  ): Promise<OcrEngineResult> {
    if (process.env.MOCK_OCR === "true") {
      const pages: OcrPageResult[] = pageGetters.map((_, i) => ({
        number: i + 1,
        text: `هذا نص تجريبي للصفحة ${i + 1} لا_أعلم_هويتi تفوق كبير وتألق`,
        confidence: 0.99,
      }));
      const text = pages.map((p) => p.text).join("\n\n");
      return { text, pages, confidence: 0.99, engine: "gemini" as OcrEngineType };
    }

    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const budget = config.ocr.cloudOcrDailyBudget ?? -1;
    if (budget >= 0) {
      const remaining = getCloudOcrRemainingBudget("gemini", budget);
      const needed = pageGetters.length;
      if (remaining < needed) {
        throw new Error(
          `CLOUD_OCR_BUDGET_INSUFFICIENT: Gemini budget ${remaining} < pages ${needed}`,
        );
      }
    }

    const batchPrompt = `You are RAQIM ELITE, an elite scientific scribe specializing in Arabic manuscript digitization.

## PRIMARY DIRECTIVE
Convert the provided document into high-fidelity Markdown with ZERO information loss.

## ARABIC PROTOCOLS
1. **100% Text Preservation**: Preserve every Arabic character, diacritic (tashkeel), and punctuation mark exactly as printed.
2. **RTL Integrity**: Maintain logical right-to-left reading order across all columns and pages.
3. **Context Bridging**: When Arabic text references scientific symbols, keep the symbol with its Arabic explanation on the same line.

## SCIENTIFIC PRECISION (CRITICAL)
1. **LaTeX for All Formulas**: Wrap ALL chemical formulas and scientific notation in LaTeX.
   - Inline: $H_2SO_4$, $C_6H_{12}O_6$
   - Block: $$2H_2 + O_2 \\rightarrow 2H_2O$$

## STRUCTURAL HIERARCHY
1. **Headings**: Use # for document title, ## for sections, ### for subsections.
2. **Tables**: Reconstruct as Markdown tables with aligned columns.
3. **Lists**: Use - for bullets, 1. for numbered lists.
4. **Emphasis**: Preserve **bold** and *italic* formatting.

## PAGE TRANSITIONS
Separate each page's text with a horizontal rule (---) on its own line.

## NEGATIVE CONSTRAINTS
❌ NO introductory text, summaries, or commentary
❌ NO interpretation, translation, or paraphrasing
❌ NO correction of spelling or grammar in the original
❌ NO removal of "unimportant" sections
✅ ONLY raw, faithful transcription in Markdown format`;

    return tryWithModelFallbacks(config, async (modelId, apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });

      // دفعات الصور = حجم القطعة (10 أولًا، 6 بعد فشل QA عبر config override في ocr-chain).
      const BATCH_SIZE = config.gemini.nativeChunkSize ?? GEMINI_DEFAULT_CHUNK_SIZE;
      const pages: OcrPageResult[] = [];
      let fullText = "";

      for (let i = 0; i < pageGetters.length; i += BATCH_SIZE) {
        const batchGetters = pageGetters.slice(i, i + BATCH_SIZE);
        logger.info(
          `Trying Gemini model ${modelId} for batch pages ${i + 1} to ${i + batchGetters.length} of ${pageGetters.length}`,
        );

        const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [
          batchPrompt,
        ];
        const batchImages = await Promise.all(batchGetters.map((get) => get()));
        for (const imgBuf of batchImages) {
          parts.push({
            inlineData: {
              data: imgBuf!.toString("base64"),
              mimeType: "image/png",
            },
          });
        }

        const result = await model.generateContent(parts);
        const text = result.response.text();

        const batchPages = splitGeminiBatchPages(text, i, batchGetters.length);
        pages.push(...batchPages);
        for (const p of batchPages) {
          fullText += p.text + "\n\n";
        }

        if (budget >= 0) {
          recordCloudOcrUsage("gemini", batchGetters.length);
        }

        if (i + BATCH_SIZE < pageGetters.length) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }

      const metrics = estimateQualityMetrics(pages, fullText);
      const confidence =
        pages.length > 0 ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length : 0;

      return {
        text: fullText.trim(),
        pages,
        confidence,
        engine: "gemini",
        quality: {
          arabicRatio: metrics.arabicRatio,
          diacriticsRatio: metrics.diacriticsRatio,
          tableHints: metrics.tableHints,
          averagePageLength: metrics.averageLength,
        },
      };
    });
  }
}
