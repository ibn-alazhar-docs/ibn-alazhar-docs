import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { mergeTagsSchema } from "@/shared/validators/tag";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const validation = mergeTagsSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const rateLimit = await checkUserRateLimit("tags:merge", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const result = await useCases.tag.mergeTags(
      validation.data.sourceTagId,
      validation.data.targetTagId,
      session,
    );

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TAG_MERGE,
      entity: "tag",
      entityId: validation.data.sourceTagId,
      metadata: {
        targetTagId: validation.data.targetTagId,
        affectedDocuments: result.affectedDocuments,
      },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      affectedDocuments: result.affectedDocuments,
      message: `دُمج الوسم. تم نقل ${result.affectedDocuments} مستند`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/merge/POST", "تعذر دمج الوسوم");
  }
});
