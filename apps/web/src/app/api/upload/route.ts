import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";
import { uploadMetadataSchema, validateUploadFile } from "@/lib/shared/validators/document";
import { DashboardService } from "@/lib/backend/services/dashboard.service";

function validateRequest(file: File | null, folderId: string | null, pageRange: string | null) {
  const fileValidation = validateUploadFile(file);
  if (!fileValidation.valid) {
    return { valid: false, error: fileValidation.error, status: fileValidation.status };
  }

  const metadataResult = uploadMetadataSchema.safeParse({ folderId, pageRange });
  if (!metadataResult.success) {
    const message = metadataResult.error.issues[0]?.message || "بيانات غير صحيحة";
    return { valid: false, error: message, status: 400 };
  }

  if (!file) {
    return { valid: false, error: "لم يُرفع أي ملف", status: 400 };
  }

  return { valid: true, data: { file, metadata: metadataResult.data } };
}

export const POST = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkUserRateLimit("documents:create", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folderId") as string) || null;
    const pageRange = (formData.get("pageRange") as string) || null;

    const validation = validateRequest(file, folderId, pageRange);
    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: validation.error } },
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
    return handleRouteError(error, "upload", "تعذر رفع الملف");
  }
});
