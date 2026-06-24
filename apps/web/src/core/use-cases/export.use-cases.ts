import { ownedWhere, isAdmin, type AuthSession } from "@/lib/auth-guards";
import { NotFoundError, AppError } from "@/lib/errors";
import { executeBulkExport } from "@/lib/export/bulk-export-helpers";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";
import { documentRepository } from "../repositories/document.repository";
import { tagRepository } from "../repositories/tag.repository";
import { folderRepository } from "../repositories/folder.repository";
import { tagDocumentRepository } from "../repositories/tag-document.repository";

type ExportOptions = {
  format: string;
  includeSource: boolean;
  profile: "research" | "archive" | "plain" | "developer";
};

export class ExportUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly tagRepository: ITagRepository,
    private readonly folderRepository: IFolderRepository,
    private readonly tagDocumentRepository: ITagDocumentRepository,
  ) {}

  async exportByTag(tagId: string, options: ExportOptions, session: AuthSession) {
    const tag = await this.tagRepository.findFirst(ownedWhere({ id: tagId }, session));
    if (!tag) throw new NotFoundError("Tag not found");

    const tagDocs = await this.tagDocumentRepository.findMany({
      where: { tagId },
      include: { document: true },
    });

    const allDocuments = tagDocs.map((td) => td.document);
    const documents = allDocuments.filter(
      (doc): doc is NonNullable<typeof doc> =>
        doc != null &&
        typeof doc === "object" &&
        "deletedAt" in doc &&
        doc.deletedAt === null &&
        (isAdmin(session) || ("userId" in doc && doc.userId === session.user.id)),
    ) as import("@prisma/client").Document[];

    if (documents.length === 0) throw new NotFoundError("No documents with this tag");

    if (options.format !== "zip") {
      throw new AppError("Tag export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Tag_${tag.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      documents,
      { ...options, userId: session.user.id },
      "exp_tag",
      zipName,
    );
  }

  async exportByFolder(
    folderId: string,
    options: ExportOptions & { recursive?: boolean },
    session: AuthSession,
  ) {
    const folder = await this.folderRepository.findFirst(ownedWhere({ id: folderId }, session));
    if (!folder) throw new NotFoundError("Folder not found");

    const folderIds: string[] = [folderId];

    if (options.recursive) {
      const childFolders = await this.folderRepository.findMany({
        where: ownedWhere({ parentId: folderId }, session),
        select: { id: true },
      });
      folderIds.push(...childFolders.map((f) => f.id));
    }

    const documents = await this.documentRepository.findMany({
      where: ownedWhere({ folderId: { in: folderIds }, deletedAt: null }, session),
    });

    if (documents.length === 0) throw new NotFoundError("Folder is empty");

    if (options.format !== "zip") {
      throw new AppError("Folder export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Folder_${folder.name}_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      documents,
      { ...options, userId: session.user.id },
      "exp_folder",
      zipName,
    );
  }

  async exportByBatch(documentIds: string[], options: ExportOptions, session: AuthSession) {
    const validDocs = await this.documentRepository.findMany({
      where: ownedWhere({ id: { in: documentIds }, deletedAt: null }, session),
    });

    if (validDocs.length === 0) throw new NotFoundError("No documents found");

    if (validDocs.length !== documentIds.length) {
      const foundIds = new Set(validDocs.map((d) => d.id));
      const missing = documentIds.filter((id) => !foundIds.has(id));
      throw new NotFoundError(`لم يتم العثور على بعض المستندات: ${missing.join(", ")}`);
    }

    if (options.format !== "zip") {
      throw new AppError("Batch export requires ZIP", "VALIDATION_ERROR", 400);
    }

    const zipName = `Export_${validDocs.length}_docs_${new Date().toISOString().split("T")[0]}.zip`;

    return executeBulkExport(
      validDocs,
      { ...options, userId: session.user.id },
      "exp_batch",
      zipName,
    );
  }
}

export const exportUseCases = new ExportUseCases(
  documentRepository,
  tagRepository,
  folderRepository,
  tagDocumentRepository,
);
