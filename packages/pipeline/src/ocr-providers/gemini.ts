import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "ocr-gemini" });

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

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    const prompt = `أنت نظام خبير في التعرف الضوئي على النصوص العربية وتحليل تخطيط المستندات.
استخرج كل النص تمامًا كما يظهر في المستند الأصلي دون إضافة أو حذف.
الأهمية القصوى: احتفظ بعلامات التشكيل (التنوين والحركات: الفتحة والضمة والكسرة والسكون) لكل كلمة كما هي، ولا تحذفها ولا تقدّرها.
احتفظ بعلامات الترقيم (، . ؛ : ؟ ! " " ( ) وغيرها) بدقة.
حافظ على اتجاه النص من اليمين إلى اليسار (RTL) وبنفس ترتيب الصفحات.
حافظ على البنية والتخطيط الأصلي: العناوين، الفقرات، والقوائم (النقطية والرقمية) كما هي.
أعد أي جداول (tables) بصيغة Markdown صحيحة ومطابقة للأصل تمامًا.
لا تُضف أي نص استهلالي أو ختامي؛ أعد النص المستخرج فقط.`;

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

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    const BATCH_SIZE = 10;
    const batchPrompt = `أنت نظام خبير في التعرف الضوئي على النصوص العربية وتحليل تخطيط المستندات.
أزوّدك بعدة صفحات من مستند.
استخرج كل النص تمامًا كما يظهر في المستند الأصلي دون إضافة أو حذف.
الأهمية القصوى: احتفظ بعلامات التشكيل (التنوين والحركات: الفتحة والضمة والكسرة والسكون) لكل كلمة كما هي، ولا تحذفها.
احتفظ بعلامات الترقيم (، . ؛ : ؟ ! " " ( ) وغيرها) بدقة.
حافظ على اتجاه النص من اليمين إلى اليسار (RTL) وبنفس ترتيب الصفحات.
حافظ على البنية والتخطيط الأصلي: العناوين، الفقرات، والقوائم كما هي.
أعد أي جداول (tables) بصيغة Markdown صحيحة ومطابقة للأصل تمامًا.
تعليمة هامة: إذا احتوت الصفحة على هوامش أو حواشٍ سفلية، فاستخرجها بدقة مع أرقام المراجع، وضعها أسفل نص الصفحة مفصولة بخط أفقي "---".
تعليمة هامة: افصل نص كل صفحة عن الصفحة التي تليها تمامًا بفاصل في سطر جديد وهو: "===PAGE_BREAK==="`;
    const pages: OcrPageResult[] = [];
    let fullText = "";

    for (let i = 0; i < pageGetters.length; i += BATCH_SIZE) {
      const batchGetters = pageGetters.slice(i, i + BATCH_SIZE);
      try {
        logger.info(
          `Processing batch pages ${i + 1} to ${i + batchGetters.length} of ${pageGetters.length}`,
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to process batch ${i + 1}-${i + batchGetters.length}: ${msg}`);
        throw err;
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
  }
}
