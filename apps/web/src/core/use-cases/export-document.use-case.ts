import { documentRepository } from "../repositories/document.repository";
import { downloadDocumentBuffer } from "@/lib/storage-helper";
import { loadConfig, fileExists } from "@ibn-al-azhar-docs/pipeline";

export class ExportDocumentUseCase {
  async execute(params: { id: string; format: string; userId: string }) {
    const { id, format, userId } = params;

    const document = await documentRepository.findDocumentById(id, userId);

    if (!document) {
      throw new Error("NOT_FOUND");
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
          throw new Error("NOT_READY");
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

export const exportDocumentUseCase = new ExportDocumentUseCase();
