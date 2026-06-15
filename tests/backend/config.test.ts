import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadConfig() {
  // Re-import fresh module each time to pick up env changes
  // Use query param to bust cache
  const mod = await import(`../../packages/pipeline/src/index?t=${Date.now()}`);
  return mod.loadConfig();
}

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
    it("endpoint defaults to localhost", async () => {
      const c = await loadConfig();
      expect(c.minio.endpoint).toBe("localhost");
    }, 15000);

    it("port defaults to 9000", async () => {
      const c = await loadConfig();
      expect(c.minio.port).toBe(9000);
    });

    it("useSSL defaults to false", async () => {
      const c = await loadConfig();
      expect(c.minio.useSSL).toBe(false);
    });

    it("S3_ENDPOINT with http:// strips protocol", async () => {
      process.env.S3_ENDPOINT = "http://minio-host:9001";
      const c = await loadConfig();
      expect(c.minio.endpoint).toBe("minio-host");
      expect(c.minio.port).toBe(9001);
      expect(c.minio.useSSL).toBe(false);
    });

    it("S3_ENDPOINT with https:// sets useSSL true", async () => {
      process.env.S3_ENDPOINT = "https://minio-host:9002";
      const c = await loadConfig();
      expect(c.minio.endpoint).toBe("minio-host");
      expect(c.minio.useSSL).toBe(true);
    });

    it("MINIO_ENDPOINT fallback", async () => {
      process.env.MINIO_ENDPOINT = "minio-local";
      const c = await loadConfig();
      expect(c.minio.endpoint).toBe("minio-local");
    });

    it("S3_ACCESS_KEY_ID sets accessKey", async () => {
      process.env.S3_ACCESS_KEY_ID = "my-key";
      const c = await loadConfig();
      expect(c.minio.accessKey).toBe("my-key");
    });

    it("MINIO_ACCESS_KEY fallback", async () => {
      process.env.MINIO_ACCESS_KEY = "minio-key";
      const c = await loadConfig();
      expect(c.minio.accessKey).toBe("minio-key");
    });

    it("S3_SECRET_ACCESS_KEY sets secretKey", async () => {
      process.env.S3_SECRET_ACCESS_KEY = "my-secret";
      const c = await loadConfig();
      expect(c.minio.secretKey).toBe("my-secret");
    });

    it("S3_BUCKET sets bucket", async () => {
      process.env.S3_BUCKET = "my-bucket";
      const c = await loadConfig();
      expect(c.minio.bucket).toBe("my-bucket");
    });

    it("MINIO_BUCKET fallback", async () => {
      process.env.MINIO_BUCKET = "minio-bucket";
      const c = await loadConfig();
      expect(c.minio.bucket).toBe("minio-bucket");
    });

    it("default accessKey is minioadmin", async () => {
      const c = await loadConfig();
      expect(c.minio.accessKey).toBe("minioadmin");
    });

    it("default bucket is ibn-al-azhar-docs", async () => {
      const c = await loadConfig();
      expect(c.minio.bucket).toBe("ibn-al-azhar-docs");
    });
  });

  describe("Redis config", () => {
    it("REDIS_URL parsed correctly", async () => {
      process.env.REDIS_URL = "redis://:secret@redis-host:6380";
      const c = await loadConfig();
      expect(c.redis.host).toBe("redis-host");
      expect(c.redis.port).toBe(6380);
      expect(c.redis.password).toBe("secret");
    });

    it("REDIS_HOST fallback", async () => {
      process.env.REDIS_HOST = "my-redis";
      const c = await loadConfig();
      expect(c.redis.host).toBe("my-redis");
    });

    it("REDIS_PORT fallback", async () => {
      process.env.REDIS_PORT = "6381";
      const c = await loadConfig();
      expect(c.redis.port).toBe(6381);
    });

    it("REDIS_PASSWORD fallback", async () => {
      process.env.REDIS_PASSWORD = "pass123";
      const c = await loadConfig();
      expect(c.redis.password).toBe("pass123");
    });

    it("default host is localhost", async () => {
      const c = await loadConfig();
      expect(c.redis.host).toBe("localhost");
    });

    it("default port is 6379", async () => {
      const c = await loadConfig();
      expect(c.redis.port).toBe(6379);
    });

    it("default password is undefined", async () => {
      const c = await loadConfig();
      expect(c.redis.password).toBeUndefined();
    });

    it("REDIS_URL without password", async () => {
      process.env.REDIS_URL = "redis://redis-host:6380";
      const c = await loadConfig();
      expect(c.redis.host).toBe("redis-host");
      expect(c.redis.password).toBeUndefined();
    });
  });

  describe("Google config", () => {
    it("service account email from env", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@project.iam.gserviceaccount.com";
      const c = await loadConfig();
      expect(c.google.serviceAccountEmail).toBe("test@project.iam.gserviceaccount.com");
    });

    it("private key \\n replacement", async () => {
      process.env.GOOGLE_PRIVATE_KEY = "key\\nline2\\nline3";
      const c = await loadConfig();
      expect(c.google.privateKey).toBe("key\nline2\nline3");
    });

    it("defaults to empty strings", async () => {
      const c = await loadConfig();
      expect(c.google.serviceAccountEmail).toBe("");
      expect(c.google.privateKey).toBe("");
    });
  });

  describe("OCR config", () => {
    it("dpi defaults to 300", async () => {
      const c = await loadConfig();
      expect(c.ocr.dpi).toBe(300);
    });

    it("language defaults to ar", async () => {
      const c = await loadConfig();
      expect(c.ocr.language).toBe("ar");
    });

    it("maxRetries defaults to 3", async () => {
      const c = await loadConfig();
      expect(c.ocr.maxRetries).toBe(3);
    });

    it("provider defaults to tesseract", async () => {
      const c = await loadConfig();
      expect(c.ocr.provider).toBe("tesseract");
    });

    it("providers defaults to [google, surya, tesseract]", async () => {
      const c = await loadConfig();
      expect(c.ocr.providers).toEqual(["google", "surya", "tesseract"]);
    });

    it("OCR_DPI overrides default", async () => {
      process.env.OCR_DPI = "150";
      const c = await loadConfig();
      expect(c.ocr.dpi).toBe(150);
    });

    it("OCR_LANGUAGE overrides default", async () => {
      process.env.OCR_LANGUAGE = "en";
      const c = await loadConfig();
      expect(c.ocr.language).toBe("en");
    });

    it("OCR_PROVIDER overrides default", async () => {
      process.env.OCR_PROVIDER = "google";
      const c = await loadConfig();
      expect(c.ocr.provider).toBe("google");
    });
  });

  describe("Paths config", () => {
    it("uploads defaults to uploads", async () => {
      expect((await loadConfig()).paths.uploads).toBe("uploads");
    });

    it("pages defaults to pages", async () => {
      expect((await loadConfig()).paths.pages).toBe("pages");
    });

    it("ocrResults defaults to ocr-results", async () => {
      expect((await loadConfig()).paths.ocrResults).toBe("ocr-results");
    });

    it("exports defaults to exports", async () => {
      expect((await loadConfig()).paths.exports).toBe("exports");
    });

    it("temp defaults to temp", async () => {
      expect((await loadConfig()).paths.temp).toBe("temp");
    });
  });
});
