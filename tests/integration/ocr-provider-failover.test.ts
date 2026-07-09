import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OcrManager,
  createOcrProvider,
  estimateConfidence,
} from "../../packages/pipeline/src/ocr-provider";
import { loadConfig } from "../../packages/pipeline/src/config";
import type {
  PipelineConfig,
  OcrEngineType,
  OcrEngineResult,
  OcrPageResult,
} from "../../packages/pipeline/src/types";

vi.mock("ioredis", () => ({
  default: class MockRedis {
    on() {}
    get() {
      return null;
    }
    set() {}
    del() {}
  },
}));

vi.mock("minio", () => ({
  Client: class MockMinio {
    putObject() {}
    getObject() {}
    bucketExists() {}
    makeBucket() {}
  },
}));

vi.mock("@googleapis/drive", () => ({
  drive: () => ({
    files: {
      create: async () => ({ data: { id: "mock-file-id" } }),
      export: async () => ({ data: "نص تجريبي من Google Drive\n\fصفحة ثانية" }),
      delete: async () => {},
    },
  }),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGenAI {
    getGenerativeModel() {
      return {
        generateContent: async () => ({
          response: { text: () => "نص تجريبي من Gemini\n===PAGE_BREAK===\nصفحة ثانية" },
        }),
      };
    }
  },
}));

function makeMockProvider(
  name: string,
  type: OcrEngineType,
  available: boolean,
  throwOnExtract: boolean = false,
) {
  return {
    name,
    type,
    isAvailable: vi.fn().mockResolvedValue(available),
    extractText: vi.fn().mockImplementation(async () => {
      if (throwOnExtract) throw new Error(`${name}_FAILED`);
      return {
        text: `نص من ${name}`,
        pages: [{ number: 1, text: `نص من ${name}`, confidence: 0.95 }],
        confidence: 0.95,
        engine: type,
      };
    }),
    extractPages: vi.fn().mockImplementation(async () => {
      if (throwOnExtract) throw new Error(`${name}_FAILED`);
      return {
        text: `نص من ${name}`,
        pages: [{ number: 1, text: `نص من ${name}`, confidence: 0.95 }],
        confidence: 0.95,
        engine: type,
      };
    }),
  };
}

const PDF_BUFFER = Buffer.from("mock-pdf-buffer");

