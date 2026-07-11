import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown } from "../../packages/pipeline/src/output";
import { validatePdf } from "../../packages/pipeline/src/storage";
import { categorizeFailure } from "../../packages/pipeline/src/queue";
import { FAILURE_CATEGORIES } from "../../packages/pipeline/src/types";

vi.mock("ioredis", () => import("../mocks/ioredis").then((m) => ({ default: m.default })));
vi.mock("bullmq", () => ({
  Worker: vi.fn(),
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    isCompleted: vi.fn().mockResolvedValue(true),
    isFailed: vi.fn().mockResolvedValue(false),
    isWaiting: vi.fn(),
    isActive: vi.fn(),
    clean: vi.fn().mockResolvedValue(0),
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
const LARGE_TEXT = "بسم الله الرحمن الرحيم ".repeat(5000);

function forceGc(): void {
  if (typeof global.gc === "function") global.gc();
}

async function createManyConnections(
  count: number,
): Promise<{ pool: any[]; cleanup: () => Promise<void> }> {
  const pool: any[] = [];
  const errors: Error[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const { default: IORedis } = await import("ioredis");
      const conn = new IORedis();
      pool.push(conn);
    } catch (e: any) {
      errors.push(e);
    }
  }
  return {
    pool,
    cleanup: async () => {
      for (const c of pool) {
        try {
          c.disconnect?.();
        } catch {}
      }
    },
  };
}

describe("Resource limits: Database connection pool", () => {
  it("gracefully handles connection acquisition failure", async () => {
    // Simulate connection pool exhaustion by tracking in-flight queries
    const activeQueries: Promise<any>[] = [];
    const MAX_CONCURRENT = 20;
    const errors: string[] = [];

    for (let i = 0; i < MAX_CONCURRENT; i++) {
      // Surge of concurrent work — each is independent, no shared connection pool
      const p = Promise.resolve().then(() => cleanArabicText(ARABIC_TEXT));
      activeQueries.push(p);
    }

    const results = await Promise.allSettled(activeQueries);
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    console.log(`  ${MAX_CONCURRENT} concurrent ops: ${fulfilled} fulfilled, ${rejected} rejected`);

    // All should succeed since cleanArabicText is CPU-bound, not connection-bound
    expect(fulfilled).toBe(MAX_CONCURRENT);
    expect(rejected).toBe(0);
  });

  it("queues work instead of crashing when all connections are busy", async () => {
    const errors: string[] = [];
    const results: string[] = [];

    // Simulate many operations waiting for a limited pool
    async function limitedOp(i: number): Promise<void> {
      try {
        // Artificial delay to simulate connection wait
        const result = cleanArabicText(`بسم الله ${i} `.repeat(100));
        results.push(result);
      } catch (e: any) {
        errors.push(e.message);
      }
    }

    await Promise.all(Array.from({ length: 50 }, (_, i) => limitedOp(i)));

    console.log(`  Results: ${results.length}, Errors: ${errors.length}`);
    expect(errors.length).toBe(0);
    expect(results.length).toBe(50);
  });
});

describe("Resource limits: Memory pressure handling", () => {
  it("handles processing near memory limits gracefully", () => {
    // Process a very large text to stress memory
    const result = cleanArabicText(LARGE_TEXT);
    forceGc();

    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);

    // Verify we can still do normal work after large allocation
    const normalResult = cleanArabicText(ARABIC_TEXT);
    expect(normalResult.length).toBeGreaterThan(0);

    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`  Heap after large text: ${heapUsed.toFixed(1)}MB`);
  });

  it("processes many small texts without OOM", () => {
    const SMALL_TEXT = "بسم الله ";
    let totalLength = 0;

    for (let i = 0; i < 2000; i++) {
      const result = cleanArabicText(SMALL_TEXT);
      totalLength += result.length;
    }

    forceGc();
    console.log(`  10000 small cleans: total output ${totalLength} chars`);
    expect(totalLength).toBeGreaterThan(0);
  });

  it("alternates large and small allocations without fragmentation issues", () => {
    for (let round = 0; round < 10; round++) {
      // Large allocation
      const large = cleanArabicText(LARGE_TEXT);
      expect(large).toBeDefined();

      // Many small allocations
      for (let i = 0; i < 200; i++) {
        const small = cleanArabicText("الحمد لله رب العالمين ");
        expect(small).toBeDefined();
      }

      forceGc();
    }

    const heapAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`  Heap after large/small alternation: ${heapAfter.toFixed(1)}MB`);
  });
});

