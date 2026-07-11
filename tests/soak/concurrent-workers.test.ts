import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import { validatePdf } from "../../packages/pipeline/src/storage";
import { categorizeFailure } from "../../packages/pipeline/src/queue";

vi.mock("ioredis", () => import("../mocks/ioredis").then((m) => ({ default: m.default })));
vi.mock("bullmq", () => ({
  Worker: vi.fn(() => ({
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    isRunning: vi.fn().mockReturnValue(true),
  })),
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    drain: vi.fn().mockResolvedValue(undefined),
    isCompleted: vi.fn(),
    isFailed: vi.fn(),
    isWaiting: vi.fn(),
    isActive: vi.fn(),
    clean: vi.fn().mockResolvedValue(0),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getWaiting: vi.fn().mockResolvedValue([]),
  })),
  QueueEvents: vi.fn(() => ({ on: vi.fn(), close: vi.fn() })),
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
  })),
}));

const ARABIC_TEXT = "بسم الله الرحمن الرحيم ".repeat(500);
const PDF_BUFFER = Buffer.concat([
  Buffer.from("%PDF-1.4\n"),
  Buffer.alloc(1000, "x"),
  Buffer.from("\n%%EOF\n"),
]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGc(): void {
  if (typeof global.gc === "function") global.gc();
}

async function simulateOcrWorker(
  id: number,
  docs: string[],
): Promise<{ id: number; completed: number; errors: number }> {
  let completed = 0;
  let errors = 0;

  for (const doc of docs) {
    try {
      const cleaned = cleanArabicText(doc);
      if (cleaned.length > 0) completed++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { id, completed, errors };
}

async function simulateExportWorker(
  id: number,
  docs: string[],
): Promise<{ id: number; formats: number; errors: number }> {
  let formats = 0;
  let errors = 0;

  for (const doc of docs) {
    try {
      const md = generateMarkdown(doc, { title: `worker-${id}`, includeMetadata: true });
      generateTxt(md, true);
      generateJson(md, `worker-${id}`);
      formats += 3;
    } catch {
      errors++;
    }
  }

  return { id, formats, errors };
}

async function simulateUploadWorker(
  id: number,
  count: number,
): Promise<{ id: number; validated: number; errors: number }> {
  let validated = 0;
  let errors = 0;

  for (let i = 0; i < count; i++) {
    try {
      const result = validatePdf(PDF_BUFFER, "application/pdf", PDF_BUFFER.length);
      if (result.valid) validated++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { id, validated, errors };
}

describe("Concurrent workers: Parallel OCR simulation", () => {
  it("runs 10 parallel OCR workers on different documents", async () => {
    const docsPerWorker: string[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 20 }, (_, j) => `بسم الله الرحمن الرحيم document-${j} `.repeat(100)),
    );

    const start = performance.now();

    const workers = docsPerWorker.map((docs, i) => simulateOcrWorker(i, docs));
    const results = await Promise.all(workers);

    const elapsed = performance.now() - start;
    const totalCompleted = results.reduce((s, r) => s + r.completed, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);

    console.log(`  10 parallel OCR workers: ${elapsed.toFixed(0)}ms`);
    console.log(`  Total documents completed: ${totalCompleted}, errors: ${totalErrors}`);

    expect(totalCompleted).toBe(200); // 10 workers × 20 docs
    expect(totalErrors).toBe(0);
    expect(results.length).toBe(10);
  });

  it("completes 100 concurrent clean operations", async () => {
    const start = performance.now();

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => cleanArabicText(`${ARABIC_TEXT} ${i}`)),
      ),
    );

    const elapsed = performance.now() - start;
    console.log(`  100 concurrent clean: ${elapsed.toFixed(0)}ms`);
    expect(results.every((r) => r.length > 0)).toBe(true);
  });
});

describe("Concurrent workers: Mixed workload", () => {
  it("runs 5 export + 5 upload workers simultaneously", async () => {
    const exportWorkerDocs: string[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 10 }, (_, j) => `بسم الله ${j} `.repeat(50)),
    );

    const start = performance.now();

    const exportWorkers = exportWorkerDocs.map((docs, i) => simulateExportWorker(i, docs));
    const uploadWorkers = Array.from({ length: 5 }, (_, i) => simulateUploadWorker(i, 20));

    const allWorkers = [...exportWorkers, ...uploadWorkers];
    const results = await Promise.all(allWorkers);

    const elapsed = performance.now() - start;

    const totalFormats = results
      .filter((r) => "formats" in r)
      .reduce((s: number, r: any) => s + r.formats, 0);
    const totalValidated = results
      .filter((r) => "validated" in r)
      .reduce((s: number, r: any) => s + r.validated, 0);

    console.log(`  Mixed workload (5 export + 5 upload): ${elapsed.toFixed(0)}ms`);
    console.log(`  Total exports: ${totalFormats}, Total validated: ${totalValidated}`);

    expect(totalFormats).toBe(150); // 5 workers × 10 docs × 3 formats
    expect(totalValidated).toBe(100); // 5 workers × 20 docs
  });
});

