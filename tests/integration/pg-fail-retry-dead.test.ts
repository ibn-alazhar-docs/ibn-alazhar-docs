process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import {
  PgQueueDriver,
  JOB_QUEUES,
  getFailedJobsViaDriver,
  cleanupFailedJobViaDriver,
} from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

async function enqueueAndClaim(key: string, maxAttempts: number) {
  await driver.enqueue({
    queue: JOB_QUEUES.OCR,
    idempotencyKey: key,
    payload: { n: 1 },
    maxAttempts,
  });
  const claimed = await driver.claim(JOB_QUEUES.OCR, "worker-1", 5);
  return claimed[0]!;
}

describe("pg-queue integration: fail → retry → dead", () => {
  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("fails with retry and returns to pending with a future runAt", async () => {
    const key = "retry-" + crypto.randomUUID();
    const job = await enqueueAndClaim(key, 3);
    const ok = await driver.fail(job.id, "worker-1", job.leaseToken, new Error("transient"), true);
    expect(ok).toBe(true);
    const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(job.id) } });
    expect(row?.status).toBe("pending");
    expect(row?.runAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("exhausts attempts then goes dead with deadLetterState", async () => {
    const key = "dead-" + crypto.randomUUID();
    const maxAttempts = 3;
    let job = await enqueueAndClaim(key, maxAttempts);
    for (let i = 0; i < maxAttempts; i++) {
      const willRetry = i < maxAttempts - 1;
      const ok = await driver.fail(
        job.id,
        "worker-1",
        job.leaseToken,
        new Error("boom"),
        willRetry,
      );
      expect(ok).toBe(true);
      const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(job.id) } });
      if (willRetry) {
        expect(row?.status).toBe("pending");
        // Retry is scheduled in the future; simulate time passing.
        await prisma.jobQueue.update({
          where: { id: BigInt(job.id) },
          data: { runAt: new Date() },
        });
        const next = await driver.claim(JOB_QUEUES.OCR, "worker-1", 5);
        expect(next[0]).toBeDefined();
        job = next[0]!;
      } else {
        expect(row?.status).toBe("dead");
        expect(row?.deadLetterState).toBeTruthy();
      }
    }
  });

  it("getFailedJobsViaDriver returns the dead row and cleanup removes it", async () => {
    const key = "failed-" + crypto.randomUUID();
    const maxAttempts = 1;
    const job = await enqueueAndClaim(key, maxAttempts);
    const ok = await driver.fail(job.id, "worker-1", job.leaseToken, new Error("perm"), false);
    expect(ok).toBe(true);
    const failed = await getFailedJobsViaDriver();
    const found = failed.find((f) => f.jobId === key);
    expect(found).toBeDefined();
    await cleanupFailedJobViaDriver(key);
    const after = await getFailedJobsViaDriver();
    expect(after.find((f) => f.jobId === key)).toBeUndefined();
  });
});
