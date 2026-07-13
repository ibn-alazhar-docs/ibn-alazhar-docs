import {
  loadConfig,
  createExportWorker,
  downloadFile,
  generateMarkdown,
  generateTxt,
  generateJson,
  classifyError,
  uploadExportBuffer,
  type ExportRequest,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";

const config = loadConfig();

export function registerExportHandler(
  onFailed?: (job: Job<ExportRequest>, error: Error, queueName: string) => Promise<void>,
): void {
  createExportWorker(
    config,
    async (job: Job<ExportRequest>) => {
      const req = job.data;
      const jobLogger = logger.child({
        jobId: req.jobId,
        documentId: req.documentId,
        stage: "export",
        format: req.format,
      });
      jobLogger.info(`[export] Processing ${req.format} export for job ${req.jobId}`);

      try {
        const cleanedBuffer = await downloadFile(config, req.textKey);
        const cleanedData = JSON.parse(cleanedBuffer.toString("utf-8"));
        const rawText: string = cleanedData.text;

        // Genuinely empty source text can't produce a useful export and won't
        // improve on retry — fail fast with a permanent, classified error.
        if (!rawText || rawText.trim().length === 0) {
          throw new Error("EXPORT_FORMAT_FAILED: empty source text");
        }

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
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = classifyError(error);
        jobLogger.error(
          { error: error.message, category },
          `[export] Failed ${req.format} export for ${req.jobId}:`,
        );

        // Transient (network/storage/redis) errors are retried by BullMQ.
        // Permanent errors (unsupported format, corrupt input) skip retries.
        if (category !== "transient") {
          job.discard();
        }
        throw error;
      }
    },
    onFailed,
  );
}
