import { prisma } from "@ibn-al-azhar-docs/database";
import {
  classifyError,
  recordJobFailure,
  type PipelineConfig,
  type ClaimedJob,
  type JobLike,
} from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Shared PG handler wrapper for both OCR and Export workers.
 * Captures the common retry/classification/document-status/DLQ logic
 * so neither worker reimplements it.
 */

export interface PgHandlerOptions {
  config: PipelineConfig;
  queueName: string;
  logger: typeof logger;
}

export function createPgHandlerWrapper({ config, queueName, logger }: PgHandlerOptions) {
  return async (cj: ClaimedJob, stageFn: (payload: unknown, cfg: PipelineConfig) => Promise<void>) => {
    const payload = cj.payload;
    const jobLogger = logger.child({
      jobId: cj.idempotencyKey,
      documentId: (payload as { documentId?: string }).documentId ?? cj.idempotencyKey,
      queue: queueName,
      attempt: cj.attempts,
      maxAttempts: cj.maxAttempts,
    });

    try {
      await stageFn(payload, config);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const willRetry =
        error instanceof Error && "willRetry" in error
          ? (error as { willRetry?: boolean }).willRetry !== false
          : true;

      const isLastAttempt = cj.attempts >= cj.maxAttempts;
      const jobLike: JobLike = {
        id: cj.idempotencyKey,
        attemptsMade: cj.attempts,
        opts: { attempts: cj.maxAttempts },
        data: payload,
      };

      jobLogger.error(
        {
          error: error.message,
          stack: error.stack,
          willRetry,
          isLastAttempt,
        },
        `[pg-handler] Stage failed for ${queueName}`,
      );

      if (!willRetry || isLastAttempt) {
        const { code } = classifyError(error);
        const documentId = (payload as { documentId?: string }).documentId;
        if (documentId) {
          await prisma.document
            .update({
              where: { id: documentId },
              data: { errorCode: code },
            })
            .catch(() => {});
        }
        if (process.env.QUEUE_DRIVER !== "pg") {
          await recordJobFailure(config, queueName, jobLike, error);
        }
      }

      throw error;
    }
  };
}
