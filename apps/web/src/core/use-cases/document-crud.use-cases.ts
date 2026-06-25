import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { IFolderRepository } from "../../domain/repositories/folder.repository.interface";
import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class DocumentCrudUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly folderRepository: IFolderRepository,
  ) {}

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
      this.documentRepository.findMany({
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
      this.documentRepository.count({ where }),
    ]);

    return { documents, total };
  }

  async getDocumentById(id: string, userId: string) {
    const document = await this.documentRepository.findDocumentById(id, userId, {
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
    const document = await this.documentRepository.findDocumentById(id, userId);
    if (!document) throw new NotFoundError();

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    if (data.folderId !== undefined) {
      if (data.folderId === null) {
        updateData.folderId = null;
      } else {
        const folder = await this.folderRepository.findById(data.folderId, userId);
        if (!folder) throw new AppError("المجلد غير موجود", "FOLDER_NOT_FOUND", 404);
        updateData.folderId = data.folderId;
      }
    }

    const updated = await this.documentRepository.update(id, userId, updateData);

    if (data.title !== undefined || data.description !== undefined) {
      try {
        await this.documentRepository.updateSearchVector(id, updated.title, updated.description);
      } catch (err) {
        logger.warn(err, "Search vector update failed (non-critical):");
      }
    }

    return { ...updated, fileSize: Number(updated.fileSize) };
  }

  async deleteDocument(id: string, userId: string) {
    const document = await this.documentRepository.findDocumentById(id, userId);
    if (!document) throw new NotFoundError();

    await this.documentRepository.update(id, userId, { deletedAt: new Date() });
  }

  async restoreDocument(id: string, userId: string) {
    const document = await this.documentRepository.findMany({
      where: { id, userId, deletedAt: { not: null } },
    });

    if (!document.length) throw new NotFoundError();

    const updated = await this.documentRepository.update(id, userId, { deletedAt: null });
    return { ...updated, fileSize: Number(updated.fileSize) };
  }
}
