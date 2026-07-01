import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { createTagSchema } from "@/lib/shared/validators/tag";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/backend/audit";

export const GET = withAuth(async (_request, { session }) => {
  try {
    const tags = await useCases.tag.getTags(session);
    return NextResponse.json({ tags }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/GET", "فشل الحصول على الوسوم");
  }
});

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const validation = createTagSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const rateLimit = await checkUserRateLimit("tags:create", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const tag = await useCases.tag.createTag(validation.data.name, validation.data.color, session);
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TAG_CREATE,
      entity: "tag",
      entityId: tag.id,
      metadata: { name: validation.data.name },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/POST", "فشل إنشاء الوسم");
  }
});
