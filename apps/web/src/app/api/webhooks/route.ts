import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { createWebhookSchema } from "@/shared/validators/webhook";

export const GET = withAuth(async (_request, { session }) => {
  const rateLimit = await checkUserRateLimit("webhooks:list", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const webhooks = await useCases.webhook.getWebhooks(session.user.id);
    return NextResponse.json({ webhooks }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/GET", "حدث خطأ");
  }
});

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const parsed = createWebhookSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
      { status: 400 },
    );
  }

  const rateLimit = await checkUserRateLimit("webhooks:create", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const webhook = await useCases.webhook.createWebhook(session.user.id, parsed.data);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/POST", "حدث خطأ");
  }
});
