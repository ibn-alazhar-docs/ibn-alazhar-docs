import {
  loadConfig,
  createExportWorker,
  downloadFile,
  uploadBuffer,
  getPresignedUrl,
  generateMarkdown,
  generateTxt,
  generateJson,
  recordFailedJob,
  closeQueueConnections,
  categorizeFailure,
  type ExportRequest,
  type FailedJob,
} from "@ibn-al-azhar-docs/pipeline";
import { startHealthServer } from "../../shared/health-server";
import { logger } from "../../shared/logger";

const config = loadConfig();

async function main() {
  logger.info("[export-worker] Starting...");

  // Start health check server
  startHealthServer("export-worker", 9091);

  const shutdown = async () => {
    logger.info("[export-worker] Shutting down...");
    await closeQueueConnections();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

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
        default:
          throw new Error(`UNSUPPORTED_FORMAT: ${req.format}`);
      }

      await uploadBuffer(config, outputKey, outputBuffer, contentType);

      const downloadUrl = await getPresignedUrl(config, outputKey, 3600);

      logger.info(`[export] Completed ${req.format} export for ${req.jobId}: ${downloadUrl}`);
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

  logger.info("[export-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[export-worker] Fatal error:");
  process.exit(1);
});
