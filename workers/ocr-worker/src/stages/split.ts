import { readFile, rm } from "node:fs/promises";

import {
  createSplittingWorker,
  enqueueViaDriver,
  JOB_QUEUES,
  splitPdfPages,
  uploadBuffer,
  validatePdf,
  classifyError,
  PermanentPipelineError,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { downloadDocumentBuffer, updateDocStatusWithProgress, parsePageRange } from "../helpers";
import { classifyDocument, extractNativePdfText } from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Pure stage logic: splits the document into pages and enqueues OCR. Shared by
 * the BullMQ worker (redis driver) and the PgWorker (pg driver) via the same
 * `enqueueViaDriver` entry point.
 */
export async function processSplittingStage(
  data: ProcessingJob,
  config: PipelineConfig,
): Promise<void> {
  const jobLogger = logger.child({
    jobId: data.id,
    documentId: data.documentId,
    stage: "split",
  });
  jobLogger.info(`[split] Processing job ${data.id}: ${data.fileName}`);

  await updateDocStatusWithProgress(data.documentId, "SPLITTING");

  const fileBuffer = await downloadDocumentBuffer(data.storageKey, data.userId, config);
  const validation = validatePdf(fileBuffer, data.mimeType, data.fileSize);
  if (!validation.valid) {
    const code = (validation.errorCode as string) || "PDF_CORRUPT";
    jobLogger.warn({ code }, `[split] Invalid file for ${data.id}`);
    throw new PermanentPipelineError(`${code}: ${validation.error}`, code);
  }

  let storedPagesCount = 0;
  let nativeText: string | undefined;
  let skipOcr = false;

  if (data.mimeType === "application/pdf") {
    // Try native text extraction fast path first
    const classification = await classifyDocument(fileBuffer, data.mimeType, data.fileName);
    jobLogger.info(
      { type: classification.type, hasEmbeddedText: classification.hasEmbeddedText },
      `[split] Document classified for ${data.id}`,
    );

    if (classification.type === "pdf-text" && classification.hasEmbeddedText) {
      try {
        const nativeResult = await extractNativePdfText(fileBuffer);
        nativeText = nativeResult.text;
        skipOcr = true;
        jobLogger.info(
          { pages: nativeResult.pageCount },
          `[split] Extracted native text for ${data.id} (skipping OCR)`,
        );
        storedPagesCount = nativeResult.pageCount;
        await updateDocStatusWithProgress(data.documentId, "SPLITTING", {
          pageCount: storedPagesCount,
        });
      } catch (nativeErr) {
        jobLogger.warn(
          nativeErr,
          `[split] Native text extraction failed for ${data.id}, falling back to OCR`,
        );
        skipOcr = false;
        nativeText = undefined;
      }
    }

    if (!skipOcr) {
      const splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi, config.ocr.preprocess);
      jobLogger.info(`[split] Split into ${splitResult.pageCount} pages for ${data.id}`);

      let selectedPaths = splitResult.pagePaths;
      if (data.pageRange) {
        const selectedPages = parsePageRange(data.pageRange, splitResult.pageCount);
        if (selectedPages.length > 0) {
          selectedPaths = selectedPages
            .map((pNum) => splitResult.pagePaths[pNum - 1]!)
            .filter(Boolean);
          jobLogger.info(
            `[split] Filtered pages using range "${data.pageRange}" (selected ${selectedPaths.length}/${splitResult.pageCount} pages)`,
          );
        }
      }

      storedPagesCount = selectedPaths.length;
      await updateDocStatusWithProgress(data.documentId, "SPLITTING", {
        pageCount: storedPagesCount,
      });

      const CONCURRENCY = 5;
      try {
        for (let i = 0; i < selectedPaths.length; i += CONCURRENCY) {
          const batch = selectedPaths.slice(i, i + CONCURRENCY);
          await Promise.all(
            batch.map(async (pagePath, batchIdx) => {
              const pageNum = i + batchIdx + 1;
              const pageKey = `${config.paths.pages}/${data.id}/page-${String(pageNum).padStart(3, "0")}.png`;
              const imgBuf = await readFile(pagePath);
              await uploadBuffer(config, pageKey, imgBuf, "image/png");
            }),
          );
        }
        jobLogger.info(`[split] Stored ${storedPagesCount} page images for ${data.id}`);
      } finally {
        await rm(splitResult.tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  } else {
    storedPagesCount = 1;
    jobLogger.info(`[split] Input is an image, skipping split for ${data.id}`);
    await updateDocStatusWithProgress(data.documentId, "SPLITTING", { pageCount: 1 });
    const pageKey = `${config.paths.pages}/${data.id}/page-001.png`;
    await uploadBuffer(config, pageKey, fileBuffer, "image/png");
    jobLogger.info(`[split] Stored 1 page image for ${data.id}`);
  }

  await enqueueViaDriver(JOB_QUEUES.OCR, config, {
    ...data,
    status: "ocr",
    progress: 0,
    nativeText,
    skipOcr,
  } as ProcessingJob);
  jobLogger.info(`[split] Enqueued OCR for ${data.id}`);
}

export function registerSplittingStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createSplittingWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      try {
        await processSplittingStage(job.data, config);
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
