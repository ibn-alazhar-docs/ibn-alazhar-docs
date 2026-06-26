import { prisma } from "@/lib/prisma";
import type { Document, Prisma } from "@prisma/client";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/domain/types";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";

export class DocumentRepository implements IDocumentRepository {
  async createDocument(data: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: data as unknown as Prisma.DocumentUncheckedCreateInput,
    });
  }

  async findDocumentById(id: string, userId: string, include?: Prisma.DocumentInclude) {
    return prisma.document.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include,
    });
  }

  async findFirst(where: Prisma.DocumentWhereInput, select?: Prisma.DocumentSelect) {
    return prisma.document.findFirst({ where, select });
  }

  async findMany(options: Prisma.DocumentFindManyArgs) {
    return prisma.document.findMany(options);
  }

  async count(options: Prisma.DocumentCountArgs) {
    return prisma.document.count(options);
  }

  async update(id: string, userId: string, data: UpdateDocumentInput) {
    return prisma.document.update({
      where: { id, userId },
      data: data as unknown as Prisma.DocumentUncheckedUpdateInput,
    });
  }

  async updateSearchVector(id: string, title?: string, description?: string | null) {
    return prisma.$executeRaw`
      UPDATE documents
      SET searchvector =
        setweight(to_tsvector('simple', coalesce(${title || ""}, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("fileName", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(${description || ""}, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce((SELECT searchpreview FROM documents WHERE id = ${id}), '')), 'D')
      WHERE id = ${id}
    `;
  }

  async updateMany(where: Prisma.DocumentWhereInput, data: Prisma.DocumentUncheckedUpdateInput) {
    return prisma.document.updateMany({
      where,
      data,
    });
  }
}

export const documentRepository = new DocumentRepository();
