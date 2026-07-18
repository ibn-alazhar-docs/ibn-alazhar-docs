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
        sendAlert({
          severity: "warning",
          code: "RETRY_EXHAUSTED",
          message: `[sweeper] Recovered ${stuck.length} document(s) stuck in processing`,
          context: {
            ids: stuck.map((d) => d.id),
            stages: stuck.map((d) => d.status),
          },
        });
      }
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, "[sweeper] Failed");
    }
  };
  sweepStuckDocuments().catch(() => {});
  setInterval(sweepStuckDocuments, 5 * 60 * 1000);

  // Recovery sweeper for uploads that succeeded storage+DB but FAILED at the
  // Redis enqueue step (UPLOAD_ENQUEUE_FAILED). These documents were never
  // actually processed, so they are safe to re-enqueue automatically rather than
  // leaving the user to manually retry. This backs the honest "retry from the
  // file list" promise with a real background mechanism.
  const sweepFailedUploads = async () => {
    try {
      const cutoff = new Date(Date.now() - 60 * 1000);
      const failed = await prisma.document.findMany({
        where: {
          status: "FAILED",
          errorCode: "UPLOAD_ENQUEUE_FAILED",
          updatedAt: { gt: cutoff },
          deletedAt: null,
        },
        select: { id: true, fileName: true, fileSize: true, mimeType: true, storageKey: true, userId: true },
      });
      for (const doc of failed) {
        const job = {
          id: doc.id,
          documentId: doc.id,
          userId: doc.userId,
          fileName: doc.fileName,
          fileSize: Number(doc.fileSize),
          mimeType: doc.mimeType,
          storageKey: doc.storageKey ?? "",
          status: "pending" as const,
          progress: 0,
          createdAt: new Date().toISOString(),
        };
        try {
          await enqueueValidation(config, job);
          await prisma.document
            .update({
              where: { id: doc.id },
              data: { status: "UPLOADED", errorCode: null, errorMessage: null },
            })
            .catch(() => {});
          logger.info({ documentId: doc.id }, "[sweeper] Re-enqueued failed upload");
        } catch {
          // Redis still down — leave FAILED for the next sweep interval.
        }
      }
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "[sweeper] Failed-upload re-enqueue failed",
      );
    }
  };
  sweepFailedUploads().catch(() => {});
  setInterval(sweepFailedUploads, 60 * 1000);

  logger.info("[ocr-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[ocr-worker] Fatal error:");
  process.exit(1);
});
