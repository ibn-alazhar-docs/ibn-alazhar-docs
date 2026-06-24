import { prisma } from "@/lib/prisma";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";

export class TagRepository implements ITagRepository {
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
