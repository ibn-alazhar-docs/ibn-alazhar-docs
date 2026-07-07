import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const PATCH = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("documents:restore", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const restored = await useCases.documentCrud.restoreDocument(id, session.user.id);
    return NextResponse.json({
      success: true,
      document: restored,
      message: "استُعيد المستند",
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/restore/PATCH", "حدث خطأ");
  }
});
