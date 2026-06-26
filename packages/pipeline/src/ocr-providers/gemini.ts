import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { logger } from "../logger";

export class GeminiOcrProvider implements OcrProvider {
  readonly name = "Gemini 1.5 Flash OCR";
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
    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert Arabic OCR and document layout analysis system.
Extract all text exactly as it appears in this document.
Maintain the exact structure and layout of the original text.
Preserve all tables using Markdown format perfectly.
Return ONLY the markdown text, without any conversational prefixes.`;

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
    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const BATCH_SIZE = 10;
    const batchPrompt = `You are an expert Arabic OCR and document layout analysis system.
I am providing you with multiple pages from a document.
Extract all text exactly as it appears in this document.
Maintain the exact structure and layout of the original text.
Preserve all tables using Markdown format perfectly.
IMPORTANT: If the page contains footnotes or marginalia (الهوامش والحواشي السفلية), you MUST extract them accurately, preserve their reference numbers, and place them at the bottom of the extracted page text separated by a horizontal rule "---".
Return ONLY the markdown text, without any conversational prefixes.
IMPORTANT INSTRUCTION: You MUST separate the text of each page with exactly this separator on a new line: "===PAGE_BREAK==="`;
    const pages: OcrPageResult[] = [];
    let fullText = "";

    for (let i = 0; i < pageGetters.length; i += BATCH_SIZE) {
      const batchGetters = pageGetters.slice(i, i + BATCH_SIZE);
      try {
        logger.info(
          "gemini",
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

        const pageTexts = text.split("===PAGE_BREAK===").map((t) => t.trim());

        for (let j = 0; j < batchGetters.length; j++) {
          const pageNum = i + j + 1;
          const pageText = pageTexts[j] || "";
          pages.push({ number: pageNum, text: pageText, confidence: 1.0 });
          fullText += pageText + "\n\n";
        }

        if (i + BATCH_SIZE < pageGetters.length) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          "gemini",
          `Failed to process batch ${i + 1}-${i + batchGetters.length}: ${msg}`,
        );
        for (let j = 0; j < batchGetters.length; j++) {
          pages.push({ number: i + j + 1, text: "", confidence: 0.0 });
        }
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
