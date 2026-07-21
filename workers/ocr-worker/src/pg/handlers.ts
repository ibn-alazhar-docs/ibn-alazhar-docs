import {
  JOB_QUEUES,
  recordJobFailure,
  classifyError,
  PermanentPipelineError,
  type PipelineConfig,
  type ClaimedJob,
  type ProcessingJob,
  type JobLike,
} from "@ibn-al-azhar-docs/pipeline";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

import { updateDocStatus } from "../helpers";
import { processValidationStage } from "../stages/validate";
import { processSplittingStage } from "../stages/split";
import { processOcrStage } from "../stages/ocr";
import { processCleaningStage } from "../stages/clean";
import { processGenerationStage } from "../stages/generate";

const logger = baseLogger.child({ module: "pg-handler" });

/** Stable worker identity for the PG-driven OCR worker. */
export const OCR_WORKER_ID = `pg-ocr-worker-${process.pid}`;

type StageFn = (job: ProcessingJob, config: PipelineConfig) => Promise<void>;

// Captured at build time so the wrappers stay driver-agnostic.
let PG_CONFIG: PipelineConfig;

/**
 * Wraps a pure stage handler so it can run under `PgWorker`. On failure it
 * decides whether to retry (via `PgWorker.dispatch`'s own `driver.fail`), and
 * performs the document-level bookkeeping (mark FAILED + record DLQ) that the
 * redis path delegates to BullMQ's `failed` listener. We DO NOT call
 * `driver.fail` here — `PgWorker` handles that when we rethrow.
 */
const make =
  (queue: string, fn: StageFn) =>
  async (cj: ClaimedJob): Promise<void> => {
    const payload = cj.payload as ProcessingJob;
    const jobLogger = logger.child({
      jobId: cj.idempotencyKey,
      documentId: payload.documentId,
      queue,
      attempt: cj.attempts,
      maxAttempts: cj.maxAttempts,
    });

    try {
      await fn(payload, PG_CONFIG);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const willRetry =
        error instanceof PermanentPipelineError
          ? false
          : (error as { willRetry?: boolean }).willRetry !== false;

      const isLastAttempt = cj.attempts >= cj.maxAttempts;
      const jobLike: JobLike = {
        id: cj.idempotencyKey,
        attemptsMade: cj.attempts,
        opts: { attempts: cj.maxAttempts },
        data: cj.payload,
      };

      jobLogger.error(
        {
          error: error.message,
          stack: error.stack,
          willRetry,
          isLastAttempt,
        },
        `[pg-handler] Stage failed for ${queue}`,
      );

      if (!willRetry || isLastAttempt) {
        const { code } = classifyError(error);
        await updateDocStatus(payload.documentId, "FAILED", { errorCode: code });
        // In PG mode PgWorker.dispatch already calls driver.fail() which marks
        // the job as dead — skip recordJobFailure to avoid a redundant Redis
        // DLQ write. The Redis call fails with Upstash rate-limit errors
        // and spams logs. We only need recordJobFailure for alerting on
        // permanent failures, which we do directly here.
        if (process.env.QUEUE_DRIVER !== "pg") {
          await recordJobFailure(PG_CONFIG, queue, jobLike, error);
        }
      }

      throw error;
    }
  };

/**
 * Builds the PG-mode handler map for all five OCR pipeline stages. Must be
 * called with the loaded config; the returned closures capture it.
 */
export function buildOcrPgHandlers(
  config: PipelineConfig,
): Partial<Record<string, (job: ClaimedJob) => Promise<void>>> {
  PG_CONFIG = config;
  return {
    [JOB_QUEUES.VALIDATION]: make(JOB_QUEUES.VALIDATION, processValidationStage),
    [JOB_QUEUES.SPLITTING]: make(JOB_QUEUES.SPLITTING, processSplittingStage),
    [JOB_QUEUES.OCR]: make(JOB_QUEUES.OCR, processOcrStage),
    [JOB_QUEUES.CLEANING]: make(JOB_QUEUES.CLEANING, processCleaningStage),
    [JOB_QUEUES.GENERATION]: make(JOB_QUEUES.GENERATION, processGenerationStage),
  };
}
