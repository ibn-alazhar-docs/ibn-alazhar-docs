import { describe, it, expect, vi, afterAll, beforeEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown } from "../../packages/pipeline/src/output";
import { validatePdf } from "../../packages/pipeline/src/storage";

vi.mock("ioredis", () => import("../mocks/ioredis").then((m) => ({ default: m.default })));
vi.mock("bullmq", () => ({
  Worker: vi.fn(),
  Queue: vi.fn(() => ({
    add: vi.fn(),
    getJob: vi.fn(),
    getJobCounts: vi.fn(),
    getJobs: vi.fn(),
    close: vi.fn(),
    isCompleted: vi.fn(),
    isFailed: vi.fn(),
  })),
  Job: vi.fn(),
}));

const ARABIC_REPEATED = "بسم الله الرحمن الرحيم ";
const LARGE_ARABIC_TEXT = ARABIC_REPEATED.repeat(10000);
const ARABIC_TEXT_100K = ARABIC_REPEATED.repeat(100000);

function forceGc(): void {
  if (typeof global.gc === "function") {
    global.gc();
  }
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function checkNoLeak(readings: number[], label: string): void {
  if (readings.length < 3) return;

  // Drop warmup phase (first 30%) — JIT naturally allocates
  const stable = readings.slice(Math.ceil(readings.length * 0.3));
  if (stable.length < 2) return;

  // Check pairwise: no adjacent stable pair should show growth >20%
  let maxAdjacentGrowth = 0;
  for (let i = 1; i < stable.length; i++) {
    const growth = ((stable[i]! - stable[i - 1]!) / stable[i - 1]!) * 100;
    maxAdjacentGrowth = Math.max(maxAdjacentGrowth, growth);
  }

  // Check overall trend: last vs first stable reading
  const overallGrowth = ((stable[stable.length - 1]! - stable[0]!) / stable[0]!) * 100;

  console.log(
    `  ${label}: readings=${readings.length}, stable=${stable.length}, ` +
      `maxΔ=${maxAdjacentGrowth.toFixed(1)}%, overall=${overallGrowth.toFixed(1)}%`,
  );
  console.log(
    `    stable: ${formatBytes(stable[0]!)} → ${formatBytes(stable[stable.length - 1]!)}`,
  );

  // No single step should grow >35% between GC measurements
  // Overall stable trend should be <50% after dropping warmup
  // These are not tight thresholds — the goal is detecting unbounded leaks,
  // not penalizing V8 GC timing between adjacent measurement windows
  expect(maxAdjacentGrowth).toBeLessThan(35);
  expect(overallGrowth).toBeLessThan(50);
}

describe("Memory leak: Pipeline text processing", () => {
  const ITERATIONS = 200;

  it("processes 200 Arabic texts without memory growth", () => {
    const readings: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const result = cleanArabicText(LARGE_ARABIC_TEXT);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      if (i % 50 === 0) {
        forceGc();
        readings.push(process.memoryUsage().heapUsed);
      }
    }

    forceGc();
    checkNoLeak(readings, "200 Arabic texts");
  });

  it("processes 50 large (100K-word) texts without memory growth", () => {
    const readings: number[] = [];

    for (let i = 0; i < 50; i++) {
      const result = cleanArabicText(ARABIC_TEXT_100K);
      expect(result).toBeDefined();

      if (i % 10 === 0) {
        forceGc();
        readings.push(process.memoryUsage().heapUsed);
      }
    }

    forceGc();
    checkNoLeak(readings, "50 large texts");
  });

  it("processes 500 text analysis operations without growth", () => {
    const cleaned = cleanArabicText(LARGE_ARABIC_TEXT);
    const readings: number[] = [];

    for (let i = 0; i < 500; i++) {
      const analysis = analyzeText(cleaned);
      expect(analysis.wordCount).toBeGreaterThan(0);

      if (i % 100 === 0) {
        forceGc();
        readings.push(process.memoryUsage().heapUsed);
      }
    }

    forceGc();
    checkNoLeak(readings, "500 analysis ops");
  });

  it("generates 200 markdown exports without heap growth", () => {
    const readings: number[] = [];
    const results: number[] = [];

    for (let i = 0; i < 200; i++) {
      const md = generateMarkdown(LARGE_ARABIC_TEXT, {
        title: `كتاب الذكر ${i}`,
        includeMetadata: true,
      });
      results.push(md.metadata.wordCount);

      if (i % 50 === 0) {
        forceGc();
        readings.push(process.memoryUsage().heapUsed);
      }
    }

    forceGc();
    expect(results.every((w) => w > 0)).toBe(true);
    checkNoLeak(readings, "200 markdown exports");
  });
});

describe("Memory leak: PDF validation", () => {
  it("validates 1000 PDF buffers without memory growth", () => {
    const readings: number[] = [];
    const pdfBuffer = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(1000, "x"),
      Buffer.from("\n%%EOF\n"),
    ]);

    for (let i = 0; i < 1000; i++) {
      const validation = validatePdf(pdfBuffer, "application/pdf", pdfBuffer.length);
      expect(validation.valid).toBe(true);

      if (i % 200 === 0) {
        forceGc();
        readings.push(process.memoryUsage().heapUsed);
      }
    }

    forceGc();
    checkNoLeak(readings, "PDF validation (1000)");
  });

  it("validates 500 invalid PDFs without leaking", () => {
    const readings: number[] = [];
    const invalidBuffers = [
      Buffer.from("not a pdf at all"),
      Buffer.alloc(5),
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("%PDF-1.4\n" + "x".repeat(100) + "%%EOF\n"),
    ];

    for (let i = 0; i < 500; i++) {
      const buf = invalidBuffers[i % invalidBuffers.length]!;
      validatePdf(buf, "application/pdf", buf.length);

      if (i % 100 === 0) {
        forceGc();
        readings.push(process.memoryUsage().heapUsed);
      }
    }

    forceGc();
    checkNoLeak(readings, "Invalid PDF validation (500)");
  });
});

describe("Memory leak: Concurrent operations", () => {
  it("runs 100 concurrent clean operations — memory stays bounded", async () => {
    const before = process.memoryUsage().heapUsed;

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => cleanArabicText(`${LARGE_ARABIC_TEXT} ${i}`)),
      ),
    );

    forceGc();
    const after = process.memoryUsage().heapUsed;
    // Allow 50% for concurrent as parallel ops allocate temp objects
    const maxAllowed = before * 1.5;
    console.log(`  Concurrent clean: ${formatBytes(before)} → ${formatBytes(after)}`);
    expect(results.every((r) => r.length > 0)).toBe(true);
    expect(after).toBeLessThan(maxAllowed);
  });

  it("runs 50 concurrent markdown generations — memory stays bounded", async () => {
    const before = process.memoryUsage().heapUsed;

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        Promise.resolve().then(() =>
          generateMarkdown(LARGE_ARABIC_TEXT, { title: `كتاب ${i}`, includeMetadata: true }),
        ),
      ),
    );

    forceGc();
    const after = process.memoryUsage().heapUsed;
    const maxAllowed = before * 2.0;
    console.log(`  Concurrent markdown: ${formatBytes(before)} → ${formatBytes(after)}`);
    expect(results.every((r) => r.metadata.wordCount > 0)).toBe(true);
    expect(after).toBeLessThan(maxAllowed);
  });
});
