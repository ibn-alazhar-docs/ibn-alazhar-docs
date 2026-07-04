import { ownedWhere } from "@/core/authorization";
import type { AuthSession } from "@/domain/types";
import { isAdminRole } from "@/domain/auth";
import type { PrismaClient } from "@prisma/client";

export interface DocumentAnalytics {
  totalDocuments: number;
  totalSize: number;
  documentsByStatus: Array<{ status: string; count: number }>;
  documentsByMimeType: Array<{ mimeType: string; count: number; totalSize: number }>;
  uploadsOverTime: Array<{ date: string; count: number }>;
  recentActivity: Array<{ action: string; count: number; date: string }>;
}

export interface TagAnalytics {
  totalTags: number;
  topTags: Array<{ name: string; color: string; documentCount: number }>;
  unusedTags: number;
}

export interface StorageAnalytics {
  totalStorageUsed: number;
  storageByUser: Array<{
    userId: string;
    userName: string;
    totalSize: number;
    documentCount: number;
  }>;
  averageFileSize: number;
  largestDocuments: Array<{ title: string; fileSize: number; mimeType: string }>;
}

export interface AnalyticsSummary {
  documents: DocumentAnalytics;
  tags: TagAnalytics;
  storage: StorageAnalytics;
}

export class AnalyticsUseCases {
  constructor(private readonly prisma: PrismaClient) {}

  async getAnalytics(session: AuthSession, days: number = 30): Promise<AnalyticsSummary> {
    const admin = isAdminRole(session.user.role);
    const whereClause = admin ? { deletedAt: null } : ownedWhere({ deletedAt: null }, session);

    const [documents, tags, storage] = await Promise.all([
      this.getDocumentAnalytics(whereClause, days),
      this.getTagAnalytics(whereClause),
      this.getStorageAnalytics(whereClause, admin),
    ]);

    return { documents, tags, storage };
  }

  private async getDocumentAnalytics(
    whereClause: Record<string, unknown>,
    days: number,
  ): Promise<DocumentAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalDocuments,
      totalSizeResult,
      documentsByStatus,
      documentsByMimeType,
      uploadsOverTime,
      recentActivity,
    ] = await Promise.all([
      this.prisma.document.count({ where: whereClause as never }),
      this.prisma.document.aggregate({
        where: whereClause as never,
        _sum: { fileSize: true },
      }),
      this.prisma.document.groupBy({
        by: ["status"],
        where: whereClause as never,
        _count: { status: true },
      }),
      this.prisma.document.groupBy({
        by: ["mimeType"],
        where: {
          ...whereClause,
          createdAt: { gte: startDate },
        } as never,
        _count: { mimeType: true },
        _sum: { fileSize: true },
      }),
      this.getUploadsOverTime(whereClause as never, days),
      this.getRecentActivity(whereClause as never, days),
    ]);

    return {
      totalDocuments,
      totalSize: Number(totalSizeResult._sum.fileSize ?? 0),
      documentsByStatus: documentsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      documentsByMimeType: documentsByMimeType.map((item) => ({
        mimeType: item.mimeType,
        count: item._count.mimeType,
        totalSize: Number(item._sum.fileSize ?? 0),
      })),
      uploadsOverTime,
      recentActivity,
    };
  }

  private async getUploadsOverTime(
    whereClause: Record<string, unknown>,
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const uploads = await this.prisma.document.groupBy({
      by: ["createdAt"],
      where: {
        ...whereClause,
        createdAt: { gte: startDate },
      },
      _count: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const grouped: Record<string, number> = {};
    for (const upload of uploads) {
      const dateKey = upload.createdAt.toISOString().split("T")[0]!;
      grouped[dateKey] = (grouped[dateKey] ?? 0) + upload._count.createdAt;
    }

    const result: Array<{ date: string; count: number }> = [];
    const current = new Date(startDate);
    const now = new Date();

    while (current <= now) {
      const dateKey = current.toISOString().split("T")[0]!;
      result.push({ date: dateKey, count: grouped[dateKey] ?? 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  private async getRecentActivity(
    whereClause: Record<string, unknown>,
    days: number,
  ): Promise<Array<{ action: string; count: number; date: string }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activity = await this.prisma.auditLog.groupBy({
      by: ["action", "createdAt"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { action: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const grouped: Record<string, Record<string, number>> = {};
    for (const item of activity) {
      const dateKey = item.createdAt.toISOString().split("T")[0]!;
      if (!grouped[item.action]) grouped[item.action] = {};
      grouped[item.action]![dateKey] = (grouped[item.action]![dateKey] ?? 0) + item._count.action;
    }

    const result: Array<{ action: string; count: number; date: string }> = [];
    for (const [action, dates] of Object.entries(grouped)) {
      for (const [date, count] of Object.entries(dates)) {
        result.push({ action, count, date });
      }
    }

    return result.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }

  private async getTagAnalytics(whereClause: Record<string, unknown>): Promise<TagAnalytics> {
    const [totalTags, topTags, unusedTags] = await Promise.all([
      this.prisma.tag.count({ where: whereClause as never }),
      this.prisma.tag.findMany({
        where: whereClause as never,
        include: { _count: { select: { documents: true } } },
        orderBy: { documents: { _count: "desc" } },
        take: 10,
      }),
      this.prisma.tag.count({
        where: {
          ...whereClause,
          documents: { none: {} },
        } as never,
      }),
    ]);

    return {
      totalTags,
      topTags: topTags.map((tag) => ({
        name: tag.name,
        color: tag.color,
        documentCount: tag._count.documents,
      })),
      unusedTags,
    };
  }

  private async getStorageAnalytics(
    whereClause: Record<string, unknown>,
    admin: boolean,
  ): Promise<StorageAnalytics> {
    const [totalSizeResult, averageSize, largestDocs, storageByUser] = await Promise.all([
      this.prisma.document.aggregate({
        where: whereClause as never,
        _sum: { fileSize: true },
      }),
      this.prisma.document.aggregate({
        where: whereClause as never,
        _avg: { fileSize: true },
      }),
      this.prisma.document.findMany({
        where: whereClause as never,
        select: { title: true, fileSize: true, mimeType: true },
        orderBy: { fileSize: "desc" },
        take: 5,
      }),
      admin
        ? this.prisma.user.findMany({
            select: {
              id: true,
              name: true,
              _count: { select: { documents: true } },
              documents: {
                select: { fileSize: true },
                where: { deletedAt: null },
              },
            },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    return {
      totalStorageUsed: Number(totalSizeResult._sum.fileSize ?? 0),
      averageFileSize: Number(averageSize._avg.fileSize ?? 0),
      largestDocuments: largestDocs.map((doc) => ({
        title: doc.title,
        fileSize: Number(doc.fileSize),
        mimeType: doc.mimeType,
      })),
      storageByUser: storageByUser.map((user) => ({
        userId: user.id,
        userName: user.name ?? "مستخدم",
        totalSize: user.documents.reduce((sum, doc) => sum + Number(doc.fileSize), 0),
        documentCount: user._count.documents,
      })),
    };
  }
}
