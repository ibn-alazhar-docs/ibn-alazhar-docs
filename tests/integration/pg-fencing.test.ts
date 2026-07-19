process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import { PgQueueDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();
const key = "fence-" + crypto.randomUUID();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: lease fencing", () => {
  let jobId: string | undefined;
  let leaseTokenL1: string | undefined;

  beforeAll(async () => {
    await truncateIfRequested();
    await driver.enqueue({
      queue: JOB_QUEUES.CLEANING,
      idempotencyKey: key,
      payload: { n: 1 },
      maxAttempts: 3,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("first claim takes the lease", async () => {
    const claimed = await driver.claim(JOB_QUEUES.CLEANING, "worker-1", 5);
    expect(claimed.length).toBe(1);
    jobId = claimed[0]!.id;
    leaseTokenL1 = claimed[0]!.leaseToken;
  });

  it("a second claim by the same worker does not re-claim the reserved row", async () => {
    const claimed = await driver.claim(JOB_QUEUES.CLEANING, "worker-1", 5);
    expect(claimed.find((j) => j.id === jobId)).toBeUndefined();
  });

  it("complete with wrong token is fenced (returns false)", async () => {
    const ok = await driver.complete(jobId!, "worker-1", "wrong-token");
    expect(ok).toBe(false);
  });

  it("complete with correct token succeeds", async () => {
    const ok = await driver.complete(jobId!, "worker-1", leaseTokenL1!);
    expect(ok).toBe(true);
    const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(jobId!) } });
    expect(row?.status).toBe("done");
  });
});
