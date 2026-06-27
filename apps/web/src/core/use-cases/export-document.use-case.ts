import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import { downloadDocumentBuffer } from "@/lib/storage-helper";
import { loadConfig, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { NotFoundError, AppError } from "@/lib/errors";
import { ERROR_CODES } from "@/lib/constants";

export class ExportDocumentUseCase {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  async execute(params: { id: string; format: string; userId: string }) {
    const { id, format, userId } = params;

    const document = await this.documentRepository.findDocumentById(id, userId);

    if (!document) {
      throw new NotFoundError();
    }

    const config = loadConfig();
    const outputKey =
      (document.outputKeys as Record<string, string>)?.[format] ||
      `${config.paths.exports}/${id}/${format === "searchable-pdf" ? "searchable.pdf" : `output.${format}`}`;

    let exists = false;
    if (!outputKey.startsWith("gdrive://")) {
      exists = await fileExists(config, outputKey);
    }

    let buffer: Buffer;
    if (!exists && !outputKey.startsWith("gdrive://")) {
      const exportKey =
        (document.outputKeys as Record<string, string>)?.[format] ||
        `${config.paths.exports}/${id}/${format === "searchable-pdf" ? "searchable.pdf" : `export.${format}`}`;
      if (exportKey.startsWith("gdrive://")) {
        buffer = await downloadDocumentBuffer(exportKey, userId, config);
      } else {
        const exportExists = await fileExists(config, exportKey);
        if (!exportExists) {
          throw new AppError("الملف جاهز للتصدير بعد", ERROR_CODES.NOT_READY, 409);
        }
        buffer = await downloadDocumentBuffer(exportKey, userId, config);
      }
    } else {
      buffer = await downloadDocumentBuffer(outputKey, userId, config);
    }

    return {
      buffer,
      document,
    };
  }
}
