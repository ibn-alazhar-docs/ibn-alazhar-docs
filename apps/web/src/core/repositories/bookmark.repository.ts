import { PrismaClient } from "@prisma/client";
import type { IBookmarkRepository } from "@/domain/repositories/bookmark.repository.interface";

export class BookmarkRepository implements IBookmarkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isBookmarked(userId: string, documentId: string): Promise<boolean> {
    const bookmark = await this.prisma.documentBookmark.findUnique({
      where: { userId_documentId: { userId, documentId } },
      select: { id: true },
    });
    return bookmark !== null;
  }

  async toggleBookmark(userId: string, documentId: string) {
    const existing = await this.prisma.documentBookmark.findUnique({
      where: { userId_documentId: { userId, documentId } },
    });

    if (existing) {
      await this.prisma.documentBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    await this.prisma.documentBookmark.create({
      data: { userId, documentId },
    });
    return { bookmarked: true };
  }

  async getUserBookmarks(userId: string, options?: { limit?: number; offset?: number }) {
    return this.prisma.documentBookmark.findMany({
      where: { userId },
      select: {
        id: true,
        documentId: true,
        createdAt: true,
        document: {
          select: {
            id: true,
            title: true,
            fileName: true,
            status: true,
            pageCount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  async countUserBookmarks(userId: string): Promise<number> {
    return this.prisma.documentBookmark.count({ where: { userId } });
  }
}
