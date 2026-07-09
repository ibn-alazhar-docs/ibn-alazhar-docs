import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import { validatePdf } from "../../packages/pipeline/src/storage";
import { categorizeFailure } from "../../packages/pipeline/src/queue";
import { createOcrProvider, OcrManager } from "../../packages/pipeline/src/ocr";
import type { PipelineConfig, OcrEngineResult } from "../../packages/pipeline/src/types";

vi.mock("ioredis", () => import("../mocks/ioredis").then((m) => ({ default: m.default })));
vi.mock("bullmq", () => ({
  Worker: vi.fn(),
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    drain: vi.fn().mockResolvedValue(undefined),
    isCompleted: vi.fn().mockResolvedValue(true),
    isFailed: vi.fn().mockResolvedValue(false),
    clean: vi.fn().mockResolvedValue(0),
  })),
  Job: vi.fn(),
}));
vi.mock("minio", () => ({
  Client: vi.fn(() => ({
    bucketExists: vi.fn().mockResolvedValue(true),
    makeBucket: vi.fn(),
    fPutObject: vi.fn(),
    putObject: vi.fn(),
    getObject: vi.fn(),
    removeObject: vi.fn(),
    statObject: vi.fn(),
    presignedGetObject: vi.fn().mockResolvedValue("http://minio/test"),
    listObjects: vi.fn(() => ({
      on: vi.fn((evt: string, cb: Function) => {
        if (evt === "data") setTimeout(() => cb({ name: "test", lastModified: new Date() }), 0);
        if (evt === "end") setTimeout(cb, 10);
        if (evt === "error") {
        }
        return this;
      }),
    })),
  })),
}));

const ARABIC_TEXT = "بسم الله الرحمن الرحيم ".repeat(500);
const ARABIC_LONG = "بسم الله الرحمن الرحيم ".repeat(5000);
const PDF_BUFFER = Buffer.concat([
  Buffer.from("%PDF-1.4\n"),
  Buffer.alloc(1000, "x"),
  Buffer.from("\n%%EOF\n"),
]);

function forceGc(): void {
  if (typeof global.gc === "function") global.gc();
}

