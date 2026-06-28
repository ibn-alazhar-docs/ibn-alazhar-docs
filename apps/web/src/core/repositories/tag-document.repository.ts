import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";

export class TagDocumentRepository implements ITagDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }

  async findMany(args: {
    where: { documentId?: string; tagId?: string };
    include?: Prisma.TagDocumentInclude;
    take?: number;
  }) {
    return this.prisma.tagDocument.findMany({
      where: args.where,
      include: args.include,
      take: args.take,
    }) as Promise<(import("@prisma/client").TagDocument & Record<string, unknown>)[]>;
  }

  async findManyByTagId(tagId: string, documentIds: string[]) {
    return this.prisma.tagDocument.findMany({
      where: { tagId, documentId: { in: documentIds } },
      select: { documentId: true },
    });
  }

  async createMany(data: { tagId: string; documentId: string }[]) {
    return this.prisma.tagDocument.createMany({ data });
  }

  async deleteMany(where: { tagId: string }) {
    return this.prisma.tagDocument.deleteMany({ where });
  }

  async deleteManyByDocumentIds(documentIds: string[]) {
    return this.prisma.tagDocument.deleteMany({
      where: { documentId: { in: documentIds } },
    });
  }
}
