import { documentRepository } from "../repositories/document.repository";
import { folderRepository } from "../repositories/folder.repository";
import { AppError, NotFoundError } from "@/lib/errors";

export class DocumentMoveUseCases {
  async moveDocument(id: string, userId: string, folderId: string | null) {
    const document = await documentRepository.findDocumentById(id, userId);
    if (!document) throw new NotFoundError();

    if (folderId) {
      const folder = await folderRepository.findById(folderId, userId);
      if (!folder) throw new AppError("المجلد غير موجود", "FOLDER_NOT_FOUND", 404);
    }

    const updated = await documentRepository.update(id, userId, { folderId });
    return { ...updated, fileSize: Number(updated.fileSize) };
  }

  async bulkMoveDocuments(ids: string[], userId: string, folderId: string | null) {
    const documents = await documentRepository.findMany({
      where: { id: { in: ids }, userId, deletedAt: null },
      select: { id: true },
    });

    if (documents.length !== ids.length) {
      throw new AppError("بعض العناصر غير موجودة", "SOME_NOT_FOUND", 404);
    }

    if (folderId) {
      const folder = await folderRepository.findById(folderId, userId);
      if (!folder) throw new AppError("المجلد غير موجود", "FOLDER_NOT_FOUND", 404);
    }

    const result = await documentRepository.updateMany({ id: { in: ids }, userId }, { folderId });

    return result.count;
  }
}

export const documentMoveUseCases = new DocumentMoveUseCases();
