import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id!;
  const rl = await checkUserRateLimit("autoTag:suggest", session.user.id);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const suggestions = await useCases.autoTag.suggestTags(id, session);

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.AUTO_TAG_SUGGEST,
      entity: "document",
      entityId: id,
      metadata: { suggestionCount: suggestions.length },
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/suggest-tags/POST", "حدث خطأ داخلي");
  }
});
