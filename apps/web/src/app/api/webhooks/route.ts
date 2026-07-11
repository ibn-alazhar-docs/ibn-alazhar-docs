import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
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
  const parsed = await parseValidatedBody(request, createWebhookSchema);

  const rateLimit = await checkUserRateLimit("webhooks:create", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const webhook = await useCases.webhook.createWebhook(session.user.id, parsed);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/POST", "حدث خطأ");
  }
});
