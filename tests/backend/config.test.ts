import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../packages/pipeline/src/config";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.S3_ENDPOINT;
  delete process.env.MINIO_ENDPOINT;
  delete process.env.S3_PORT;
  delete process.env.MINIO_PORT;
  delete process.env.S3_USE_SSL;
  delete process.env.MINIO_USE_SSL;
  delete process.env.S3_ACCESS_KEY_ID;
  delete process.env.MINIO_ACCESS_KEY;
  delete process.env.S3_SECRET_ACCESS_KEY;
  delete process.env.MINIO_SECRET_KEY;
  delete process.env.S3_BUCKET;
  delete process.env.MINIO_BUCKET;
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  delete process.env.REDIS_PORT;
  delete process.env.REDIS_PASSWORD;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_PRIVATE_KEY;
  delete process.env.OCR_DPI;
  delete process.env.OCR_LANGUAGE;
  delete process.env.OCR_MAX_RETRIES;
  delete process.env.OCR_PROVIDER;
  delete process.env.OCR_PROVIDERS;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("loadConfig", () => {
  describe("MinIO config", () => {
    it("endpoint defaults to 127.0.0.1", () => {
      const c = loadConfig();
      expect(c.minio.endpoint).toBe("localhost");
    });

    it("port defaults to 9000", () => {
      const c = loadConfig();
      expect(c.minio.port).toBe(9000);
    });

    it("useSSL defaults to false", () => {
      const c = loadConfig();
      expect(c.minio.useSSL).toBe(false);
    });

    it("S3_ENDPOINT with http:// strips protocol", () => {
      process.env.S3_ENDPOINT = "http://minio-host:9001";
      const c = loadConfig();
      expect(c.minio.endpoint).toBe("minio-host");
      expect(c.minio.port).toBe(9001);
      expect(c.minio.useSSL).toBe(false);
    });

    it("S3_ENDPOINT fallback to raw when invalid URL", () => {
      process.env.S3_ENDPOINT = "http://a:b:c";
      const c = loadConfig();
      expect(c.minio.endpoint).toBe("http://a:b:c");
    });

    it("S3_ENDPOINT with https:// sets useSSL true", () => {
      process.env.S3_ENDPOINT = "https://minio-host:9002";
      const c = loadConfig();
      expect(c.minio.endpoint).toBe("minio-host");
      expect(c.minio.useSSL).toBe(true);
    });

    it("MINIO_ENDPOINT fallback", () => {
      process.env.MINIO_ENDPOINT = "minio-local";
      const c = loadConfig();
      expect(c.minio.endpoint).toBe("minio-local");
    });

    it("MINIO_USE_SSL sets useSSL to true", () => {
      process.env.MINIO_USE_SSL = "true";
      const c = loadConfig();
      expect(c.minio.useSSL).toBe(true);
    });

    it("S3_PORT sets port", () => {
      process.env.S3_PORT = "9005";
      const c = loadConfig();
      expect(c.minio.port).toBe(9005);
    });

    it("S3_ACCESS_KEY_ID sets accessKey", () => {
      process.env.S3_ACCESS_KEY_ID = "my-key";
      const c = loadConfig();
      expect(c.minio.accessKey).toBe("my-key");
    });

    it("MINIO_ACCESS_KEY fallback", () => {
      process.env.MINIO_ACCESS_KEY = "minio-key";
      const c = loadConfig();
      expect(c.minio.accessKey).toBe("minio-key");
    });

    it("S3_SECRET_ACCESS_KEY sets secretKey", () => {
      process.env.S3_SECRET_ACCESS_KEY = "my-secret";
      const c = loadConfig();
      expect(c.minio.secretKey).toBe("my-secret");
    });

    it("S3_BUCKET sets bucket", () => {
      process.env.S3_BUCKET = "my-bucket";
      const c = loadConfig();
      expect(c.minio.bucket).toBe("my-bucket");
    });

    it("MINIO_BUCKET fallback", () => {
      process.env.MINIO_BUCKET = "minio-bucket";
      const c = loadConfig();
      expect(c.minio.bucket).toBe("minio-bucket");
    });

    it("default accessKey is minioadmin", () => {
      const c = loadConfig();
      expect(c.minio.accessKey).toBe("minioadmin");
    });

    it("default bucket is ibnalazhardocs", () => {
      const c = loadConfig();
      expect(c.minio.bucket).toBe("ibnalazhardocs");
    });
  });

  describe("Redis config", () => {
    it("REDIS_URL parsed correctly", () => {
      process.env.REDIS_URL = "redis://:secret@redis-host:6380";
      const c = loadConfig();
      expect(c.redis.host).toBe("redis-host");
      expect(c.redis.port).toBe(6380);
      expect(c.redis.password).toBe("secret");
    });

    it("REDIS_URL invalid URL falls back to individual vars", () => {
      process.env.REDIS_URL = "redis://a:b:c:d:e";
      process.env.REDIS_HOST = "fallback-redis";
      const c = loadConfig();
      expect(c.redis.host).toBe("fallback-redis");
    });

    it("REDIS_HOST fallback", () => {
      process.env.REDIS_HOST = "my-redis";
      const c = loadConfig();
      expect(c.redis.host).toBe("my-redis");
    });

    it("REDIS_PORT fallback", () => {
      process.env.REDIS_PORT = "6381";
      const c = loadConfig();
      expect(c.redis.port).toBe(6381);
    });

    it("REDIS_PASSWORD fallback", () => {
      process.env.REDIS_PASSWORD = "pass123";
      const c = loadConfig();
      expect(c.redis.password).toBe("pass123");
    });

    it("REDIS_PASSWORD is honored when REDIS_URL omits the password", () => {
      // Reproduces the UPLOAD_ENQUEUE_FAILED incident: REDIS_URL had no
      // password while the server required one. The standalone var must fill
      // the gap so the connection authenticates instead of failing far away.
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.REDIS_PASSWORD = "redis_strong_password_2026";
      const c = loadConfig();
      expect(c.redis.host).toBe("localhost");
      expect(c.redis.port).toBe(6379);
      expect(c.redis.password).toBe("redis_strong_password_2026");
    });

    it("default host is localhost", () => {
      const c = loadConfig();
      expect(c.redis.host).toBe("localhost");
    });

    it("default port is 6379", () => {
      const c = loadConfig();
      expect(c.redis.port).toBe(6379);
    });

    it("default password is undefined", () => {
      const c = loadConfig();
      expect(c.redis.password).toBeUndefined();
    });

    it("REDIS_URL without password", () => {
      process.env.REDIS_URL = "redis://redis-host:6380";
      const c = loadConfig();
      expect(c.redis.host).toBe("redis-host");
      expect(c.redis.password).toBeUndefined();
    });
  });

  describe("Google config", () => {
    it("service account email from env", () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@project.iam.gserviceaccount.com";
      const c = loadConfig();
      expect(c.google.serviceAccountEmail).toBe("test@project.iam.gserviceaccount.com");
    });

    it("private key \\n replacement", () => {
      process.env.GOOGLE_PRIVATE_KEY = "key\\nline2\\nline3";
      const c = loadConfig();
      expect(c.google.privateKey).toBe("key\nline2\nline3");
    });

    it("defaults to empty strings", () => {
      const c = loadConfig();
      expect(c.google.serviceAccountEmail).toBe("");
      expect(c.google.privateKey).toBe("");
    });
  });

  describe("OCR config", () => {
    it("dpi defaults to 300", () => {
      const c = loadConfig();
      expect(c.ocr.dpi).toBe(300);
    });

    it("language defaults to ar", () => {
      const c = loadConfig();
      expect(c.ocr.language).toBe("ar");
    });

    it("maxRetries defaults to 3", () => {
      const c = loadConfig();
      expect(c.ocr.maxRetries).toBe(3);
    });

    it("provider defaults to surya", () => {
      const c = loadConfig();
      expect(c.ocr.provider).toBe("surya");
    });

    it("providers defaults to [surya, tesseract]", () => {
      const c = loadConfig();
      expect(c.ocr.providers).toEqual(["surya", "tesseract"]);
    });

    it("OCR_DPI overrides default", () => {
      process.env.OCR_DPI = "150";
      const c = loadConfig();
      expect(c.ocr.dpi).toBe(150);
    });

    it("OCR_LANGUAGE overrides default", () => {
      process.env.OCR_LANGUAGE = "en";
      const c = loadConfig();
      expect(c.ocr.language).toBe("en");
    });

    it("OCR_PROVIDER overrides default", () => {
      process.env.OCR_PROVIDER = "google";
      const c = loadConfig();
      expect(c.ocr.provider).toBe("google");
    });

    it("OCR_PROVIDERS overrides default", () => {
      process.env.OCR_PROVIDERS = "google,surya";
      const c = loadConfig();
      expect(c.ocr.providers).toEqual(["google", "surya"]);
    });
  });

  describe("Paths config", () => {
    it("uploads defaults to uploads", () => {
      expect(loadConfig().paths.uploads).toBe("uploads");
    });

    it("pages defaults to pages", () => {
      expect(loadConfig().paths.pages).toBe("pages");
    });

    it("ocrResults defaults to ocr-results", () => {
      expect(loadConfig().paths.ocrResults).toBe("ocr-results");
    });

    it("exports defaults to exports", () => {
      expect(loadConfig().paths.exports).toBe("exports");
    });

    it("temp defaults to temp", () => {
      expect(loadConfig().paths.temp).toBe("temp");
    });
  });
});
