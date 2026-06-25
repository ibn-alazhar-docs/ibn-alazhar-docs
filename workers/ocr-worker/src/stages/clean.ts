import {
  createCleaningWorker,
  cleanArabicText,
  downloadFile,
  uploadBuffer,
  enqueueGeneration,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { updateDocStatus } from "../helpers";
import { logger } from "../../../shared/logger";

export function registerCleaningStage(config: PipelineConfig): void {
  createCleaningWorker(config, async (job: ProcessingJob) => {
    logger.info(`[clean] Processing job ${job.id}`);

    try {
      await updateDocStatus(job.documentId, "CLEANING");

      const ocrKey = `${config.paths.ocrResults}/${job.id}/text.json`;
      const ocrBuffer = await downloadFile(config, ocrKey);
      const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
      const rawText: string = ocrData.text;

      const cleaned = cleanArabicText(rawText);

      const cleanedKey = `${config.paths.ocrResults}/${job.id}/cleaned.json`;
      await uploadBuffer(
        config,
        cleanedKey,
        Buffer.from(JSON.stringify({ text: cleaned })),
        "application/json",
      );

      await enqueueGeneration(config, {
        ...job,
        status: "generating",
        progress: 80,
      });

      logger.info(`[clean] Completed cleanup for ${job.id}`);
    } catch (err) {
      await updateDocStatus(job.documentId, "FAILED");
      throw err;
    }
  });
}
