type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, "UserId">;
export type DocumentId = Brand<string, "DocumentId">;
export type FolderId = Brand<string, "FolderId">;
export type TagId = Brand<string, "TagId">;

export const toUserId = (id: string): UserId => id as UserId;
export const toDocumentId = (id: string): DocumentId => id as DocumentId;
export const toFolderId = (id: string): FolderId => id as FolderId;
export const toTagId = (id: string): TagId => id as TagId;
