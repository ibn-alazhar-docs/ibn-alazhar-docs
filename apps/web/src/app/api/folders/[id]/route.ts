import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { renameFolderSchema } from "@/lib/shared/validators/folder";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/backend/audit";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id!;
    const folder = await useCases.folder.getFolderById(id, session.user.id);
    return NextResponse.json({ folder }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/GET", "تعذر جلب المجلد");
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

    const updated = await useCases.folder.renameFolder(id, session.user.id, validation.data.name);
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.FOLDER_RENAME,
      entity: "folder",
      entityId: id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ folder: updated });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/PATCH", "تعذر تحديث المجلد");
  }
});

export const DELETE = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id!;

    const rateLimit = await checkUserRateLimit("folders:delete", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    await useCases.folder.deleteFolder(id, session.user.id);
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.FOLDER_DELETE,
      entity: "folder",
      entityId: id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ message: "حُذف المجلد" });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/DELETE", "تعذر حذف المجلد");
  }
});
