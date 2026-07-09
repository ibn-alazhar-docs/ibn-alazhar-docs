import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import type { DocumentDownloadUseCase } from "./document-download.use-case";
import { NotFoundError, AppError } from "@/shared/errors";
import { ERROR_CODES } from "@/shared/constants";

export class ExportDocumentUseCase {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly storage: IStorageRepository,
    private readonly documentDownload: DocumentDownloadUseCase,
  ) {}

  async execute(params: { id: string; format: string; userId: string; userRole?: string }) {
    const { id, format, userId, userRole } = params;

    const document = await this.documentRepository.findDocumentById(id, userId, undefined, userRole);

    if (!document) {
      throw new NotFoundError();
    }

    const outputKey =
      (document.outputKeys as Record<string, string>)?.[format] ||
      (format === "searchable-pdf"
        ? this.storage.searchablePdfKey(id)
        : this.storage.exportOutputKey(id, format));

    let exists = false;
    if (!outputKey.startsWith("gdrive://")) {
      exists = await this.storage.fileExists(outputKey);
    }

    let buffer: Buffer;
    if (!exists && !outputKey.startsWith("gdrive://")) {
      const exportKey =
        (document.outputKeys as Record<string, string>)?.[format] ||
        (format === "searchable-pdf"
          ? this.storage.searchablePdfKey(id)
          : this.storage.exportCacheKey(id, format));
      if (exportKey.startsWith("gdrive://")) {
        buffer = await this.documentDownload.execute(exportKey, userId);
      } else {
        const exportExists = await this.storage.fileExists(exportKey);
        if (!exportExists) {
          throw new AppError("الملف جاهز للتصدير بعد", ERROR_CODES.NOT_READY, 409);
        }
        buffer = await this.documentDownload.execute(exportKey, userId);
      }
    } else {
      buffer = await this.documentDownload.execute(outputKey, userId);
    }

    return {
      buffer,
      document,
    };
  }
}
