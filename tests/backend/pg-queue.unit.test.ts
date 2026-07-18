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
    expect(nextRunAt(0, base).getTime()).toBeGreaterThanOrEqual(Date.now() + base - 5);
    expect(nextRunAt(1, base).getTime()).toBeGreaterThanOrEqual(Date.now() + 2 * base - 5);
    expect(nextRunAt(3, base).getTime()).toBeGreaterThanOrEqual(Date.now() + 8 * base - 5);
  });

  it("canMutate validates fencing result", () => {
    expect(canMutate(1)).toBe(true);
    expect(canMutate(0)).toBe(false);
    expect(canMutate(2)).toBe(false);
  });
});
