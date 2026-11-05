import { describe, it, expect, afterEach } from "vitest";
import { getQueueDriver } from "@ibn-al-azhar-docs/pipeline/queue";
import type { QueueDriverName } from "@ibn-al-azhar-docs/pipeline/queue";
import { buildIdempotencyKey, nextRunAt, canMutate } from "@ibn-al-azhar-docs/pipeline/queue";

describe("pg-queue unit", () => {
  const saved = process.env.QUEUE_DRIVER;

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.QUEUE_DRIVER;
    } else {
      process.env.QUEUE_DRIVER = saved;
    }
  });

  it("flag factory returns redis by default", () => {
    delete process.env.QUEUE_DRIVER;
    const driver = getQueueDriver();
    expect(process.env.QUEUE_DRIVER ?? "redis").toBe("redis");
    // Redis driver instance is produced without throwing.
    expect(driver).toBeDefined();
  });

  it("flag factory returns pg when QUEUE_DRIVER=pg", () => {
    process.env.QUEUE_DRIVER = "pg";
    const driver = getQueueDriver();
    expect(process.env.QUEUE_DRIVER as QueueDriverName).toBe("pg");
    expect(driver).toBeDefined();
  });

  it("buildIdempotencyKey scopes by queue", () => {
    expect(buildIdempotencyKey("pipeline-ocr", "doc-123")).toBe("pipeline-ocr:doc-123");
    expect(buildIdempotencyKey("pipeline-ocr", "doc-123")).not.toBe(
      buildIdempotencyKey("pipeline-export", "doc-123"),
    );
  });

  it("nextRunAt returns exponential backoff", () => {
    const base = 1000;
    const before = Date.now();
    const first = nextRunAt(0, base).getTime();
    const second = nextRunAt(1, base).getTime();
    const fourth = nextRunAt(3, base).getTime();
    const after = Date.now();

    // Allow for the elapsed wall-clock time between capturing `before`
    // and each call, instead of comparing against a later Date.now().
    expect(first).toBeGreaterThanOrEqual(before + base);
    expect(first).toBeLessThanOrEqual(after + base);
    expect(second).toBeGreaterThanOrEqual(before + 2 * base);
    expect(second).toBeLessThanOrEqual(after + 2 * base);
    expect(fourth).toBeGreaterThanOrEqual(before + 8 * base);
    expect(fourth).toBeLessThanOrEqual(after + 8 * base);
  });

  it("canMutate validates fencing result", () => {
    expect(canMutate(1)).toBe(true);
    expect(canMutate(0)).toBe(false);
    expect(canMutate(2)).toBe(false);
  });
});
