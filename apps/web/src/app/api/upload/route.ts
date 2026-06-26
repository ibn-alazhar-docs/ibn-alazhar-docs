import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_UPLOAD_SIZE_MB = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 2048);
const MAX_FILE_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const POST = withAuth(async (request, { session }) => {
  try {
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
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      if (msg === "AUTH_ERROR") {
        return NextResponse.json(
          { error: { code: "AUTH_ERROR", message: "يجب ربط حساب Google الخاص بك لرفع الملفات" } },
          { status: 400 },
        );
      }
    }
    return handleRouteError(error, "upload", "فشل رفع الملف");
  }
});
