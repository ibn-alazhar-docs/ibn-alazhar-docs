import { describe, it, expect, afterEach } from "vitest";
import {
  nextRunAt,
  canMutate,
  buildIdempotencyKey,
  validateQueueConfig,
  PermanentPipelineError,
} from "@ibn-al-azhar-docs/pipeline";

describe("pg-queue unit: nextRunAt", () => {
  it("returns now + baseDelay * 2^attempts and is future", () => {
    const base = 2000;
    const attempts = 3;
    const before = Date.now();
    const runAt = nextRunAt(attempts, base);
    const expected = base * 2 ** attempts;
    const delta = runAt.getTime() - before;
    expect(delta).toBeGreaterThanOrEqual(expected - 5);
    expect(delta).toBeLessThan(expected + 1000);
    expect(runAt.getTime()).toBeGreaterThan(before);
  });
});

describe("pg-queue unit: canMutate", () => {
  it("is true only when exactly one row affected", () => {
    expect(canMutate(1)).toBe(true);
    expect(canMutate(0)).toBe(false);
    expect(canMutate(2)).toBe(false);
  });
});

describe("pg-queue unit: buildIdempotencyKey", () => {
  it("builds queue:key scope", () => {
    expect(buildIdempotencyKey("pipeline-validation", "abc")).toBe("pipeline-validation:abc");
  });
});

describe("pg-queue unit: validateQueueConfig", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env.QUEUE_DRIVER = saved.QUEUE_DRIVER;
    process.env.DATABASE_URL = saved.DATABASE_URL;
    process.env.DATABASE_URL_DIRECT = saved.DATABASE_URL_DIRECT;
  });

  it("throws when QUEUE_DRIVER=pg without DATABASE_URL_DIRECT", () => {
    process.env.QUEUE_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://x";
    delete process.env.DATABASE_URL_DIRECT;
    expect(() => validateQueueConfig()).toThrow();
  });

  it("does not throw when both DATABASE_URL and DATABASE_URL_DIRECT present", () => {
    process.env.QUEUE_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://x";
    process.env.DATABASE_URL_DIRECT = "postgres://x";
    expect(() => validateQueueConfig()).not.toThrow();
  });
});

describe("pg-queue unit: PermanentPipelineError", () => {
  it("has willRetry=false and correct name", () => {
    const err = new PermanentPipelineError("bad");
    expect(err.willRetry).toBe(false);
    expect(err.name).toBe("PermanentPipelineError");
    expect(err).toBeInstanceOf(Error);
  });
});
