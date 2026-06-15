import {
  loadConfig,
  createValidationWorker,
  createSplittingWorker,
  createOcrWorker,
  createCleaningWorker,
  createGenerationWorker,
  enqueueSplitting,
  enqueueOcr,
  enqueueCleaning,
  enqueueGeneration,
  downloadFile,
  uploadBuffer,
  splitPdfPages,
  OcrManager,
  cleanArabicText,
  generateMarkdown,
  generateTxt,
  generateJson,
  validatePdf,
  setupDlq,
  recordFailedJob,
  categorizeFailure,
  closeQueueConnections,
  fileExists,
  type ProcessingJob,
  type FailedJob,
} from "@ibn-al-azhar-docs/pipeline";
import { PrismaClient } from "@prisma/client";
import { startHealthServer } from "../../shared/health-server";
import { logger } from "../../shared/logger";

const config = loadConfig();
const prisma = new PrismaClient();

async function updateDocStatus(
  documentId: string,
  status: string,
  extra?: Record<string, unknown>,
) {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: status as never, ...extra },
    });
  } catch (err) {
    logger.warn(err, `[doc-status] Failed to update document ${documentId}:`);
  }
}

async function main() {
  logger.info("[ocr-worker] Starting...");

  // Start health check server
  startHealthServer("ocr-worker", 9090);

  // Setup dead letter queue handler
  await setupDlq(config, async (failed: FailedJob) => {
    logger.error({ error: failed.error }, `[dlq] Job ${failed.jobId} failed permanently`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("[ocr-worker] Shutting down...");
    await closeQueueConnections();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Stage 0: Validate uploaded file
  createValidationWorker(config, async (job: ProcessingJob) => {
    logger.info(`[validate] Processing job ${job.id}: ${job.fileName}`);

    try {
      await updateDocStatus(job.documentId, "VALIDATING");

      const fileBuffer = await downloadFile(config, job.storageKey);

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

function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (/^\d+$/.test(trimmed)) {
      const p = parseInt(trimmed, 10);
      if (p >= 1 && p <= maxPages) pages.add(p);
    } else if (/^\d+-\d+$/.test(trimmed)) {
      const [startStr, endStr] = trimmed.split("-");
      if (startStr && endStr) {
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (start >= 1 && end >= start) {
          const actualEnd = Math.min(end, maxPages);
          for (let i = start; i <= actualEnd; i++) {
            pages.add(i);
          }
        }
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

  // Stage 1: Split PDF into page images
  createSplittingWorker(config, async (job: ProcessingJob) => {
    logger.info(`[split] Processing job ${job.id}: ${job.fileName}`);

    try {
      await updateDocStatus(job.documentId, "SPLITTING");

      const fileBuffer = await downloadFile(config, job.storageKey);

      // Validate PDF before processing
      const validation = validatePdf(fileBuffer, job.mimeType, job.fileSize);
      if (!validation.valid) {
        await updateDocStatus(job.documentId, "FAILED");
        throw new Error(`${validation.errorCode}: ${validation.error}`);
      }

      // Actually split the PDF into page images
      const splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi);
      logger.info(`[split] Split into ${splitResult.pageCount} pages for ${job.id}`);

      let pagesToStore = splitResult.pages;
      if (job.pageRange) {
        const selectedPages = parsePageRange(job.pageRange, splitResult.pageCount);
        if (selectedPages.length > 0) {
          pagesToStore = selectedPages.map((pNum) => splitResult.pages[pNum - 1]!).filter(Boolean);
          logger.info(`[split] Filtered pages using range "${job.pageRange}" (selected ${pagesToStore.length}/${splitResult.pageCount} pages)`);
        }
      }

      // Store page count in Document
      await updateDocStatus(job.documentId, "SPLITTING", { pageCount: pagesToStore.length });

      // Store page images in MinIO for the OCR stage
      for (let i = 0; i < pagesToStore.length; i++) {
        const pageNum = i + 1;
        const pageKey = `${config.paths.pages}/${job.id}/page-${String(pageNum).padStart(3, "0")}.png`;
        await uploadBuffer(config, pageKey, pagesToStore[i]!, "image/png");
      }
      logger.info(`[split] Stored ${pagesToStore.length} page images for ${job.id}`);

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

  // Stage 2: OCR via configured provider (Surya or Google)
  createOcrWorker(config, async (job: ProcessingJob) => {
    logger.info(`[ocr] Processing job ${job.id}: ${job.fileName}`);

    try {
      await updateDocStatus(job.documentId, "OCR_PROCESSING");

      const manager = new OcrManager(config);

      // Check if pre-split page images exist from the split stage
      const firstPageKey = `${config.paths.pages}/${job.id}/page-001.png`;
      let result;

      try {
        // Try to download pre-split pages
        const pagesExist = await fileExists(config, firstPageKey);

        if (pagesExist) {
          // Download pre-split page images (limit to 200 pages to prevent OOM)
          logger.info(`[ocr] Using pre-split pages for ${job.id}`);
          const pageImages: Buffer[] = [];
          let pageNum = 1;
          const MAX_PAGES = 200;
          let hasMorePages = true;
          while (hasMorePages && pageNum <= MAX_PAGES) {
            const pageKey = `${config.paths.pages}/${job.id}/page-${String(pageNum).padStart(3, "0")}.png`;
            try {
              const pageBuffer = await downloadFile(config, pageKey);
              pageImages.push(pageBuffer);
              pageNum++;
            } catch {
              hasMorePages = false;
            }
          }
          if (pageNum > MAX_PAGES) {
            logger.warn(`[ocr] Truncated to ${MAX_PAGES} pages for ${job.id} to prevent OOM`);
          }
          logger.info(`[ocr] Downloaded ${pageImages.length} pre-split pages`);
          result = await manager.extractPages(config, pageImages, job.fileName);
          // Clear page images from memory
          pageImages.length = 0;
        } else {
          // No pre-split pages — fall back to full PDF extraction
          logger.info(`[ocr] No pre-split pages, extracting from full PDF for ${job.id}`);
          const fileBuffer = await downloadFile(config, job.storageKey);
          result = await manager.extractText(config, fileBuffer, job.fileName, job.mimeType);
        }
      } catch (pageError: unknown) {
        // Fallback: download full PDF and extract
        const pageErrorMsg = pageError instanceof Error ? pageError.message : String(pageError);
        logger.warn(`[ocr] Page detection failed for ${job.id}: ${pageErrorMsg}. Falling back to full PDF.`);
        const fileBuffer = await downloadFile(config, job.storageKey);
        result = await manager.extractText(config, fileBuffer, job.fileName, job.mimeType);
      }

      // Store OCR result in MinIO
      const ocrKey = `${config.paths.ocrResults}/${job.id}/text.json`;
      const metadataJson = JSON.stringify({
        jobId: job.id,
        fileName: job.fileName,
        confidence: result.confidence,
        pages: result.pages.length,
        text: result.text,
      });

      await uploadBuffer(config, ocrKey, Buffer.from(metadataJson), "application/json");

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

  // Stage 3: Clean extracted text
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

  // Stage 4: Generate Markdown output
  createGenerationWorker(config, async (job: ProcessingJob) => {
    logger.info(`[generate] Processing job ${job.id}`);

    try {
      await updateDocStatus(job.documentId, "GENERATING");

      const cleanedKey = `${config.paths.ocrResults}/${job.id}/cleaned.json`;
      const cleanedBuffer = await downloadFile(config, cleanedKey);
      const cleanedData = JSON.parse(cleanedBuffer.toString("utf-8"));
      const rawText: string = cleanedData.text;

      // Get actual pageCount from database if available
      let pageCount: number | undefined;
      try {
        const doc = await prisma.document.findUnique({
          where: { id: job.documentId },
          select: { pageCount: true },
        });
        if (doc?.pageCount) {
          pageCount = doc.pageCount;
        }
      } catch (dbErr) {
        logger.warn(dbErr, `[generate] Failed to fetch document pageCount for ${job.documentId}`);
      }

      const title = job.fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, "");
      const result = generateMarkdown(rawText, { title, pageCount });

      const mdKey = `${config.paths.exports}/${job.id}/output.md`;
      await uploadBuffer(config, mdKey, Buffer.from(result.markdown, "utf-8"), "text/markdown");

      const txtContent = generateTxt(result);
      const txtKey = `${config.paths.exports}/${job.id}/output.txt`;
      await uploadBuffer(config, txtKey, Buffer.from(txtContent, "utf-8"), "text/plain");

      const jsonContent = generateJson(result, job.fileName);
      const jsonKey = `${config.paths.exports}/${job.id}/output.json`;
      await uploadBuffer(config, jsonKey, Buffer.from(jsonContent, "utf-8"), "application/json");

      // Mark document as completed with output formats
      await updateDocStatus(job.documentId, "COMPLETED", {
        outputFormats: ["md", "txt", "json"],
      });

      // Populate search index — non-critical, don't fail generation if this breaks
      try {
        const searchPreview = rawText.slice(0, 1000);
        const wordCount = rawText.split(/\s+/).filter((w) => w.length > 0).length;
        const doc = await prisma.document.findUnique({ where: { id: job.documentId } });
        if (doc) {
          await prisma.$executeRaw`
            UPDATE documents
            SET
              searchvector =
                setweight(to_tsvector('simple', coalesce(${doc.title}, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(${doc.fileName}, '')), 'B') ||
                setweight(to_tsvector('simple', coalesce(${doc.description ?? ""}, '')), 'C') ||
                setweight(to_tsvector('simple', coalesce(${searchPreview}, '')), 'D'),
              searchpreview = ${searchPreview},
              wordcount = ${wordCount}
            WHERE id = ${job.documentId}
          `;
        }
      } catch (searchErr) {
        logger.warn(searchErr, `[generate] Search index update failed (non-critical):`);
      }

      logger.info(`[generate] Completed output generation for ${job.id}`);
    } catch (err) {
      logger.error(err, `[generate] Failed for ${job.id}:`);
      await updateDocStatus(job.documentId, "FAILED");
      throw err;
    }
  });

  logger.info("[ocr-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[ocr-worker] Fatal error:");
  process.exit(1);
});
