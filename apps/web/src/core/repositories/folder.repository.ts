import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class FolderRepository {
  async findById(id: string, userId: string, include?: Prisma.FolderInclude) {
    return prisma.folder.findFirst({
      where: { id, userId, deletedAt: null },
      include,
    });
  }

  async findMany(userId: string, options?: Prisma.FolderFindManyArgs) {
    return prisma.folder.findMany({
      ...options,
      where: {
        ...options?.where,
        userId,
        deletedAt: null,
      },
    });
  }

  async create(data: Prisma.FolderUncheckedCreateInput) {
    return prisma.folder.create({ data });
  }

  async update(id: string, _userId: string, data: Prisma.FolderUncheckedUpdateInput) {
    return prisma.folder.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: Prisma.FolderWhereInput, data: Prisma.FolderUncheckedUpdateInput) {
    return prisma.folder.updateMany({
      where: {
        ...where,
        deletedAt: null,
      },
      data,
    });
  }

  async softDelete(id: string, _userId: string) {
    return prisma.folder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, _userId: string) {
    return prisma.folder.update({
      where: { id },
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
}

export const folderRepository = new FolderRepository();
