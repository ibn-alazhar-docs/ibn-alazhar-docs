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
    },
    ocr: {
      dpi: Number(process.env.OCR_DPI ?? 300),
      language: process.env.OCR_LANGUAGE ?? "ar",
      maxRetries: Number(process.env.OCR_MAX_RETRIES ?? 3),
      provider: (process.env.OCR_PROVIDER as OcrEngineType) ?? "surya",
      // DATA-RESIDENCY / GDPR: provider order is LOCAL-FIRST by default.
      // Surya and Tesseract run entirely on-prem and never send document bytes off our
      // servers. Cloud providers (Gemini, Google) upload pages to the vendor and are only
      // used as an explicit fallback.
      //   - OCR_PROVIDERS (comma-separated) fully overrides the order/set below, letting
      //     operators explicitly opt into cloud.
      //   - Otherwise cloud providers are excluded from the default set UNLESS
      //     OCR_CLOUD_ENABLED=true is explicitly set. Cloud is OFF by default.
      providers: (() => {
        const explicit = process.env.OCR_PROVIDERS
          ?.split(",")
          .map((p) => p.trim())
          .filter(Boolean) as OcrEngineType[] | undefined;
        if (explicit && explicit.length > 0) return explicit;

        const cloudEnabled = process.env.OCR_CLOUD_ENABLED === "true";
        if (!cloudEnabled) {
          // Local-only default: documents stay on-prem.
          return ["surya", "tesseract"] as OcrEngineType[];
        }
        // Local-first with cloud as explicit fallback.
        return ["surya", "tesseract", "gemini", "google"] as OcrEngineType[];
      })(),
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
