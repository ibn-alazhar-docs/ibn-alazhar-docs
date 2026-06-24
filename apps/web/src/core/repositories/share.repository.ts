import { prisma } from "@/lib/prisma";
import type { IShareRepository } from "@/domain/repositories/share.repository.interface";

export class ShareRepository implements IShareRepository {
  async findShareLinkByDocumentId(documentId: string, userId: string) {
    return prisma.shareLink.findFirst({
      where: { documentId, userId },
      include: { document: { select: { title: true } } },
    });
  }

  async findShareLinkByToken(token: string, documentSelect?: Record<string, boolean>) {
    return prisma.shareLink.findUnique({
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
    return prisma.shareLink.create({
      data,
    });
  }

  async updateShareLinkToken(id: string, token: string) {
    return prisma.shareLink.update({
      where: { id },
      data: { token },
    });
  }

  async deleteShareLinkByDocumentId(documentId: string, userId: string) {
    return prisma.shareLink.deleteMany({
      where: { documentId, userId },
    });
  }
}

export const shareRepository = new ShareRepository();
