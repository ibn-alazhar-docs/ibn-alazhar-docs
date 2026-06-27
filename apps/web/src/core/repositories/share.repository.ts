import { PrismaClient } from "@prisma/client";
import type { IShareRepository } from "@/domain/repositories/share.repository.interface";

export class ShareRepository implements IShareRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findShareLinkByDocumentId(documentId: string, userId: string) {
    return this.prisma.shareLink.findFirst({
      where: { documentId, userId },
      include: { document: { select: { title: true } } },
    });
  }

  async findShareLinkByToken(token: string, documentSelect?: Record<string, boolean>) {
    return this.prisma.shareLink.findUnique({
      where: { token },
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
    return this.prisma.shareLink.create({
      data,
    });
  }

  async updateShareLinkToken(id: string, token: string) {
    return this.prisma.shareLink.update({
      where: { id },
      data: { token },
    });
  }

  async deleteShareLinkByDocumentId(documentId: string, userId: string) {
    return this.prisma.shareLink.deleteMany({
      where: { documentId, userId },
    });
  }
}
