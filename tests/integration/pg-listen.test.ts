process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import { PgQueueDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

const driver = new PgQueueDriver();
const key = "listen-" + crypto.randomUUID();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: listen notifies on enqueue", () => {
  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("fires the callback when a job is enqueued on the queue", async () => {
    let fired = false;
    const unsubscribe = await driver.listen(JOB_QUEUES.EXPORT, () => {
      fired = true;
    });

    try {
      await driver.enqueue({
        queue: JOB_QUEUES.EXPORT,
        idempotencyKey: key,
        payload: { n: 1 },
        maxAttempts: 3,
      });

      await new Promise<void>((resolve) => {
        const start = Date.now();
        const timer = setInterval(() => {
          if (fired || Date.now() - start > 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });

      expect(fired).toBe(true);
    } finally {
      await unsubscribe();
    }
  });
});
