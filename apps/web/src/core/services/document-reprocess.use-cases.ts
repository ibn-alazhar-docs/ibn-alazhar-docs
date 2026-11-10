import { loadConfig, enqueueViaDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import { ERROR_CODES } from "@/shared/constants";

export type DocumentReprocessResult =
  | { ok: true; documentId: string }
  | { ok: false; code: string; message: string; status: number };

export class DocumentReprocessUseCases {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  async reprocess(id: string, userId: string): Promise<DocumentReprocessResult> {
    const document = await this.documentRepository.findFirst(
      { id, userId, deletedAt: null },
      { id: true, status: true, fileName: true, fileSize: true, mimeType: true, storageKey: true },
    );

    if (!document) {
      return {
        ok: false,
        code: ERROR_CODES.NOT_FOUND,
        message: "الوثيقة غير موجودة",
        status: 404,
      };
    }

    if (document.status !== "FAILED" && document.status !== "UPLOADED") {
      return {
        ok: false,
        code: ERROR_CODES.CONFLICT,
        message: "الملف قيد المعالجة بالفعل ولا يمكن إعادة المحاولة الآن",
        status: 409,
      };
    }

    const reset = await this.documentRepository.resetForReprocess(id, userId);
    if (reset.count === 0) {
      return {
        ok: false,
        code: ERROR_CODES.CONFLICT,
        message: "تم بدء المعالجة بالفعل من طلب آخر",
        status: 409,
      };
    }

    const config = loadConfig();
    await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, {
      id: document.id,
      documentId: document.id,
      userId,
      fileName: document.fileName,
      fileSize: Number(document.fileSize),
      mimeType: document.mimeType,
      storageKey: document.storageKey!,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, documentId: document.id };
  }
}
