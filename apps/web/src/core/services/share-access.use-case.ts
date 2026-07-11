import type { IShareRepository } from "@/domain/repositories/share.repository.interface";

interface ShareAccessResult {
  share: {
    documentId: string;
    expiresAt: Date | null;
    document: Record<string, unknown>;
  };
}

export class ShareAccessUseCase {
  constructor(private readonly shareRepository: IShareRepository) {}

  async execute(
    token: string,
    documentSelect: Record<string, boolean> = {
      id: true,
      title: true,
      status: true,
      deletedAt: true,
      outputFormats: true,
      originalName: true,
    },
  ): Promise<ShareAccessResult | { error: string; status: 404 | 410 }> {
    const share = await this.shareRepository.findShareLinkByToken(token, documentSelect);

    if (!share) return { error: "Link not found", status: 404 };
    const doc = share.document as Record<string, unknown>;
    if (doc.deletedAt) return { error: "Document deleted", status: 404 };
    if (doc.status !== "COMPLETED") return { error: "Document not ready", status: 404 };
    if (share.expiresAt && new Date() > share.expiresAt)
      return { error: "Link expired", status: 410 };

    return { share: share as ShareAccessResult["share"] };
  }
}
