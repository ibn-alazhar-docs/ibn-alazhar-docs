import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (request) => {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const session = (request as unknown as { auth: { user: { id: string } } }).auth;
  const rateLimit = await checkUserRateLimit("bookmarks:query", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    // @ts-expect-error — bookmark use-case not yet implemented in composition-root
    const result = await useCases.bookmark.getBookmarks(
      { user: { id: session.user.id, role: "STUDENT" } } as never,
      { limit, offset },
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "bookmarks/GET", "حدث خطأ أثناء تحميل المفضلة");
  }
});
