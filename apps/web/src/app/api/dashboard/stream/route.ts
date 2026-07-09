import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { DashboardService } from "@/core/services/dashboard.service";

export const GET = withAuth(async (request, { session }) => {
  // Use strict: true for strict rate limit check (blocking if Redis is down)
  const rateLimitResult = await checkUserRateLimit("dashboard:stream", session.user.id, true);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  // Register active user
  await DashboardService.trackUserActivity(session.user.id);

  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;

        const send = (data: string) => {
          if (!closed) {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        };

        // Initial push
        try {
          const metrics = await DashboardService.getMetrics();
          send(JSON.stringify({ type: "metrics", metrics }));
        } catch {
          send(JSON.stringify({ type: "error", message: "تعذر تحميل التحليلات الأولية" }));
        }

        const interval = setInterval(async () => {
          if (closed) {
            clearInterval(interval);
            return;
          }

          try {
            // Track active user on each tick
            await DashboardService.trackUserActivity(session.user.id);

            const metrics = await DashboardService.getMetrics();
            send(JSON.stringify({ type: "metrics", metrics }));
          } catch {
            send(JSON.stringify({ type: "error", message: "تعذر تحديث التحليلات" }));
          }
        }, 5000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "dashboard/stream", "فشل الاتصال بتدفق لوحة التحكم");
  }
});
