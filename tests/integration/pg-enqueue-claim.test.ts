process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import { PgQueueDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: enqueue → claim → complete", () => {
  const key = "u-" + crypto.randomUUID();
  let claimedId: string | undefined;
  let leaseToken: string | undefined;

  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enqueues a job", async () => {
    await driver.enqueue({
      queue: JOB_QUEUES.VALIDATION,
      idempotencyKey: key,
      payload: { hello: "world" },
      maxAttempts: 3,
    });
    const row = await prisma.jobQueue.findFirst({ where: { idempotencyKey: key } });
    expect(row).not.toBeNull();
    expect(row?.status).toBe("pending");
  });

  it("claim returns the reserved job with a leaseToken", async () => {
    const claimed = await driver.claim(JOB_QUEUES.VALIDATION, "worker-1", 5);
    expect(claimed.length).toBe(1);
    expect(claimed[0]?.idempotencyKey).toBe(key);
    expect(claimed[0]?.status).toBeUndefined();
    const row = await prisma.jobQueue.findFirst({ where: { idempotencyKey: key } });
    expect(row?.status).toBe("reserved");
    expect(row?.leaseToken).toBeTruthy();
    claimedId = claimed[0]?.id;
    leaseToken = claimed[0]?.leaseToken;
  });

  it("complete marks the row done", async () => {
    expect(claimedId).toBeDefined();
    const ok = await driver.complete(claimedId!, "worker-1", leaseToken!);
    expect(ok).toBe(true);
    const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(claimedId!) } });
    expect(row?.status).toBe("done");
  });
});
