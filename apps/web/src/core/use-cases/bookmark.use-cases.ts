import type { AuthSession } from "@/domain/types";
import type { IBookmarkRepository } from "@/domain/repositories/bookmark.repository.interface";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import { ForbiddenError, NotFoundError } from "@/lib/shared/errors";

export interface BookmarkToggleResult {
  bookmarked: boolean;
  documentId: string;
}

export interface BookmarkListResult {
  bookmarks: Array<{
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
  }>;
  total: number;
}

export class BookmarkUseCases {
  constructor(
    private readonly bookmarkRepo: IBookmarkRepository,
    private readonly documentRepo: IDocumentRepository,
  ) {}

  async toggleBookmark(session: AuthSession, documentId: string): Promise<BookmarkToggleResult> {
    const doc = await this.documentRepo.findFirst({ id: documentId, deletedAt: null });
    if (!doc) throw new NotFoundError("Document not found");
    if (doc.userId !== session.user.id) throw new ForbiddenError("Access denied");

    const result = await this.bookmarkRepo.toggleBookmark(session.user.id, documentId);
    return { bookmarked: result.bookmarked, documentId };
  }

  async isBookmarked(session: AuthSession, documentId: string): Promise<boolean> {
    return this.bookmarkRepo.isBookmarked(session.user.id, documentId);
  }

  async getBookmarks(
    session: AuthSession,
    options?: { limit?: number; offset?: number },
  ): Promise<BookmarkListResult> {
    const [bookmarks, total] = await Promise.all([
      this.bookmarkRepo.getUserBookmarks(session.user.id, options),
      this.bookmarkRepo.countUserBookmarks(session.user.id),
    ]);
    return { bookmarks, total };
  }
}
