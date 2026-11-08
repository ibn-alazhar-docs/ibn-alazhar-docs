import type { IShareRepository } from "@/domain/repositories/share.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";
import {
  contentDispositionHeader,
  sanitizeTitle,
  getContentType,
} from "@/core/services/export/profiles";

interface ShareAccessResult {
  share: {
    documentId: string;
    expiresAt: Date | null;
    document: Record<string, unknown>;
  };
}

export class ShareAccessUseCase {
  constructor(
    private readonly shareRepository: IShareRepository,
    private readonly storage: IStorageRepository,
    private readonly tagDocumentRepository: ITagDocumentRepository,
    private readonly folderRepository: IFolderRepository,
  ) {}

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

  async getPublicContent(token: string, documentSelect: Record<string, boolean>) {
    const result = await this.execute(token, documentSelect);
    if ("error" in result) return result;

    const { share } = result;

    const tags = await this.tagDocumentRepository.findMany({
      where: { documentId: share.documentId },
      include: { tag: { select: { name: true, color: true } } },
    });

    let markdown = "";
    let rawText = "";

    const ocrKey = this.storage.ocrTextKey(share.documentId);
    const ocrExists = await this.storage.fileExists(ocrKey);
    if (ocrExists) {
      const ocrBuffer = await this.storage.downloadFile(ocrKey);
      try {
        const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
        rawText = ocrData.text || "";
      } catch {
        rawText = "";
      }
    }

    const mdKey = this.storage.exportOutputKey(share.documentId, "md");
    const mdExists = await this.storage.fileExists(mdKey);
    if (mdExists) {
      const buffer = await this.storage.downloadFile(mdKey);
      markdown = buffer.toString("utf-8");
      if (!rawText) rawText = markdown;
    }

    const folder = share.document
      ? await this.folderRepository.findFirst({
          documents: { some: { id: share.documentId } },
        })
      : null;

    return { share, tags, markdown, rawText, folderName: folder?.name ?? null };
  }

  async getExportFile(token: string, format: string) {
    const result = await this.execute(token);
    if ("error" in result) return result;

    const { share } = result;
    const doc = share.document as { title: string };

    const outputKey = this.storage.exportOutputKey(share.documentId, format);
    const exists = await this.storage.fileExists(outputKey);

    if (!exists) {
      const altKey = this.storage.exportCacheKey(share.documentId, format);
      const altExists = await this.storage.fileExists(altKey);
      if (!altExists) {
        return { error: "Export not ready", status: 404 as const };
      }
      const altBuffer = await this.storage.downloadFile(altKey);
      const altFilename = `${sanitizeTitle(doc.title)}.${format === "searchable-pdf" ? "pdf" : format}`;
      return {
        buffer: altBuffer,
        filename: altFilename,
        contentType: getContentType(format),
        disposition: contentDispositionHeader(altFilename),
      };
    }

    const buffer = await this.storage.downloadFile(outputKey);
    const filename = `${sanitizeTitle(doc.title)}.${format === "searchable-pdf" ? "pdf" : format}`;
    return {
      buffer,
      filename,
      contentType: getContentType(format),
      disposition: contentDispositionHeader(filename),
    };
  }
}
