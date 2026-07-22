import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";
import { getCloudOcrRemainingBudget, recordCloudOcrUsage } from "../cloud-cost-guard";

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

async function tryWithModelFallbacks<T>(
  config: PipelineConfig,
  fn: (modelId: string) => Promise<T>,
): Promise<T> {
  const models = [config.gemini.model, ...config.gemini.modelFallbacks];
  const errors: { model: string; error: string }[] = [];

  for (const modelId of models) {
    try {
      return await fn(modelId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Model ${modelId} failed: ${msg}`);
      errors.push({ model: modelId, error: msg });

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

function estimateQualityMetrics(pages: OcrPageResult[], rawText: string): {
  arabicRatio: number;
  diacriticsRatio: number;
  tableHints: number;
  averageLength: number;
} {
  const arabic = (rawText.match(/[\u0600-\u06FF]/g) || []).length;
  const total = rawText.replace(/\s+/g, " ").length;
  const tableHints = (rawText.match(/\|/g) || []).length;
  const diacritics =
    rawText.match(/[\u064B-\u065F\u0670\u06D6-\u06DC]/g) || [];
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
   - Inline: $H_2SO_4$, $C_6H_{12}O_6$, $\int f(x)dx$
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

const DEFAULT_NATIVE_CHUNK_SIZE = 4;

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
      const chunkSize = config.gemini.nativeChunkSize ?? 4;
      return this.extractPdfChunksNative(config, fileBuffer, fileName, chunkSize);
    }

    const prompt = PROMPTS.arabic_scientific;

    return tryWithModelFallbacks(config, async (modelId) => {
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
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

    return tryWithModelFallbacks(config, async (modelId) => {
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
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
        const pages = await chunk.copyPages(pdfDoc, Array.from({ length: end - start }, (_, i) => start + i));
        pages.forEach((page) => chunk.addPage(page));
        const bytes = await chunk.save();
        chunks.push(Buffer.from(bytes));
      }

      logger.info(
        `Native PDF chunking: ${totalPages} pages -> ${chunks.length} chunks on ${modelId}`
      );

      const pages: OcrPageResult[] = [];
      let fullText = "";
      let processedPages = 0;

      for (let c = 0; c < chunks.length; c++) {
        const base64Chunk = chunks[c].toString("base64");
        const { start, end } = ranges[c];

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
        pages.length > 0
          ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length
          : 0;

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

    return tryWithModelFallbacks(config, async (modelId) => {
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });

      const BATCH_SIZE = 10;
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

