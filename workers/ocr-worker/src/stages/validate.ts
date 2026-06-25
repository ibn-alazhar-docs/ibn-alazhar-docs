import {
  createValidationWorker,
  enqueueSplitting,
  validatePdf,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { downloadDocumentBuffer, updateDocStatus } from "../helpers";
import { logger } from "../../../shared/logger";

export function registerValidationStage(config: PipelineConfig): void {
  createValidationWorker(config, async (job: ProcessingJob) => {
    logger.info(`[validate] Processing job ${job.id}: ${job.fileName}`);

    try {
      await updateDocStatus(job.documentId, "VALIDATING");

      const fileBuffer = await downloadDocumentBuffer(job.storageKey, job.userId, config);

      const validation = validatePdf(fileBuffer, job.mimeType, job.fileSize);
      if (!validation.valid) {
        await updateDocStatus(job.documentId, "FAILED");
        throw new Error(`${validation.errorCode}: ${validation.error}`);
      }

      await enqueueSplitting(config, {
        ...job,
        status: "splitting",
        progress: 10,
      });

      logger.info(`[validate] Enqueued splitting for ${job.id}`);
    } catch (err) {
      await updateDocStatus(job.documentId, "FAILED");
      throw err;
    }
  });
}
