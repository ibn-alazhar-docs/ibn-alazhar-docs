import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { MAX_TAGS_PER_USER } from "@/lib/validators/tag";
import { ownedWhere, type AuthSession } from "@/lib/auth-guards";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";
import { prisma } from "@/lib/prisma";

export class TagUseCases {
  constructor(
    private readonly tagRepository: ITagRepository,
    private readonly tagDocumentRepository: ITagDocumentRepository,
  ) {}

  async getTags(session: AuthSession) {
    const isAdmin = session.user.role === "ADMIN";
    return this.tagRepository.findMany(isAdmin ? {} : { userId: session.user.id });
  }

  async getTagById(id: string, session: AuthSession) {
    const tag = await this.tagRepository.findFirst(ownedWhere({ id }, session));
    if (!tag) throw new NotFoundError("الوسم غير موجود");
    return tag;
  }

  async createTag(name: string, color: string | undefined, session: AuthSession) {
    const tagCount = await this.tagRepository.count({ userId: session.user.id });
    if (tagCount >= MAX_TAGS_PER_USER) {
      throw new ValidationError(`الحد الأقصى ${MAX_TAGS_PER_USER} وسم لكل مستخدم`);
    }

    const existingTag = await this.tagRepository.findFirst({
      userId: session.user.id,
      name: { equals: name, mode: "insensitive" },
    });
    if (existingTag) throw new ConflictError("يوجد وسم بهذا الاسم بالفعل");

    return this.tagRepository.create({
      userId: session.user.id,
      name,
      color: color || "#16A34A",
    });
  }

  async updateTag(id: string, data: { name?: string; color?: string }, session: AuthSession) {
    const tag = await this.tagRepository.findFirst(ownedWhere({ id }, session));
    if (!tag) throw new NotFoundError("الوسم غير موجود");

    if (data.name) {
      const existingTag = await this.tagRepository.findFirst(
        ownedWhere({ name: { equals: data.name, mode: "insensitive" }, id: { not: id } }, session),
      );
      if (existingTag) throw new ConflictError("يوجد وسم بهذا الاسم بالفعل");
    }

    return this.tagRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
    });
  }

  async deleteTag(id: string, session: AuthSession) {
    const tag = await this.tagRepository.findFirst(ownedWhere({ id }, session));
    if (!tag) throw new NotFoundError("الوسم غير موجود");

    await this.tagDocumentRepository.deleteMany({ tagId: id });
    await this.tagRepository.delete(id);
  }

  async mergeTags(sourceTagId: string, targetTagId: string, session: AuthSession) {
    if (sourceTagId === targetTagId) {
      throw new ValidationError("لا يمكن دمج الوسم مع نفسه");
    }

    const [sourceTag, targetTag] = await Promise.all([
      this.tagRepository.findFirst(ownedWhere({ id: sourceTagId }, session)),
      this.tagRepository.findFirst(ownedWhere({ id: targetTagId }, session)),
    ]);

    if (!sourceTag) throw new NotFoundError("الوسم المصدري غير موجود");
    if (!targetTag) throw new NotFoundError("الوسم الهدف غير موجود");

    const MAX_MERGE_DOCS = 10000;

    const sourceDocs = await this.tagDocumentRepository.findMany({
      where: { tagId: sourceTagId },
      take: MAX_MERGE_DOCS,
    });
    const existingTarget = await this.tagDocumentRepository.findMany({
      where: { tagId: targetTagId },
      take: MAX_MERGE_DOCS,
    });

    const existingDocIds = new Set(existingTarget.map((td) => td.documentId));
    const newDocIds = sourceDocs.map((td) => td.documentId).filter((id) => !existingDocIds.has(id));

    await prisma.$transaction(async (tx) => {
      if (newDocIds.length > 0) {
        await tx.tagDocument.createMany({
          data: newDocIds.map((documentId) => ({ tagId: targetTagId, documentId })),
        });
      }
      await tx.tagDocument.deleteMany({ where: { tagId: sourceTagId } });
      await tx.tag.delete({ where: { id: sourceTagId } });
    });

    return { affectedDocuments: newDocIds.length };
  }
}
