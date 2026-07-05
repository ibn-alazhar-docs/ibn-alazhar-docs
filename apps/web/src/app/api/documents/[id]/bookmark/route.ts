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
    // @ts-expect-error — bookmark use-case not yet implemented in composition-root
    const result = await useCases.bookmark.toggleBookmark(
      { user: { id: session.user.id, role: session.user.role } } as never,
      id,
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/bookmark/POST", "حدث خطأ أثناء تبديل المفضلة");
  }
});

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    // @ts-expect-error — bookmark use-case not yet implemented in composition-root
    const bookmarked = await useCases.bookmark.isBookmarked(
      { user: { id: session.user.id, role: session.user.role } } as never,
      id,
    );
    return NextResponse.json(
      { bookmarked },
      {
        headers: { "Cache-Control": "private, max-age=10" },
      },
    );
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/bookmark/GET",
      "حدث خطأ أثناء التحقق من المفضلة",
    );
  }
});
