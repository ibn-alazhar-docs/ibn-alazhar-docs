import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  const tagId = params.tagId!;

  const rateLimit = await checkUserRateLimit("documents:tags", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    await useCases.documentTag.removeTagFromDocument(id, tagId, session.user.id, session.user.role);
    return NextResponse.json({ success: true, message: "Tag removed" });
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/tags/[tagId]/DELETE",
      "حدث خطأ أثناء إزالة الوسم",
    );
  }
});
