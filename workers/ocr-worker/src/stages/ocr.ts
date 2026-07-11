import {
  createOcrWorker,
  OcrManager,
  downloadFile,
  fileExists,
  categorizeFailure,
  recordFailedJob,
  uploadBuffer,
  type ProcessingJob,
  type FailedJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { generateSearchablePdf, updateDocStatus } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerOcrStage(config: PipelineConfig): void {
  createOcrWorker(config, async (job: ProcessingJob) => {
    logger.info(`[ocr] Processing job ${job.id}: ${job.fileName}`);

    try {
      await updateDocStatus(job.documentId, "OCR_PROCESSING");

      const manager = new OcrManager(config);

      const firstPageKey = `${config.paths.pages}/${job.id}/page-001.png`;
      let result;

      try {
        const pagesExist = await fileExists(config, firstPageKey);

        if (pagesExist) {
          logger.info(`[ocr] Streaming pre-split pages for ${job.id}`);
          const pageGetters: (() => Promise<Buffer>)[] = [];

          let pageNum = 1;
          let hasMorePages = true;
          while (hasMorePages) {
            const pageKey = `${config.paths.pages}/${job.id}/page-${String(pageNum).padStart(3, "0")}.png`;
            const exists = await fileExists(config, pageKey);
            if (exists) {
              pageGetters.push(() => downloadFile(config, pageKey));
              pageNum++;
            } else {
              hasMorePages = false;
            }
          }

          logger.info(`[ocr] Found ${pageGetters.length} pre-split pages for lazy extraction`);

          result = await manager.extractPages(config, pageGetters, job.fileName);
          const searchablePdfPromise = generateSearchablePdf(job, pageGetters, config, result);
          await searchablePdfPromise;
        } else {
          logger.info(`[ocr] No pre-split pages, extracting from full PDF for ${job.id}`);
          const fileBuffer = await downloadFile(config, job.storageKey);
          result = await manager.extractText(config, fileBuffer, job.fileName, job.mimeType);
        }
      } catch (pageError: unknown) {
        const pageErrorMsg = pageError instanceof Error ? pageError.message : String(pageError);
        logger.warn(
          `[ocr] Page detection failed for ${job.id}: ${pageErrorMsg}. Falling back to full PDF.`,
        );
        const fileBuffer = await downloadFile(config, job.storageKey);
        result = await manager.extractText(config, fileBuffer, job.fileName, job.mimeType);
      }

      const ocrKey = `${config.paths.ocrResults}/${job.id}/text.json`;
      const metadataJson = JSON.stringify({
        jobId: job.id,
        fileName: job.fileName,
        confidence: result.confidence,
        pages: result.pages.length,
        text: result.text,
      });

      await uploadBuffer(config, ocrKey, Buffer.from(metadataJson), "application/json");

      const { enqueueCleaning } = await import("@ibn-al-azhar-docs/pipeline");
      await enqueueCleaning(config, {
        ...job,
        status: "cleaning",
        progress: 50,
      });

      logger.info(
        `[ocr] Completed OCR for ${job.id} (${result.pages.length} pages, confidence: ${result.confidence})`,
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const { category } = categorizeFailure(err instanceof Error ? err : new Error(errorMessage));
      logger.error({ errorMessage, category }, `[ocr] Failed for ${job.id}`);

      await updateDocStatus(job.documentId, "FAILED");

      if (category === "fatal" || category === "permanent") {
        await recordFailedJob(config, {
          jobId: job.id,
          queue: "pipeline:ocr",
          originalData: job,
          error: errorMessage,
          errorCode: "OCR_FAILED",
          failureCategory: category,
          attempts: 1,
          lastAttemptAt: new Date().toISOString(),
          failedAt: new Date().toISOString(),
        } as FailedJob);
      }

      throw err instanceof Error ? err : new Error(errorMessage);
    }
  });
}
