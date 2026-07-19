process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import {
  PgQueueDriver,
  getQueueDriver,
  enqueueViaDriver,
  JOB_QUEUES,
  type ProcessingJob,
} from "@ibn-al-azhar-docs/pipeline";

const key = "noredis-" + crypto.randomUUID();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: pg mode never touches Redis/BullMQ", () => {
  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("getQueueDriver returns a PgQueueDriver instance", () => {
    const driver = getQueueDriver();
    expect(driver).toBeInstanceOf(PgQueueDriver);
  });

  it("enqueueViaDriver writes a row without opening a Redis connection", async () => {
    const config = {} as Parameters<typeof enqueueViaDriver>[1];
    const job: ProcessingJob = {
      id: key,
      documentId: "doc-1",
      userId: "user-1",
      stage: JOB_QUEUES.VALIDATION,
      inputPath: "/tmp/x.pdf",
      outputPath: "/tmp/y",
      attempts: 0,
      maxAttempts: 3,
    };
    await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, job);

    const row = await prisma.jobQueue.findFirst({ where: { idempotencyKey: key } });
    expect(row).not.toBeNull();
    expect(row?.queue).toBe(JOB_QUEUES.VALIDATION);
    expect(row?.status).toBe("pending");
  });
});
