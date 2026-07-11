import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

const analyticsUseCases = useCases.analytics;

export const GET = withAuth(async (request, { session }) => {
  const rl = await checkUserRateLimit("analytics:query", session.user.id);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const url = new URL(request.url);
    const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") ?? "30", 10)));

    const analytics = await analyticsUseCases.getAnalytics(session, days);
    return NextResponse.json(analytics, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "analytics/GET", "حدث خطأ");
  }
});
