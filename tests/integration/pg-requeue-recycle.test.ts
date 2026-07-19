process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import {
  PgQueueDriver,
  JOB_QUEUES,
  enqueueViaDriver,
  loadConfig,
} from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: idempotency + requeue recycle", () => {
  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ignores a duplicate enqueue while the row is still pending/reserved", async () => {
    const key = "dup-" + crypto.randomUUID();
    await driver.enqueue({
      queue: JOB_QUEUES.OCR,
      idempotencyKey: key,
      payload: { n: 1 },
      maxAttempts: 3,
    });
    await driver.enqueue({
      queue: JOB_QUEUES.OCR,
      idempotencyKey: key,
      payload: { n: 2 },
      maxAttempts: 3,
    });
    const rows = await prisma.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM job_queue WHERE "idempotencyKey" = ${key}
    `;
    expect(rows.length).toBe(1);
    expect((await driver.claim(JOB_QUEUES.OCR, "worker-1", 5))[0]).toBeDefined();
  });

  it("recycles a dead row on re-enqueue so reprocess/resqueue does not stall", async () => {
    const key = "recycle-" + crypto.randomUUID();
    const config = loadConfig();
    await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, {
      id: key,
      documentId: key,
      userId: "u",
      fileName: "f",
      fileSize: 1,
      mimeType: "application/pdf",
      storageKey: "k",
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    } as never);

    // Drive it to dead.
    let claimed = await driver.claim(JOB_QUEUES.VALIDATION, "worker-1", 5);
    expect(claimed[0]).toBeDefined();
    await driver.fail(claimed[0]!.id, "worker-1", claimed[0]!.leaseToken, new Error("boom"), false);
    let row = await prisma.jobQueue.findFirst({ where: { idempotencyKey: key } });
    expect(row?.status).toBe("dead");

    // Re-enqueue via the driver abstraction (what reprocess/requeue endpoints do).
    await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, {
      id: key,
      documentId: key,
      userId: "u",
      fileName: "f",
      fileSize: 1,
      mimeType: "application/pdf",
      storageKey: "k",
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    } as never);

    row = await prisma.jobQueue.findFirst({ where: { idempotencyKey: key } });
    expect(row?.status).toBe("pending");
    expect(row?.attempts).toBe(0);
    expect(row?.deadLetterState).toBeNull();
  });
});
