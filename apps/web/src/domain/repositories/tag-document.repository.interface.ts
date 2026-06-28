import type { TagDocument, Prisma } from "@prisma/client";
import type { BatchCount } from "./tag.repository.interface";

export interface ITagDocumentRepository {
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  findMany(args: {
    where: { documentId?: string; tagId?: string };
    include?: Prisma.TagDocumentInclude;
    take?: number;
  }): Promise<(TagDocument & Record<string, unknown>)[]>;
  findManyByTagId(tagId: string, documentIds: string[]): Promise<Pick<TagDocument, "documentId">[]>;
  createMany(data: { tagId: string; documentId: string }[]): Promise<BatchCount>;
  deleteMany(where: { tagId: string }): Promise<BatchCount>;
  deleteManyByDocumentIds(documentIds: string[]): Promise<BatchCount>;
}
