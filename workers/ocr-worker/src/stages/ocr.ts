import {
  createOcrWorker,
  OcrManager,
  runOcrChain,
  downloadFile,
  fileExists,
  categorizeFailure,
  uploadBuffer,
  enqueueViaDriver,
  JOB_QUEUES,
  PermanentPipelineError,
  runQaOnResult,
  type ProcessingJob,
  type PipelineConfig,
  type OcrEngineType,
  type OcrEngineResult,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import {
  generateSearchablePdf,
  updateDocStatusWithProgress,
  downloadDocumentBuffer,
} from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * مرحلة OCR ضمن السلسلة الكاملة (docs/IMPLEMENTATION_OCR_CHAIN.md).
 *
 * - الخطوة 1 (direct pdf-parse) حُسمت في split عبر routeDocument:
 *   nativeText + skipOcr ⇒ route=native مباشرة بلا أي OCR.
 * - الخطوة 2 (Tesseract) والخطوة 3 (Gemini keypool) عبر runOcrChain:
 *   OcrManager بترتيب resolveOcrChainOrder ثم بوابة QA الكاملة، وعند فشل
 *   QA تُعاد مرة واحدة بقطع 6 صفحات (pipeline.py §5).
 * لا مسار Gemini-series منفصل هنا — المزوّد يختار تلقائيًّا (محلي قبل سحابي):
 * إن كان Tesseract متاحًا نُجّح نصّه دون إرسال أي صفحة إلى السحابة،
 * وGemini (keypool) احتياط أخير فقط.
 */

/** جمع pageGetters من الصفحات المقسّمة في split (null إن غابت الأولى). */
async function collectPageGetters(
  config: PipelineConfig,
  jobId: string,
): Promise<(() => Promise<Buffer>)[] | null> {
  const firstPageKey = `${config.paths.pages}/${jobId}/page-001.png`;
  const exists = await fileExists(config, firstPageKey);
  if (!exists) return null;
  const pageGetters: (() => Promise<Buffer>)[] = [];
  let pageNum = 1;
  let hasMorePages = true;
  while (hasMorePages) {
    const pageKey = `${config.paths.pages}/${jobId}/page-${String(pageNum).padStart(3, "0")}.png`;
    const hit = await fileExists(config, pageKey);
    if (hit) {
      pageGetters.push(() => downloadFile(config, pageKey));
      pageNum++;
    } else {
      hasMorePages = false;
    }
  }
  return pageGetters;
}

export async function processOcrStage(data: ProcessingJob, config: PipelineConfig): Promise<void> {
  const jobLogger = logger.child({ jobId: data.id, documentId: data.documentId, stage: "ocr" });
  jobLogger.info(`[ocr] Processing job ${data.id}: ${data.fileName}`);

  await updateDocStatusWithProgress(data.documentId, "OCR_PROCESSING");

  let result: OcrEngineResult;
  let qa: ReturnType<typeof runQaOnResult> | null = null;
  let retried = false;
  let retryChunkSize: number | undefined;
  const route: "native" | "ocr" = data.skipOcr && data.nativeText ? "native" : "ocr";

  if (route === "native") {
    jobLogger.info(`[ocr] Using native text extraction for ${data.id} (skipping OCR)`);
    const out = await runOcrChain(config, {
      fileBuffer: Buffer.alloc(0),
      fileName: data.fileName,
      mimeType: data.mimeType,
      nativeText: data.nativeText,
      skipOcr: true,
    });
    result = out.result;
    qa = out.qa;
    // الـPDF نشأةً رقميًا هو «المطابق للأصل» حرفيًا: يُنشر كما هو بدل إعادة بنائه
    // صورةً بطبقة. بلا هذا كانت الصيغة تُعرض لكل مستند ثم تُرفض 409 إلى الأبد في native.
    try {
      const original = await downloadDocumentBuffer(data.storageKey, data.userId, config);
      const pdfKey = `${config.paths.exports}/${data.id}/searchable.pdf`;
      await uploadBuffer(config, pdfKey, original, "application/pdf");
      jobLogger.info(`[ocr] Published original PDF as searchable output for ${data.id}`);
    } catch (err) {
      jobLogger.warn(
        err,
        `[ocr] Failed to publish original PDF as searchable output for ${data.id}`,
      );
    }
  } else {
    const pageGetters = await collectPageGetters(config, data.id);
    const fileBuffer = await downloadFile(config, data.storageKey);
    jobLogger.info(
      pageGetters
        ? `[ocr] Streaming pre-split pages for ${data.id} (${pageGetters.length} pages)`
        : `[ocr] No pre-split pages, extracting from full PDF for ${data.id}`,
    );
    try {
      const out = await runOcrChain(config, {
        fileBuffer,
        fileName: data.fileName,
        mimeType: data.mimeType,
        pageGetters: pageGetters ?? undefined,
      });
      result = out.result;
      qa = out.qa;
      retried = out.retried;
      retryChunkSize = out.retryChunkSize;
      if (pageGetters) {
        await generateSearchablePdf(data, pageGetters, config, result);
      }
    } catch (chainErr) {
      jobLogger.warn(
        { error: chainErr instanceof Error ? chainErr.message : String(chainErr) },
        `[ocr] OCR chain failed for ${data.id}, trying legacy manager path`,
      );
      const manager = new OcrManager(config);
      if (pageGetters) {
        result = await manager.extractPages(config, pageGetters, data.fileName);
        await generateSearchablePdf(data, pageGetters, config, result);
      } else {
        result = await manager.extractText(config, fileBuffer, data.fileName, data.mimeType);
      }
      qa = runQaOnResult(result, result.pages?.length || 1);
    }
  }

  const { minConfidence } = config.ocr;
  const lowConfidence = typeof result.confidence === "number" && result.confidence < minConfidence;
  if (lowConfidence) {
    jobLogger.warn(
      { confidence: result.confidence, minConfidence },
      `[ocr] Low-confidence OCR result for ${data.id} (code: OCR_LOW_CONFIDENCE) — proceeding with degradation`,
    );
  }
  const qaFailed = !!qa && !qa.pass;
  if (qaFailed) {
    jobLogger.warn(
      {
        exitCode: qa!.exitCode,
        checks: qa!.checks.filter((c) => !c.ok && !c.warn).map((c) => c.name),
        retried,
      },
      `[ocr] QA failed for ${data.id}${retried ? " after retry chunk 6" : ""} — proceeding degraded`,
    );
  }
  if (lowConfidence || qaFailed) {
    await updateDocStatusWithProgress(data.documentId, "OCR_PROCESSING", {
      needsReview: true,
    }).catch(() => {});
  }

  const ocrKey = `${config.paths.ocrResults}/${data.id}/text.json`;
  const metadataJson = JSON.stringify({
    jobId: data.id,
    fileName: data.fileName,
    confidence: result.confidence,
    pages: result.pages.length,
    engine: result.engine as OcrEngineType,
    text: result.text,
    route,
    retried,
    retryChunkSize,
    qa: qa
      ? {
          pass: qa.pass,
          exitCode: qa.exitCode,
          checks: qa.checks,
          charsPerPage: qa.charsPerPage,
          inputPages: qa.inputPages,
          outputPages: qa.outputPages,
        }
      : null,
  });
  await uploadBuffer(config, ocrKey, Buffer.from(metadataJson), "application/json");
  if (qa) {
    await uploadBuffer(
      config,
      `${config.paths.ocrResults}/${data.id}/qa.json`,
      Buffer.from(JSON.stringify(qa), "utf-8"),
      "application/json",
    ).catch(() => {});
  }

  await enqueueViaDriver(JOB_QUEUES.CLEANING, config, {
    ...data,
    status: "cleaning",
    progress: 50,
  });

  jobLogger.info(
    `[ocr] Completed OCR for ${data.id} (${result.pages.length} pages, engine: ${result.engine}, confidence: ${result.confidence}${retried ? ", retried chunk 6" : ""})`,
  );
}

export function registerOcrStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createOcrWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      try {
        await processOcrStage(job.data, config);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = categorizeFailure(error);
        if (error instanceof PermanentPipelineError || category !== "transient") {
          job.discard();
        }
        throw error;
      }
    },
    onFailed,
  );
}
