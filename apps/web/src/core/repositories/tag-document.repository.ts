import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";

export class TagDocumentRepository implements ITagDocumentRepository {
  async findMany(args: {
    where: { documentId?: string; tagId?: string };
    include?: Prisma.TagDocumentInclude;
  }) {
    return prisma.tagDocument.findMany({
      where: args.where,
      include: args.include,
    }) as Promise<
      (import("@prisma/client").TagDocument & { document?: Record<string, unknown> })[]
    >;
  }

  async findManyByTagId(tagId: string, documentIds: string[]) {
    return prisma.tagDocument.findMany({
      where: { tagId, documentId: { in: documentIds } },
      select: { documentId: true },
    });
  }

  async createMany(data: { tagId: string; documentId: string }[]) {
    return prisma.tagDocument.createMany({ data });
  }

  async deleteMany(where: { tagId: string }) {
    return prisma.tagDocument.deleteMany({ where });
  }

  async deleteManyByDocumentIds(documentIds: string[]) {
    return prisma.tagDocument.deleteMany({
      where: { documentId: { in: documentIds } },
    });
  }
}

export const tagDocumentRepository = new TagDocumentRepository();
