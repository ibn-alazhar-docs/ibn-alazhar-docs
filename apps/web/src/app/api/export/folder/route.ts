import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { folderExportSchema } from "@/lib/export/validators";
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
  const parsed = folderExportSchema.safeParse(body);

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

  const { folderId, format, profile, includeSource, recursive } = parsed.data;

  try {
    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id: folderId }, session),
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const folderIds: string[] = [folderId];

    if (recursive) {
      const childFolders = await prisma.folder.findMany({
        where: ownedWhere({
          parentId: folderId,
        }, session),
        select: { id: true },
      });
      folderIds.push(...childFolders.map((f) => f.id));
    }

    const documents = await prisma.document.findMany({
      where: ownedWhere({
        folderId: { in: folderIds },
        deletedAt: null,
      }, session),
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: "Folder is empty" }, { status: 404 });
    }

    if (format !== "zip") {
      return NextResponse.json({ error: "Folder export requires ZIP" }, { status: 400 });
    }

    const config = loadConfig();
    const zipDocs = [];

    for (const doc of documents) {
      const tags = await resolveTagsForExport(doc.id);
      const docFolder = await resolveFolderForExport(doc.folderId);
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
        docFolder,
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
        folderPath: docFolder?.path ?? "",
        pageCount: doc.pageCount,
        metadata,
        rawText,
        markdown,
        sourceBuffer,
        sourceFileName: doc.originalName,
      });
    }

    const exportId = `exp_folder_${Date.now()}`;
    const zipBuffer = await buildZipPackage({
      exportId,
      documents: zipDocs,
      profile,
      includeSource,
    });

    const zipName = `Folder_${folder.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error({ errMessage }, "[export] Folder export failed:");
    return NextResponse.json({ error: "Folder export failed" }, { status: 500 });
  }
}
