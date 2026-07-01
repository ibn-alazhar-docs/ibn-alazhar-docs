import type { PipelineConfig, OcrEngineType, OcrEngineResult } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "ocr-provider" });
import { GoogleDriveOcrProvider } from "./ocr-providers/google";
import { SuryaOcrProvider } from "./ocr-providers/surya";
import { GeminiOcrProvider } from "./ocr-providers/gemini";
import { TesseractOcrProvider } from "./ocr-providers/tesseract";

export type { OcrProvider } from "./ocr-providers/types";
export { estimateConfidence } from "./ocr-providers/types";
export { GoogleDriveOcrProvider } from "./ocr-providers/google";
export { SuryaOcrProvider } from "./ocr-providers/surya";
export { GeminiOcrProvider } from "./ocr-providers/gemini";
export { TesseractOcrProvider } from "./ocr-providers/tesseract";

export function createOcrProvider(type: OcrEngineType) {
  switch (type) {
    case "google":
      return new GoogleDriveOcrProvider();
    case "surya":
      return new SuryaOcrProvider();
    case "tesseract":
      return new TesseractOcrProvider();
    case "gemini":
      return new GeminiOcrProvider();
  }
}

export class OcrManager {
  private providers: InstanceType<
    | typeof GoogleDriveOcrProvider
    | typeof SuryaOcrProvider
    | typeof GeminiOcrProvider
    | typeof TesseractOcrProvider
  >[];

  constructor(config: PipelineConfig) {
    const engineTypes =
      config.ocr.providers.length > 0 ? config.ocr.providers : [config.ocr.provider];

    this.providers = engineTypes.map((type: OcrEngineType) => createOcrProvider(type));
  }

  getAvailableProviders() {
    return this.providers;
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      const available = await provider.isAvailable(config);
      if (!available) {
        errors.push({ provider: provider.name, error: "NOT_AVAILABLE" });
        continue;
      }

      try {
        const result = await provider.extractText(config, fileBuffer, fileName, mimeType);
        if (errors.length > 0) {
          logger.warn(`${provider.name} succeeded after ${errors.length} failure(s)`);
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`${provider.name} failed: ${msg}`);
        errors.push({ provider: provider.name, error: msg });
      }
    }

    throw new Error(
      `ALL_OCR_PROVIDERS_FAILED: ${errors.map((e) => `${e.provider}:${e.error}`).join("; ")}`,
    );
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      const available = await provider.isAvailable(config);
      if (!available) {
        errors.push({ provider: provider.name, error: "NOT_AVAILABLE" });
        continue;
      }

      try {
        const result = await provider.extractPages(config, pageGetters, fileName);
        if (errors.length > 0) {
          logger.warn(`${provider.name} succeeded after ${errors.length} failure(s)`);
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`${provider.name} failed: ${msg}`);
        errors.push({ provider: provider.name, error: msg });
      }
    }

    throw new Error(
      `ALL_OCR_PROVIDERS_FAILED: ${errors.map((e) => `${e.provider}:${e.error}`).join("; ")}`,
    );
  }
}
