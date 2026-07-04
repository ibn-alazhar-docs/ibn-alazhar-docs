import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (_request, { session }) => {
  const rateLimit = await checkUserRateLimit("webhooks:stats", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const stats = await useCases.webhook.getDeliveryStats(session.user.id);
    return NextResponse.json({ stats }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/stats/GET", "حدث خطأ داخلي");
  }
});
