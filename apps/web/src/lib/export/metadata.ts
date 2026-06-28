import { prisma } from "@/lib/prisma";
import { ownedWhere, type AuthSession } from "@/lib/auth-guards";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
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

  const ancestors: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });

    if (!folder) break;

    ancestors.push(folder.name);
    currentId = folder.parentId;
  }

  if (ancestors.length === 0) {
    return {
      name: "Unknown",
      path: "",
      ancestors: [],
    };
  }

  ancestors.reverse();
  const targetFolder = ancestors[ancestors.length - 1]!;

  return {
    name: targetFolder,
    path: ancestors.join(" / "),
    ancestors,
  };
}

export async function resolveOcrData(documentId: string): Promise<ExportOcrData> {
  const [job, doc] = await Promise.all([
    prisma.conversionJob.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.findUnique({
      where: { id: documentId },
      select: { pageCount: true },
    }),
  ]);

  return {
    confidence: job?.progress ? Math.min(job.progress / 100, 1) : 0,
    engine: job?.sourceFormat ?? "unknown",
    pageCount: doc?.pageCount ?? 0,
  };
}

export async function resolvePipelineData(
  documentId: string,
  storage: IStorageRepository,
): Promise<ExportPipelineData> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { pageCount: true },
  });

  try {
    const cleanedKey = storage.ocrCleanedKey(documentId);
    const buffer = await storage.downloadFile(cleanedKey);
    const data = JSON.parse(buffer.toString("utf-8"));
    const text: string = data.text || data.raw || "";
    const words = text.split(/\s+/).filter(Boolean);
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
    const headings = (text.match(/^#{1,6}\s+/gm) || []).length;
    const totalChars = text.length;
    const garbageChars = (text.match(/[□■◆◇○●△▲▽▼]{3,}/g) || []).join("").length;
    return {
      wordCount: words.length,
      charCount: totalChars,
      headingCount: headings,
      paragraphCount: paragraphs.length,
      qualityScore: totalChars > 0 ? Math.max(0, 1 - garbageChars / totalChars) : 0,
      garbageRatio: totalChars > 0 ? garbageChars / totalChars : 0,
      pageCount: doc?.pageCount ?? 0,
    };
  } catch {
    // Fall through to defaults
  }

  return {
    wordCount: 0,
    charCount: 0,
    headingCount: 0,
    paragraphCount: 0,
    qualityScore: 0,
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
