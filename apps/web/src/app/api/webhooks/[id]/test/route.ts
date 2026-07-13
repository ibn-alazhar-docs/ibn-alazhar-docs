import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("webhooks:test", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const result = await useCases.webhook.testWebhook(id, session.user.id);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "WEBHOOK_DELIVERY_FAILED",
            message: "تعذر توصيل الاختبار إلى الرابط. تأكد من أن الرابط متاح ويستجيب.",
          },
        },
        { status: 502 },
      );
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/test/POST", "حدث خطأ", { userId: session.user.id });
  }
});
