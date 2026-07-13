import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { uploadMetadataSchema, validateUploadFile } from "@/shared/validators/document";
import { DashboardService } from "@/core/services/dashboard.service";
import { ERROR_CODES } from "@/shared/constants";

const MAX_UPLOAD_SIZE_MB = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 200);

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
