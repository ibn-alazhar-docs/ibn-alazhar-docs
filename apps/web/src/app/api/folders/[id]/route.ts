import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { renameFolderSchema } from "@/lib/validators/folder";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { getErrorMessage } from "@/lib/errors";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id!;

    try {
      const folder = await folderUseCases.getFolderById(id, session.user.id);
      return NextResponse.json({ folder }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/GET", "فشل الحصول على المجلد");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id!;
    const body = await request.json();
    const validation = renameFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    try {
      const updated = await folderUseCases.renameFolder(id, session.user.id, validation.data.name);
      return NextResponse.json({ folder: updated });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/PATCH", "فشل تحديث المجلد");
  }
});

export const DELETE = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id!;

    try {
      await folderUseCases.deleteFolder(id, session.user.id);
      return NextResponse.json({ message: "تم حذف المجلد بنجاح" });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/DELETE", "فشل حذف المجلد");
  }
});
