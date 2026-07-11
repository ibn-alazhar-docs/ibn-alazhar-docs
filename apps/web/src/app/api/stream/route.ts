import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { repos } from "@/core/composition-root";
import { ERROR_CODES, LIMITS, UI_TIMING } from "@/shared/constants";
import { StreamService } from "@/core/services/stream.service";

export const GET = withAuth(async (request, { session }) => {
  const rateLimitResult = await checkRateLimit("/api/stream", request);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  const connCheck = StreamService.checkAndIncrementConnections(session.user.id);
  if (!connCheck.allowed) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.RATE_LIMITED, message: "تجاوزت الحد الأقصى للاتصالات" } },
      { status: 429 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      StreamService.decrementConnections(session.user.id);
      return NextResponse.json(
        { error: { code: ERROR_CODES.BAD_REQUEST, message: "jobId مطلوب" } },
        { status: 400 },
      );
    }

    const document = await repos.document.findFirst(
      { id: jobId, userId: session.user.id, deletedAt: null },
      { id: true },
    );
    if (!document) {
      StreamService.decrementConnections(session.user.id);
      return NextResponse.json(
        { error: { code: ERROR_CODES.FORBIDDEN, message: "غير مصرح" } },
        { status: 403 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        let cleaned = false;
        let consecutiveCompleteChecks = 0;
        let pollCount = 0;

        const send = (data: string) => StreamService.sendSSE(controller, encoder, data, closed);
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          StreamService.decrementConnections(session.user.id);
          StreamService.closeSSE(controller, closed);
        };
        const close = () => {
          closed = true;
          cleanup();
        };

        send(JSON.stringify({ type: "connected", jobId }));

        const timeoutId = setTimeout(() => {
          if (!closed) {
            send(JSON.stringify({ type: "timeout", message: "انتهت مهلة الاتصال" }));
            close();
          }
        }, LIMITS.SSE_TIMEOUT_MS);

        const interval = setInterval(async () => {
          pollCount++;

          if (pollCount >= LIMITS.MAX_SSE_POLL_COUNT || closed) {
            clearInterval(interval);
            clearTimeout(timeoutId);
            if (!closed) {
              send(JSON.stringify({ type: "timeout", message: "انتهت مهلة الاتصال" }));
              close();
            }
            return;
          }

          try {
            const { getJobStatus, loadConfig } = await import("@ibn-al-azhar-docs/pipeline");
            const config = loadConfig();
            const status = await getJobStatus(config, jobId);

            if (status) {
              consecutiveCompleteChecks = 0;
              send(
                JSON.stringify({
                  type: "progress",
                  jobId,
                  stage: status.stage,
                  progress: status.progress,
                }),
              );

              if (status.stage === "completed" || status.stage === "failed") {
                clearInterval(interval);
                StreamService.handleCompletion(jobId, status.stage, send, close);
              }
            } else {
              const prismaStatus = await StreamService.getDocumentStatus(jobId);
              consecutiveCompleteChecks = StreamService.handlePollResult(
                prismaStatus,
                jobId,
                send,
                consecutiveCompleteChecks,
              );

              if (
                prismaStatus &&
                consecutiveCompleteChecks >= UI_TIMING.MAX_CONSECUTIVE_COMPLETE_CHECKS
              ) {
                clearInterval(interval);
                StreamService.handleCompletion(jobId, prismaStatus.stage, send, close);
              }
            }
          } catch {
            send(
              JSON.stringify({
                type: "warning",
                message: "طابور المعالجة غير متاح — تُجرى المحاكاة محلياً",
              }),
            );
          }
        }, 2000);

        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          clearTimeout(timeoutId);
          cleanup();
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
    StreamService.decrementConnections(session.user.id);
    return handleRouteError(error, "stream", "فشل الاتصال بالتدفق");
  }
});
