import type { IBookmarkRepository } from "../../domain/repositories/bookmark.repository.interface";
import type { AuthSession } from "@/lib/backend/auth-guards";

export class BookmarkUseCases {
  constructor(private readonly bookmarkRepository: IBookmarkRepository) {}

  async getBookmarks(session: AuthSession, options?: { limit?: number; offset?: number }) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const bookmarks = await this.bookmarkRepository.getUserBookmarks(session.user.id, {
      limit,
      offset,
    });
    const total = await this.bookmarkRepository.countUserBookmarks(session.user.id);

    return {
      bookmarks,
      total,
      limit,
      offset,
    };
  }

  async toggleBookmark(documentId: string, session: AuthSession) {
    return this.bookmarkRepository.toggleBookmark(session.user.id, documentId);
  }

  async checkBookmarkStatus(documentId: string, session: AuthSession) {
    const isBookmarked = await this.bookmarkRepository.isBookmarked(session.user.id, documentId);
    return { bookmarked: isBookmarked };
  }
}
