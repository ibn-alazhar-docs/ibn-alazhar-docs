import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { singleExportSchema } from "@/lib/export/validators";
import {
  resolveDocumentForExport,
  resolveTagsForExport,
  resolveFolderForExport,
  resolveOcrData,
  resolvePipelineData,
  buildExportMetadata,
} from "@/lib/export/metadata";
import { buildZipPackage } from "@/lib/export/zip-builder";
import { sanitizeTitle, contentDispositionHeader, getContentType } from "@/lib/export/profiles";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const parsed = singleExportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid data",
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const { documentId, format, profile, includeSource } = parsed.data;

  try {
    const document = await resolveDocumentForExport(documentId, session);
    const [tags, folder, ocr, pipeline] = await Promise.all([
      resolveTagsForExport(documentId),
      resolveFolderForExport(null),
      resolveOcrData(documentId),
      resolvePipelineData(documentId),
    ]);
    const metadata = await buildExportMetadata(document, tags, folder, ocr, pipeline, profile);

    if (format === "zip") {
      let rawText = "";
      let markdown = "";

      const config = loadConfig();

      // Try to fetch raw OCR text first
      const ocrKey = `${config.paths.ocrResults}/${documentId}/text.json`;
      const ocrExists = await fileExists(config, ocrKey);
      if (ocrExists) {
        const ocrBuffer = await downloadFile(config, ocrKey);
        try {
          const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
          rawText = ocrData.text || "";
        } catch {
          rawText = "";
        }
      }

      // Fetch generated markdown
      const outputKey = `${config.paths.exports}/${documentId}/output.md`;
      const mdExists = await fileExists(config, outputKey);
      if (mdExists) {
        const mdBuffer = await downloadFile(config, outputKey);
        markdown = mdBuffer.toString("utf-8");
        if (!rawText) rawText = markdown;
      }

      let sourceBuffer: Buffer | undefined;
      if (includeSource) {
        const sourceKey = `${config.paths.uploads}/${documentId}/${document.fileName}`;
        const srcExists = await fileExists(config, sourceKey);
        if (srcExists) {
          sourceBuffer = await downloadFile(config, sourceKey);
        }
      }

      const exportId = `exp_${documentId}_${Date.now()}`;
      const zipBuffer = await buildZipPackage({
        exportId,
        documents: [
          {
            id: document.id,
            title: document.title,
            tags: tags.map((t) => t.name),
            folderPath: folder?.path ?? "",
            pageCount: document.pageCount,
            metadata,
            rawText,
            markdown,
            sourceBuffer,
            sourceFileName: document.originalName,
          },
        ],
        profile,
        includeSource,
      });

      const zipName = `${sanitizeTitle(document.title)}_${new Date().toISOString().split("T")[0]}.zip`;

      return new Response(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": getContentType("zip"),
          "Content-Disposition": contentDispositionHeader(zipName),
        },
      });
    }

    const config = loadConfig();
    const outputKey = `${config.paths.exports}/${documentId}/output.${format}`;
    const exists = await fileExists(config, outputKey);

    if (!exists) {
      const exportKey = `${config.paths.exports}/${documentId}/export.${format}`;
      const exportExists = await fileExists(config, exportKey);
      if (!exportExists) {
        return NextResponse.json(
          { error: "Export not ready" },
          { status: 404 },
        );
      }
      const buffer = await downloadFile(config, exportKey);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": getContentType(format),
          "Content-Disposition": contentDispositionHeader(
            `${sanitizeTitle(document.title)}.${format}`,
          ),
        },
      });
    }

    const buffer = await downloadFile(config, outputKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(format),
        "Content-Disposition": contentDispositionHeader(
          `${sanitizeTitle(document.title)}.${format}`,
        ),
      },
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error({ errMessage }, "[export] Single export failed:");

    if (errMessage.includes("not found") || errMessage.includes("Document not found")) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