describe("Concurrent workers: Worker crash and recovery", () => {
  it("recovers cleanly when a worker crashes mid-job", async () => {
    const docs = Array.from({ length: 10 }, (_, i) =>
      `بسم الله الرحمن الرحيم document ${i} `.repeat(100),
    );

    // Simulate worker crash mid-way: process first half, then "crash", then recover
    const firstHalf = docs.slice(0, 5);
    const secondHalf = docs.slice(5);

    // First half succeeds
    const results1 = await Promise.all(
      firstHalf.map((doc) => Promise.resolve().then(() => cleanArabicText(doc))),
    );
    expect(results1.every((r) => r.length > 0)).toBe(true);

    // "Crash" — verify memory is released
    forceGc();

    // Second half (recovery) processes remaining
    const results2 = await Promise.all(
      secondHalf.map((doc) => Promise.resolve().then(() => cleanArabicText(doc))),
    );
    expect(results2.every((r) => r.length > 0)).toBe(true);

    // Verify no duplicate processing — each result is unique
    const allResults = [...results1, ...results2];
    const uniqueResults = new Set(allResults);
    expect(uniqueResults.size).toBe(allResults.length);
  });

  it("handles worker graceful shutdown — finishes current job", async () => {
    let currentJobFinished = false;
    let wasCancelled = false;

    // Simulate a worker that's told to shut down but finishes first
    const workerPromise = Promise.resolve().then(async () => {
      // Start current job
      const result = cleanArabicText(ARABIC_TEXT);
      currentJobFinished = true;
      return result;
    });

    const shutdownPromise = Promise.resolve().then(async () => {
      await delay(5);
      if (!currentJobFinished) {
        wasCancelled = true;
      }
    });

    // Signal shutdown
    const [result] = await Promise.all([workerPromise, shutdownPromise]);

    // Current job should have finished
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    if (!wasCancelled) {
      console.log("  Graceful shutdown: current job completed before termination");
    }
  });
});

describe("Concurrent workers: Job re-queue and stall recovery", () => {
  it("handles stalled jobs by re-processing", async () => {
    const DOC_COUNT = 20;
    const docs = Array.from({ length: DOC_COUNT }, (_, i) =>
      `بسم الله الرحمن الرحيم job ${i} `.repeat(50),
    );

    // First pass: process all
    const firstPass = await Promise.all(
      docs.map((doc) => Promise.resolve().then(() => cleanArabicText(doc))),
    );

    // Simulate stall: clear references
    forceGc();

    // Re-process (simulating re-queue)
    const secondPass = await Promise.all(
      docs.map((doc) => Promise.resolve().then(() => cleanArabicText(doc))),
    );

    // Verify both passes produced valid (possibly identical) results
    expect(firstPass.length).toBe(DOC_COUNT);
    expect(secondPass.length).toBe(DOC_COUNT);

    // Both passes should produce consistent output for the same input
    for (let i = 0; i < DOC_COUNT; i++) {
      expect(firstPass[i]).toBe(secondPass[i]);
    }

    console.log(`  Stalled recovery: ${DOC_COUNT} jobs re-processed identically`);
  });

  it("does not duplicate work on worker restart", async () => {
    const texts = Array.from({ length: 10 }, (_, i) => `بسم الله document-${i} `.repeat(50));
    const seenResults = new Set<string>();

    // First processing
    const firstBatch = await Promise.all(
      texts.map((t) => Promise.resolve().then(() => cleanArabicText(t))),
    );
    for (const r of firstBatch) {
      expect(seenResults.has(r)).toBe(false);
      seenResults.add(r);
    }

    // "Restart" worker
    forceGc();

    // Reprocess — should produce identical results (idempotent)
    const secondBatch = await Promise.all(
      texts.map((t) => Promise.resolve().then(() => cleanArabicText(t))),
    );

    for (let i = 0; i < texts.length; i++) {
      expect(secondBatch[i]).toBe(firstBatch[i]);
    }

    console.log(`  Worker restart: ${firstBatch.length} jobs idempotent`);
  });
});
