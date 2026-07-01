import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import { downloadDocumentBuffer } from "@/lib/backend/storage-helper";
import { loadConfig } from "@ibn-al-azhar-docs/pipeline";
import { NotFoundError, AppError } from "@/lib/shared/errors";
import { ERROR_CODES } from "@/lib/shared/constants";

export class ExportDocumentUseCase {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly storage: IStorageRepository,
  ) {}

  async execute(params: { id: string; format: string; userId: string }) {
    const { id, format, userId } = params;

    const document = await this.documentRepository.findDocumentById(id, userId);

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
        const config = loadConfig();
        buffer = await downloadDocumentBuffer(exportKey, userId, config);
      } else {
        const exportExists = await this.storage.fileExists(exportKey);
        if (!exportExists) {
          throw new AppError("الملف جاهز للتصدير بعد", ERROR_CODES.NOT_READY, 409);
        }
        const config = loadConfig();
        buffer = await downloadDocumentBuffer(exportKey, userId, config);
      }
    } else {
      const config = loadConfig();
      buffer = await downloadDocumentBuffer(outputKey, userId, config);
    }

    return {
      buffer,
      document,
    };
  }
}
