import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, isAdmin, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { tagExportSchema } from "@/lib/export/validators";
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
import { getErrorMessage } from "@/lib/types";

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
  const parsed = tagExportSchema.safeParse(body);

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

  const { tagId, format, profile, includeSource } = parsed.data;

  try {
    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id: tagId }, session),
    });

    if (!tag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Tag not found" } },
        { status: 404 },
      );
    }

    const tagDocs = await prisma.tagDocument.findMany({
      where: { tagId },
      include: { document: true },
    });

    type DocData = {
      id: string;
      userId: string;
      deletedAt: Date | null;
      title: string;
      description: string | null;
      fileName: string;
      originalName: string;
      mimeType: string;
      fileSize: bigint;
      pageCount: number | null;
      outputFormats: string[];
      language: string | null;
      isRtl: boolean;
      createdAt: Date;
      updatedAt: Date;
      status: string;
      folderId: string | null;
    };
    const allTagDocEntries = tagDocs as unknown as Array<{ document: DocData }>;
    const allDocuments = allTagDocEntries.map((td) => td.document);
    const documents = allDocuments.filter(
      (doc) => doc.deletedAt === null && (isAdmin(session) || doc.userId === session.user.id),
    ) as DocData[];

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No documents with this tag" } },
        { status: 404 },
      );
    }

    if (format !== "zip") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Tag export requires ZIP" } },
        { status: 400 },
      );
    }

    const config = loadConfig();

    const docIds = documents.map((d) => d.id);

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
    >(allConversionJobs.map((j) => [j.documentId, j]));
    const folderMap = new Map<string, { id: string; name: string; parentId: string | null }>(
      allFolders.map((f) => [f.id, f]),
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
      allStorageKeys.map((k) => fileExists(config, k.key).then((exists) => ({ ...k, exists }))),
    );

    const existingKeys = existenceResults.filter((r) => r.exists);

    const fetchResults = await Promise.all(
      existingKeys.map((r) =>
        downloadFile(config, r.key).then((buffer) => ({ docId: r.docId, type: r.type, buffer })),
      ),
    );

    const filesByDocAndType = new Map<string, Buffer>();
    for (const fr of fetchResults) {
      filesByDocAndType.set(`${fr.docId}:${fr.type}`, fr.buffer);
    }

    const zipDocs = await Promise.all(
      documents.map(async (doc) => {
        const tags = tagsByDocId.get(doc.id) ?? [];
        const folder = resolveFolderAncestors(doc.folderId);
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
            language: doc.language ?? "ar",
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
          folderPath: folder?.path ?? "",
          pageCount: doc.pageCount,
          metadata,
          rawText,
          markdown,
          sourceBuffer,
          sourceFileName: doc.originalName,
        };
      }),
    );

    const exportId = `exp_tag_${Date.now()}`;
    const zipBuffer = await buildZipPackage({
      exportId,
      documents: zipDocs,
      profile,
      includeSource,
    });

    const zipName = `Tag_${tag.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    const errMessage = getErrorMessage(error);
    logger.error({ errMessage }, "[export] Tag export failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Tag export failed" } },
      { status: 500 },
    );
  }
}
