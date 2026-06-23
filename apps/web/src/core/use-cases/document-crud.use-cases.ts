import { documentRepository } from "../repositories/document.repository";
import { folderRepository } from "../repositories/folder.repository";
import { AppError, NotFoundError } from "@/lib/errors";

export class DocumentCrudUseCases {
  async getDocuments(
    userId: string,
    role: string,
    filters: {
      deleted?: boolean;
      folderId?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const isAdmin = role === "ADMIN";
    const where: Record<string, unknown> = {
      ...(isAdmin ? {} : { userId }),
      deletedAt: filters.deleted ? { not: null } : null,
    };

    if (filters.folderId !== undefined) {
      where.folderId = filters.folderId === "root" ? null : filters.folderId;
    }

    const [documents, total] = await Promise.all([
      documentRepository.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
        include: {
          folder: { select: { id: true, name: true } },
          tags: {
            include: { tag: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      documentRepository.count({ where }),
    ]);

    return { documents, total };
  }

  async getDocumentById(id: string, userId: string) {
    const document = await documentRepository.findDocumentById(id, userId, {
      folder: { select: { id: true, name: true } },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
    });

    if (!document) throw new NotFoundError();
    return { ...document, fileSize: Number(document.fileSize) };
  }

  async updateDocument(
    id: string,
    userId: string,
    data: { title?: string; description?: string | null; folderId?: string | null },
  ) {
    const document = await documentRepository.findDocumentById(id, userId);
    if (!document) throw new NotFoundError();

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    if (data.folderId !== undefined) {
      if (data.folderId === null) {
        updateData.folderId = null;
      } else {
        const folder = await folderRepository.findById(data.folderId, userId);
        if (!folder) throw new AppError("المجلد غير موجود", "FOLDER_NOT_FOUND", 404);
        updateData.folderId = data.folderId;
      }
    }

    const updated = await documentRepository.update(id, userId, updateData);

    if (data.title !== undefined || data.description !== undefined) {
      try {
        await documentRepository.updateSearchVector(id, updated.title, updated.description);
      } catch (err) {
        console.warn("Search vector update failed (non-critical):", err);
      }
    }

    return { ...updated, fileSize: Number(updated.fileSize) };
  }

  async deleteDocument(id: string, userId: string) {
    const document = await documentRepository.findDocumentById(id, userId);
    if (!document) throw new NotFoundError();

    await documentRepository.update(id, userId, { deletedAt: new Date() });
  }

  async restoreDocument(id: string, userId: string) {
    const document = await documentRepository.findMany({
      where: { id, userId, deletedAt: { not: null } },
    });

    if (!document.length) throw new NotFoundError();

    const updated = await documentRepository.update(id, userId, { deletedAt: null });
    return { ...updated, fileSize: Number(updated.fileSize) };
  }
}

export const documentCrudUseCases = new DocumentCrudUseCases();
