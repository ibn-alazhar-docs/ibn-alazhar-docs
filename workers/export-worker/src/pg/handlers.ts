import {
  JOB_QUEUES,
  recordJobFailure,
  classifyError,
  PermanentPipelineError,
  type PipelineConfig,
  type ClaimedJob,
  type ExportRequest,
  type JobLike,
} from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";

import { processExportStage } from "../export-handler";

/** Stable worker identity for the PG-driven export worker. */
export const EXPORT_WORKER_ID = `pg-export-worker-${process.pid}`;

// Captured at build time so the wrapper stays driver-agnostic.
let PG_CONFIG: PipelineConfig;

/**
 * Wraps the pure export handler so it can run under `PgWorker`. On final/permanent
 * failure it records the failure code on the (already COMPLETED) source document
 * and persists a DLQ entry — mirroring the redis `failed` listener. We DO NOT
 * call `driver.fail` here; `PgWorker.dispatch` handles that when we rethrow.
 */
const make = async (cj: ClaimedJob): Promise<void> => {
  try {
    await processExportStage(cj.payload as ExportRequest, PG_CONFIG);
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

    if (!willRetry || isLastAttempt) {
      const { code } = classifyError(error);
      const payload = cj.payload as ExportRequest;
      await prisma.document
        .update({ where: { id: payload.documentId }, data: { errorCode: code } })
        .catch(() => {});
      if (process.env.QUEUE_DRIVER !== "pg") {
        await recordJobFailure(PG_CONFIG, JOB_QUEUES.EXPORT, jobLike, error);
      }
    }

    throw error;
  }
};

/**
 * Builds the PG-mode handler map for the export queue. Must be called with the
 * loaded config; the returned closure captures it.
 */
export function buildExportPgHandlers(
  config: PipelineConfig,
): Partial<Record<string, (job: ClaimedJob) => Promise<void>>> {
  PG_CONFIG = config;
  return {
    [JOB_QUEUES.EXPORT]: make,
  };
}
