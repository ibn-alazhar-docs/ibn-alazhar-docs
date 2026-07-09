import type { IDocumentRepository } from "../../domain/repositories/document.repository.interface";
import type { ITagRepository } from "../../domain/repositories/tag.repository.interface";
import type { ITagDocumentRepository } from "../../domain/repositories/tag-document.repository.interface";
import { AppError, NotFoundError } from "@/shared/errors";
import { ERROR_CODES } from "@/shared/constants";

interface DocumentWithTags {
  tags: { tag: { id: string; name: string; color: string } }[];
}

export class DocumentTagUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly tagRepository: ITagRepository,
    private readonly tagDocumentRepository: ITagDocumentRepository,
  ) {}

  async getDocumentTags(documentId: string, userId: string) {
    const docWithTags = (await this.documentRepository.findDocumentById(documentId, userId, {
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
    })) as DocumentWithTags | null;

    if (!docWithTags) throw new NotFoundError();

    return docWithTags.tags.map((td) => td.tag);
  }

  async addTagToDocument(documentId: string, tagId: string, userId: string, role: string) {
    const document = await this.documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const tag = await this.tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", ERROR_CODES.TAG_NOT_FOUND, 404);

    const existing = await this.tagRepository.findManyTagDocuments(tagId, [documentId]);
    if (existing.length > 0) throw new AppError("الوسم مرتبط بالفعل", ERROR_CODES.CONFLICT, 409);

    await this.tagRepository.createManyTagDocuments([{ tagId, documentId }]);
    return tag;
  }

  async setDocumentTags(documentId: string, tagIds: string[], userId: string, role: string) {
    const document = await this.documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    if (tagIds.length > 0) {
      const validTags = await this.tagRepository.findManyTagsByIds(tagIds, userId, role);
      if (validTags.length !== tagIds.length)
        throw new AppError("بعض العلامات غير موجودة", ERROR_CODES.SOME_TAGS_NOT_FOUND, 404);
    }

    await this.tagDocumentRepository.transaction(async (tx) => {
      await tx.tagDocument.deleteMany({ where: { documentId } });

      if (tagIds.length > 0) {
        await tx.tagDocument.createMany({
          data: tagIds.map((tagId) => ({ tagId, documentId })),
        });
      }
    });
    return tagIds.length;
  }

  async removeTagFromDocument(documentId: string, tagId: string, userId: string, role: string) {
    const document = await this.documentRepository.findDocumentById(documentId, userId);
    if (!document) throw new NotFoundError();

    const tag = await this.tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", ERROR_CODES.TAG_NOT_FOUND, 404);

    const result = await this.tagRepository.deleteManyTagDocuments(tagId, [documentId]);
    if (result.count === 0)
      throw new AppError("الوسم غير مرتبط", ERROR_CODES.TAG_NOT_ASSIGNED, 404);
    return true;
  }

  async bulkTagDocuments(documentIds: string[], tagId: string, userId: string, role: string) {
    const tag = await this.tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", ERROR_CODES.TAG_NOT_FOUND, 404);

    const documents = await this.documentRepository.findMany({
      where: { id: { in: documentIds }, userId, deletedAt: null },
      select: { id: true },
    });

    if (documents.length !== documentIds.length) {
      throw new AppError("بعض العناصر غير موجودة", ERROR_CODES.SOME_NOT_FOUND, 404);
    }

    const existingAssociations = await this.tagRepository.findManyTagDocuments(tagId, documentIds);
    const existingSet = new Set(existingAssociations.map((e) => e.documentId));

    const newDocs = documentIds.filter((id) => !existingSet.has(id));

    if (newDocs.length > 0) {
      await this.tagRepository.createManyTagDocuments(
        newDocs.map((documentId) => ({ tagId, documentId })),
      );
    }

    return { taggedCount: newDocs.length, skippedCount: existingSet.size };
  }

  async bulkUntagDocuments(documentIds: string[], tagId: string, userId: string, role: string) {
    const tag = await this.tagRepository.findTagById(tagId, userId, role);
    if (!tag) throw new AppError("الوسم غير موجود", ERROR_CODES.TAG_NOT_FOUND, 404);

    const documents = await this.documentRepository.findMany({
      where: { id: { in: documentIds }, userId, deletedAt: null },
      select: { id: true },
    });

    if (documents.length !== documentIds.length) {
      throw new AppError("بعض العناصر غير موجودة", ERROR_CODES.SOME_NOT_FOUND, 404);
    }

    const result = await this.tagRepository.deleteManyTagDocuments(tagId, documentIds);
    return result.count;
  }
}
