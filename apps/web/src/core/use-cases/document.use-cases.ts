import { documentRepository } from "../repositories/document.repository";
import { folderRepository } from "../repositories/folder.repository";
import { tagRepository } from "../repositories/tag.repository";
import { shareRepository } from "../repositories/share.repository";
import { randomBytes } from "crypto";
import { expirationToMs } from "@/lib/validators/share";
import { AppError, NotFoundError } from "@/lib/errors";

export class DocumentUseCases {
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

    if (filters.search) {
      // Assuming search logic is elsewhere or handled by specialized tools. We will implement simple filter here for now.
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

  async bulkTagDocuments(documentIds: string[], tagId: string, userId: string, role: string) {
    const tag = await tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", "TAG_NOT_FOUND", 404);

    const documents = await documentRepository.findMany({
      where: { id: { in: documentIds }, userId, deletedAt: null },
      select: { id: true },
    });

    if (documents.length !== documentIds.length) {
      throw new AppError("بعض العناصر غير موجودة", "SOME_NOT_FOUND", 404);
    }

    const existingAssociations = await tagRepository.findManyTagDocuments(tagId, documentIds);
    const existingSet = new Set(existingAssociations.map((e) => e.documentId));

    const newDocs = documentIds.filter((id) => !existingSet.has(id));

    if (newDocs.length > 0) {
      await tagRepository.createManyTagDocuments(
        newDocs.map((documentId) => ({ tagId, documentId })),
      );
    }

    return { taggedCount: newDocs.length, skippedCount: existingSet.size };
  }

  async bulkUntagDocuments(documentIds: string[], tagId: string, userId: string, role: string) {
    const tag = await tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", "TAG_NOT_FOUND", 404);

    const documents = await documentRepository.findMany({
      where: { id: { in: documentIds }, userId, deletedAt: null },
      select: { id: true },
    });

    if (documents.length !== documentIds.length) {
      throw new AppError("بعض العناصر غير موجودة", "SOME_NOT_FOUND", 404);
    }

    const result = await tagRepository.deleteManyTagDocuments(tagId, documentIds);
    return result.count;
  }

  async getShareLink(documentId: string, userId: string) {
    const share = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    return share;
  }

  async createShareLink(documentId: string, userId: string, expirationStr: string | null) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();
    if (document.status !== "COMPLETED")
      throw new AppError("الملف جاهز للتصدير بعد", "NOT_READY", 409);

    const existing = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (existing) return existing;

    const expirationMs = expirationToMs((expirationStr as "never" | "7days" | "30days") || null);
    const expiresAt = expirationMs ? new Date(Date.now() + expirationMs) : null;
    const token = randomBytes(32).toString("base64url");

    return shareRepository.createShareLink({
      token,
      documentId,
      userId,
      expiresAt,
    });
  }

  async regenerateShareLink(documentId: string, userId: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const existing = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (!existing) throw new AppError("لا يوجد رابط مشاركة", "NO_SHARE_LINK", 404);

    const token = randomBytes(32).toString("base64url");
    return shareRepository.updateShareLinkToken(existing.id, token);
  }

  async deleteShareLink(documentId: string, userId: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const existing = await shareRepository.findShareLinkByDocumentId(documentId, userId);
    if (!existing) throw new AppError("لا يوجد رابط مشاركة", "NO_SHARE_LINK", 404);

    await shareRepository.deleteShareLinkByDocumentId(documentId, userId);
    return true;
  }

  async getDocumentTags(documentId: string, userId: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const docWithTags = (await documentRepository.findDocumentById(documentId, userId, {
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
    })) as unknown as { tags: { tag: { id: string; name: string; color: string } }[] };

    return docWithTags.tags.map((td) => td.tag);
  }

  async addTagToDocument(documentId: string, tagId: string, userId: string, role: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const tag = await tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", "TAG_NOT_FOUND", 404);

    const existing = await tagRepository.findManyTagDocuments(tagId, [documentId]);
    if (existing.length > 0) throw new AppError("الوسم مرتبط بالفعل", "CONFLICT", 409);

    await tagRepository.createManyTagDocuments([{ tagId, documentId }]);
    return tag;
  }

  async setDocumentTags(documentId: string, tagIds: string[], userId: string, role: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    if (tagIds.length > 0) {
      const validTags = await Promise.all(
        tagIds.map((id) => tagRepository.findTagById(id, userId, role)),
      );
      if (validTags.some((t) => !t))
        throw new AppError("بعض العلامات غير موجودة", "SOME_TAGS_NOT_FOUND", 404);
    }

    // Delete existing tags. We can just use prisma since tagRepository deleteMany requires tagId.
    // For now let's just add deleteByDocumentId to tagRepository.
    await tagRepository.deleteByDocumentId(documentId);

    if (tagIds.length > 0) {
      await tagRepository.createManyTagDocuments(tagIds.map((tagId) => ({ tagId, documentId })));
    }
    return tagIds.length;
  }

  async removeTagFromDocument(documentId: string, tagId: string, userId: string, role: string) {
    const document = await documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const tag = await tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", "TAG_NOT_FOUND", 404);

    const result = await tagRepository.deleteManyTagDocuments(tagId, [documentId]);
    if (result.count === 0) throw new AppError("الوسم غير مرتبط", "TAG_NOT_ASSIGNED", 404);
    return true;
  }
}

export const documentUseCases = new DocumentUseCases();
