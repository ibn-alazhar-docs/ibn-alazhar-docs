import {
  createValidationWorker,
  enqueueViaDriver,
  JOB_QUEUES,
  validatePdf,
  classifyError,
  PermanentPipelineError,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { downloadDocumentBuffer, updateDocStatusWithProgress } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Pure stage logic: performs validation and enqueues the next stage. Shared by
 * the BullMQ worker (redis driver) and the PgWorker (pg driver) via the same
 * `enqueueViaDriver` entry point, so driver routing stays in one place.
 */
export async function processValidationStage(
  data: ProcessingJob,
  config: PipelineConfig,
): Promise<void> {
  const jobLogger = logger.child({
    jobId: data.id,
    documentId: data.documentId,
    stage: "validate",
  });
  jobLogger.info(`[validate] Processing job ${data.id}: ${data.fileName}`);

  await updateDocStatusWithProgress(data.documentId, "VALIDATING");

  const fileBuffer = await downloadDocumentBuffer(data.storageKey, data.userId, config);
  const validation = validatePdf(fileBuffer, data.mimeType, data.fileSize);

  if (!validation.valid) {
    const code = (validation.errorCode as string) || "PDF_CORRUPT";
    jobLogger.warn({ code }, `[validate] Invalid file for ${data.id}`);
    throw new PermanentPipelineError(`${code}: ${validation.error}`, code);
  }

  await enqueueViaDriver(JOB_QUEUES.SPLITTING, config, {
    ...data,
    status: "splitting",
    progress: 10,
  });
  jobLogger.info(`[validate] Enqueued splitting for ${data.id}`);
}

export function registerValidationStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createValidationWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      try {
        await processValidationStage(job.data, config);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = classifyError(error);
        if (error instanceof PermanentPipelineError || category !== "transient") {
          job.discard();
        }
        throw error;
      }
    },
    onFailed,
  );
}
