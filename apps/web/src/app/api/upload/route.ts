import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";
import { prisma } from "@/transport/db";
import { useCases } from "@/core/composition-root";
import {
  uploadMetadataSchema,
  validateUploadFile,
  MAX_UPLOAD_SIZE_MB,
} from "@/shared/validators/document";
import { DashboardService } from "@/core/services/dashboard.service";
import { ERROR_CODES } from "@/shared/constants";
import { logger } from "@/shared/logger";
import { ServiceHealthValidator, ServiceErrorType } from "@ibn-al-azhar-docs/shared";

function validateRequest(
  file: File | null,
  folderId: string | null,
  pageRange: string | null,
):
  | {
      valid: true;
      data: { file: File; metadata: { folderId?: string | null; pageRange?: string | null } };
    }
  | { valid: false; error: string; status: number; code: string } {
  if (!file) {
    return { valid: false, error: "لم يُرفق أي ملف", status: 400, code: "VALIDATION_ERROR" };
  }

  const fileValidation = validateUploadFile(file);
  if (!fileValidation.valid) {
    return {
      valid: false,
      error: fileValidation.error,
      status: fileValidation.status,
      code: fileValidation.code,
    };
  }

  const metadataResult = uploadMetadataSchema.safeParse({ folderId, pageRange });
  if (!metadataResult.success) {
    const message = metadataResult.error.issues[0]?.message || "بيانات غير صحيحة";
    return { valid: false, error: message, status: 400, code: ERROR_CODES.VALIDATION_ERROR };
  }

  return { valid: true, data: { file, metadata: metadataResult.data } };
}

export const POST = withAuth(async (request, { session }) => {
  const startedAt = Date.now();
  try {
    // CRITICAL: Verify user exists before processing upload. The JWT token may
    // contain a stale user ID (e.g. deleted user, or race with Google OAuth
    // account creation). Without this check, createDocument() fails with a
    // foreign key constraint violation.
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, deletedAt: true },
    });

    if (!userExists || userExists.deletedAt) {
      logger.warn({ userId: session.user.id }, "Upload rejected: user not found or deleted");
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: "الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.",
          },
        },
        { status: 401 },
      );
    }

    const rateLimitResult = await checkUserRateLimit("documents:create", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    // Pre-parse guard: reject oversized payloads before buffering the whole
    // body in memory (prevents OOM / DoS from a malicious Content-Length).
    const declaredLength = Number(request.headers.get("content-length") || 0);
    const hardCap = MAX_UPLOAD_SIZE_MB * 1024 * 1024 + 8 * 1024 * 1024; // file + multipart overhead
    if (declaredLength > hardCap) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
            message: `الملف أكبر من الحد المسموح (${MAX_UPLOAD_SIZE_MB}MB). يرجى تقليل الحجم أو تقسيم الملف.`,
          },
        },
        { status: 400 },
      );
    }

    // Requirement 3.1-3.5: validate that critical services (DB + storage) are
    // available before accepting the file upload. Redis is treated as optional
    // — when unavailable the rate limiter gracefully degrades to memory.
    // Runs in parallel with a 2s budget (Requirement 7.2, 7.4).
    const serviceValidation = await ServiceHealthValidator.validateAll(
      {
        database: async () => {
          await prisma.$queryRaw`SELECT 1`;
        },
        redis: async () => {
          // Redis is optional on HF Spaces — skip if not configured
          if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
            return;
          }
          const client = await getRedisClient();
          if (!client) {
            // Not configured or temporarily unavailable — non-blocking
            return;
          }
          await client.ping();
        },
        storage: async () => {
          const { access, constants } = await import("node:fs/promises");
          await access(process.env.STORAGE_LOCAL_DIR || "/data", constants.W_OK);
        },
      },
      { timeoutMs: 2000 },
    );

    if (!serviceValidation.success && serviceValidation.error) {
      const { type, message, httpStatus } = serviceValidation.error;
      const code =
        type === ServiceErrorType.DATABASE_UNAVAILABLE
          ? ERROR_CODES.DB_CONNECTION_FAILED
          : type === ServiceErrorType.REDIS_UNAVAILABLE
            ? ERROR_CODES.REDIS_UNAVAILABLE
            : type === ServiceErrorType.STORAGE_UNAVAILABLE
              ? ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE
              : ERROR_CODES.INTERNAL_ERROR;

      logger.warn(
        { service: type, userId: session.user.id },
        "Pre-upload service validation failed",
      );

      return NextResponse.json(
        {
          error: { code, message: message.ar },
          errorEn: message.en,
        },
        { status: httpStatus },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folderId") as string) || null;
    const pageRange = (formData.get("pageRange") as string) || null;

    const validation = validateRequest(file, folderId, pageRange);
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: validation.code, message: validation.error } },
        { status: validation.status },
      );
    }

    const document = await useCases.uploadDocument.execute({
      file: validation.data!.file,
      folderId: validation.data!.metadata.folderId ?? null,
      userId: session.user.id,
      pageRange: validation.data!.metadata.pageRange ?? null,
    });

    await DashboardService.trackUpload(document.id).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        jobId: document.id,
        documentId: document.id,
        fileName: document.originalName,
        fileSize: Number(document.fileSize),
        status: "pending",
        message: "رُفع الملف وبدأت المعالجة",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "upload", "تعذر رفع الملف", {
      userId: session.user.id,
      durationMs: Date.now() - startedAt,
    });
  }
});
