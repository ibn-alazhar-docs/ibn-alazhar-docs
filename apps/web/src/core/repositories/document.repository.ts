import { prisma } from "@/lib/prisma";
import type { Document, Prisma } from "@prisma/client";

export class DocumentRepository {
  async createDocument(data: Prisma.DocumentUncheckedCreateInput): Promise<Document> {
    return prisma.document.create({
      data,
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

  async findMany(options: Prisma.DocumentFindManyArgs) {
    return prisma.document.findMany(options);
  }

  async count(options: Prisma.DocumentCountArgs) {
    return prisma.document.count(options);
  }

  async update(id: string, userId: string, data: Prisma.DocumentUncheckedUpdateInput) {
    return prisma.document.update({
      where: { id },
      data,
    });
  }

  async updateSearchVector(id: string, title?: string, description?: string | null) {
    // Only execute if title or description are changing
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

  async findFolderById(id: string, userId: string) {
    return prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async updateMany(where: Prisma.DocumentWhereInput, data: Prisma.DocumentUncheckedUpdateInput) {
    return prisma.document.updateMany({
      where,
      data,
    });
  }

  async findGoogleAccount(userId: string) {
    return prisma.account.findFirst({
      where: { userId, provider: "google" },
    });
  }
}

export const documentRepository = new DocumentRepository();
