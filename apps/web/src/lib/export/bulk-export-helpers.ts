import { prisma } from "@/lib/prisma";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { buildExportMetadata } from "./metadata";
import { buildZipPackage } from "./zip-builder";
import type { ExportTagData, ExportFolderData, ExportOcrData, ExportPipelineData } from "./types";

interface DocumentRecord {
  id: string;
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
  folderId: string | null;
}

interface ExportContext {
  userId: string;
  includeSource: boolean;
  profile: "research" | "archive" | "plain" | "developer";
}

export async function fetchRelatedData(docIds: string[], userId: string) {
  const config = loadConfig();

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
      where: { userId },
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

  return { tagsByDocId, jobsByDocId, folderMap, resolveFolderAncestors, config };
}

export async function fetchDocumentFiles(
  documents: DocumentRecord[],
  includeSource: boolean,
  config: ReturnType<typeof loadConfig>,
) {
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
      downloadFile(config, r.key).then((buffer) => ({
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

  return filesByDocAndType;
}

export async function buildZipDocuments(
  documents: DocumentRecord[],
  ctx: ExportContext,
  related: Awaited<ReturnType<typeof fetchRelatedData>>,
  filesByDocAndType: Map<string, Buffer>,
) {
  const { tagsByDocId, jobsByDocId, resolveFolderAncestors } = related;
  const { profile } = ctx;

  return Promise.all(
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
          folderId: doc.folderId,
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
}

export async function executeBulkExport(
  documents: DocumentRecord[],
  ctx: ExportContext,
  exportPrefix: string,
  zipName: string,
) {
  const docIds = documents.map((d) => d.id);
  const related = await fetchRelatedData(docIds, ctx.userId);
  const filesByDocAndType = await fetchDocumentFiles(documents, ctx.includeSource, related.config);
  const zipDocs = await buildZipDocuments(documents, ctx, related, filesByDocAndType);

  const exportId = `${exportPrefix}_${Date.now()}`;
  const zipBuffer = await buildZipPackage({
    exportId,
    documents: zipDocs,
    profile: ctx.profile,
    includeSource: ctx.includeSource,
  });

  return { zipBuffer, zipName };
}
