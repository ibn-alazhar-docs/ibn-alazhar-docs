process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import { PgQueueDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();
const key = "dup-" + crypto.randomUUID();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: duplicate idempotencyKey (ON CONFLICT DO NOTHING)", () => {
  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("second enqueue with same key is ignored", async () => {
    await driver.enqueue({
      queue: JOB_QUEUES.SPLITTING,
      idempotencyKey: key,
      payload: { n: 1 },
      maxAttempts: 3,
    });
    await driver.enqueue({
      queue: JOB_QUEUES.SPLITTING,
      idempotencyKey: key,
      payload: { n: 2 },
      maxAttempts: 3,
    });

    const count = await prisma.jobQueue.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);

    const claimed = await driver.claim(JOB_QUEUES.SPLITTING, "worker-1", 5);
    expect(claimed.length).toBe(1);
    await driver.complete(claimed[0]!.id, "worker-1", claimed[0]!.leaseToken);
  });
});
