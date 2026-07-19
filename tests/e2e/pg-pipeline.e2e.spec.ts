import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import { PgQueueDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

// Skip unless the full e2e flag is set; this runs the full pipeline progression
// against Neon staging using the Postgres driver only (no Redis/BullMQ).
describe.skipIf(!process.env.E2E_FULL)("pg pipeline full progression (e2e)", () => {
  const driver = new PgQueueDriver();
  const baseKey = "e2e-" + crypto.randomUUID();

  async function truncateIfRequested() {
    if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
      await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
    }
  }

  beforeAll(async () => {
    process.env.QUEUE_DRIVER = "pg";
    process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("progresses a row through pending → reserved → done for each queue", async () => {
    const queues = [
      JOB_QUEUES.VALIDATION,
      JOB_QUEUES.SPLITTING,
      JOB_QUEUES.OCR,
      JOB_QUEUES.CLEANING,
      JOB_QUEUES.GENERATION,
      JOB_QUEUES.EXPORT,
    ];

    for (const queue of queues) {
      const key = `${baseKey}-${queue}`;
      await driver.enqueue({
        queue,
        idempotencyKey: key,
        payload: { stage: queue },
        maxAttempts: 3,
      });

      const pending = await prisma.jobQueue.findFirst({ where: { idempotencyKey: key } });
      expect(pending?.status).toBe("pending");

      const claimed = await driver.claim(queue, "e2e-worker", 5);
      const mine = claimed.find((j) => j.idempotencyKey === key);
      expect(mine).toBeDefined();

      const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(mine!.id) } });
      expect(row?.status).toBe("reserved");

      const ok = await driver.complete(mine!.id, "e2e-worker", mine!.leaseToken);
      expect(ok).toBe(true);

      const done = await prisma.jobQueue.findUnique({ where: { id: BigInt(mine!.id) } });
      expect(done?.status).toBe("done");
    }
  });
});
