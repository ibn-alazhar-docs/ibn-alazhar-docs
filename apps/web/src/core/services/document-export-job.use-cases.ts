import { loadConfig, enqueueViaDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";
import type { IAccountRepository } from "@/domain/repositories/account.repository.interface";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";

export type ExportFormat = "md" | "txt" | "docx" | "epub" | "json" | "pdf" | "searchable-pdf";

export interface ExportOptions {
  destination?: "local" | "drive";
  profile?: "research" | "archive" | "plain" | "developer";
  fontSize?: number;
  watermark?: string;
}

export type DocumentExportJobResult =
  | { ok: true; jobId: string; message: "Export job enqueued" }
  | { ok: true; jobId: string; message: "Export ready" }
  | { ok: false; code: string; message: string; status: number };

export class DocumentExportJobUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly accountRepository: IAccountRepository,
  ) {}

  async enqueueExport(
    id: string,
    userId: string,
    format: ExportFormat,
    options: ExportOptions | undefined,
    userRole?: string,
  ): Promise<DocumentExportJobResult> {
    const document = await this.documentRepository.findDocumentById(
      id,
      userId,
      undefined,
      userRole,
    );

    if (!document || document.status !== "COMPLETED") {
      return {
        ok: false,
        code: "BAD_REQUEST",
        message: "معالجة المستند لم تكتمل بعد",
        status: 400,
      };
    }

    if (options?.destination === "drive") {
      const account = await this.accountRepository.findGoogleAccount(userId);
      if (!account || !account.access_token || !account.refresh_token) {
        return {
          ok: false,
          code: "NOT_LINKED",
          message: "يجب ربط حساب Google من الإعدادات أولاً لتتمكن من التصدير إلى Drive.",
          status: 400,
        };
      }
    }

    if (format === "searchable-pdf") {
      const existingKey = (document.outputKeys as Record<string, string> | null)?.[format];
      if (!existingKey) {
        return {
          ok: false,
          code: "NOT_READY",
          message: "لم يُنشأ ملف PDF المطابق للأصل لهذا المستند.",
          status: 409,
        };
      }
      return { ok: true, jobId: document.id, message: "Export ready" };
    }

    const config = loadConfig();
    const jobId = document.id;
    const textKey = `${config.paths.ocrResults}/${document.id}/cleaned.json`;
    const outputKey = `${config.paths.exports}/${document.id}/export.${format}`;

    await enqueueViaDriver(JOB_QUEUES.EXPORT, config, {
      jobId,
      documentId: document.id,
      userId,
      format: format as "md" | "txt" | "docx" | "epub" | "json" | "pdf",
      textKey,
      outputKey,
      pageCount: document.pageCount || undefined,
      options,
    });

    const freshKeys = { ...((document.outputKeys as Record<string, string>) || {}) };
    delete freshKeys[format];
    await this.documentRepository.updateMany({ id: document.id }, { outputKeys: freshKeys });

    return { ok: true, jobId, message: "Export job enqueued" };
  }
}
