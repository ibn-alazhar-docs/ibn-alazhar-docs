import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

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

export class GeminiOcrProvider implements OcrProvider {
  readonly name = "Gemini OCR (configurable model)";
  readonly type = "gemini" as OcrEngineType;

  isAvailable(config: PipelineConfig): boolean {
    return !!config.gemini?.apiKey;
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
        engine: "gemini" as OcrEngineType,
      };
    }

    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const prompt = `You are an expert Arabic OCR (Optical Character Recognition) and document layout analysis system.

**Your Primary Task:**
Extract all text exactly as it appears in the original document without adding, removing, or interpreting anything.

**Critical Rules (must follow strictly):**
1. **Diacritics:** Preserve all tashkeel marks (fatha, damma, kasra, sukun, tanween, shadda) exactly as they are — do not remove, add, or infer them.
2. **Punctuation:** Preserve all punctuation marks precisely: ، . ؛ : ؟ ! " " ( ) [ ] { } - – — / \\ * # @ & % $ and others.
3. **Numbers and Letters:** Preserve Arabic numerals (١٢٣), Hindu numerals (123), and Latin letters (a, b, c, س١, س5) as they are.
4. **Direction:** Maintain right-to-left (RTL) text direction and page order.
5. **Layout:** Preserve the original structure:
   - Main and sub headings
   - Paragraphs and separate lines
   - Bulleted and numbered lists
   - Tables (in Markdown format)
   - Questions and answers (each question on a separate line)
   - Multiple-choice alternatives (each alternative on a separate line)
   - Any other special formatting

**Special Instructions:**
- **For Questions and Exams:** Preserve question formatting (س١:, س5:, سؤال ١:, etc.) and answer alternatives [(أ), (ب), (ج), (د)] on separate lines.
- **For Tables:** Use correct Markdown format with column alignment.
- **For Footnotes:** Extract footnotes precisely with reference numbers, place them below page text separated by "---".
- **For Multiple Columns:** Read right to left, column by column, then top to bottom.

**What NOT to do:**
❌ Do not add introductory text, comments, or notes
❌ Do not interpret, summarize, or rephrase
❌ Do not correct spelling or grammatical errors in the original text
❌ Do not remove parts that seem "unimportant"
✅ Only extract the text exactly as it is

**Required Output:**
Precise raw text in simple Markdown format (headings start with #, lists with -, tables with |).`;

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
      return {
        text: text,
        pages: [{ number: 1, text, confidence: 1.0 }],
        confidence: 1.0,
        engine: "gemini",
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
        text: `هذا نص تجريبي للصفحة ${i + 1} لا_أعلم_هويتي تفوق كبير وتألق`,
        confidence: 0.99,
      }));
      const text = pages.map((p) => p.text).join("\n\n");
      return { text, pages, confidence: 0.99, engine: "gemini" as OcrEngineType };
    }

    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const batchPrompt = `You are an expert Arabic OCR (Optical Character Recognition) and document layout analysis system.

**Context:** I am providing you with multiple pages from a single document (up to 10 pages in this batch).

**Your Task:**
Extract all text exactly as it appears in the original document without adding, removing, or interpreting anything.

**Critical Rules:**
1. **Diacritics:** Preserve all tashkeel marks (fatha, damma, kasra, sukun, tanween, shadda) with absolute precision.
2. **Punctuation:** Preserve all punctuation marks: ، . ؛ : ؟ ! " " ( ) [ ] { } - – — / \\ * # @ and others.
3. **Numbers:** Preserve Arabic numerals (١٢٣), Hindu numerals (123), and Latin letters (a, b, c, س١, س5).
4. **Direction:** Right-to-left (RTL) with same page order.
5. **Layout:** Preserve headings, paragraphs, lists, tables, questions and answers, choice alternatives.

**Special Instructions:**
- **For Questions:** Each question on a separate line (س١:, س5:, سؤال ١:)
- **For Alternatives:** Each alternative on a separate line [(أ), (ب), (ج), (د)]
- **For Tables:** Correct Markdown format
- **For Footnotes:** Extract them with reference numbers, place below page text after "---"
- **For Columns:** Read right to left, column by column, then top to bottom

**Page Separator (very important):**
Separate each page's text from the next page with a separator on a new line: "===PAGE_BREAK==="

**What NOT to do:**
❌ Do not add introductory text or comments
❌ Do not interpret, summarize, or rephrase
❌ Do not correct spelling errors
❌ Do not remove parts that seem "unimportant"

**Output:** Precise raw text in simple Markdown format, with PAGE_BREAK separator between pages.`;

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

        if (i + BATCH_SIZE < pageGetters.length) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }

      const confidence =
        pages.length > 0 ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length : 0;

      return {
        text: fullText.trim(),
        pages,
        confidence,
        engine: "gemini",
      };
    });
  }
}
