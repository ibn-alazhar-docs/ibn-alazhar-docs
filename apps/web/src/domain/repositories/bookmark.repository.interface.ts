export interface BookmarkInfo {
  id: string;
  userId: string;
  documentId: string;
  createdAt: Date;
}

export interface DocumentBookmarkWithDoc {
  id: string;
  documentId: string;
  createdAt: Date;
  document: {
    id: string;
    title: string;
    fileName: string;
    status: string;
    pageCount: number | null;
    createdAt: Date;
  };
}

export interface IBookmarkRepository {
  isBookmarked(userId: string, documentId: string): Promise<boolean>;
  toggleBookmark(userId: string, documentId: string): Promise<{ bookmarked: boolean }>;
  getUserBookmarks(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DocumentBookmarkWithDoc[]>;
  countUserBookmarks(userId: string): Promise<number>;
}
