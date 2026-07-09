import { describe, it, expect } from "vitest";

describe("Regression Suite — Sanity Checks", () => {
  // Config must load in non-prod without env vars
  it("config loads without throwing", async () => {
    const { loadConfig } = await import("../../packages/pipeline/src/config");
    expect(() => loadConfig()).not.toThrow();
  });

  // Shared types must export critical constants
  it("shared types export correctly", async () => {
    const mod = await import("../../packages/shared/src/types");
    expect(mod.DOC_STATUS_MAP).toBeDefined();
    expect(mod.ERROR_CODES).toBeDefined();
    expect(mod.STATUS_LABELS).toBeDefined();
    expect(mod.FAILURE_CATEGORIES).toBeDefined();
  });

  // Doc status map covers all pipeline states
  it("DOC_STATUS_MAP has correct keys", async () => {
    const { DOC_STATUS_MAP } = await import("../../packages/shared/src/types");
    expect(DOC_STATUS_MAP.pending).toBe("UPLOADED");
    expect(DOC_STATUS_MAP.completed).toBe("COMPLETED");
    expect(DOC_STATUS_MAP.failed).toBe("FAILED");
  });

  // OCR provider helpers must produce valid confidence scores
  it("OCR provider types work", async () => {
    const { estimateConfidence } = await import("../../packages/pipeline/src/ocr-providers/types");
    expect(estimateConfidence("هذا النص عربي بالكامل")).toBeGreaterThan(0);
    expect(estimateConfidence("")).toBe(0);
  });

  // Text cleaning pipeline must run without error
  it("text cleaning works", async () => {
    const { cleanArabicText } = await import("../../packages/pipeline/src/text/clean");
    const result = cleanArabicText("  اختبار  ");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // Markdown output generation returns full CleanedText object
  it("output generation works", async () => {
    const { generateMarkdown } = await import("../../packages/pipeline/src/output/markdown");
    const result = generateMarkdown("# Test\n\nHello world");
    expect(result).toBeDefined();
    expect(result.raw).toBe("# Test\n\nHello world");
    expect(result.markdown).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.wordCount).toBeGreaterThan(0);
  });

  // Pipeline index re-exports all public modules
  // High timeout: pipeline index triggers side-effect imports (dotenv, google-api, ioredis, bullmq, minio)
  it("pipeline index exports all modules", async () => {
    const mod = await import("../../packages/pipeline/src/index");
    expect(mod.loadConfig).toBeDefined();
    expect(mod.cleanArabicText).toBeDefined();
    expect(mod.generateMarkdown).toBeDefined();
    expect(mod.estimateConfidence).toBeDefined();
    expect(mod.analyzeText).toBeDefined();
  }, 90_000);

  // Shared index re-exports correctly
  it("shared index exports correctly", async () => {
    const mod = await import("../../packages/shared/src/index");
    expect(mod.DOC_STATUS_MAP).toBeDefined();
    expect(mod.ERROR_CODES).toBeDefined();
    expect(mod.logger).toBeDefined();
  });

  // Error codes must cover all documented failures
  it("ERROR_CODES contains critical codes", async () => {
    const { ERROR_CODES } = await import("../../packages/shared/src/types");
    expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
    expect(ERROR_CODES.UPLOAD_FAILED).toBe("UPLOAD_FAILED");
    expect(ERROR_CODES.OCR_FAILED).toBe("OCR_FAILED");
    expect(ERROR_CODES.EXPORT_FAILED).toBe("EXPORT_FAILED");
    expect(ERROR_CODES.REDIS_CONNECTION).toBe("REDIS_CONNECTION");
    expect(ERROR_CODES.MINIO_CONNECTION).toBe("MINIO_CONNECTION");
  });

  // Text analysis works alongside cleaning
  it("text analysis exports functions", async () => {
    const mod = await import("../../packages/pipeline/src/text/index");
    expect(mod.analyzeText).toBeDefined();
    expect(mod.cleanArabicText).toBeDefined();
  });

  // Output module exports all format generators
  it("output index exports all formats", async () => {
    const mod = await import("../../packages/pipeline/src/output/index");
    expect(mod.generateMarkdown).toBeDefined();
    expect(mod.generateJson).toBeDefined();
    expect(mod.generateTxt).toBeDefined();
  });

  // STATUS_LABELS must cover every DocStatus
  it("STATUS_LABELS covers all statuses", async () => {
    const { STATUS_LABELS } = await import("../../packages/shared/src/types");
    const required: string[] = [
      "UPLOADED",
      "VALIDATING",
      "SPLITTING",
      "OCR_PROCESSING",
      "CLEANING",
      "GENERATING",
      "COMPLETED",
      "FAILED",
      "ARCHIVED",
    ];
    for (const status of required) {
      expect(STATUS_LABELS[status]).toBeDefined();
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});
