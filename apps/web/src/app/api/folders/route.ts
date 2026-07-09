import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { createFolderSchema } from "@/shared/validators/folder";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") ?? undefined;

    const folders = await useCases.folder.getFolders(session.user.id, session.user.role, parentId);

    return NextResponse.json({ folders }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/GET", "تعذر جلب المجلدات");
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

    const rateLimit = await checkUserRateLimit("folders:create", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

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
    return handleRouteError(error, "folders/POST", "تعذر إنشاء المجلد");
  }
});
