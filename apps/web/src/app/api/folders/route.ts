import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { createFolderSchema } from "@/lib/validators/folder";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { getErrorMessage } from "@/lib/errors";

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    const folders = await folderUseCases.getFolders(session.user.id, session.user.role, parentId);

    return NextResponse.json({ folders });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/GET", "فشل الحصول على المجلدات");
  }
});

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    try {
      const folder = await folderUseCases.createFolder(session.user.id, validation.data);
      return NextResponse.json({ folder }, { status: 201 });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد الأصل غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    return handleRouteError(error, "folders/POST", "فشل إنشاء المجلد");
  }
});
