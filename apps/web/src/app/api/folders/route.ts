import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { createFolderSchema } from "@/lib/validators/folder";
import { useCases } from "@/core/composition-root";
import { getErrorMessage } from "@/lib/errors";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit";

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    const folders = await useCases.folder.getFolders(session.user.id, session.user.role, parentId);

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
      const folder = await useCases.folder.createFolder(session.user.id, validation.data);
      await auditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.FOLDER_CREATE,
        entity: "folder",
        entityId: folder.id,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
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
