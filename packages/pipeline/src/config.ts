import { existsSync } from "node:fs";
import type { PipelineConfig, OcrEngineType, StorageDriver } from "./types";
import { logger } from "@ibn-al-azhar-docs/shared";

export function getStorageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER === "local" ? "local" : "s3";
  // Log to help debug Hugging Face deployment issues
  if (process.env.NODE_ENV === "production") {
    logger.info(
      { storageDriver: driver, storageDriverEnv: process.env.STORAGE_DRIVER },
      "[config] Storage driver selected",
    );
  }
  return driver;
}

export function loadConfig(): PipelineConfig {
  const storageDriver = getStorageDriver();

  return {
    storage: {
      driver: storageDriver,
      localDir: process.env.STORAGE_LOCAL_DIR || "/data",
    },
    minio: (() => {
      // If using local storage, skip MinIO config entirely to avoid connection attempts
      if (storageDriver === "local") {
        return {
          endpoint: "localhost",
          port: 9000,
          useSSL: false,
          accessKey: "dummy",
          secretKey: "dummy",
          bucket: "dummy",
        };
      }

      const rawEndpoint = process.env.S3_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "localhost";
      let endpoint = rawEndpoint;
      let port = Number(process.env.S3_PORT ?? process.env.MINIO_PORT ?? 9000);
      let useSSL = process.env.S3_USE_SSL === "true" || process.env.MINIO_USE_SSL === "true";

      if (rawEndpoint.startsWith("http://") || rawEndpoint.startsWith("https://")) {
        try {
          const parsed = new URL(rawEndpoint);
          endpoint = parsed.hostname;
          useSSL = parsed.protocol === "https:";
          if (parsed.port) {
            port = Number(parsed.port);
          } else if (!process.env.S3_PORT && !process.env.MINIO_PORT) {
            port = useSSL ? 443 : 80;
          }
        } catch {
          // fallback to raw
        }
      }

      const accessKey = process.env.S3_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY;
      const secretKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY;

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
          // WHY: REDIS_URL frequently omits the password (e.g. the repo .env sets
          // REDIS_URL=redis://localhost:6379 while REDIS_PASSWORD is set
          // separately). A password-protected server then rejects the
          // unauthenticated connection and the failure surfaces far away as
          // UPLOAD_ENQUEUE_FAILED during upload. Honor REDIS_PASSWORD as a
          // fallback so the URL and the standalone var agree.
          const password = parsed.password || process.env.REDIS_PASSWORD || undefined;
          return {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            password,
            tls: parsed.protocol === "rediss:",
          };
        } catch {
          // fall through to individual vars
        }
      }
      // WHY: In the self-contained HF Space deployment, Redis runs in-container
      // with a known password (started by the entrypoint via --requirepass).
      // If REDIS_URL is ever missing, falling back to bare "localhost" with NO
      // password would fail to authenticate against that server and surface as
      // UPLOAD_ENQUEUE_FAILED. We instead default to the in-container URL so a
      // lost env var degrades to a working connection rather than a silent
      // auth failure. The flag file is written by the entrypoint at boot.
      const isSelfContained =
        process.env.SELF_CONTAINED === "1" || process.env.SELF_CONTAINED === "true";
      let flagFilePresent = false;
      try {
        flagFilePresent = existsSync("/data/.self-contained");
      } catch {
        flagFilePresent = false;
      }
      if (isSelfContained || flagFilePresent) {
        const password = process.env.REDIS_PASSWORD || "ibn_docs_redis";
        const fallback = `redis://:${password}@127.0.0.1:6379`;
        try {
          const parsed = new URL(fallback);
          return {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            password: parsed.password || undefined,
            tls: parsed.protocol === "rediss:",
          };
        } catch {
          // unreachable
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
      // Configurable model id. Defaults to gemini-1.5-flash which supports
      // vision + PDF + Arabic. Override via GEMINI_MODEL env var if needed.
      model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
    },
    ocr: {
      dpi: Number(process.env.OCR_DPI ?? 300),
      language: process.env.OCR_LANGUAGE ?? "ar",
      maxRetries: Number(process.env.OCR_MAX_RETRIES ?? 3),
      provider: (process.env.OCR_PROVIDER as OcrEngineType) ?? "surya",
      providers: (() => {
        const parsed = (process.env.OCR_PROVIDERS ?? "")
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        const base = (parsed.length > 0 ? parsed : ["surya", "tesseract"]) as OcrEngineType[];
        if (process.env.OCR_CLOUD_ENABLED === "true" && !base.includes("gemini")) {
          base.push("gemini");
        }
        return base;
      })(),
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
