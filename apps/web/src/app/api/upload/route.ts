import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";
import { uploadMetadataSchema, validateUploadFile } from "@/lib/shared/validators/document";

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

    const fileValidation = validateUploadFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: fileValidation.error } },
        { status: fileValidation.status },
      );
    }

    const metadataResult = uploadMetadataSchema.safeParse({ folderId, pageRange });
    if (!metadataResult.success) {
      const message = metadataResult.error.issues[0]?.message || "بيانات غير صحيحة";
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "لم يتم رفع أي ملف" } },
        { status: 400 },
      );
    }

    const document = await useCases.uploadDocument.execute({
      file,
      folderId: metadataResult.data.folderId ?? null,
      userId: session.user.id,
      pageRange: metadataResult.data.pageRange ?? null,
    });

    return NextResponse.json({
      success: true,
      jobId: document.id,
      documentId: document.id,
      fileName: document.originalName,
      fileSize: Number(document.fileSize),
      status: "pending",
      message: "تم رفع الملف بنجاح وبدء المعالجة",
    });
  } catch (error: unknown) {
    return handleRouteError(error, "upload", "فشل رفع الملف");
  }
});
