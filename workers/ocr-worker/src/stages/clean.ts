import {
  createCleaningWorker,
  cleanArabicText,
  enhanceArabicText,
  downloadFile,
  uploadBuffer,
  enqueueViaDriver,
  JOB_QUEUES,
  classifyError,
  PermanentPipelineError,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { updateDocStatusWithProgress } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Pure stage logic: cleans the OCR text and enqueues generation. Shared by the
 * BullMQ worker (redis driver) and the PgWorker (pg driver) via the same
 * `enqueueViaDriver` entry point.
 */
export async function processCleaningStage(
  data: ProcessingJob,
  config: PipelineConfig,
): Promise<void> {
  const jobLogger = logger.child({
    jobId: data.id,
    documentId: data.documentId,
    stage: "clean",
  });
  jobLogger.info(`[clean] Processing job ${data.id}`);

  await updateDocStatusWithProgress(data.documentId, "CLEANING");

  const ocrKey = `${config.paths.ocrResults}/${data.id}/text.json`;
  const ocrBuffer = await downloadFile(config, ocrKey);
  const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
  const rawText: string = ocrData.text;
  const ocrConfidence: number = ocrData.confidence || 0.5;

  const baseCleaned = cleanArabicText(rawText, { confidence: ocrConfidence });
  const cleaned = await enhanceArabicText(baseCleaned);

  const cleanedKey = `${config.paths.ocrResults}/${data.id}/cleaned.json`;
  await uploadBuffer(
    config,
    cleanedKey,
    Buffer.from(JSON.stringify({ text: cleaned, confidence: ocrConfidence })),
    "application/json",
  );

  await enqueueViaDriver(JOB_QUEUES.GENERATION, config, {
    ...data,
    status: "generating",
    progress: 80,
  });
  jobLogger.info(`[clean] Completed cleanup for ${data.id}`);
}

export function registerCleaningStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createCleaningWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      try {
        await processCleaningStage(job.data, config);
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
