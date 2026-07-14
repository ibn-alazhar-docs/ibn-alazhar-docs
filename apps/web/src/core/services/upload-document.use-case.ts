import {
  loadConfig,
  enqueueValidation,
  classifyError,
  recordJobFailure,
} from "@ibn-al-azhar-docs/pipeline";
import { unlink, writeFile } from "node:fs/promises";

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import { NotFoundError } from "@/shared/errors";
import { AppError } from "@/shared/errors";
import { ERROR_CODES } from "@/shared/constants";
import { logger } from "@/shared/logger";

export class UploadDocumentUseCase {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly folderRepository: IFolderRepository,
    private readonly storage: IStorageRepository,
  ) {}

  async execute(params: {
    file: File;
    folderId: string | null;
    userId: string;
    pageRange: string | null;
  }) {
    const { file, folderId, userId, pageRange } = params;

    logger.info(
      {
        userId,
        fileName: file.name,
        fileSize: file.size,
        storageDriver: process.env.STORAGE_DRIVER,
      },
      "Upload request received",
    );

    if (folderId) {
      const folder = await this.folderRepository.findFolderById(folderId, userId);
      if (!folder) {
        throw new NotFoundError();
      }
    }

    // Storage availability is checked before any file is written or any DB row
    // is created, so a failure here leaves no orphaned resources.
    try {
      logger.debug({ storageDriver: process.env.STORAGE_DRIVER }, "Ensuring storage bucket...");
      await this.storage.ensureBucket();
      logger.debug("Storage bucket ensured successfully");
    } catch (err) {
      const cause = err instanceof Error ? err : new Error(String(err));
      logger.error(
        { error: cause.message, stack: cause.stack, storageDriver: process.env.STORAGE_DRIVER },
        "Storage unavailable during upload",
      );
      throw new AppError(
        "خدمة التخزين غير متاحة حاليًا. حاول مرة أخرى بعد دقيقة.",
        ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE,
        503,
      );
    }

    const jobId = randomUUID();
    const fileName = file.name;
    const safeName = fileName
      .replace(/[^a-zA-Z0-9._\u0600-\u06FF\u0660-\u0669-]/g, "_")
      .slice(0, 200);
    const tempPath = join(tmpdir(), `${jobId}_${safeName}`);

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await writeFile(tempPath, buffer);
    } catch (err) {
      const cause = err instanceof Error ? err : new Error(String(err));
      logger.error({ error: cause.message, userId }, "Temp file write failed during upload");
      throw new AppError("تعذر تجهيز الملف للرفع. حاول مرة أخرى.", ERROR_CODES.UPLOAD_FAILED, 500);
    }

    const storageKey = this.storage.uploadKey(userId, jobId, safeName);

    try {
      await this.storage.uploadFile(storageKey, tempPath, file.type);
    } catch (err) {
      const cause = err instanceof Error ? err : new Error(String(err));
      logger.error(
        { error: cause.message, userId, storageKey },
        "Storage write failed during upload",
      );
      throw new AppError(
        "خدمة التخزين غير متاحة حاليًا. حاول مرة أخرى بعد دقيقة.",
        ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE,
        503,
      );
    } finally {
      await unlink(tempPath).catch(() => {});
    }

    let document;
    try {
      document = await this.documentRepository.createDocument({
        id: jobId,
        userId: userId,
        title: fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
        fileName,
        originalName: fileName,
        mimeType: file.type,
        fileSize: file.size,
        storageKey: storageKey,
        folderId: folderId || null,
        status: "UPLOADED",
        pageRange: pageRange || null,
      });
    } catch (error) {
      // If DB insert fails, cleanup the S3 object to prevent orphaned files.
      await this.storage.deleteFile(storageKey).catch(() => {});
      throw error;
    }

    const config = loadConfig();
    const job = {
      id: document.id,
      documentId: document.id,
      userId: document.userId,
      fileName: document.originalName,
      fileSize: Number(document.fileSize),
      mimeType: document.mimeType,
      storageKey: document.storageKey!,
      status: "pending" as const,
      progress: 0,
      createdAt: new Date().toISOString(),
      pageRange: pageRange || undefined,
    };

    try {
      await enqueueValidation(config, job);
    } catch (err) {
      // Best-effort: schedule a delayed retry. If this also fails (e.g. Redis
      // still down) we fall through to a recoverable FAILED state.
      try {
        await enqueueValidation(config, job, { delay: 15_000 });
        return document;
      } catch {
        // The file is stored and the document row exists, so we keep both and
        // mark the doc FAILED (recoverable). The user can retry from the UI via
        // the reprocess endpoint, which re-enqueues validation without re-upload.
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({ error: error.message }, "Enqueue failed during upload");
        const { code } = classifyError(error);
        await this.documentRepository
          .update(document.id, userId, {
            status: "FAILED",
            errorCode: code,
            errorMessage: error.message,
          })
          .catch(() => {});
        await recordJobFailure(
          config,
          "pipeline-validation",
          { id: job.id, data: job, attemptsMade: 1 },
          error,
        ).catch(() => {});
        throw new AppError(
          "تم رفع الملف لكن تعذر بدء المعالجة. سيتم إعادة المحاولة تلقائيًا.",
          ERROR_CODES.UPLOAD_ENQUEUE_FAILED,
          202,
        );
      }
    }

    return document;
  }
}
