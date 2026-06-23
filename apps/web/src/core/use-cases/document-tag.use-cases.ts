import { documentRepository } from "../repositories/document.repository";
import { tagRepository } from "../repositories/tag.repository";
import { AppError, NotFoundError } from "@/lib/errors";

export class DocumentTagUseCases {
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
}

export const documentTagUseCases = new DocumentTagUseCases();
