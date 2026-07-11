import { readFile, rm } from "node:fs/promises";

import {
  createSplittingWorker,
  splitPdfPages,
  enqueueOcr,
  uploadBuffer,
  validatePdf,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { downloadDocumentBuffer, updateDocStatus, parsePageRange } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerSplittingStage(config: PipelineConfig): void {
  createSplittingWorker(config, async (job: ProcessingJob) => {
    logger.info(`[split] Processing job ${job.id}: ${job.fileName}`);

    try {
      await updateDocStatus(job.documentId, "SPLITTING");

      const fileBuffer = await downloadDocumentBuffer(job.storageKey, job.userId, config);

      const validation = validatePdf(fileBuffer, job.mimeType, job.fileSize);
      if (!validation.valid) {
        await updateDocStatus(job.documentId, "FAILED");
        throw new Error(`${validation.errorCode}: ${validation.error}`);
      }

      let storedPagesCount = 0;

      if (job.mimeType === "application/pdf") {
        const splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi, config.ocr.preprocess);
        logger.info(`[split] Split into ${splitResult.pageCount} pages for ${job.id}`);

        try {
          let selectedPaths = splitResult.pagePaths;
          if (job.pageRange) {
            const selectedPages = parsePageRange(job.pageRange, splitResult.pageCount);
            if (selectedPages.length > 0) {
              selectedPaths = selectedPages
                .map((pNum) => splitResult.pagePaths[pNum - 1]!)
                .filter(Boolean);
              logger.info(
                `[split] Filtered pages using range "${job.pageRange}" (selected ${selectedPaths.length}/${splitResult.pageCount} pages)`,
              );
            }
          }

          storedPagesCount = selectedPaths.length;
          await updateDocStatus(job.documentId, "SPLITTING", { pageCount: storedPagesCount });

          const CONCURRENCY = 5;
          for (let i = 0; i < selectedPaths.length; i += CONCURRENCY) {
            const batch = selectedPaths.slice(i, i + CONCURRENCY);
            await Promise.all(
              batch.map(async (pagePath, batchIdx) => {
                const pageNum = i + batchIdx + 1;
                const pageKey = `${config.paths.pages}/${job.id}/page-${String(pageNum).padStart(3, "0")}.png`;
                const imgBuf = await readFile(pagePath);
                await uploadBuffer(config, pageKey, imgBuf, "image/png");
              }),
            );
          }

          logger.info(`[split] Stored ${storedPagesCount} page images for ${job.id}`);
        } finally {
          await rm(splitResult.tempDir, { recursive: true, force: true }).catch(() => {});
        }
      } else {
        storedPagesCount = 1;
        logger.info(`[split] Input is an image, skipping split for ${job.id}`);
        await updateDocStatus(job.documentId, "SPLITTING", { pageCount: 1 });
        const pageKey = `${config.paths.pages}/${job.id}/page-001.png`;
        await uploadBuffer(config, pageKey, fileBuffer, "image/png");
        logger.info(`[split] Stored 1 page image for ${job.id}`);
      }

      await enqueueOcr(config, {
        ...job,
        status: "ocr",
        progress: 0,
      });

      logger.info(`[split] Enqueued OCR for ${job.id}`);
    } catch (err) {
      await updateDocStatus(job.documentId, "FAILED");
      throw err;
    }
  });
}
