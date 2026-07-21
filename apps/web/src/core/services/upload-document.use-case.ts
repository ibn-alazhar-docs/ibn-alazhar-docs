import {
  loadConfig,
  enqueueViaDriver,
  classifyError,
  recordJobFailure,
  JOB_QUEUES,
} from "@ibn-al-azhar-docs/pipeline";
import { unlink, writeFile, mkdir, readdir } from "node:fs/promises";

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
import {
  RetryExecutor,
  DATABASE_RETRY_STRATEGY,
  REDIS_RETRY_STRATEGY,
} from "@ibn-al-azhar-docs/shared";

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
        {
          error: cause.message,
          errorStack: cause.stack,
          storageDriver: process.env.STORAGE_DRIVER,
        },
        "Storage unavailable during upload",
      );
      const wrappedError = new AppError(
        "خدمة التخزين غير متاحة حاليًا. حاول مرة أخرى بعد دقيقة.",
        ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE,
        503,
      );
      (wrappedError as Error & { cause?: Error }).cause = cause;
      throw wrappedError;
    }

    const jobId = randomUUID();
    const fileName = file.name;
    const safeName = fileName
      .replace(/[^a-zA-Z0-9._\u0600-\u06FF\u0660-\u0669-]/g, "_")
      .slice(0, 200);
    // The temp file is staged before the real storage write. On Hugging Face
    // Spaces the app runs as uid 1000 while the persistent volume (/data) is
    // prepared by the entrypoint as root, so the configured tmp dir may not
    // always be writable. Try a ordered set of candidate directories and use
    // the first one that succeeds, so a single bad path cannot block uploads.
    const baseDir = process.env.STORAGE_LOCAL_DIR || "/data";
    const candidateDirs = [
      process.env.UPLOAD_TMP_DIR,
      join(baseDir, "tmp"),
      join(baseDir, "uploads"),
      tmpdir(),
    ].filter((d): d is string => Boolean(d));

    const buffer = Buffer.from(await file.arrayBuffer());

    let tempPath: string | undefined;
    const writeAttempts: Array<{ dir: string; error: string; code?: string }> = [];
    for (const dir of candidateDirs) {
      try {
        await mkdir(dir, { recursive: true });
        const candidate = join(dir, `${jobId}_${safeName}`);
        await writeFile(candidate, buffer);
        tempPath = candidate;
        break;
      } catch (err) {
        const cause = err instanceof Error ? err : new Error(String(err));
        writeAttempts.push({
          dir,
          error: cause.message,
          code: (cause as NodeJS.ErrnoException).code,
        });
      }
    }

    if (!tempPath) {
      const summary = writeAttempts
        .map((a) => `${a.dir}: ${a.error}${a.code ? ` (${a.code})` : ""}`)
        .join(" | ");
      const cause = new Error(`All temp dirs failed: ${summary}`);
      logger.error(
        {
          error: cause.message,
          attempts: writeAttempts,
          userId,
        },
        "Temp file write failed during upload",
      );
      const wrappedError = new AppError(
        "تعذر تجهيز الملف للرفع. حاول مرة أخرى.",
        ERROR_CODES.UPLOAD_FAILED,
        500,
      );
      (wrappedError as Error & { cause?: Error }).cause = cause;
      throw wrappedError;
    }

    const storageKey = this.storage.uploadKey(userId, jobId, safeName);

    try {
      await this.storage.uploadFile(storageKey, tempPath, file.type);
    } catch (err) {
      const cause = err instanceof Error ? err : new Error(String(err));
      logger.error(
        {
          error: cause.message,
          errorStack: cause.stack,
          userId,
          storageKey,
        },
        "Storage write failed during upload",
      );
      const wrappedError = new AppError(
        "خدمة التخزين غير متاحة حاليًا. حاول مرة أخرى بعد دقيقة.",
        ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE,
        503,
      );
      (wrappedError as Error & { cause?: Error }).cause = cause;
      throw wrappedError;
    } finally {
      await unlink(tempPath).catch(() => {});
    }

    const fileExists = await this.storage.fileExists(storageKey).catch(() => false);
    if (!fileExists) {
      logger.error(
        { storageKey, tempPath, userId },
        "Upload verification failed: file not found at storage path after upload",
      );
    } else {
      logger.info({ storageKey, userId, fileName }, "Upload verified: file exists at storage path");
    }

    try {
      const uploadsDir = join(baseDir, "uploads", userId);
      const entries = await readdir(uploadsDir).catch(() => []);
      logger.info(
        { dir: uploadsDir, files: entries.slice(0, 10), total: entries.length },
        "Uploads dir listing after upload",
      );
      const tmpDir = join(baseDir, "tmp");
      const tmpEntries = await readdir(tmpDir).catch(() => []);
      logger.info(
        { dir: tmpDir, files: tmpEntries.slice(0, 10), total: tmpEntries.length },
        "Tmp dir listing after upload",
      );
    } catch (dirErr) {
      logger.warn({ error: String(dirErr) }, "Failed to list upload dirs for diagnostic");
    }

    let document;
    try {
      // Requirement 2.1: retry DB writes with exponential backoff so Neon
      // cold starts (up to 5 min) are absorbed for short outages while the
      // 10s user-facing timeout is still enforced (Requirement 2.5, 13.1).
      document = await RetryExecutor.retryWithBackoff(
        () =>
          this.documentRepository.createDocument({
            id: jobId,
            userId: userId,
            title: fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
            fileName,
            originalName: fileName,
            mimeType: file.type,
            fileSize: BigInt(file.size),
            storageKey: storageKey,
            folderId: folderId || null,
            status: "UPLOADED",
            pageRange: pageRange || null,
          }),
        DATABASE_RETRY_STRATEGY,
        { serviceName: "database", operationName: "create_document" },
      );
    } catch (error) {
      // If DB insert fails, cleanup the S3 object to prevent orphaned files.
      await this.storage.deleteFile(storageKey).catch(() => {});
      throw error;
    }

    let config;
    try {
      config = loadConfig();
    } catch (configErr) {
      logger.error(
        { error: String(configErr), storageDriver: process.env.STORAGE_DRIVER },
        "Failed to load pipeline config for enqueue",
      );
      throw new AppError(
        "تعذر تكوين خط المعالجة. تأكد من إعدادات الخادم.",
        ERROR_CODES.INTERNAL_ERROR,
        500,
      );
    }

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
      // Requirement 2.2: retry the Redis enqueue with exponential backoff so
      // transient Upstash connection/quota errors are absorbed before we fall
      // back to a delayed re-enqueue below.
      await RetryExecutor.retryWithBackoff(
        () => enqueueViaDriver(JOB_QUEUES.VALIDATION, config, job),
        REDIS_RETRY_STRATEGY,
        { serviceName: "redis", operationName: "enqueue_validation" },
      );
    } catch (err) {
      // Best-effort: schedule a delayed retry. If this also fails (e.g. Redis
      // still down) we fall through to a recoverable FAILED state.
      const error = err instanceof Error ? err : new Error(String(err));
      try {
        await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, job, { delay: 15_000 });
        // The delayed job IS queued. Keep the document in UPLOADED — that is the
        // canonical "uploaded, awaiting worker pickup" state (also what the
        // reprocess endpoint resets to before enqueuing), so we never leave a
        // "bad status" row or create a conflicting state for the worker.
        logger.warn(
          {
            requestId: undefined,
            documentId: document.id,
            jobId: job.id,
            jobName: JOB_QUEUES.VALIDATION,
            errorName: error.name,
            errorType: error.constructor?.name,
            errorMessage: error.message,
          },
          "Enqueue failed immediately — scheduled delayed retry",
        );
        return document;
      } catch (delayedErr) {
        // The file is stored and the document row exists, so we keep both and
        // mark the doc FAILED (recoverable). The user can retry from the UI via
        // the reprocess endpoint, which re-enqueues validation without re-upload.
        // No new job is created here, so a manual retry cannot double-enqueue.
        const delayedError =
          delayedErr instanceof Error ? delayedErr : new Error(String(delayedErr));
        // Structured, server-only log of the REAL failure. Never includes file
        // contents or secrets — only identifiers, the queue name and the original
        // error's name/type/message + stack trace in the server log.
        logger.error(
          {
            requestId: undefined,
            documentId: document.id,
            jobId: job.id,
            jobName: JOB_QUEUES.VALIDATION,
            errorName: error.name,
            errorType: error.constructor?.name,
            errorMessage: error.message,
            errorStack: error.stack,
            cause: (error as Error & { cause?: unknown }).cause,
            delayedErrorName: delayedError.name,
            delayedErrorMessage: delayedError.message,
            redisHost: config.redis.host,
            redisPort: config.redis.port,
            hasRedisPassword: Boolean(config.redis.password),
            redisUrl: process.env.REDIS_URL ? "set" : "unset",
          },
          "Enqueue failed during upload",
        );
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
          JOB_QUEUES.VALIDATION,
          { id: job.id, data: job, attemptsMade: 1 },
          error,
        ).catch(() => {});
        throw new AppError(
          "تم رفع الملف لكن تعذر بدء المعالجة حاليًا. يمكنك إعادة المحاولة من قائمة الملفات.",
          ERROR_CODES.UPLOAD_ENQUEUE_FAILED,
          500,
        );
      }
    }

    return document;
  }
}
