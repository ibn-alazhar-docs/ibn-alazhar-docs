import { prisma } from "@/transport/db";

export interface TestFixtures {
  documentId: string | null;
  folderId: string | null;
  tagId: string | null;
  shareToken: string | null;
  conversionJobId: string | null;
}

export class TestFixturesUseCases {
  async getFixtures(): Promise<TestFixtures> {
    const [document, folder, tag, share, conversionJob] = await Promise.all([
      prisma.document.findFirst({ select: { id: true } }),
      prisma.folder.findFirst({ select: { id: true } }),
      prisma.tag.findFirst({ select: { id: true } }),
      prisma.shareLink.findFirst({ select: { token: true } }),
      prisma.conversionJob.findFirst({ select: { id: true } }),
    ]);

    return {
      documentId: document?.id || null,
      folderId: folder?.id || null,
      tagId: tag?.id || null,
      shareToken: share?.token || null,
      conversionJobId: conversionJob?.id || null,
    };
  }
}

export const testFixturesUseCases = new TestFixturesUseCases();
