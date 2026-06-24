import type { TagDocument } from "@prisma/client";
import type { BatchCount } from "./tag.repository.interface";

export interface ITagDocumentRepository {
  findMany(where: { documentId: string }): Promise<TagDocument[]>;
  findManyByTagId(tagId: string, documentIds: string[]): Promise<Pick<TagDocument, "documentId">[]>;
  createMany(data: { tagId: string; documentId: string }[]): Promise<BatchCount>;
  deleteMany(where: { tagId: string }): Promise<BatchCount>;
  deleteManyByDocumentIds(documentIds: string[]): Promise<BatchCount>;
}
