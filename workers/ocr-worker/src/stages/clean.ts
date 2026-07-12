import {
  createCleaningWorker,
  cleanArabicText,
  enhanceArabicText,
  downloadFile,
  uploadBuffer,
  enqueueGeneration,
  classifyError,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { updateDocStatus } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerCleaningStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createCleaningWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      const data = job.data;
      const jobLogger = logger.child({
        jobId: data.id,
        documentId: data.documentId,
        stage: "clean",
      });
      jobLogger.info(`[clean] Processing job ${data.id}`);

      try {
        await updateDocStatus(data.documentId, "CLEANING");

        const ocrKey = `${config.paths.ocrResults}/${data.id}/text.json`;
        const ocrBuffer = await downloadFile(config, ocrKey);
        const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
        const rawText: string = ocrData.text;

        const baseCleaned = cleanArabicText(rawText);
        const cleaned = await enhanceArabicText(baseCleaned);

        const cleanedKey = `${config.paths.ocrResults}/${data.id}/cleaned.json`;
        await uploadBuffer(
          config,
          cleanedKey,
          Buffer.from(JSON.stringify({ text: cleaned })),
          "application/json",
        );

        await enqueueGeneration(config, { ...data, status: "generating", progress: 80 });
        jobLogger.info(`[clean] Completed cleanup for ${data.id}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = classifyError(error);
        jobLogger.error({ error: error.message, category }, `[clean] Failed for ${data.id}`);
        if (category !== "transient") {
          await job.discard().catch(() => {});
        }
        throw error;
      }
    },
    onFailed,
  );
}
