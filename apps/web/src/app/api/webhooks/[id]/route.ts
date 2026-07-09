import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { updateWebhookSchema } from "@/shared/validators/webhook";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("webhooks:read", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const webhook = await useCases.webhook.getWebhookById(id, session.user.id);
    return NextResponse.json({ webhook }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/GET", "حدث خطأ");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  const id = params.id!;
  const body = await request.json();
  const parsed = updateWebhookSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
      { status: 400 },
    );
  }

  const rateLimit = await checkUserRateLimit("webhooks:update", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const webhook = await useCases.webhook.updateWebhook(id, session.user.id, parsed.data);
    return NextResponse.json({ webhook });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/PATCH", "حدث خطأ");
  }
});

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("webhooks:delete", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    await useCases.webhook.deleteWebhook(id, session.user.id);
    return NextResponse.json({ success: true, message: "حُذف الويب هوك" });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/DELETE", "حدث خطأ");
  }
});
