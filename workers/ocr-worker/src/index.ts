import {
  loadConfig,
  setupDlq,
  closeQueueConnections,
  recordJobFailure,
  classifyError,
  isFinalAttempt,
  sendAlert,
  enqueueValidation,
  type ProcessingJob,
  type FailedJob,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";
import { startHealthServer } from "@ibn-al-azhar-docs/shared/health-server";

import { registerValidationStage } from "./stages/validate";
import { registerSplittingStage } from "./stages/split";
import { registerOcrStage } from "./stages/ocr";
import { registerCleaningStage } from "./stages/clean";
import { registerGenerationStage } from "./stages/generate";
import { updateDocStatus } from "./helpers";
import { PgWorker, JOB_CONCURRENCY, validateQueueConfig } from "@ibn-al-azhar-docs/pipeline";
import { buildOcrPgHandlers, OCR_WORKER_ID } from "./pg/handlers";
import { createStuckDocumentsSweeper } from "./sweepers/stuck-documents";
import { createFailedUploadsSweeper } from "./sweepers/failed-uploads";

async function main() {
  const config = loadConfig();
  logger.info("[ocr-worker] Starting...");

  startHealthServer("ocr-worker", 9090);

  if (process.env.QUEUE_DRIVER === "pg") {
    validateQueueConfig();

    const worker = new PgWorker({
      handlers: buildOcrPgHandlers(config),
      concurrency: JOB_CONCURRENCY,
      workerId: OCR_WORKER_ID,
      directUrl: process.env.DATABASE_URL_DIRECT,
    });
    await worker.start();

    const shutdown = async () => {
      logger.info("[ocr-worker] Shutting down (pg)...");
      await worker.shutdown();
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    logger.info("[ocr-worker] PG worker started. Waiting for jobs...");
    return;
  }

  await setupDlq(config, async (failed: FailedJob) => {
    logger.error(
      { error: failed.error, code: failed.errorCode },
      `[dlq] Job ${failed.jobId} failed permanently`,
    );
  });

  const onPipelineFailed = async (
    job: Job<ProcessingJob>,
    error: Error,
    queueName: string,
  ): Promise<void> => {
    const data = job.data;
    const { code } = classifyError(error);

    if (!isFinalAttempt(job)) {
      logger.warn(
        { jobId: data.id, code, attemptsMade: job.attemptsMade, queue: queueName },
        `[pipeline] Transient failure (retry scheduled) for ${data.id}: ${code}`,
      );
      return;
    }

    await updateDocStatus(data.documentId, "FAILED", { errorCode: code });
    await recordJobFailure(config, queueName, job, error);
  };

  const shutdown = async () => {
    logger.info("[ocr-worker] Shutting down...");
    await closeQueueConnections();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  registerValidationStage(config, onPipelineFailed);
  registerSplittingStage(config, onPipelineFailed);
  registerOcrStage(config, onPipelineFailed);
  registerCleaningStage(config, onPipelineFailed);
  registerGenerationStage(config, onPipelineFailed);

  const stuckSweeper = createStuckDocumentsSweeper();
  const failedUploadsSweeper = createFailedUploadsSweeper();

  const shutdownWithSweepers = async () => {
    stuckSweeper.stop();
    failedUploadsSweeper.stop();
    shutdown();
  };
  process.on("SIGTERM", shutdownWithSweepers);
  process.on("SIGINT", shutdownWithSweepers);

  logger.info("[ocr-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[ocr-worker] Fatal error:");
  process.exit(1);
});
