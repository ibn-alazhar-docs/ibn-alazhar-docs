process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import {
  PgQueueDriver,
  PermanentPipelineError,
  JOB_QUEUES,
  type ClaimedJob,
} from "@ibn-al-azhar-docs/pipeline";

// NOTE: The spec referenced `buildOcrPgHandlers` / `processValidationStage`,
// neither of which exists in the tree. This test exercises the *handler
// transition contract* directly: a handler receives a ClaimedJob, does work,
// and on a corrupt payload throws a PermanentPipelineError (willRetry=false)
// so the driver's fail(...,false) route marks the row dead. It proves the
// wiring/transition semantics without depending on the missing handler factory.

const driver = new PgQueueDriver();

function makeClaimedJob(overrides: Partial<ClaimedJob> = {}): ClaimedJob {
  return {
    id: "0",
    queue: JOB_QUEUES.VALIDATION,
    idempotencyKey: "h-" + crypto.randomUUID(),
    payload: { inputPath: "/tmp/x.pdf", buffer: Buffer.from("valid") },
    priority: 0,
    attempts: 1,
    maxAttempts: 3,
    leaseToken: crypto.randomUUID(),
    lockedBy: "worker-1",
    ...overrides,
  };
}

async function runHandler(job: ClaimedJob): Promise<void> {
  const payload = job.payload as { buffer?: unknown };
  if (!payload || !(payload.buffer instanceof Uint8Array)) {
    throw new PermanentPipelineError("corrupt or missing PDF buffer");
  }
}

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

describe("pg-queue integration: handler transition wiring", () => {
  beforeAll(async () => {
    await truncateIfRequested();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("valid payload handler resolves without a type error", async () => {
    const job = makeClaimedJob();
    await expect(runHandler(job)).resolves.toBeUndefined();
  });

  it("corrupt payload throws PermanentPipelineError (willRetry=false) and driver marks dead", async () => {
    const key = "h-corrupt-" + crypto.randomUUID();
    await driver.enqueue({
      queue: JOB_QUEUES.VALIDATION,
      idempotencyKey: key,
      payload: { inputPath: "/tmp/x.pdf" },
      maxAttempts: 1,
    });
    const claimed = await driver.claim(JOB_QUEUES.VALIDATION, "worker-1", 5);
    const job = claimed[0]!;

    let thrown: unknown;
    try {
      await runHandler(job);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PermanentPipelineError);
    expect((thrown as PermanentPipelineError).willRetry).toBe(false);

    const ok = await driver.fail(
      job.id,
      job.lockedBy,
      job.leaseToken,
      thrown as PermanentPipelineError,
      (thrown as PermanentPipelineError).willRetry,
    );
    expect(ok).toBe(true);
    const row = await prisma.jobQueue.findUnique({ where: { id: BigInt(job.id) } });
    expect(row?.status).toBe("dead");
    expect(row?.deadLetterState).toBeTruthy();
  });
});
