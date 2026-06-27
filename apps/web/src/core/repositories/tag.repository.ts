import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";

export class TagRepository implements ITagRepository {
  async findMany(where?: Prisma.TagWhereInput, include?: Prisma.TagInclude) {
    return prisma.tag.findMany({
      where: where ?? {},
      include: include ?? { _count: { select: { documents: true } } },
      orderBy: { name: "asc" },
    });
  }

  async findFirst(where: Prisma.TagWhereInput, include?: Prisma.TagInclude) {
    return prisma.tag.findFirst({
      where,
      include: include ?? { _count: { select: { documents: true } } },
    });
  }

  async count(where: Prisma.TagWhereInput) {
    return prisma.tag.count({ where });
  }

  async create(data: Prisma.TagUncheckedCreateInput) {
    return prisma.tag.create({ data });
  }

  async update(id: string, data: Prisma.TagUncheckedUpdateInput) {
    return prisma.tag.update({ where: { id }, data });
  }

  async delete(id: string) {
    await prisma.tag.delete({ where: { id } });
  }

  async findFolderTags(userId: string, role: string, folderId: string | null) {
    const isRoot = folderId === "root";
    const whereFolder = isRoot ? { folderId: null } : { folderId };
    const isAdmin = role === "ADMIN";

    const where = {
      deletedAt: null,
      ...whereFolder,
      ...(isAdmin ? {} : { userId }),
    };

    return prisma.tag.findMany({
      where: {
        ...(isAdmin ? {} : { userId }),
        documents: {
          some: {
            document: where,
          },
        },
      },
      include: {
        _count: {
          select: {
            documents: {
              where: {
                document: where,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findTagById(id: string, userId: string, role: string) {
    const isAdmin = role === "ADMIN";
    return prisma.tag.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId }),
      },
    });
  }

  async findManyTagsByIds(ids: string[], userId: string, role: string) {
    const isAdmin = role === "ADMIN";
    return prisma.tag.findMany({
      where: {
        id: { in: ids },
        ...(isAdmin ? {} : { userId }),
      },
    });
  }

  async findManyTagDocuments(tagId: string, documentIds: string[]) {
    return prisma.tagDocument.findMany({
      where: {
        tagId,
        documentId: { in: documentIds },
      },
      select: { documentId: true },
    });
  }

  async createManyTagDocuments(data: { tagId: string; documentId: string }[]) {
    return prisma.tagDocument.createMany({ data });
  }

  async deleteManyTagDocuments(tagId: string, documentIds: string[]) {
    return prisma.tagDocument.deleteMany({
      where: {
        tagId,
        documentId: { in: documentIds },
      },
    });
  }

  async deleteByDocumentId(documentId: string) {
    return prisma.tagDocument.deleteMany({
      where: { documentId },
    });
  }
}

export const tagRepository = new TagRepository();
