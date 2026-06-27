import { prisma } from "@/lib/prisma";
import { ownedWhere, type AuthSession } from "@/lib/auth-guards";
import type {
  ExportDocumentData,
  ExportTagData,
  ExportFolderData,
  ExportOcrData,
  ExportPipelineData,
  ExportMetadata,
  ExportProfile,
} from "./types";

export async function resolveDocumentForExport(
  documentId: string,
  session: AuthSession,
): Promise<ExportDocumentData> {
  const doc = await prisma.document.findFirst({
    where: ownedWhere({ id: documentId, deletedAt: null }, session),
  });

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  return {
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
    language: doc.language,
    isRtl: doc.isRtl,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function resolveTagsForExport(documentId: string): Promise<ExportTagData[]> {
  const tagDocs = await prisma.tagDocument.findMany({
    where: { documentId },
    include: { tag: true },
  });

  return tagDocs.map((td) => ({
    name: td.tag.name,
    color: td.tag.color,
  }));
}

export async function resolveFolderForExport(
  folderId: string | null,
): Promise<ExportFolderData | null> {
  if (!folderId) return null;

  const result = await prisma.$queryRaw<
    Array<{ id: string; name: string; parentId: string | null }>
  >`
    WITH RECURSIVE folder_tree AS (
      SELECT id, name, "parentId", 1 as level
      FROM folders
      WHERE id = ${folderId}

      UNION ALL

      SELECT f.id, f.name, f."parentId", t.level + 1
      FROM folders f
      INNER JOIN folder_tree t ON f.id = t."parentId"
    )
    SELECT id, name, "parentId"
    FROM folder_tree
    ORDER BY level DESC;
  `;

  if (result.length === 0) {
    return {
      name: "Unknown",
      path: "",
      ancestors: [],
    };
  }

  const ancestors = result.map((f) => f.name);
  const targetFolder = result[result.length - 1];

  return {
    name: targetFolder?.name ?? "Unknown",
    path: ancestors.join(" / "),
    ancestors,
  };
}

export async function resolveOcrData(documentId: string): Promise<ExportOcrData> {
  const job = await prisma.conversionJob.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });

  return {
    confidence: job?.progress ? Math.min(job.progress / 100, 1) : 0,
    engine: job?.sourceFormat ?? "unknown",
    pageCount: 0,
  };
}

export async function resolvePipelineData(documentId: string): Promise<ExportPipelineData> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { pageCount: true },
  });

  return {
    wordCount: 0,
    charCount: 0,
    headingCount: 0,
    paragraphCount: 0,
    qualityScore: 0.8,
    garbageRatio: 0,
    pageCount: doc?.pageCount ?? 0,
  };
}

export async function buildExportMetadata(
  document: ExportDocumentData,
  tags: ExportTagData[],
  folder: ExportFolderData | null,
  ocr: ExportOcrData,
  pipeline: ExportPipelineData,
  profile: ExportProfile,
): Promise<ExportMetadata> {
  return {
    source: {
      title: document.title,
      description: document.description,
      fileName: document.fileName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      language: document.language,
      isRtl: document.isRtl,
    },
    tags,
    folder,
    ocr,
    pipeline,
    dates: {
      created: document.createdAt.toISOString(),
      updated: document.updatedAt.toISOString(),
      exported: new Date().toISOString(),
    },
    export: {
      format: "zip",
      profile,
      version: "1.0",
      generator: "ibn-al-azhar-docs/v1",
    },
  };
}
