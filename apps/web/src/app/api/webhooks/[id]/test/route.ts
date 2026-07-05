import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("webhooks:test", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    // @ts-expect-error — webhook use-case not yet implemented in composition-root
    const result = await useCases.webhook.testWebhook(id, session.user.id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/test/POST", "حدث خطأ داخلي");
  }
});
