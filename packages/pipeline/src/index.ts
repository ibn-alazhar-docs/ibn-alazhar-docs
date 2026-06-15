export * from "./types";
export * from "./storage";
export * from "./queue";
export * from "./ocr";
export * from "./ocr-provider";
export * from "./text";
export * from "./output";

import "dotenv/config";

export function loadConfig(): import("./types").PipelineConfig {
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

      return {
        endpoint,
        port,
        useSSL,
        accessKey: process.env.S3_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY ?? "minioadmin",
        secretKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY ?? "minioadmin",
        bucket: process.env.S3_BUCKET ?? process.env.MINIO_BUCKET ?? "ibn-al-azhar-docs",
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
    ocr: {
      dpi: Number(process.env.OCR_DPI ?? 300),
      language: process.env.OCR_LANGUAGE ?? "ar",
      maxRetries: Number(process.env.OCR_MAX_RETRIES ?? 3),
      provider: (process.env.OCR_PROVIDER as "google" | "surya" | "tesseract") ?? "tesseract",
      providers: (process.env.OCR_PROVIDERS?.split(",") as Array<
        "google" | "surya" | "tesseract"
      >) ?? ["google", "surya", "tesseract"],
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
