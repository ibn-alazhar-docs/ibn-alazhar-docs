import type { Tag, TagDocument, Prisma } from "@prisma/client";
import type { DomainTag } from "../types";

export type BatchCount = { count: number };

export interface ITagRepository {
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  findMany(
    where?: Prisma.TagWhereInput,
    include?: Prisma.TagInclude,
  ): Promise<(Tag & { _count: { documents: number } })[]>;
  findFirst(
    where: Prisma.TagWhereInput,
    include?: Prisma.TagInclude,
  ): Promise<(Tag & { _count: { documents: number } }) | null>;
  count(where: Prisma.TagWhereInput): Promise<number>;
  create(data: Prisma.TagUncheckedCreateInput): Promise<Tag>;
  update(id: string, data: Prisma.TagUncheckedUpdateInput): Promise<Tag>;
  delete(id: string): Promise<void>;
  findFolderTags(
    userId: string,
    role: string,
    folderId: string | null,
  ): Promise<(Tag & { _count: { documents: number } })[]>;
  findTagById(id: string, userId: string, role: string): Promise<DomainTag | null>;
  findManyTagsByIds(ids: string[], userId: string, role: string): Promise<DomainTag[]>;
  findManyTagDocuments(
    tagId: string,
    documentIds: string[],
  ): Promise<Pick<TagDocument, "documentId">[]>;
  createManyTagDocuments(data: { tagId: string; documentId: string }[]): Promise<BatchCount>;
  deleteManyTagDocuments(tagId: string, documentIds: string[]): Promise<BatchCount>;
  deleteByDocumentId(documentId: string): Promise<BatchCount>;
}
