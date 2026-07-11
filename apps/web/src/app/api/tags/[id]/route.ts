import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { updateTagSchema } from "@/shared/validators/tag";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

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
    return handleRouteError(error, "tags/[id]/GET", "تعذر جلب الوسم");
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
    const validation = await parseValidatedBody(request, updateTagSchema);

    const tag = await useCases.tag.updateTag(id, validation, session);
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/PATCH", "تعذر تحديث الوسم");
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
    return NextResponse.json({ success: true, message: "حُذف الوسم" });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/DELETE", "تعذر حذف الوسم");
  }
});
