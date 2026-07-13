import {
  loadConfig,
  setupDlq,
  closeQueueConnections,
  recordJobFailure,
  classifyError,
  isFinalAttempt,
  type ProcessingJob,
  type FailedJob,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { startHealthServer, logger } from "@ibn-al-azhar-docs/shared";

import { registerValidationStage } from "./stages/validate";
import { registerSplittingStage } from "./stages/split";
import { registerOcrStage } from "./stages/ocr";
import { registerCleaningStage } from "./stages/clean";
import { registerGenerationStage } from "./stages/generate";
import { updateDocStatus } from "./helpers";

const config = loadConfig();

/**
 * Centralized failure sink for every pipeline stage. BullMQ invokes this on
 * EVERY failed attempt, so we guard on `isFinalAttempt`: while retries remain
 * (transient infra blips) we only log — the document keeps its in-flight stage
 * so the next attempt resumes cleanly. Only after the last attempt (or a
 * permanent `discard()`) do we mark the document FAILED and write exactly ONE
 * Dead-Letter entry.
 */
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

async function main() {
  logger.info("[ocr-worker] Starting...");

  startHealthServer("ocr-worker", 9090);

  await setupDlq(config, async (failed: FailedJob) => {
    logger.error(
      { error: failed.error, code: failed.errorCode },
      `[dlq] Job ${failed.jobId} failed permanently`,
    );
  });

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

  // Recovery sweeper: documents left in a processing stage (e.g. worker crash
  // between jobs, or a BullMQ job lost on a dead node) would otherwise stay
  // "in progress" forever with no active job. Periodically mark them FAILED
  // (recoverable) so the user can retry from the UI / admin DLQ endpoint.
  const PROCESSING_STAGES = [
    "VALIDATING",
    "SPLITTING",
    "OCR_PROCESSING",
    "CLEANING",
    "GENERATING",
  ] as const;
  const sweepStuckDocuments = async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const stuck = await prisma.document.findMany({
        where: {
          status: { in: [...PROCESSING_STAGES] },
          updatedAt: { lt: cutoff },
          deletedAt: null,
        },
        select: { id: true, status: true },
      });
      for (const doc of stuck) {
        await prisma.document
          .update({
            where: { id: doc.id },
            data: {
              status: "FAILED",
              errorCode: "RETRY_EXHAUSTED",
              errorMessage: "Recovered by stuck-job sweeper",
            },
          })
          .catch(() => {});
        logger.warn(
          { documentId: doc.id, stage: doc.status },
          `[sweeper] Recovered document stuck in ${doc.status}`,
        );
      }
      if (stuck.length > 0) {
        logger.info(`[sweeper] Recovered ${stuck.length} stuck document(s)`);
      }
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, "[sweeper] Failed");
    }
  };
  sweepStuckDocuments().catch(() => {});
  setInterval(sweepStuckDocuments, 5 * 60 * 1000);

  logger.info("[ocr-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[ocr-worker] Fatal error:");
  process.exit(1);
});
