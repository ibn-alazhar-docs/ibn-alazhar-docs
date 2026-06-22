import { prisma } from "@/lib/prisma";

export class ShareRepository {
  async findShareLinkByDocumentId(documentId: string, userId: string) {
    return prisma.shareLink.findFirst({
      where: { documentId, userId },
      include: { document: { select: { title: true } } },
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
