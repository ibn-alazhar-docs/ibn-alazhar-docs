import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown, generateTxt } from "../../packages/pipeline/src/output";
import { validatePdf } from "../../packages/pipeline/src/storage";
import { categorizeFailure } from "../../packages/pipeline/src/queue";

vi.mock("ioredis", () => import("../mocks/ioredis").then((m) => ({ default: m.default })));
vi.mock("bullmq", () => ({
  Worker: vi.fn(),
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    isCompleted: vi.fn(),
    isFailed: vi.fn(),
    clean: vi.fn().mockResolvedValue(0),
    drain: vi.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: vi.fn(() => ({ on: vi.fn(), close: vi.fn() })),
}));

const ARABIC_TEXT = "بسم الله الرحمن الرحيم ".repeat(500);
const PDF_BUFFER = Buffer.concat([
  Buffer.from("%PDF-1.4\n"),
  Buffer.alloc(1000, "x"),
  Buffer.from("\n%%EOF\n"),
]);

/**
 * Simple circuit breaker implementation for testing.
 * Tracks failure count and opens after threshold.
 */
class TestCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly threshold: number;
  private readonly resetTimeoutMs: number;

  constructor(threshold = 5, resetTimeoutMs = 1000) {
    this.threshold = threshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  getState(): string {
    // Auto-transition to half-open after reset timeout
    if (this.state === "OPEN" && Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
      this.state = "HALF_OPEN";
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      // Check if we should transition to half-open
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("CIRCUIT_OPEN: failing fast");
      }
    }

    try {
      const result = await fn();
      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED";
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold) {
        this.state = "OPEN";
      }
      throw err;
    }
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

describe("Circuit breaker: External service failure", () => {
  it("opens circuit after 5 consecutive failures", async () => {
    const breaker = new TestCircuitBreaker(5, 5000);
    let callCount = 0;

    async function failingOcr(): Promise<string> {
      callCount++;
      throw new Error("OCR_PROVIDER_UNAVAILABLE");
    }

    // First 5 calls should fail with the original error
    for (let i = 0; i < 5; i++) {
      await expect(breaker.call(failingOcr)).rejects.toThrow("OCR_PROVIDER_UNAVAILABLE");
    }

    // 6th call should fail fast with CIRCUIT_OPEN
    await expect(breaker.call(failingOcr)).rejects.toThrow("CIRCUIT_OPEN");
    expect(breaker.getState()).toBe("OPEN");
    expect(callCount).toBe(5);
  });

  it("subsequent calls fail fast while circuit is open", async () => {
    const breaker = new TestCircuitBreaker(3, 10000);

    async function failingCall(): Promise<string> {
      throw new Error("SERVICE_UNAVAILABLE");
    }

    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(failingCall)).rejects.toThrow("SERVICE_UNAVAILABLE");
    }

    // Circuit should be open now
    expect(breaker.getState()).toBe("OPEN");

    // All subsequent calls fail fast
    for (let i = 0; i < 10; i++) {
      await expect(breaker.call(failingCall)).rejects.toThrow("CIRCUIT_OPEN");
    }
  });
});

describe("Circuit breaker: Half-open recovery", () => {
  it("allows test request after timeout — closes on success", async () => {
    const breaker = new TestCircuitBreaker(3, 50); // Short timeout for testing

    async function flakyService(succeed: boolean): Promise<string> {
      if (!succeed) throw new Error("TEMPORARY_FAILURE");
      return "success";
    }

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(() => flakyService(false))).rejects.toThrow("TEMPORARY_FAILURE");
    }
    expect(breaker.getState()).toBe("OPEN");

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 100));

    // State should transition to HALF_OPEN
    expect(breaker.getState()).toBe("HALF_OPEN");

    // Half-open: test request succeeds
    const result = await breaker.call(() => flakyService(true));
    expect(result).toBe("success");

    // Circuit should be CLOSED again
    expect(breaker.getState()).toBe("CLOSED");
    expect(breaker.getFailureCount()).toBe(0);
  });

  it("re-opens circuit if test request fails in half-open state", async () => {
    const breaker = new TestCircuitBreaker(3, 50);

    async function stillFailing(): Promise<string> {
      throw new Error("STILL_FAILING");
    }

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(stillFailing)).rejects.toThrow("STILL_FAILING");
    }
    expect(breaker.getState()).toBe("OPEN");

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 100));

    // State should be HALF_OPEN
    expect(breaker.getState()).toBe("HALF_OPEN");

    // Test request fails again
    await expect(breaker.call(stillFailing)).rejects.toThrow("STILL_FAILING");

    // Circuit should be OPEN again
    expect(breaker.getState()).toBe("OPEN");
  });
});

