import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";

export class TagRepository implements ITagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }

  async findMany(where?: Prisma.TagWhereInput, include?: Prisma.TagInclude) {
    return this.prisma.tag.findMany({
      where: where ?? {},
      include: include ?? { _count: { select: { documents: true } } },
      orderBy: { name: "asc" },
    });
  }

  async findFirst(where: Prisma.TagWhereInput, include?: Prisma.TagInclude) {
    return this.prisma.tag.findFirst({
      where,
      include: include ?? { _count: { select: { documents: true } } },
    });
  }

  async count(where: Prisma.TagWhereInput) {
    return this.prisma.tag.count({ where });
  }

  async create(data: Prisma.TagUncheckedCreateInput) {
    return this.prisma.tag.create({ data });
  }

  async update(id: string, data: Prisma.TagUncheckedUpdateInput) {
    return this.prisma.tag.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findFolderTags(userId: string, role: string, folderId: string | null) {
    const isRoot = folderId === "root";
    const whereFolder = isRoot ? { folderId: null } : { folderId };

    // كل مستخدم يرى وسومه فقط
    const where = {
      deletedAt: null,
      userId,
      ...whereFolder,
    };

    return this.prisma.tag.findMany({
      where: {
        userId,
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
    return this.prisma.tag.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async findManyTagsByIds(ids: string[], userId: string, role: string) {
    return this.prisma.tag.findMany({
      where: {
        id: { in: ids },
        userId,
      },
    });
  }

  async findManyTagDocuments(tagId: string, documentIds: string[]) {
    return this.prisma.tagDocument.findMany({
      where: {
        tagId,
        documentId: { in: documentIds },
      },
      select: { documentId: true },
    });
  }

  async createManyTagDocuments(data: { tagId: string; documentId: string }[]) {
    return this.prisma.tagDocument.createMany({ data });
  }

  async deleteManyTagDocuments(tagId: string, documentIds: string[]) {
    return this.prisma.tagDocument.deleteMany({
      where: {
        tagId,
        documentId: { in: documentIds },
      },
    });
  }

  async deleteByDocumentId(documentId: string) {
    return this.prisma.tagDocument.deleteMany({
      where: { documentId },
    });
  }
}
