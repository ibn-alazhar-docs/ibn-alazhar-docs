import { PrismaClient, Prisma } from "@prisma/client";
import type { CreateFolderInput } from "@/domain/types";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";

export class FolderRepository implements IFolderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string, include?: Prisma.FolderInclude) {
    return this.prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
      include,
    });
  }

  async findWithDeleted(id: string, userId: string) {
    return this.prisma.folder.findFirst({
      where: { id, userId },
    });
  }

  async findFirst(where: Prisma.FolderWhereInput) {
    return this.prisma.folder.findFirst({ where });
  }

  async findMany(
    userIdOrOptions: string | Prisma.FolderFindManyArgs,
    options?: Prisma.FolderFindManyArgs,
  ) {
    if (typeof userIdOrOptions === "string") {
      const userId = userIdOrOptions;
      return this.prisma.folder.findMany({
        ...options,
        where: {
          ...options?.where,
          userId,
          deletedAt: null,
        },
      });
    }
    return this.prisma.folder.findMany(userIdOrOptions);
  }

  async create(data: CreateFolderInput) {
    return this.prisma.folder.create({
      data: data as Prisma.FolderUncheckedCreateInput,
    });
  }

  async update(id: string, userId: string, data: { name?: string; parentId?: string | null }) {
    return this.prisma.folder.update({
      where: { id, userId },
      data,
    });
  }

  async updateMany(where: Prisma.FolderWhereInput, data: Prisma.FolderUncheckedUpdateInput) {
    return this.prisma.folder.updateMany({
      where,
      data,
    });
  }

  async softDelete(id: string, userId: string) {
    return this.prisma.folder.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, userId: string) {
    return this.prisma.folder.update({
      where: { id, userId },
      data: { deletedAt: null },
    });
  }

  async getMaxOrder(userId: string, parentId: string | null) {
    const maxOrder = await this.prisma.folder.aggregate({
      where: { userId, parentId, deletedAt: null },
      _max: { order: true },
    });
    return maxOrder._max.order ?? -1;
  }

  async findFolderById(id: string, userId: string) {
    return this.prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async getDescendantIds(folderId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`WITH RECURSIVE descendants AS (
        SELECT id FROM folders WHERE id = ${folderId} AND "userId" = ${userId} AND "deletedAt" IS NULL
        UNION ALL
        SELECT f.id FROM folders f INNER JOIN descendants d ON f."parentId" = d.id
        WHERE f."userId" = ${userId} AND f."deletedAt" IS NULL
      ) SELECT id FROM descendants`,
    );
    return rows.map((r) => r.id);
  }

  async getAncestorDepth(folderId: string, userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ depth: bigint | null }>>(
      Prisma.sql`WITH RECURSIVE ancestors AS (
        SELECT id, "parentId", 0 AS depth FROM folders WHERE id = ${folderId} AND "userId" = ${userId} AND "deletedAt" IS NULL
        UNION ALL
        SELECT f.id, f."parentId", a.depth + 1 FROM folders f INNER JOIN ancestors a ON f.id = a."parentId"
        WHERE f."userId" = ${userId} AND f."deletedAt" IS NULL
      ) SELECT MAX(depth) AS depth FROM ancestors`,
    );
    return Number(rows[0]?.depth ?? 0);
  }

  async transaction<T>(fn: (tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }
}