describe("Circuit breaker: Rate limiting behavior", () => {
  it("opens circuit on repeated 429 responses", async () => {
    const breaker = new TestCircuitBreaker(4, 2000);
    let callCount = 0;

    async function rateLimitedCall(): Promise<string> {
      callCount++;
      const err = new Error("RATE_LIMITED: 429 Too Many Requests") as any;
      err.statusCode = 429;
      throw err;
    }

    for (let i = 0; i < 4; i++) {
      await expect(breaker.call(rateLimitedCall)).rejects.toThrow("429");
    }

    expect(breaker.getState()).toBe("OPEN");
    expect(callCount).toBe(4);

    // Backoff — calls fail fast
    await expect(breaker.call(rateLimitedCall)).rejects.toThrow("CIRCUIT_OPEN");
    expect(callCount).toBe(4); // No actual calls made
  });
});

describe("Circuit breaker: Integration with pipeline", () => {
  it("falls back to cache when database circuit is open", async () => {
    const cache = new Map<string, string>();
    cache.set("known_text", "cached result for بسم الله الرحمن الرحيم");

    const breaker = new TestCircuitBreaker(3, 30000);

    async function dbFetch(text: string): Promise<string> {
      throw new Error("DB_TIMEOUT");
    }

    async function fetchWithFallback(text: string): Promise<string> {
      try {
        return await breaker.call(() => dbFetch(text));
      } catch (err: any) {
        if (err.message.startsWith("CIRCUIT_OPEN")) {
          const cached = cache.get(text);
          if (cached) return cached;
        }
        throw err;
      }
    }

    // First call: fails (DB error, circuit not open yet)
    await expect(fetchWithFallback("unknown")).rejects.toThrow("DB_TIMEOUT");

    // Fail twice more to open circuit
    await expect(fetchWithFallback("unknown")).rejects.toThrow("DB_TIMEOUT");
    await expect(fetchWithFallback("unknown")).rejects.toThrow("DB_TIMEOUT");

    // Circuit is open now -> should fall back to cache for known text
    const result = await fetchWithFallback("known_text");
    expect(result).toBe("cached result for بسم الله الرحمن الرحيم");
  });

  it("continues normal pipeline operations when services are healthy", async () => {
    const breaker = new TestCircuitBreaker(5, 1000);

    // Normal pipeline work should never trigger circuit
    for (let i = 0; i < 20; i++) {
      const result = await breaker.call(() =>
        Promise.resolve().then(() => cleanArabicText(ARABIC_TEXT)),
      );
      expect(result).toBeDefined();
    }

    expect(breaker.getState()).toBe("CLOSED");
    expect(breaker.getFailureCount()).toBe(0);
  });

  it("isolates failures by service", async () => {
    const dbBreaker = new TestCircuitBreaker(3, 30000);
    const redisBreaker = new TestCircuitBreaker(3, 30000);
    const ocrBreaker = new TestCircuitBreaker(3, 30000);

    async function dbOp(): Promise<string> {
      throw new Error("DB_FAILURE");
    }

    async function redisOp(): Promise<string> {
      return "redis-ok";
    }

    async function ocrOp(): Promise<string> {
      return "ocr-ok";
    }

    // DB fails and opens
    for (let i = 0; i < 3; i++) {
      await expect(dbBreaker.call(dbOp)).rejects.toThrow("DB_FAILURE");
    }
    expect(dbBreaker.getState()).toBe("OPEN");

    // Other services stay healthy
    expect(await redisBreaker.call(redisOp)).toBe("redis-ok");
    expect(await ocrBreaker.call(ocrOp)).toBe("ocr-ok");

    expect(redisBreaker.getState()).toBe("CLOSED");
    expect(ocrBreaker.getState()).toBe("CLOSED");
  });
});
