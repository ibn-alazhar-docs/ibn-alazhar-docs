import {
  createValidationWorker,
  enqueueSplitting,
  validatePdf,
  classifyError,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { downloadDocumentBuffer, updateDocStatus } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerValidationStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createValidationWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      const data = job.data;
      const jobLogger = logger.child({
        jobId: data.id,
        documentId: data.documentId,
        stage: "validate",
      });
      jobLogger.info(`[validate] Processing job ${data.id}: ${data.fileName}`);

      try {
        await updateDocStatus(data.documentId, "VALIDATING");

        const fileBuffer = await downloadDocumentBuffer(data.storageKey, data.userId, config);
        const validation = validatePdf(fileBuffer, data.mimeType, data.fileSize);

        if (!validation.valid) {
          // Permanent, user/infra-caused failure — never worth retrying.
          const code = (validation.errorCode as string) || "PDF_CORRUPT";
          jobLogger.warn({ code }, `[validate] Invalid file for ${data.id}`);
          throw new Error(`${code}: ${validation.error}`);
        }

        await enqueueSplitting(config, { ...data, status: "splitting", progress: 10 });
        jobLogger.info(`[validate] Enqueued splitting for ${data.id}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = classifyError(error);
        jobLogger.error({ error: error.message, category }, `[validate] Failed for ${data.id}`);
        // Transient errors are retried by BullMQ and the doc stays VALIDATING;
        // the centralized `failed` listener marks FAILED only after exhaustion.
        // Permanent/fatal errors skip the retry cycle via discard().
        if (category !== "transient") {
          job.discard();
        }
        throw error;
      }
    },
    onFailed,
  );
}
