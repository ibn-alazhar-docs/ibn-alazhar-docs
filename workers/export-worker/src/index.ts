import {
  closeQueueConnections,
  recordJobFailure,
  classifyError,
  isFinalAttempt,
  PgWorker,
  JOB_QUEUES,
  JOB_CONCURRENCY,
  validateQueueConfig,
  type ExportRequest,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { loadConfig } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";
import { startHealthServer } from "@ibn-al-azhar-docs/shared/health-server";

import { registerExportHandler } from "./export-handler";
import { buildExportPgHandlers, EXPORT_WORKER_ID } from "./pg/handlers";

/**
 * Export failures do NOT mark the document FAILED (the source document is
 * already COMPLETED and usable). We record the failure code on the document
 * and persist a Dead-Letter entry so a specific export format can be retried
 * from the UI without re-running the whole pipeline.
 */
const onExportFailed = async (
  job: Job<ExportRequest>,
  error: Error,
  queueName: string,
): Promise<void> => {
  const data = job.data;
  const { code } = classifyError(error);

  // BullMQ fires `failed` on every attempt. Avoid persisting a (duplicate)
  // DLQ entry / error code until retries are exhausted — the source document
  // stays COMPLETED and usable, and only the final failure is recorded so the
  // UI can offer a per-format retry.
  if (!isFinalAttempt(job)) {
    logger.warn(
      { jobId: data.jobId, documentId: data.documentId, code, attemptsMade: job.attemptsMade },
      `[export] Transient export failure (retry scheduled) for ${data.jobId}: ${code}`,
    );
    return;
  }

  await prisma.document
    .update({ where: { id: data.documentId }, data: { errorCode: code } })
    .catch(() => {});
};

async function main() {
  const config = loadConfig();
  logger.info("[export-worker] Starting...");

  startHealthServer("export-worker", 9091);

  if (process.env.QUEUE_DRIVER === "pg") {
    validateQueueConfig();

    const worker = new PgWorker({
      handlers: buildExportPgHandlers(config),
      concurrency: { [JOB_QUEUES.EXPORT]: JOB_CONCURRENCY[JOB_QUEUES.EXPORT] },
      workerId: EXPORT_WORKER_ID,
      directUrl: process.env.DATABASE_URL_DIRECT,
    });
    await worker.start();

    const shutdown = async () => {
      logger.info("[export-worker] Shutting down (pg)...");
      await worker.shutdown();
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    logger.info("[export-worker] PG worker started. Waiting for jobs...");
    return;
  }

  const shutdown = async () => {
    logger.info("[export-worker] Shutting down...");
    await closeQueueConnections();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  registerExportHandler(onExportFailed);

  logger.info("[export-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[export-worker] Fatal error:");
  process.exit(1);
});