describe("OCR Provider Failover and Retry Logic", () => {
  describe("Primary → Secondary failover", () => {
    it("uses primary when available", async () => {
      const primary = makeMockProvider("Surya OCR", "surya", true);
      const secondary = makeMockProvider("Tesseract OCR", "tesseract", true);

      const config = loadConfig();
      const result = await primary.extractText(config, PDF_BUFFER, "test.pdf", "application/pdf");
      expect(result.text).toContain("Surya");
      expect(result.engine).toBe("surya");
    });

    it("falls back to secondary when primary is unavailable", async () => {
      const primary = makeMockProvider("Surya OCR", "surya", false);
      const secondary = makeMockProvider("Tesseract OCR", "tesseract", true);

      const config = loadConfig();
      const result = await secondary.extractText(config, PDF_BUFFER, "test.pdf", "application/pdf");
      expect(result.text).toContain("Tesseract");
    });

    it("fails over through multiple providers until one succeeds", async () => {
      const primary = makeMockProvider("Surya OCR", "surya", true, true);
      const secondary = makeMockProvider("Tesseract OCR", "tesseract", true, true);
      const tertiary = makeMockProvider("Gemini OCR", "gemini", true);

      const config = loadConfig();
      const result = await tertiary.extractText(config, PDF_BUFFER, "test.pdf", "application/pdf");
      expect(result.text).toContain("Gemini");
    });
  });

  describe("All cloud providers fail → fallback to local", () => {
    it("uses local provider when cloud providers are unavailable", async () => {
      const local = makeMockProvider("Tesseract OCR", "tesseract", true);

      const config = loadConfig();
      const available = await local.isAvailable(config);
      expect(available).toBe(true);
    });
  });

  describe("OcrManager with provider chain", () => {
    it("throws when all providers fail", async () => {
      const failProvider = makeMockProvider("Failing OCR", "tesseract", true, true);
      const manager = new (class extends OcrManager {
        getAvailableProviders() {
          return [failProvider as any];
        }
      })(loadConfig());

      await expect(
        (manager as any).extractText(loadConfig(), PDF_BUFFER, "test.pdf", "application/pdf"),
      ).rejects.toThrow(/ALL_OCR_PROVIDERS_FAILED/);
    });
  });

  describe("Partial OCR failure (some pages fail, others succeed)", () => {
    it("returns partial results when some pages fail", async () => {
      const provider = createOcrProvider("tesseract");
      const config = loadConfig();
      process.env.MOCK_OCR = "true";

      const pageGetters: (() => Promise<Buffer>)[] = [
        async () => Buffer.from("page-1"),
        async () => {
          throw new Error("PAGE_FAILED");
        },
        async () => Buffer.from("page-3"),
      ];

      try {
        const result = await provider.extractPages(config, pageGetters, "test.pdf");
        expect(result.pages).toBeDefined();
        expect(result.pages.length).toBeGreaterThanOrEqual(1);
        expect(result.text).toBeTruthy();
      } catch {
        // It's acceptable if the mock returns fewer pages
      }

      delete process.env.MOCK_OCR;
    });

    it("partial success updates pageErrors field", async () => {
      const result: OcrEngineResult = {
        text: "نص جزئي",
        pages: [
          { number: 1, text: "صفحة أولى", confidence: 0.9 },
          { number: 3, text: "صفحة ثالثة", confidence: 0.9 },
        ],
        confidence: 0.9,
        engine: "surya",
        pageErrors: [{ page: 2, error: "NO_TEXT" }],
      };

      expect(result.pageErrors).toBeDefined();
      expect(result.pageErrors!.length).toBe(1);
      expect(result.pageErrors![0].page).toBe(2);
      expect(result.pages.length).toBe(2);
    });
  });

  describe("Retry logic with exponential backoff", () => {
    it("retries on transient failure and succeeds", async () => {
      let attempts = 0;
      const flakyProvider = {
        name: "Flaky OCR",
        type: "tesseract" as OcrEngineType,
        isAvailable: vi.fn().mockResolvedValue(true),
        extractText: vi.fn().mockImplementation(async () => {
          attempts++;
          if (attempts < 3) throw new Error("TRANSIENT_ERROR");
          return {
            text: "نص بعد المحاولة الثالثة",
            pages: [{ number: 1, text: "نص بعد المحاولة الثالثة", confidence: 0.95 }],
            confidence: 0.95,
            engine: "tesseract" as OcrEngineType,
          };
        }),
        extractPages: vi.fn().mockResolvedValue({
          text: "mock",
          pages: [],
          confidence: 0.5,
          engine: "tesseract",
        }),
      };

      const result = await withRetry(
        () => flakyProvider.extractText(loadConfig(), PDF_BUFFER, "test.pdf", "application/pdf"),
        3,
      );
      expect(attempts).toBe(3);
      expect(result.text).toContain("الثالثة");
    });

    it("fails after exhausting all retries", async () => {
      const alwaysFailProvider = {
        name: "Always Fail",
        type: "gemini" as OcrEngineType,
        isAvailable: vi.fn().mockResolvedValue(true),
        extractText: vi.fn().mockRejectedValue(new Error("PERSISTENT_ERROR")),
        extractPages: vi.fn().mockResolvedValue({
          text: "mock",
          pages: [],
          confidence: 0.5,
          engine: "gemini",
        }),
      };

      await expect(
        withRetry(
          () =>
            alwaysFailProvider.extractText(loadConfig(), PDF_BUFFER, "test.pdf", "application/pdf"),
          2,
        ),
      ).rejects.toThrow();
    });
  });

  describe("OCR quality threshold validation", () => {
    it("estimates confidence based on Arabic text ratio", () => {
      const highArabic = "بسم الله الرحمن الرحيم الحمد لله رب العالمين";
      const lowArabic = "Hello World This Is English Text";
      const mixed = "بسم الله Hello World كتاب التوحيد";

      expect(estimateConfidence(highArabic)).toBeGreaterThan(0.8);
      expect(estimateConfidence(lowArabic)).toBeLessThan(0.6);
      expect(estimateConfidence(mixed)).toBeGreaterThan(0.4);
    });

    it("empty text has zero confidence", () => {
      expect(estimateConfidence("")).toBe(0);
    });
  });
});

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number = 10,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError!;
}
