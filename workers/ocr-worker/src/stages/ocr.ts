import {
  createOcrWorker,
  OcrManager,
  downloadFile,
  fileExists,
  categorizeFailure,
  uploadBuffer,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { generateSearchablePdf, updateDocStatus } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerOcrStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error) => Promise<void>,
): void {
  createOcrWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      const data = job.data;
      const jobLogger = logger.child({ jobId: data.id, documentId: data.documentId, stage: "ocr" });
      jobLogger.info(`[ocr] Processing job ${data.id}: ${data.fileName}`);

      try {
        await updateDocStatus(data.documentId, "OCR_PROCESSING");

        const manager = new OcrManager(config);
        const firstPageKey = `${config.paths.pages}/${data.id}/page-001.png`;
        let result;

        try {
          const pagesExist = await fileExists(config, firstPageKey);

          if (pagesExist) {
            jobLogger.info(`[ocr] Streaming pre-split pages for ${data.id}`);
            const pageGetters: (() => Promise<Buffer>)[] = [];
            let pageNum = 1;
            let hasMorePages = true;
            while (hasMorePages) {
              const pageKey = `${config.paths.pages}/${data.id}/page-${String(pageNum).padStart(3, "0")}.png`;
              const exists = await fileExists(config, pageKey);
              if (exists) {
                pageGetters.push(() => downloadFile(config, pageKey));
                pageNum++;
              } else {
                hasMorePages = false;
              }
            }
            jobLogger.info(`[ocr] Found ${pageGetters.length} pre-split pages for lazy extraction`);
            result = await manager.extractPages(config, pageGetters, data.fileName);
            await generateSearchablePdf(data, pageGetters, config, result);
          } else {
            jobLogger.info(`[ocr] No pre-split pages, extracting from full PDF for ${data.id}`);
            const fileBuffer = await downloadFile(config, data.storageKey);
            result = await manager.extractText(config, fileBuffer, data.fileName, data.mimeType);
          }
        } catch (pageError: unknown) {
          const pageErrorMsg = pageError instanceof Error ? pageError.message : String(pageError);
          jobLogger.warn(
            `[ocr] Page detection failed for ${data.id}: ${pageErrorMsg}. Falling back to full PDF.`,
          );
          const fileBuffer = await downloadFile(config, data.storageKey);
          result = await manager.extractText(config, fileBuffer, data.fileName, data.mimeType);
        }

        const { minConfidence } = config.ocr;
        if (typeof result.confidence === "number" && result.confidence < minConfidence) {
          jobLogger.warn(
            { confidence: result.confidence, minConfidence },
            `[ocr] Low-confidence OCR result for ${data.id} (code: OCR_LOW_CONFIDENCE) — proceeding with degradation`,
          );
        }

        const ocrKey = `${config.paths.ocrResults}/${data.id}/text.json`;
        const metadataJson = JSON.stringify({
          jobId: data.id,
          fileName: data.fileName,
          confidence: result.confidence,
          pages: result.pages.length,
          text: result.text,
        });
        await uploadBuffer(config, ocrKey, Buffer.from(metadataJson), "application/json");

        const { enqueueCleaning } = await import("@ibn-al-azhar-docs/pipeline");
        await enqueueCleaning(config, { ...data, status: "cleaning", progress: 50 });

        jobLogger.info(
          `[ocr] Completed OCR for ${data.id} (${result.pages.length} pages, confidence: ${result.confidence})`,
        );
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = categorizeFailure(error);
        jobLogger.error({ error: error.message, category }, `[ocr] Failed for ${data.id}`);

        // Transient (network/storage/redis) errors are retried by BullMQ and the
        // doc stays in OCR_PROCESSING; the centralized `failed` listener marks
        // FAILED only after exhaustion. Permanent/fatal engine failures skip
        // retries via discard().
        if (category !== "transient") {
          await job.discard().catch(() => {});
        }
        throw error;
      }
    },
    onFailed,
  );
}
