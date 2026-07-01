import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { updateTagSchema } from "@/lib/shared/validators/tag";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/backend/audit";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );
    const tag = await useCases.tag.getTagById(id, session);
    return NextResponse.json({ tag }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/GET", "فشل الحصول على الوسم");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );
    const body = await request.json();
    const validation = updateTagSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const tag = await useCases.tag.updateTag(id, validation.data, session);
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/PATCH", "فشل تحديث الوسم");
  }
});

export const DELETE = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );

    const rateLimit = await checkUserRateLimit("tags:delete", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    await useCases.tag.deleteTag(id, session);
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TAG_DELETE,
      entity: "tag",
      entityId: id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ success: true, message: "تم حذف الوسم بنجاح" });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/DELETE", "فشل حذف الوسم");
  }
});
