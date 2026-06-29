import type { Folder, Prisma } from "@prisma/client";
import type { CreateFolderInput } from "../types";

type TransactionClient = Prisma.TransactionClient;

export interface IFolderRepository {
  findById(id: string, userId: string, include?: Prisma.FolderInclude): Promise<Folder | null>;
  findWithDeleted(id: string, userId: string): Promise<Folder | null>;
  findFirst(where: Prisma.FolderWhereInput): Promise<Folder | null>;
  findMany(
    userIdOrOptions: string | Prisma.FolderFindManyArgs,
    options?: Prisma.FolderFindManyArgs,
  ): Promise<Folder[]>;
  create(data: CreateFolderInput): Promise<Folder>;
  update(
    id: string,
    userId: string,
    data: { name?: string; parentId?: string | null },
  ): Promise<Folder>;
  updateMany(
    where: Prisma.FolderWhereInput,
    data: { parentId?: string | null; order?: number },
  ): Promise<{ count: number }>;
  softDelete(id: string, userId: string): Promise<Folder>;
  restore(id: string, userId: string): Promise<Folder>;
  getMaxOrder(userId: string, parentId: string | null): Promise<number>;
  findFolderById(id: string, userId: string): Promise<Folder | null>;
  getDescendantIds(folderId: string, userId: string): Promise<string[]>;
  getAncestorDepth(folderId: string, userId: string): Promise<number>;
  transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}
