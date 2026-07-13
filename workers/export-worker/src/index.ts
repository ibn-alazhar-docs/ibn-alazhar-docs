import {
  closeQueueConnections,
  recordJobFailure,
  classifyError,
  isFinalAttempt,
  type ExportRequest,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { loadConfig } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { startHealthServer, logger } from "@ibn-al-azhar-docs/shared";

import { registerExportHandler } from "./export-handler";

const config = loadConfig();

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
  await recordJobFailure(config, queueName, job, error);
};

async function main() {
  logger.info("[export-worker] Starting...");

  startHealthServer("export-worker", 9091);

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