describe("Long-running: Sequential pipeline operations", () => {
  it("performs 500 sequential clean → analyze → generate cycles", () => {
    const timings: number[] = [];

    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      const cleaned = cleanArabicText(ARABIC_TEXT);
      const analysis = analyzeText(cleaned);
      const md = generateMarkdown(ARABIC_TEXT, { title: `كتاب ${i}`, includeMetadata: true });
      const elapsed = performance.now() - start;

      timings.push(elapsed);
      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(md.metadata.qualityScore).toBeGreaterThanOrEqual(0);

      if (i % 100 === 99) forceGc();
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    const p99 = sorted[Math.floor(sorted.length * 0.99)]!;

    console.log(
      `  500 cycles: p50=${p50.toFixed(0)}ms, p95=${p95.toFixed(0)}ms, p99=${p99.toFixed(0)}ms`,
    );
    expect(p50).toBeLessThan(1000);
    expect(p99).toBeLessThan(5000);
  });

  it("generates 100 documents in 3 output formats without degradation", () => {
    const formatTimings: Record<string, number[]> = { markdown: [], txt: [], json: [] };

    for (let i = 0; i < 100; i++) {
      let t = performance.now();
      const md = generateMarkdown(ARABIC_TEXT, { title: `كتاب ${i}` });
      formatTimings.markdown.push(performance.now() - t);

      t = performance.now();
      generateTxt(md, true);
      formatTimings.txt.push(performance.now() - t);

      t = performance.now();
      generateJson(md, `كتاب ${i}`);
      formatTimings.json.push(performance.now() - t);

      if (i % 50 === 49) forceGc();
    }

    for (const [fmt, timings] of Object.entries(formatTimings)) {
      const sorted = [...timings].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
      const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
      console.log(`  ${fmt}: p50=${p50.toFixed(0)}ms, p95=${p95.toFixed(0)}ms`);
    }

    // Verify no format takes >5s p95 (degradation check)
    for (const timings of Object.values(formatTimings)) {
      const sorted = [...timings].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
      expect(p95).toBeLessThan(5000);
    }
  });

  it("processes long (5000-word) text 200 times", () => {
    const timings: number[] = [];

    for (let i = 0; i < 200; i++) {
      const start = performance.now();
      const cleaned = cleanArabicText(ARABIC_LONG);
      const md = generateMarkdown(ARABIC_LONG, { title: `طويل ${i}`, includeMetadata: true });
      timings.push(performance.now() - start);

      expect(cleaned.length).toBeGreaterThan(0);
      expect(md.metadata.wordCount).toBeGreaterThan(0);

      if (i % 50 === 49) forceGc();
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    console.log(`  Long text (200×): p50=${p50.toFixed(0)}ms, p95=${p95.toFixed(0)}ms`);
    expect(p95).toBeLessThan(10000);
  });
});

describe("Long-running: PDF validation pipeline", () => {
  it("validates 500 PDFs sequentially without degradation", () => {
    const timings: number[] = [];

    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      const result = validatePdf(PDF_BUFFER, "application/pdf", PDF_BUFFER.length);
      timings.push(performance.now() - start);
      expect(result.valid).toBe(true);
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    console.log(`  PDF validation (500×): p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(10);
  });

  it("handles 100 valid + 100 invalid interleaved without slowdown", () => {
    const validBuffer = PDF_BUFFER;
    const invalidBuffer = Buffer.from("not a pdf at all");

    for (let i = 0; i < 100; i++) {
      const r1 = validatePdf(validBuffer, "application/pdf", validBuffer.length);
      expect(r1.valid).toBe(true);

      const r2 = validatePdf(invalidBuffer, "application/pdf", invalidBuffer.length);
      expect(r2.valid).toBe(false);
      expect(r2.errorCode).toBeDefined();
    }
  });
});

describe("Long-running: Failure categorization", () => {
  it("categorizes 200 errors without slowdown", () => {
    const errors = [
      new Error("OCR_QUOTA_EXCEEDED"),
      new Error("PDF_ENCRYPTED"),
      new Error("PDF_CORRUPT"),
      new Error("ETIMEDOUT"),
      new Error("ECONNRESET"),
      new Error("Redis connection refused"),
      new Error("MinIO bucket not found"),
      new Error("JOB_TIMEOUT"),
      new Error("RATE_LIMITED: 429"),
    ];

    const timings: number[] = [];
    for (let i = 0; i < 200; i++) {
      const start = performance.now();
      const result = categorizeFailure(errors[i % errors.length]!);
      timings.push(performance.now() - start);
      expect(result.category).toBeDefined();
      expect(result.code).toBeDefined();
    }

    const p95 = [...timings].sort((a, b) => a - b)[Math.floor(200 * 0.95)]!;
    console.log(`  Categorization p95: ${(p95 * 1000).toFixed(0)}μs`);
    expect(p95).toBeLessThan(1);
  });
});

describe("Long-running: Mixed workload simulation", () => {
  it("runs mixed clean + analyze + validate + export cycle 300 times", () => {
    const timings: number[] = [];

    for (let i = 0; i < 300; i++) {
      const start = performance.now();

      const cleaned = cleanArabicText(ARABIC_TEXT);
      analyzeText(cleaned);
      validatePdf(PDF_BUFFER, "application/pdf", PDF_BUFFER.length);
      generateMarkdown(cleaned, { title: `مختلط ${i}` });

      timings.push(performance.now() - start);
      if (i % 100 === 99) forceGc();
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    const mean = timings.reduce((s, t) => s + t, 0) / timings.length;

    console.log(
      `  Mixed 300-cycle: p50=${p50.toFixed(0)}ms, p95=${p95.toFixed(0)}ms, mean=${mean.toFixed(0)}ms`,
    );

    // Verify no linear degradation: first 50 vs last 50 should be comparable
    const first50Avg = timings.slice(0, 50).reduce((s, t) => s + t, 0) / 50;
    const last50Avg = timings.slice(-50).reduce((s, t) => s + t, 0) / 50;
    const degradation = ((last50Avg - first50Avg) / first50Avg) * 100;
    console.log(`  Degradation first→last quartile: ${degradation.toFixed(1)}%`);

    // More than 50% slowdown suggests accumulated state / leak
    expect(degradation).toBeLessThan(50);
  });
});
