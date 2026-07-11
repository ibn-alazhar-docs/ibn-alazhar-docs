import { PrismaClient } from "@prisma/client";
import type { IShareRepository } from "@/domain/repositories/share.repository.interface";

export class ShareRepository implements IShareRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findShareLinkByDocumentId(documentId: string, userId: string) {
    return this.prisma.shareLink.findFirst({
      where: { documentId, userId, deletedAt: null },
      include: { document: { select: { title: true } } },
    });
  }

  async findShareLinkByToken(token: string, documentSelect?: Record<string, boolean>) {
    return this.prisma.shareLink.findFirst({
      where: { token, deletedAt: null },
      include: {
        document: {
          select: documentSelect ?? {
            id: true,
            title: true,
            status: true,
            deletedAt: true,
            outputFormats: true,
            originalName: true,
          },
        },
      },
    });
  }

  async createShareLink(data: {
    token: string;
    documentId: string;
    userId: string;
    expiresAt: Date | null;
  }) {
    return this.prisma.shareLink.upsert({
      where: { documentId_userId: { documentId: data.documentId, userId: data.userId } },
      create: data,
      update: { token: data.token, expiresAt: data.expiresAt, deletedAt: null },
    });
  }

  async updateShareLinkToken(id: string, token: string) {
    return this.prisma.shareLink.update({
      where: { id },
      data: { token },
    });
  }

  async deleteShareLinkByDocumentId(documentId: string, userId: string) {
    return this.prisma.shareLink.updateMany({
      where: { documentId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
