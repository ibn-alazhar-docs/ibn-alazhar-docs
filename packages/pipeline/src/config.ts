import type { PipelineConfig, OcrEngineType } from "./types";

export function loadConfig(): PipelineConfig {
  return {
    minio: (() => {
      const rawEndpoint = process.env.S3_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "localhost";
      let endpoint = rawEndpoint;
      let port = Number(process.env.S3_PORT ?? process.env.MINIO_PORT ?? 9000);
      let useSSL = process.env.S3_USE_SSL === "true" || process.env.MINIO_USE_SSL === "true";

      if (rawEndpoint.startsWith("http://") || rawEndpoint.startsWith("https://")) {
        try {
          const parsed = new URL(rawEndpoint);
          endpoint = parsed.hostname;
          port = Number(parsed.port) || port;
          useSSL = parsed.protocol === "https:";
        } catch {
          // fallback to raw
        }
      }

      const isProduction = process.env.NODE_ENV === "production";
      const accessKey = process.env.S3_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY;
      const secretKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY;

      if (isProduction && (!accessKey || !secretKey)) {
        throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required in production");
      }

      return {
        endpoint,
        port,
        useSSL,
        accessKey: accessKey ?? "minioadmin",
        secretKey: secretKey ?? "minioadmin",
        bucket: process.env.S3_BUCKET ?? process.env.MINIO_BUCKET ?? "ibnalazhardocs",
      };
    })(),
    redis: (() => {
      const url = process.env.REDIS_URL;
      if (url) {
        try {
          const parsed = new URL(url);
          return {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            password: parsed.password || undefined,
            tls: parsed.protocol === "rediss:",
          };
        } catch {
          // fall through to individual vars
        }
      }
      return {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      };
    })(),
    google: {
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
      privateKey: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      // Configurable model id. Defaults to a currently-available Gemini Flash
      // model that supports vision + PDF + Arabic. Override via GEMINI_MODEL
      // if your account/region uses a different id (e.g. gemini-3.5-flash).
      model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
    },
    ocr: {
      dpi: Number(process.env.OCR_DPI ?? 300),
      language: process.env.OCR_LANGUAGE ?? "ar",
      maxRetries: Number(process.env.OCR_MAX_RETRIES ?? 3),
      provider: (process.env.OCR_PROVIDER as OcrEngineType) ?? "gemini",
      providers: (process.env.OCR_PROVIDERS?.split(",") as OcrEngineType[]) ?? ["gemini"],
      // Minimum mean confidence (0..1) for an OCR result to be accepted. Below
      // this the OcrManager retries with the next provider (confidence-gated
      // fallback). 0 disables gating (legacy strict-first behaviour).
      minConfidence: Number(process.env.OCR_MIN_CONFIDENCE ?? 0),
      // Image pre-processing chain applied to every rasterised page.
      preprocess: {
        mode: (process.env.OCR_PREPROCESS_MODE as "auto" | "on" | "off") ?? "auto",
        minDpi: Number(process.env.OCR_MIN_DPI ?? 300),
        targetDpi: Number(process.env.OCR_TARGET_DPI ?? 400),
        upscale: Number(process.env.OCR_UPSCALE ?? 1.0),
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
    paths: {
      uploads: "uploads",
      pages: "pages",
      ocrResults: "ocr-results",
      exports: "exports",
      temp: "temp",
    },
  };
}
