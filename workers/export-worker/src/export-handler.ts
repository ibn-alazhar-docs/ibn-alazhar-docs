import {
  loadConfig,
  createExportWorker,
  downloadFile,
  generateMarkdown,
  classifyError,
  uploadExportBuffer,
  convertMarkdownToIR,
  generateMarkdownFromIR,
  generateTxtFromIR,
  generateJsonFromIR,
  generateDocxFromIR,
  generateEpubFromIR,
  generatePdfFromIR,
  pageGeometryFromStoredJson,
  PermanentPipelineError,
  type ExportRequest,
  type PageGeometry,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Pure handler logic: generates a single export format for a document. Shared
 * by the BullMQ worker (redis driver) and the PgWorker (pg driver). Permanent
 * failures throw `PermanentPipelineError` (the pg driver's `willRetry=false`
 * equivalent of BullMQ's `job.discard()`).
 */
export async function processExportStage(
  req: ExportRequest,
  config: PipelineConfig,
): Promise<void> {
  const jobLogger = logger.child({
    jobId: req.jobId,
    documentId: req.documentId,
    stage: "export",
    format: req.format,
  });
  jobLogger.info(`[export] Processing ${req.format} export for job ${req.jobId}`);

  const cleanedBuffer = await downloadFile(config, req.textKey);
  const cleanedData = JSON.parse(cleanedBuffer.toString("utf-8"));
  const rawText: string = cleanedData.text;

  // Genuinely empty source text can't produce a useful export and won't
  // improve on retry — fail fast with a permanent, classified error.
  if (!rawText || rawText.trim().length === 0) {
    throw new PermanentPipelineError(
      "EXPORT_FORMAT_FAILED: empty source text",
      "EXPORT_FORMAT_FAILED",
    );
  }

  const result = generateMarkdown(rawText, { pageCount: req.pageCount });

  // السجل هو مصدر الحقيقة في اللغة: كان `language: "ar"` مكتوبًا في الكود لكل مستند،
  // فيخرج IR لمستند إنجليزي بلغته عربية — و`language` تُقرأ في الواجهة وفي الحزمة.
  // قراءة لغة منفصلة عن قراءة `outputKeys` أسفل عمدًا: لو قُرئتا معًا لَتَّسعت نافذة
  // فقدان التحديث على `outputKeys` إلى مدة التوليد كلها (تصديران متزامنان لصيغتين).
  const record = await prisma.document.findUnique({
    where: { id: req.jobId },
    select: { language: true },
  });

  // Build the structure-preserving IR once, then route every format
  // through IR-aware generators so headings/lists survive export.
  const ir = convertMarkdownToIR(rawText, {
    ocrProvider: "gemini",
    pageCount: req.pageCount,
    language: record?.language ?? "ar",
    confidence: result.metadata.confidence,
  });

  let outputBuffer: Buffer;
  let contentType: string;

  // لا outputKey هنا: مفتاح التخزين تُقرّره `uploadExportBuffer` أسفل (ومعها الوجهة
  // إلى Drive)، فالكتابة في كل حالة كانت تُكتب ثم تُمحى فورًا — توحي بأن المسار
  // يُختار لكل صيغة وهو لا يُختار.

  // قاعدةُ «المُنتَج نسخةٌ طبق الأصل من الأصل» في الورقة: الـ PDF والـ DOCX يبنيان
  // `@page` و`w:pgSz`/`w:pgMar` من هندسةِ الأصل المقيسةِ عند التقسيم، لا من A4 ثابتةٍ
  // ولا من مرجعِ docx واحدٍ لكل المستندات. غيابُ الأثر (صورةٌ مرفوعة، أو قياسٌ فشل)
  // يعني الترقّيَ إلى ما كان عليه المُنتَجُ دائمًا — لا فشلُ تصدير، ولا هامشٌ مخترَع.
  const geometry = await loadPageGeometry(config, req.jobId, jobLogger);

  switch (req.format) {
    case "md": {
      outputBuffer = await generateMarkdownFromIR(ir, { title: req.options?.title });
      contentType = "text/markdown";
      break;
    }
    case "txt": {
      outputBuffer = generateTxtFromIR(ir);
      contentType = "text/plain";
      break;
    }
    case "json": {
      outputBuffer = generateJsonFromIR(ir, {
        sourceFileName: cleanedData.fileName,
        markdown: result.markdown,
      });
      contentType = "application/json";
      break;
    }
    case "docx": {
      outputBuffer = await generateDocxFromIR(ir, { geometry });
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      break;
    }
    case "epub": {
      outputBuffer = await generateEpubFromIR(ir);
      contentType = "application/epub+zip";
      break;
    }
    case "pdf": {
      outputBuffer = await generatePdfFromIR(ir, { ...req.options, geometry });
      contentType = "application/pdf";
      break;
    }
    default:
      throw new PermanentPipelineError(`UNSUPPORTED_FORMAT: ${req.format}`, "UNSUPPORTED_FORMAT");
  }

  let account = null;
  if (req.options?.destination === "drive") {
    account = await prisma.account.findFirst({
      where: { userId: req.userId, provider: "google" },
    });
  }

  const outputKey = await uploadExportBuffer(
    config,
    req.userId,
    outputBuffer,
    `export.${req.format}`,
    contentType,
    account,
    req.options?.destination === "drive",
  );

  const doc = await prisma.document.findUnique({
    where: { id: req.jobId },
    select: { outputKeys: true },
  });
  if (doc) {
    const keys = (doc.outputKeys as Record<string, string>) || {};
    keys[req.format] = outputKey;
    await prisma.document.update({
      where: { id: req.jobId },
      // Clear any prior failure code so a retried-then-succeeded format
      // doesn't keep showing a stale error in the UI.
      data: { outputKeys: keys, errorCode: null, errorMessage: null },
    });
  }

  jobLogger.info(`[export] Completed ${req.format} export for ${req.jobId}`);
}

/**
 * أثرُ الهندسة من التخزين، أو undefined. لا يُرمى خطأٌ من هنا: ملفٌ غيرُ موجود يعني
 * مستندًا بلا قياسٍ (صورةٌ مرفوعة، أو مهمةٌ سبقت هذه الطبقة) لا تصديرًا فاشلًا،
 * والمولّداتُ كلُّها تعرف وجهَها حين تُترك بلا هندسة.
 */
async function loadPageGeometry(
  config: PipelineConfig,
  jobId: string,
  jobLogger: typeof logger,
): Promise<PageGeometry | undefined> {
  try {
    const raw = await downloadFile(config, `${config.paths.ocrResults}/${jobId}/geometry.json`);
    return pageGeometryFromStoredJson(raw.toString("utf-8")) ?? undefined;
  } catch (err) {
    jobLogger.debug({ err, jobId }, "[export] no page geometry artifact — using default page");
    return undefined;
  }
}

export function registerExportHandler(
  onFailed?: (job: Job<ExportRequest>, error: Error, queueName: string) => Promise<void>,
): void {
  const config = loadConfig();

  createExportWorker(
    config,
    async (job: Job<ExportRequest>) => {
      try {
        await processExportStage(job.data, config);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = classifyError(error);
        // Transient (network/storage/redis) errors are retried by BullMQ.
        // Permanent errors (unsupported format, corrupt input) skip retries.
        if (error instanceof PermanentPipelineError || category !== "transient") {
          job.discard();
        }
        throw error;
      }
    },
    onFailed,
  );
}
