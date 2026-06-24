import type { Folder, Prisma } from "@prisma/client";
import type { CreateFolderInput } from "../types";

export interface IFolderRepository {
  findById(id: string, userId: string, include?: Prisma.FolderInclude): Promise<Folder | null>;
  findWithDeleted(id: string, userId: string): Promise<Folder | null>;
  findFirst(where: Prisma.FolderWhereInput): Promise<Folder | null>;
  findMany(userIdOrOptions: string | Prisma.FolderFindManyArgs): Promise<Folder[]>;
  create(data: CreateFolderInput): Promise<Folder>;
  createRaw(data: Prisma.FolderUncheckedCreateInput): Promise<Folder>;
  update(id: string, userId: string, data: Prisma.FolderUncheckedUpdateInput): Promise<Folder>;
  updateMany(
    where: Prisma.FolderWhereInput,
    data: Prisma.FolderUncheckedUpdateInput,
  ): Promise<Prisma.BatchPayload>;
  softDelete(id: string, userId: string): Promise<Folder>;
  restore(id: string, userId: string): Promise<Folder>;
  getMaxOrder(userId: string, parentId: string | null): Promise<number>;
  findFolderById(id: string, userId: string): Promise<Folder | null>;
}
