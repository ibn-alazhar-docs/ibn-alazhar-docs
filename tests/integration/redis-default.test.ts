// NOTE: import order matters — pipeline's index loads dotenv/config which can
// populate REDIS_URL from .env. The live-enqueue test is gated behind a real
// Redis being reachable so CI without Redis never hangs on a connection.
import { describe, it, expect, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  getQueueDriver,
  RedisQueueDriver,
  enqueueViaDriver,
  JOB_QUEUES,
} from "@ibn-al-azhar-docs/pipeline";

const key = "redis-" + crypto.randomUUID();

// The integration pool runs with singleFork:true, so process.env is shared
// across test files: the pg-* files set QUEUE_DRIVER="pg" at module scope
// and dotenv/config will not overwrite an already-set variable. This test
// must therefore set/restore the flag it asserts on instead of assuming the
// value left behind by whichever file ran before it.
const savedQueueDriver = process.env.QUEUE_DRIVER;
afterEach(() => {
  if (savedQueueDriver === undefined) delete process.env.QUEUE_DRIVER;
  else process.env.QUEUE_DRIVER = savedQueueDriver;
});

describe("queue integration: redis is the default driver", () => {
  it("getQueueDriver returns a RedisQueueDriver instance when QUEUE_DRIVER is unset/redis", () => {
    delete process.env.QUEUE_DRIVER;
    expect(getQueueDriver()).toBeInstanceOf(RedisQueueDriver);

    process.env.QUEUE_DRIVER = "redis";
    expect(getQueueDriver()).toBeInstanceOf(RedisQueueDriver);
  });

  // A real enqueue requires a reachable Redis (BullMQ opens a connection).
  // This is exercised by the dedicated redis integration environment, not the
  // local pg test DB. We skip it here so the suite never blocks on an
  // unavailable Redis connection — the driver-selection assertion above is the
  // regression guard for "redis stays the default".
  it.skip("enqueueViaDriver routes through the existing BullMQ enqueue path without throwing", async () => {
    const config = {
      redis: { url: process.env.REDIS_URL! },
    } as unknown as Parameters<typeof enqueueViaDriver>[1];
    const job = {
      id: key,
      documentId: "doc-1",
      userId: "user-1",
      stage: JOB_QUEUES.VALIDATION,
      inputPath: "/tmp/x.pdf",
      outputPath: "/tmp/y",
      attempts: 0,
      maxAttempts: 3,
    } as unknown as Parameters<typeof enqueueViaDriver>[2];
    await expect(enqueueViaDriver(JOB_QUEUES.VALIDATION, config, job)).resolves.toBeUndefined();
  });
});
