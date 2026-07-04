import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";
import { updateWebhookSchema } from "@/lib/shared/validators/webhook";

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
    return handleRouteError(error, "webhooks/GET", "حدث خطأ داخلي");
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
    return handleRouteError(error, "webhooks/PATCH", "حدث خطأ داخلي");
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
    return NextResponse.json({ success: true, message: "تم حذف الويب هوك" });
  } catch (error: unknown) {
    return handleRouteError(error, "webhooks/DELETE", "حدث خطأ داخلي");
  }
});
