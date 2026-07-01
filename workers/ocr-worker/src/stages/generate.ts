import {
  createGenerationWorker,
  generateMarkdown,
  generateTxt,
  generateJson,
  generateDocx,
  downloadFile,
  fileExists,
  type ProcessingJob,
  type PipelineConfig,
} from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { updateDocStatus, uploadExportBufferForWorker } from "../helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export function registerGenerationStage(config: PipelineConfig): void {
  createGenerationWorker(config, async (job: ProcessingJob) => {
    logger.info(`[generate] Processing job ${job.id}`);

    try {
      await updateDocStatus(job.documentId, "GENERATING");

      const cleanedKey = `${config.paths.ocrResults}/${job.id}/cleaned.json`;
      const cleanedBuffer = await downloadFile(config, cleanedKey);
      const cleanedData = JSON.parse(cleanedBuffer.toString("utf-8"));
      const rawText: string = cleanedData.text;

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

      const outputKeys: Record<string, string> = {};

      const titleSafe = title
        .replace(/[^a-zA-Z0-9.\u0600-\u06FF\u0660-\u0669-]/g, "_")
        .slice(0, 100);

      const mdKey = await uploadExportBufferForWorker(
        config,
        job.userId,
        Buffer.from(result.markdown, "utf-8"),
        `${titleSafe}.md`,
        "text/markdown",
      );
      outputKeys["md"] = mdKey;

      const txtContent = generateTxt(result);
      const txtKey = await uploadExportBufferForWorker(
        config,
        job.userId,
        Buffer.from(txtContent, "utf-8"),
        `${titleSafe}.txt`,
        "text/plain",
      );
      outputKeys["txt"] = txtKey;

      const jsonContent = generateJson(result, job.fileName);
      const jsonKey = await uploadExportBufferForWorker(
        config,
        job.userId,
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
          job.userId,
          docxBuffer,
          `${titleSafe}.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        outputKeys["docx"] = docxKey;
        finalFormats.push("docx");
      } catch (err) {
        logger.warn(err, `[generate] Failed to generate DOCX for ${job.id}, skipping DOCX format:`);
      }

      const searchablePdfKey = `${config.paths.exports}/${job.id}/searchable.pdf`;
      const hasSearchablePdf = await fileExists(config, searchablePdfKey);
      if (hasSearchablePdf) {
        outputKeys["searchable-pdf"] = searchablePdfKey;
        finalFormats.push("searchable-pdf");
      }

      await updateDocStatus(job.documentId, "COMPLETED", {
        outputFormats: finalFormats,
        outputKeys: outputKeys,
      });

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
}
