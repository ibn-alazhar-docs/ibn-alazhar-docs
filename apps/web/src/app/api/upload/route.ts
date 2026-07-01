import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_UPLOAD_SIZE_MB = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 50);
const MAX_FILE_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const CUID_REGEX = /^c[a-z0-9]{23,29}$/i;

export const POST = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkRateLimit("/api/upload", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folderId") as string) || null;
    const pageRange = (formData.get("pageRange") as string) || null;

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "لم يتم رفع أي ملف" } },
        { status: 400 },
      );
    }

    if (folderId && !CUID_REGEX.test(folderId)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "معرف المجلد غير صالح" } },
        { status: 400 },
      );
    }

    if (pageRange && !/^\d+(-\d+)?$/.test(pageRange)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "نطاق الصفحات غير صالح" } },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "نوع الملف غير مدعوم. يرجى رفع PDF أو JPG أو PNG",
          },
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `حجم الملف يتجاوز الحد المسموح (${MAX_UPLOAD_SIZE_MB}MB)`,
          },
        },
        { status: 400 },
      );
    }

    const document = await useCases.uploadDocument.execute({
      file,
      folderId,
      userId: session.user.id,
      pageRange,
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
