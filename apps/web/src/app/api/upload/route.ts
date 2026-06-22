import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { uploadDocumentUseCase } from "@/core/use-cases/upload-document.use-case";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_UPLOAD_SIZE_MB = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 2048);
const MAX_FILE_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) {
      return unauthorizedResponse();
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

    let document;
    try {
      document = await uploadDocumentUseCase.execute({
        file,
        folderId,
        userId: session.user.id,
        pageRange,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if ((error as Error).message === "NOT_FOUND") {
          return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
            { status: 404 },
          );
        }
        if ((error as Error).message === "AUTH_ERROR") {
          return NextResponse.json(
            { error: { code: "AUTH_ERROR", message: "يجب ربط حساب Google الخاص بك لرفع الملفات" } },
            { status: 400 },
          );
        }
      }
      throw error;
    }

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
    const errMessage = error instanceof Error ? (error as Error).message : "فشل رفع الملف";
    logger.error(error, "[upload] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: errMessage } },
      { status: 500 },
    );
  }
}