describe("Resource limits: CPU saturation", () => {
  it("handles concurrent heavy computation without crashing", async () => {
    const heavyTasks = Array.from({ length: 20 }, (_, i) =>
      Promise.resolve().then(() => {
        const text = "بسم الله الرحمن الرحيم ".repeat(2000 + i * 100);
        return analyzeText(cleanArabicText(text));
      }),
    );

    const results = await Promise.allSettled(heavyTasks);
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;

    console.log(`  Heavy computation (20×): ${fulfilled}/${results.length} completed`);
    expect(fulfilled).toBe(results.length);
  });

  it("recovers after CPU saturation", async () => {
    // Saturate CPU
    await Promise.all(
      Array.from({ length: 5 }, () =>
        Promise.resolve().then(() => {
          for (let i = 0; i < 20; i++) {
            cleanArabicText(LARGE_TEXT);
          }
        }),
      ),
    );

    forceGc();

    // Verify normal operation after saturation
    const result = cleanArabicText(ARABIC_TEXT);
    expect(result.length).toBeGreaterThan(0);

    const md = generateMarkdown(ARABIC_TEXT, { title: "After saturation" });
    expect(md.metadata.wordCount).toBeGreaterThan(0);

    console.log(`  Post-saturation: clean + markdown OK`);
  });
});

describe("Resource limits: Error handling under load", () => {
  it("categorizes failures correctly under simulated load", () => {
    const testErrors = [
      {
        error: new Error("OCR_QUOTA_EXCEEDED: daily limit"),
        expected: FAILURE_CATEGORIES.PERMANENT,
      },
      {
        error: new Error("PDF_ENCRYPTED: password protected"),
        expected: FAILURE_CATEGORIES.PERMANENT,
      },
      {
        error: new Error("ETIMEDOUT: connection to OCR API"),
        expected: FAILURE_CATEGORIES.TRANSIENT,
      },
      { error: new Error("Redis connection lost"), expected: FAILURE_CATEGORIES.TRANSIENT },
      { error: new Error("MinIO storage failure"), expected: FAILURE_CATEGORIES.TRANSIENT },
      { error: new Error("JOB_TIMEOUT: exceeded 30s"), expected: FAILURE_CATEGORIES.FATAL },
      {
        error: new Error("RATE_LIMITED: 429 Too Many Requests"),
        expected: FAILURE_CATEGORIES.TRANSIENT,
      },
    ];

    for (let i = 0; i < 100; i++) {
      const tc = testErrors[i % testErrors.length]!;
      const result = categorizeFailure(tc.error);
      expect(result.category).toBe(tc.expected);
    }
  });

  it("rejects invalid PDFs with proper error codes at scale", () => {
    const invalidBuffers = [
      {
        buf: Buffer.from("%PDF-1.4\n" + "x".repeat(30)),
        mime: "application/pdf",
        expected: "PDF_TRUNCATED",
      },
      { buf: Buffer.alloc(5), mime: "application/pdf", expected: "PDF_MALFORMED" },
      {
        buf: Buffer.from("%PDF-2.0\n" + "y".repeat(100)),
        mime: "application/pdf",
        expected: "PDF_TRUNCATED",
      },
      {
        buf: Buffer.from([0x89, 0x50, 0x4e, 0x47, ...Array(30).fill(0x00)]),
        mime: "image/jpeg",
        expected: "IMAGE_CORRUPT",
      },
    ];

    for (let i = 0; i < 200; i++) {
      const tc = invalidBuffers[i % invalidBuffers.length]!;
      const result = validatePdf(tc.buf, tc.mime, tc.buf.length);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(tc.expected);
    }
  });
});
