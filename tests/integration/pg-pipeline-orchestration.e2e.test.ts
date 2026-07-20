process.env.QUEUE_DRIVER = "pg";
process.env.DATABASE_URL_DIRECT = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@ibn-al-azhar-docs/database";
import {
  enqueueViaDriver,
  JOB_QUEUES,
  loadConfig,
  PgWorker,
  type PipelineConfig,
  type ProcessingJob,
} from "@ibn-al-azhar-docs/pipeline";
import { buildOcrPgHandlers } from "../../workers/ocr-worker/src/pg/handlers";

// --- Stub the 5 OCR stages so the orchestration fabric can be exercised
// end-to-end on Postgres without external OCR/MinIO/Gemini services. Each stub
// replicates the REAL handoff contract: advance doc status + enqueue the next
// queue via the driver abstraction. ---
vi.mock("../../workers/ocr-worker/src/stages/validate", () => ({
  processValidationStage: async (job: ProcessingJob, config: PipelineConfig) => {
    await prisma.document.update({ where: { id: job.documentId }, data: { status: "VALIDATING" } });
    await enqueueViaDriver(JOB_QUEUES.SPLITTING, config, {
      ...job,
      status: "splitting",
      progress: 10,
    });
  },
}));
vi.mock("../../workers/ocr-worker/src/stages/split", () => ({
  processSplittingStage: async (job: ProcessingJob, config: PipelineConfig) => {
    await prisma.document.update({ where: { id: job.documentId }, data: { status: "SPLITTING" } });
    await enqueueViaDriver(JOB_QUEUES.OCR, config, { ...job, status: "ocr", progress: 30 });
  },
}));
vi.mock("../../workers/ocr-worker/src/stages/ocr", () => ({
  processOcrStage: async (job: ProcessingJob, config: PipelineConfig) => {
    await prisma.document.update({
      where: { id: job.documentId },
      data: { status: "OCR_PROCESSING" },
    });
    await enqueueViaDriver(JOB_QUEUES.CLEANING, config, {
      ...job,
      status: "CLEANING",
      progress: 50,
    });
  },
}));
vi.mock("../../workers/ocr-worker/src/stages/clean", () => ({
  processCleaningStage: async (job: ProcessingJob, config: PipelineConfig) => {
    await prisma.document.update({ where: { id: job.documentId }, data: { status: "CLEANING" } });
    await enqueueViaDriver(JOB_QUEUES.GENERATION, config, {
      ...job,
      status: "GENERATING",
      progress: 70,
    });
  },
}));
vi.mock("../../workers/ocr-worker/src/stages/generate", () => ({
  processGenerationStage: async (job: ProcessingJob) => {
    // Terminal stage: mark the document COMPLETED (no further enqueue).
    await prisma.document.update({ where: { id: job.documentId }, data: { status: "COMPLETED" } });
  },
}));

const config = loadConfig();

async function truncateIfRequested() {
  if (process.env.PG_QUEUE_TEST_URL && process.env.PG_QUEUE_TEST_TRUNCATE === "1") {
    await prisma.$executeRaw`TRUNCATE job_queue RESTART IDENTITY CASCADE`;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("pg-queue E2E: full OCR pipeline orchestration on Postgres", () => {
  const docId = "e2e-" + crypto.randomUUID();
  let worker: PgWorker;

  beforeAll(async () => {
    await truncateIfRequested();
    await prisma.user.upsert({
      where: { id: "e2e-user" },
      update: {},
      create: {
        id: "e2e-user",
        email: "e2e@example.com",
        name: "E2E User",
        passwordHash: "x",
      },
    });
    await prisma.document.create({
      data: {
        id: docId,
        userId: "e2e-user",
        title: "E2E doc",
        fileName: "doc.pdf",
        originalName: "doc.pdf",
        fileSize: 1234,
        mimeType: "application/pdf",
        storageKey: "uploads/doc.pdf",
        status: "UPLOADED",
        pageCount: 1,
      },
    });
  });

  afterAll(async () => {
    if (worker) await worker.shutdown();
    await prisma.document.deleteMany({ where: { id: docId } });
    await prisma.$disconnect();
  });

  it("drives validation -> splitting -> ocr -> cleaning -> generation -> COMPLETED and drains the queue", async () => {
    const job: ProcessingJob = {
      id: docId,
      documentId: docId,
      userId: "e2e-user",
      fileName: "doc.pdf",
      fileSize: 1234,
      mimeType: "application/pdf",
      storageKey: "uploads/doc.pdf",
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    } as ProcessingJob;

    // Enqueue the entry job via the driver abstraction (what upload use-case does).
    await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, job);

    worker = new PgWorker({
      handlers: buildOcrPgHandlers(config),
      concurrency: {
        [JOB_QUEUES.VALIDATION]: 1,
        [JOB_QUEUES.SPLITTING]: 1,
        [JOB_QUEUES.OCR]: 1,
        [JOB_QUEUES.CLEANING]: 1,
        [JOB_QUEUES.GENERATION]: 1,
      },
      workerId: "e2e-ocr-worker",
      directUrl: process.env.DATABASE_URL_DIRECT,
    });
    await worker.start();

    // Poll until the document reaches COMPLETED (stages enqueue the next queue).
    let status = "";
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const doc = await prisma.document.findUnique({ where: { id: docId } });
      status = doc?.status ?? "";
      if (status === "COMPLETED") break;
    }

    if (status !== "COMPLETED") {
      const rows = await prisma.$queryRaw<
        { queue: string; status: string; attempts: number; lastError: string | null }[]
      >`
        SELECT queue, status, attempts, "lastError" FROM job_queue ORDER BY id
      `;
      console.log("[E2E DEBUG] docStatus=", status, "rows=", JSON.stringify(rows, null, 2));
    }

    expect(status).toBe("COMPLETED");

    await worker.shutdown();
    worker = undefined as unknown as PgWorker;

    // Queue must be fully drained (all rows done/dead, none pending/reserved).
    const remaining = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c FROM job_queue
      WHERE status IN ('pending', 'reserved')
    `;
    expect(Number(remaining[0]!.c)).toBe(0);

    // Every enqueued stage row should have completed.
    const done = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c FROM job_queue WHERE status = 'done'
    `;
    expect(Number(done[0]!.c)).toBe(5);
  });
});
