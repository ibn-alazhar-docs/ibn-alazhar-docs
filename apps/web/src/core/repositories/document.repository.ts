import { PrismaClient } from "@prisma/client";
import type { Document, Prisma } from "@prisma/client";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/domain/types";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import { NotFoundError } from "@/lib/shared/errors";

export class DocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDocument(data: CreateDocumentInput): Promise<Document> {
    return this.prisma.document.create({
      data: data as Prisma.DocumentUncheckedCreateInput,
    });
  }

  async findDocumentById(
    id: string,
    userId: string,
    include?: Prisma.DocumentInclude,
    role?: string,
  ) {
    const where: Prisma.DocumentWhereInput = {
      id,
      deletedAt: null,
    };
    if (!role || role !== "ADMIN") {
      where.userId = userId;
    }
    return this.prisma.document.findFirst({
      where,
      include,
    });
  }

  async findFirst(where: Prisma.DocumentWhereInput, select?: Prisma.DocumentSelect) {
    return this.prisma.document.findFirst({ where, select });
  }

  async findMany(options: Prisma.DocumentFindManyArgs) {
    return this.prisma.document.findMany(options);
  }

  async count(options: Prisma.DocumentCountArgs) {
    return this.prisma.document.count(options);
  }

  async update(id: string, userId: string, data: UpdateDocumentInput, role?: string) {
    if (!role || role !== "ADMIN") {
      const owned = await this.prisma.document.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!owned) throw new NotFoundError();
    }
    return this.prisma.document.update({
      where: { id },
      data: data as Prisma.DocumentUncheckedUpdateInput,
    });
  }

  async updateSearchVector(id: string, title?: string, description?: string | null) {
    return this.prisma.$executeRaw`
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
    return this.prisma.document.updateMany({
      where,
      data,
    });
  }
}
