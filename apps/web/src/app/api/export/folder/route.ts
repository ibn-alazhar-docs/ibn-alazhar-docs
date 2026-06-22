import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { folderExportSchema } from "@/lib/export/validators";
import { buildExportMetadata } from "@/lib/export/metadata";
import type {
  ExportTagData,
  ExportFolderData,
  ExportOcrData,
  ExportPipelineData,
} from "@/lib/export/types";
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
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Folder not found" } },
        { status: 404 },
      );
    }

    const folderIds: string[] = [folderId];

    if (recursive) {
      const childFolders = await prisma.folder.findMany({
        where: ownedWhere(
          {
            parentId: folderId,
          },
          session,
        ),
        select: { id: true },
      });
      folderIds.push(...childFolders.map((f) => f.id));
    }

    const documents = await prisma.document.findMany({
      where: ownedWhere(
        {
          folderId: { in: folderIds },
          deletedAt: null,
        },
        session,
      ),
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Folder is empty" } },
        { status: 404 },
      );
    }

    if (format !== "zip") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Folder export requires ZIP" } },
        { status: 400 },
      );
    }

    const config = loadConfig();

    const docIds = documents.map((d: { id: string }) => d.id);

    const [allTagDocs, allConversionJobs, allFolders] = await Promise.all([
      prisma.tagDocument.findMany({
        where: { documentId: { in: docIds } },
        include: { tag: { select: { name: true, color: true } } },
      }),
      prisma.conversionJob.findMany({
        where: { documentId: { in: docIds } },
        orderBy: { createdAt: "desc" },
        distinct: ["documentId"],
        select: { documentId: true, progress: true, sourceFormat: true },
      }),
      prisma.folder.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, parentId: true },
      }),
    ]);

    const tagsByDocId = new Map<string, ExportTagData[]>();
    for (const td of allTagDocs) {
      const existing = tagsByDocId.get(td.documentId) ?? [];
      existing.push({ name: td.tag.name, color: td.tag.color });
      tagsByDocId.set(td.documentId, existing);
    }

    const jobsByDocId = new Map<
      string,
      { documentId: string; progress: number; sourceFormat: string }
    >(
      allConversionJobs.map((j: { documentId: string; progress: number; sourceFormat: string }) => [
        j.documentId,
        j,
      ]),
    );
    const folderMap = new Map<string, { id: string; name: string; parentId: string | null }>(
      allFolders.map((f: { id: string; name: string; parentId: string | null }) => [f.id, f]),
    );

    const resolveFolderAncestors = (folderId: string | null): ExportFolderData | null => {
      if (!folderId) return null;
      const ancestors: string[] = [];
      let currentId: string | null = folderId;
      while (currentId) {
        const f = folderMap.get(currentId);
        if (!f) break;
        ancestors.unshift(f.name);
        currentId = f.parentId;
      }
      const target = folderMap.get(folderId);
      return {
        name: target?.name ?? "Unknown",
        path: ancestors.join(" / "),
        ancestors,
      };
    };

    // Build all MinIO keys to fetch in parallel (fixes N+1)
    const allStorageKeys = documents.flatMap((doc) => {
      const keys: { docId: string; type: string; key: string }[] = [
        { docId: doc.id, type: "ocr", key: `${config.paths.ocrResults}/${doc.id}/text.json` },
        { docId: doc.id, type: "md", key: `${config.paths.exports}/${doc.id}/output.md` },
      ];
      if (includeSource) {
        keys.push({
          docId: doc.id,
          type: "source",
          key: `${config.paths.uploads}/${doc.id}/${doc.fileName}`,
        });
      }
      return keys;
    });

    const existenceResults = await Promise.all(
      allStorageKeys.map((k: { docId: string; type: string; key: string }) =>
        fileExists(config, k.key).then((exists: boolean) => ({ ...k, exists })),
      ),
    );

    const existingKeys = existenceResults.filter((r) => r.exists);

    const fetchResults = await Promise.all(
      existingKeys.map((r: { docId: string; type: string; key: string; exists: boolean }) =>
        downloadFile(config, r.key).then((buffer: Buffer) => ({
          docId: r.docId,
          type: r.type,
          buffer,
        })),
      ),
    );

    const filesByDocAndType = new Map<string, Buffer>();
    for (const fr of fetchResults) {
      filesByDocAndType.set(`${fr.docId}:${fr.type}`, fr.buffer);
    }

    const zipDocs = await Promise.all(
      documents.map(async (doc: (typeof documents)[number]) => {
        const tags = tagsByDocId.get(doc.id) ?? [];
        const docFolder = resolveFolderAncestors(doc.folderId);
        const job = jobsByDocId.get(doc.id);
        const ocr: ExportOcrData = {
          confidence: job?.progress ? Math.min(job.progress / 100, 1) : 0,
          engine: job?.sourceFormat ?? "unknown",
          pageCount: 0,
        };
        const pipeline: ExportPipelineData = {
          wordCount: 0,
          charCount: 0,
          headingCount: 0,
          paragraphCount: 0,
          qualityScore: 0.8,
          garbageRatio: 0,
          pageCount: doc.pageCount ?? 0,
        };
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

        const ocrBuffer = filesByDocAndType.get(`${doc.id}:ocr`);
        if (ocrBuffer) {
          try {
            const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
            rawText = ocrData.text || "";
          } catch {
            rawText = "";
          }
        }

        const mdBuffer = filesByDocAndType.get(`${doc.id}:md`);
        if (mdBuffer) {
          markdown = mdBuffer.toString("utf-8");
          if (!rawText) rawText = markdown;
        }

        const sourceBuffer = filesByDocAndType.get(`${doc.id}:source`);

        return {
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
        };
      }),
    );

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
    const errMessage = error instanceof Error ? (error as Error).message : String(error);
    logger.error({ errMessage }, "[export] Folder export failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Folder export failed" } },
      { status: 500 },
    );
  }
}
