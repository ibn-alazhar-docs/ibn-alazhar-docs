import {
  loadConfig,
  createExportWorker,
  downloadFile,
  generateMarkdown,
  generateTxt,
  generateJson,
  recordFailedJob,
  categorizeFailure,
  uploadExportBuffer,
  type ExportRequest,
  type FailedJob,
} from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";

const config = loadConfig();

export function registerExportHandler(): void {
  createExportWorker(config, async (req: ExportRequest) => {
    logger.info(`[export] Processing ${req.format} export for job ${req.jobId}`);

    try {
      const cleanedBuffer = await downloadFile(config, req.textKey);
      const cleanedData = JSON.parse(cleanedBuffer.toString("utf-8"));
      const rawText: string = cleanedData.text;

      const result = generateMarkdown(rawText, { pageCount: req.pageCount });

      let outputBuffer: Buffer;
      let contentType: string;
      let outputKey: string;

      switch (req.format) {
        case "md": {
          outputBuffer = Buffer.from(result.markdown, "utf-8");
          contentType = "text/markdown";
          outputKey = `${config.paths.exports}/${req.jobId}/export.md`;
          break;
        }
        case "txt": {
          outputBuffer = Buffer.from(generateTxt(result), "utf-8");
          contentType = "text/plain";
          outputKey = `${config.paths.exports}/${req.jobId}/export.txt`;
          break;
        }
        case "json": {
          outputBuffer = Buffer.from(generateJson(result), "utf-8");
          contentType = "application/json";
          outputKey = `${config.paths.exports}/${req.jobId}/export.json`;
          break;
        }
        case "docx": {
          const { generateDocx } = await import("@ibn-al-azhar-docs/pipeline");
          outputBuffer = await generateDocx(result);
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          outputKey = `${config.paths.exports}/${req.jobId}/export.docx`;
          break;
        }
        case "epub": {
          const { generateEpub } = await import("@ibn-al-azhar-docs/pipeline");
          outputBuffer = await generateEpub(result);
          contentType = "application/epub+zip";
          outputKey = `${config.paths.exports}/${req.jobId}/export.epub`;
          break;
        }
        case "pdf": {
          const { generatePdf } = await import("@ibn-al-azhar-docs/pipeline");
          outputBuffer = await generatePdf(result, req.options);
          contentType = "application/pdf";
          outputKey = `${config.paths.exports}/${req.jobId}/export.pdf`;
          break;
        }
        default:
          throw new Error(`UNSUPPORTED_FORMAT: ${req.format}`);
      }

      let account = null;
      if (req.options?.destination === "drive") {
        account = await prisma.account.findFirst({
          where: { userId: req.userId, provider: "google" },
        });
      }

      outputKey = await uploadExportBuffer(
        config,
        req.userId,
        outputBuffer,
        `export.${req.format}`,
        contentType,
        account,
        req.options?.destination === "drive",
      );

      const doc = await prisma.document.findUnique({ where: { id: req.jobId } });
      if (doc) {
        const keys = (doc.outputKeys as Record<string, string>) || {};
        keys[req.format] = outputKey;
        await prisma.document.update({
          where: { id: req.jobId },
          data: { outputKeys: keys },
        });
      }

      logger.info(`[export] Completed ${req.format} export for ${req.jobId}`);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const { category } = categorizeFailure(
        error instanceof Error ? error : new Error(errMessage),
      );
      logger.error({ errMessage }, `[export] Failed ${req.format} export for ${req.jobId}:`);

      if (category === "fatal" || category === "permanent") {
        await recordFailedJob(config, {
          jobId: `${req.jobId}_${req.format}`,
          queue: "pipeline:export",
          originalData: req,
          error: errMessage,
          errorCode: "EXPORT_FAILED",
          failureCategory: category,
          attempts: 1,
          lastAttemptAt: new Date().toISOString(),
          failedAt: new Date().toISOString(),
        } as FailedJob);
      }

      throw error instanceof Error ? error : new Error(errMessage);
    }
  });
}
