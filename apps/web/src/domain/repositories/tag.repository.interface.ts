import type { Tag, TagDocument } from "@prisma/client";
import type { DomainTag } from "../types";

export type BatchCount = { count: number };

export interface ITagRepository {
  findFolderTags(
    userId: string,
    role: string,
    folderId: string | null,
  ): Promise<(Tag & { _count: { documents: number } })[]>;
  findTagById(id: string, userId: string, role: string): Promise<DomainTag | null>;
  findManyTagDocuments(
    tagId: string,
    documentIds: string[],
  ): Promise<Pick<TagDocument, "documentId">[]>;
  createManyTagDocuments(data: { tagId: string; documentId: string }[]): Promise<BatchCount>;
  deleteManyTagDocuments(tagId: string, documentIds: string[]): Promise<BatchCount>;
  deleteByDocumentId(documentId: string): Promise<BatchCount>;
}
