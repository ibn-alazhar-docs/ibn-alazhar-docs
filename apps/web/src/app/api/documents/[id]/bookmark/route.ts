import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("documents:bookmark", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const result = await useCases.bookmark.toggleBookmark(id, session);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/bookmark/POST", "تعذر تبديل حالة المفضلة");
  }
});

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const result = await useCases.bookmark.checkBookmarkStatus(id, session);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=10" },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/bookmark/GET", "تعذر التحقق من المفضلة");
  }
});
