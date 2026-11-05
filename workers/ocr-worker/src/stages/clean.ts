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
  runQaOnResult,
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
  const qaFromOcr = ocrData.qa ?? null;

  const baseCleaned = cleanArabicText(rawText, { confidence: ocrConfidence });
  const cleaned = await enhanceArabicText(baseCleaned);

  // توثيق QA بعد التنظيف — لا يُعيد OCR هنا (الإعادة كانت في مرحلة ocr)،
  // فقط: تقرير qa.json مُحدَّث + needsReview عند فشل صارخ دون إسقاط المهمة.
  let qaPostClean: import("@ibn-al-azhar-docs/pipeline").QaReport | null = qaFromOcr;
  try {
    const fakeResult = {
      text: cleaned,
      pages: [{ number: 1, text: cleaned, confidence: ocrConfidence }],
      confidence: ocrConfidence,
      engine: "gemini" as const,
    };
    qaPostClean = runQaOnResult(fakeResult, ocrData.pages || 1);
    await uploadBuffer(
      config,
      `${config.paths.ocrResults}/${data.id}/qa.json`,
      Buffer.from(JSON.stringify(qaPostClean), "utf-8"),
      "application/json",
    ).catch(() => {});
    if (!qaPostClean.pass) {
      jobLogger.warn(
        {
          exitCode: qaPostClean.exitCode,
          checks: qaPostClean.checks.filter((c) => !c.ok && !c.warn).map((c) => c.name),
        },
        `[clean] QA-after-clean failed for ${data.id} — proceeding degraded`,
      );
      await updateDocStatusWithProgress(data.documentId, "CLEANING", {
        needsReview: true,
      }).catch(() => {});
    }
  } catch {
    // QA غير حرج: أي خطأ هنا لا يُسقط التنظيف.
  }

  const cleanedKey = `${config.paths.ocrResults}/${data.id}/cleaned.json`;
  await uploadBuffer(
    config,
    cleanedKey,
    Buffer.from(JSON.stringify({ text: cleaned, confidence: ocrConfidence, qa: qaPostClean })),
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
