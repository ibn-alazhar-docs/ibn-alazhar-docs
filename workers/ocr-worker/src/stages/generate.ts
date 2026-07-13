import {
  createGenerationWorker,
  generateMarkdown,
  generateTxt,
  generateJson,
  downloadFile,
  fileExists,
  classifyError,
  recordJobFailure,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import type { Job } from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { updateDocStatus, uploadExportBufferForWorker } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerGenerationStage(
  config: PipelineConfig,
  onFailed?: (job: Job<ProcessingJob>, error: Error, queueName: string) => Promise<void>,
): void {
  createGenerationWorker(
    config,
    async (job: Job<ProcessingJob>) => {
      const data = job.data;
      const jobLogger = logger.child({
        jobId: data.id,
        documentId: data.documentId,
        stage: "generate",
      });
      jobLogger.info(`[generate] Processing job ${data.id}`);

      try {
        await updateDocStatus(data.documentId, "GENERATING");

        const cleanedKey = `${config.paths.ocrResults}/${data.id}/cleaned.json`;
        const cleanedBuffer = await downloadFile(config, cleanedKey);
        const cleanedData = JSON.parse(cleanedBuffer.toString("utf-8"));
        const rawText: string = cleanedData.text;

        let pageCount: number | undefined;
        try {
          const doc = await prisma.document.findUnique({
            where: { id: data.documentId },
            select: { pageCount: true },
          });
          if (doc?.pageCount) {
            pageCount = doc.pageCount;
          }
        } catch (dbErr) {
          jobLogger.warn(
            dbErr,
            `[generate] Failed to fetch document pageCount for ${data.documentId}`,
          );
        }

        const title = data.fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, "");
        const result = generateMarkdown(rawText, { title, pageCount });

        const outputKeys: Record<string, string> = {};
        const titleSafe = title
          .replace(/[^a-zA-Z0-9.\u0600-\u06FF\u0660-\u0669-]/g, "_")
          .slice(0, 100);

        const mdKey = await uploadExportBufferForWorker(
          config,
          data.userId,
          Buffer.from(result.markdown, "utf-8"),
          `${titleSafe}.md`,
          "text/markdown",
        );
        outputKeys["md"] = mdKey;

        const txtContent = generateTxt(result);
        const txtKey = await uploadExportBufferForWorker(
          config,
          data.userId,
          Buffer.from(txtContent, "utf-8"),
          `${titleSafe}.txt`,
          "text/plain",
        );
        outputKeys["txt"] = txtKey;

        const jsonContent = generateJson(result, data.fileName);
        const jsonKey = await uploadExportBufferForWorker(
          config,
          data.userId,
          Buffer.from(jsonContent, "utf-8"),
          `${titleSafe}.json`,
          "application/json",
        );
        outputKeys["json"] = jsonKey;

        const finalFormats = ["md", "txt", "json"];

        try {
          const docxBuffer = await generateDocx(result);
          const docxKey = await uploadExportBufferForWorker(
            config,
            data.userId,
            docxBuffer,
            `${titleSafe}.docx`,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );
          outputKeys["docx"] = docxKey;
          finalFormats.push("docx");
        } catch (err) {
          jobLogger.warn(
            err,
            `[generate] Failed to generate DOCX for ${data.id}, skipping DOCX format:`,
          );
        }

        const searchablePdfKey = `${config.paths.exports}/${data.id}/searchable.pdf`;
        const hasSearchablePdf = await fileExists(config, searchablePdfKey);
        if (hasSearchablePdf) {
          outputKeys["searchable-pdf"] = searchablePdfKey;
          finalFormats.push("searchable-pdf");
        }

        await updateDocStatus(data.documentId, "COMPLETED", {
          outputFormats: finalFormats,
          outputKeys,
        });

        try {
          const searchPreview = rawText.slice(0, 1000);
          const wordCount = rawText.split(/\s+/).filter((w) => w.length > 0).length;
          const doc = await prisma.document.findUnique({ where: { id: data.documentId } });
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
              WHERE id = ${data.documentId}
            `;
          }
        } catch (searchErr) {
          // Search indexing is non-critical: the document is still COMPLETED
          // and downloadable. Record the failure for observability/DLQ but do
          // NOT fail the job or block the user.
          const msg = searchErr instanceof Error ? searchErr.message : String(searchErr);
          jobLogger.warn(
            { error: msg },
            `[generate] Search index update failed (SEARCH_INDEX_FAILED)`,
          );
          await recordJobFailure(
            config,
            "pipeline-search",
            job,
            new Error(`SEARCH_INDEX_FAILED: ${msg}`),
          ).catch(() => {});
        }

        jobLogger.info(`[generate] Completed output generation for ${data.id}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { category } = classifyError(error);
        jobLogger.error({ error: error.message, category }, `[generate] Failed for ${data.id}`);
        if (category !== "transient") {
          job.discard();
        }
        throw error;
      }
    },
    onFailed,
  );
}

async function generateDocx(result: { markdown: string }): Promise<Buffer> {
  const { generateDocx: gen } = await import("@ibn-al-azhar-docs/pipeline");
  return gen(result);
}
