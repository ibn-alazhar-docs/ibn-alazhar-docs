import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { IFolderRepository } from "../../domain/repositories/folder.repository.interface";
import { AppError, NotFoundError } from "@/lib/shared/errors";

export class DocumentMoveUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly folderRepository: IFolderRepository,
  ) {}

  async moveDocument(id: string, userId: string, folderId: string | null) {
    const document = await this.documentRepository.findDocumentById(id, userId);
    if (!document) throw new NotFoundError();

    if (folderId) {
      const folder = await this.folderRepository.findById(folderId, userId);
      if (!folder) throw new AppError("المجلد غير موجود", "FOLDER_NOT_FOUND", 404);
    }

    const updated = await this.documentRepository.update(id, userId, { folderId });
    return { ...updated, fileSize: Number(updated.fileSize) };
  }

  async bulkMoveDocuments(ids: string[], userId: string, folderId: string | null) {
    const documents = await this.documentRepository.findMany({
      where: { id: { in: ids }, userId, deletedAt: null },
      select: { id: true },
    });

    if (documents.length !== ids.length) {
      throw new AppError("بعض العناصر غير موجودة", "SOME_NOT_FOUND", 404);
    }

    if (folderId) {
      const folder = await this.folderRepository.findById(folderId, userId);
      if (!folder) throw new AppError("المجلد غير موجود", "FOLDER_NOT_FOUND", 404);
    }

    const result = await this.documentRepository.updateMany(
      { id: { in: ids }, userId },
      { folderId },
    );

    return result.count;
  }
}
