import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { IFolderRepository } from "../../domain/repositories/folder.repository.interface";
import type { Prisma } from "@prisma/client";
import { AppError, NotFoundError } from "@/shared/errors";
import { ERROR_CODES } from "@/shared/constants";
import { isAdminRole } from "@/domain/auth";
import { logger } from "@/shared/logger";

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
    const admin = isAdminRole(role);
    const where: Prisma.DocumentWhereInput = {
      ...(admin ? {} : { userId }),
      deletedAt: filters.deleted ? { not: null } : null,
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

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

  async getDocumentById(id: string, userId: string, role?: string) {
    const document = await this.documentRepository.findDocumentById(
      id,
      userId,
      {
        folder: { select: { id: true, name: true } },
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
      role,
    );

    if (!document) throw new NotFoundError();
    return { ...document, fileSize: Number(document.fileSize) };
  }

  async updateDocument(
    id: string,
    userId: string,
    data: { title?: string; description?: string | null; folderId?: string | null },
    role?: string,
  ) {
    const document = await this.documentRepository.findDocumentById(id, userId, undefined, role);
    if (!document) throw new NotFoundError();

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    if (data.folderId !== undefined) {
      if (data.folderId === null) {
        updateData.folderId = null;
      } else {
        const folder = await this.folderRepository.findById(data.folderId, userId);
        if (!folder) throw new AppError("المجلد غير موجود", ERROR_CODES.FOLDER_NOT_FOUND, 404);
        updateData.folderId = data.folderId;
      }
    }

    const updated = await this.documentRepository.update(id, userId, updateData, role);

    if (data.title !== undefined || data.description !== undefined) {
      try {
        await this.documentRepository.updateSearchVector(id, updated.title, updated.description);
      } catch (err) {
        logger.warn(err, "Search vector update failed (non-critical):");
      }
    }

    return { ...updated, fileSize: Number(updated.fileSize) };
  }

  async bulkDeleteDocuments(ids: string[], userId: string, role?: string) {
    const admin = role ? isAdminRole(role) : false;
    const where: Prisma.DocumentWhereInput = {
      id: { in: ids },
      deletedAt: null,
    };
    if (!admin) {
      where.userId = userId;
    }
    const documents = await this.documentRepository.findMany({
      where,
      select: { id: true },
    });

    if (documents.length === 0) return 0;

    const foundIds = documents.map((d) => d.id);
    const updateWhere: Prisma.DocumentWhereInput = { id: { in: foundIds } };
    if (!admin) {
      updateWhere.userId = userId;
    }
    const { count } = await this.documentRepository.updateMany(updateWhere, {
      deletedAt: new Date(),
    });
    return count;
  }

  async deleteDocument(id: string, userId: string, role?: string) {
    const document = await this.documentRepository.findDocumentById(id, userId, undefined, role);
    if (!document) throw new NotFoundError();

    await this.documentRepository.update(id, userId, { deletedAt: new Date() }, role);
  }

  async restoreDocument(id: string, userId: string) {
    const documentList = await this.documentRepository.findMany({
      where: { id, userId, deletedAt: { not: null } },
      select: { id: true, folderId: true },
    });

    const doc = documentList[0];
    if (!doc) throw new NotFoundError();

    let newFolderId = doc.folderId;
    if (newFolderId) {
      const folder = await this.folderRepository.findById(newFolderId, userId);
      if (!folder || folder.deletedAt) {
        newFolderId = null;
      }
    }

    const updated = await this.documentRepository.update(id, userId, {
      deletedAt: null,
      folderId: newFolderId,
    });
    return { ...updated, fileSize: Number(updated.fileSize) };
  }
}
