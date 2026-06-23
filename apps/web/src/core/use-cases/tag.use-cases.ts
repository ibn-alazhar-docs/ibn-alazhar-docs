import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { MAX_TAGS_PER_USER } from "@/lib/validators/tag";
import { ownedWhere, type AuthSession } from "@/lib/auth-guards";

export class TagUseCases {
  async getTags(session: AuthSession) {
    const isAdmin = session.user.role === "ADMIN";
    return prisma.tag.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getTagById(id: string, session: AuthSession) {
    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id }, session),
      include: { _count: { select: { documents: true } } },
    });
    if (!tag) throw new NotFoundError("الوسم غير موجود");
    return tag;
  }

  async createTag(name: string, color: string | undefined, session: AuthSession) {
    const tagCount = await prisma.tag.count({ where: { userId: session.user.id } });
    if (tagCount >= MAX_TAGS_PER_USER) {
      throw new ValidationError(`الحد الأقصى ${MAX_TAGS_PER_USER} وسم لكل مستخدم`);
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        userId: session.user.id,
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (existingTag) throw new ConflictError("يوجد وسم بهذا الاسم بالفعل");

    return prisma.tag.create({
      data: {
        userId: session.user.id,
        name,
        color: color || "#16A34A",
      },
    });
  }

  async updateTag(id: string, data: { name?: string; color?: string }, session: AuthSession) {
    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });
    if (!tag) throw new NotFoundError("الوسم غير موجود");

    if (data.name) {
      const existingTag = await prisma.tag.findFirst({
        where: ownedWhere(
          { name: { equals: data.name, mode: "insensitive" }, id: { not: id } },
          session,
        ),
      });
      if (existingTag) throw new ConflictError("يوجد وسم بهذا الاسم بالفعل");
    }

    return prisma.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
  }

  async deleteTag(id: string, session: AuthSession) {
    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });
    if (!tag) throw new NotFoundError("الوسم غير موجود");

    await prisma.tagDocument.deleteMany({ where: { tagId: id } });
    await prisma.tag.delete({ where: { id } });
  }

  async mergeTags(sourceTagId: string, targetTagId: string, session: AuthSession) {
    if (sourceTagId === targetTagId) {
      throw new ValidationError("لا يمكن دمج الوسم مع نفسه");
    }

    const [sourceTag, targetTag] = await Promise.all([
      prisma.tag.findFirst({
        where: ownedWhere({ id: sourceTagId }, session),
        select: { id: true },
      }),
      prisma.tag.findFirst({
        where: ownedWhere({ id: targetTagId }, session),
        select: { id: true },
      }),
    ]);

    if (!sourceTag) throw new NotFoundError("الوسم المصدري غير موجود");
    if (!targetTag) throw new NotFoundError("الوسم الهدف غير موجود");

    const sourceDocs = await prisma.tagDocument.findMany({
      where: { tagId: sourceTagId },
      select: { documentId: true },
    });

    const existingTarget = await prisma.tagDocument.findMany({
      where: { tagId: targetTagId },
      select: { documentId: true },
    });

    const existingDocIds = new Set(existingTarget.map((td) => td.documentId));
    const newDocIds = sourceDocs.map((td) => td.documentId).filter((id) => !existingDocIds.has(id));

    if (newDocIds.length > 0) {
      await prisma.tagDocument.createMany({
        data: newDocIds.map((documentId) => ({ tagId: targetTagId, documentId })),
      });
    }

    await prisma.tagDocument.deleteMany({ where: { tagId: sourceTagId } });
    await prisma.tag.delete({ where: { id: sourceTagId } });

    return { affectedDocuments: newDocIds.length };
  }
}

export const tagUseCases = new TagUseCases();
