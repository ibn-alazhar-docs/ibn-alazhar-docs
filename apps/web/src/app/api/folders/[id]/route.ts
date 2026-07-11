import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { renameFolderSchema } from "@/shared/validators/folder";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

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
    const validation = await parseValidatedBody(request, renameFolderSchema);

    const updated = await useCases.folder.renameFolder(id, session.user.id, validation.name);
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
