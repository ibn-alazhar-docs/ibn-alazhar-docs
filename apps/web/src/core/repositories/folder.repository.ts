import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CreateFolderInput } from "@/domain/types";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";

export class FolderRepository implements IFolderRepository {
  async findById(id: string, userId: string, include?: Prisma.FolderInclude) {
    return prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
      include,
    });
  }

  async findWithDeleted(id: string, userId: string) {
    return prisma.folder.findFirst({
      where: { id, userId },
    });
  }

  async findFirst(where: Prisma.FolderWhereInput) {
    return prisma.folder.findFirst({ where });
  }

  async findMany(
    userIdOrOptions: string | Prisma.FolderFindManyArgs,
    options?: Prisma.FolderFindManyArgs,
  ) {
    if (typeof userIdOrOptions === "string") {
      const userId = userIdOrOptions;
      return prisma.folder.findMany({
        ...options,
        where: {
          ...options?.where,
          userId,
          deletedAt: null,
        },
      });
    }
    return prisma.folder.findMany(userIdOrOptions);
  }

  async create(data: CreateFolderInput) {
    return this.createRaw(data as unknown as Prisma.FolderUncheckedCreateInput);
  }

  async createRaw(data: Prisma.FolderUncheckedCreateInput) {
    return prisma.folder.create({ data });
  }

  async update(id: string, userId: string, data: Prisma.FolderUncheckedUpdateInput) {
    return prisma.folder.update({
      where: { id, userId },
      data,
    });
  }

  async updateMany(where: Prisma.FolderWhereInput, data: Prisma.FolderUncheckedUpdateInput) {
    return prisma.folder.updateMany({
      where,
      data,
    });
  }

  async softDelete(id: string, userId: string) {
    return prisma.folder.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, userId: string) {
    return prisma.folder.update({
      where: { id, userId },
      data: { deletedAt: null },
    });
  }

  async getMaxOrder(userId: string, parentId: string | null) {
    const maxOrder = await prisma.folder.aggregate({
      where: { userId, parentId, deletedAt: null },
      _max: { order: true },
    });
    return maxOrder._max.order ?? -1;
  }

  async findFolderById(id: string, userId: string) {
    return prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async transaction<T>(fn: (tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  }
}

export const folderRepository = new FolderRepository();
