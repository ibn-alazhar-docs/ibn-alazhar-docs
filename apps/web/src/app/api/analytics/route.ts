import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { AnalyticsUseCases } from "@/core/use-cases/analytics.use-cases";
import { prisma } from "@/lib/backend/prisma";

const analyticsUseCases = new AnalyticsUseCases(prisma);

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
    return handleRouteError(error, "analytics/GET", "حدث خطأ داخلي");
  }
});
