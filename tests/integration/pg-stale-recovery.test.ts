process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import { PgQueueDriver, recoverStale, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();
const key = "stale-" + crypto.randomUUID();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: stale recovery", () => {
  let jobId: string | undefined;

  beforeAll(async () => {
    await truncateIfRequested();
    await driver.enqueue({
      queue: JOB_QUEUES.GENERATION,
      idempotencyKey: key,
      payload: { n: 1 },
      maxAttempts: 3,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("a claimed job with an old heartbeat is recovered to pending and re-claimable", async () => {
    const claimed = await driver.claim(JOB_QUEUES.GENERATION, "worker-1", 5);
    jobId = claimed[0]!.id;
    expect(claimed[0]!.leaseToken).toBeTruthy();

    await prisma.jobQueue.update({
      where: { id: BigInt(jobId!) },
      data: {
        heartbeatAt: new Date(Date.now() - 60000),
        lockedAt: new Date(Date.now() - 60000),
      },
    });

    const recovered = await recoverStale(30000);
    expect(recovered).toBeGreaterThanOrEqual(1);

    const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(jobId!) } });
    expect(row?.status).toBe("pending");
    expect(row?.leaseToken).toBeNull();

    const reclaimed = await driver.claim(JOB_QUEUES.GENERATION, "worker-2", 5);
    expect(reclaimed.find((j) => j.id === jobId)).toBeDefined();
    await driver.complete(jobId!, "worker-2", reclaimed[0]!.leaseToken);
  });
});
