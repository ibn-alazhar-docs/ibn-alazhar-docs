import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { batchExportSchema } from "@/lib/export/validators";
import {
  resolveTagsForExport,
  resolveFolderForExport,
  resolveOcrData,
  resolvePipelineData,
  buildExportMetadata,
} from "@/lib/export/metadata";
import { buildZipPackage } from "@/lib/export/zip-builder";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@/lib/logger";

function contentDispositionHeader(filename: string): string {
  const asciiSafe =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/\s+/g, "_")
      .trim() || "download";
  const encoded = encodeURIComponent(filename)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encoded}`;
}

export async function POST(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const parsed = batchExportSchema.safeParse(body);

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

  const { documentIds, format, profile, includeSource } = parsed.data;

  try {
    const validDocs = await prisma.document.findMany({
      where: ownedWhere({
        id: { in: documentIds },
        deletedAt: null,
      }, session),
    });

    if (validDocs.length === 0) {
      return NextResponse.json({ error: "No documents found" }, { status: 404 });
    }

    if (validDocs.length !== documentIds.length) {
      const foundIds = new Set(validDocs.map((d) => d.id));
      const missing = documentIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        { error: `Missing documents: ${missing.join(", ")}` },
        { status: 404 },
      );
    }

    if (format !== "zip") {
      return NextResponse.json({ error: "Batch export requires ZIP" }, { status: 400 });
    }

    const config = loadConfig();
    const zipDocs = [];

    for (const doc of validDocs) {
      const tags = await resolveTagsForExport(doc.id);
      const folder = await resolveFolderForExport(doc.folderId);
      const ocr = await resolveOcrData(doc.id);
      const pipeline = await resolvePipelineData(doc.id);
      const metadata = await buildExportMetadata(
        {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          fileName: doc.fileName,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          fileSize: Number(doc.fileSize),
          pageCount: doc.pageCount,
          outputFormats: doc.outputFormats,
          language: doc.language,
          isRtl: doc.isRtl,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        tags,
        folder,
        ocr,
        pipeline,
        profile,
      );

      let rawText = "";
      let markdown = "";

      // Try to fetch raw OCR text first
      const ocrKey = `${config.paths.ocrResults}/${doc.id}/text.json`;
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

      const outputKey = `${config.paths.exports}/${doc.id}/output.md`;
      const mdExists = await fileExists(config, outputKey);
      if (mdExists) {
        const mdBuffer = await downloadFile(config, outputKey);
        markdown = mdBuffer.toString("utf-8");
        if (!rawText) rawText = markdown;
      }

      let sourceBuffer: Buffer | undefined;
      if (includeSource) {
        const sourceKey = `${config.paths.uploads}/${doc.id}/${doc.fileName}`;
        const srcExists = await fileExists(config, sourceKey);
        if (srcExists) {
          sourceBuffer = await downloadFile(config, sourceKey);
        }
      }

      zipDocs.push({
        id: doc.id,
        title: doc.title,
        tags: tags.map((t) => t.name),
        folderPath: folder?.path ?? "",
        pageCount: doc.pageCount,
        metadata,
        rawText,
        markdown,
        sourceBuffer,
        sourceFileName: doc.originalName,
      });
    }

    const exportId = `exp_batch_${Date.now()}`;
    const zipBuffer = await buildZipPackage({
      exportId,
      documents: zipDocs,
      profile,
      includeSource,
    });

    const zipName = `Export_${validDocs.length}_docs_${new Date().toISOString().split("T")[0]}.zip`;

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error({ errMessage }, "[export] Batch export failed:");
    return NextResponse.json({ error: "Batch export failed" }, { status: 500 });
  }
}
