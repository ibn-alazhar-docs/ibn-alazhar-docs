import {
  loadConfig,
  setupDlq,
  closeQueueConnections,
  recordJobFailure,
  classifyError,
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
 * Centralized failure sink for every pipeline stage. BullMQ invokes this ONLY
 * after all configured retries are exhausted (or the job was `discard()`-ed for
 * a permanent error). It marks the document FAILED with a classified error
 * code and persists the Dead-Letter entry exactly once — never per-attempt.
 */
const onPipelineFailed = async (
  job: Job<ProcessingJob>,
  error: Error,
  queueName: string,
): Promise<void> => {
  const data = job.data;
  const { code } = classifyError(error);
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

  logger.info("[ocr-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[ocr-worker] Fatal error:");
  process.exit(1);
});
