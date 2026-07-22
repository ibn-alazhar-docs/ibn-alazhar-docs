import type { PipelineConfig, OcrEngineType } from "../types";

function toNum(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildOcrConfig(): Pick<PipelineConfig, "ocr"> {
  return {
    ocr: {
      dpi: toNum(process.env.OCR_DPI, 300),
      language: process.env.OCR_LANGUAGE ?? "ar",
      maxRetries: toNum(process.env.OCR_MAX_RETRIES, 3),
      provider: (process.env.OCR_PROVIDER as OcrEngineType) ?? "surya",
      providers: (() => {
        const parsed = (process.env.OCR_PROVIDERS ?? "")
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        const base = (parsed.length > 0
          ? parsed
          : ["surya", "tesseract"]) as OcrEngineType[];
        if (
          process.env.OCR_CLOUD_ENABLED === "true" &&
          !base.includes("gemini")
        ) {
          base.push("gemini");
        }
        return base;
      })(),
      minConfidence: Math.max(
        0,
        Math.min(1, Number(process.env.OCR_MIN_CONFIDENCE ?? 0)),
      ),
      adaptiveProviderSelection: process.env.OCR_ADAPTIVE_PROVIDERS !== "false",
      cloudOcrDailyBudget: Number(process.env.OCR_CLOUD_DAILY_BUDGET ?? -1),
      preprocess: {
        mode: (process.env.OCR_PREPROCESS_MODE as "auto" | "on" | "off") ??
          "auto",
        minDpi: toNum(process.env.OCR_MIN_DPI, 300),
        targetDpi: toNum(process.env.OCR_TARGET_DPI, 400),
        upscale: Math.max(1, Number(process.env.OCR_UPSCALE ?? 1.0)),
        deskew: process.env.OCR_DESKEW !== "0",
        clahe: process.env.OCR_CLAHE !== "0",
        denoise: process.env.OCR_DENOISE !== "0",
        shadow: process.env.OCR_SHADOW !== "0",
        border: process.env.OCR_BORDER === "1",
        perspective: process.env.OCR_PERSPECTIVE === "1",
        binarize: process.env.OCR_BINARIZE === "1",
        sauvola: process.env.OCR_SAUVOLA === "1",
        sharpen: process.env.OCR_SHARPEN === "1",
      },
    },
  };
}
