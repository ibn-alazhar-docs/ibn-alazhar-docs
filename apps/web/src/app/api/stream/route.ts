import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { normalizeStage, DOC_PROGRESS_MAP } from "@/lib/shared/conversion-status-utils";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { repos } from "@/core/composition-root";
import { ERROR_CODES, LIMITS, UI_TIMING } from "@/lib/shared/constants";

const sseConnectionsByUser = new Map<string, number>();

async function getDocumentStatus(
  jobId: string,
): Promise<{ stage: string; progress: number } | null> {
  try {
    const doc = await repos.document.findFirst({ id: jobId }, { status: true });
    if (!doc) return null;
    const stage = normalizeStage(doc.status);
    const progress = DOC_PROGRESS_MAP[doc.status] ?? 0;
    return { stage, progress };
  } catch {
    return null;
  }
}

function sendSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: string,
  closed: boolean,
) {
  if (!closed) {
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  }
}

function closeSSE(controller: ReadableStreamDefaultController, closed: boolean) {
  if (!closed) {
    controller.close();
  }
}

function handlePollResult(
  status: { stage: string; progress: number } | null,
  jobId: string,
  send: (data: string) => void,
  close: () => void,
  consecutiveCompleteChecks: number,
): number {
  if (!status) {
    send(JSON.stringify({ type: "progress", jobId, stage: "pending", progress: 0 }));
    return consecutiveCompleteChecks;
  }

  send(JSON.stringify({ type: "progress", jobId, stage: status.stage, progress: status.progress }));

  if (status.stage === "completed" || status.stage === "failed") {
    return consecutiveCompleteChecks + 1;
  }

  return 0;
}

function handleCompletion(
  jobId: string,
  status: string,
  send: (data: string) => void,
  close: () => void,
) {
  send(JSON.stringify({ type: "complete", jobId, status }));
  setTimeout(close, UI_TIMING.SSE_CLOSE_DELAY_MS);
}

export const GET = withAuth(async (request, { session }) => {
  const rateLimitResult = await checkRateLimit("/api/stream", request);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  const currentConnections = sseConnectionsByUser.get(session.user.id) ?? 0;
  if (currentConnections >= LIMITS.MAX_SSE_CONNECTIONS_PER_USER) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.RATE_LIMITED, message: "تم تجاوز الحد الأقصى للاتصالات" } },
      { status: 429 },
    );
  }

  sseConnectionsByUser.set(session.user.id, currentConnections + 1);

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
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
      return NextResponse.json(
        { error: { code: ERROR_CODES.FORBIDDEN, message: "غير مصرح" } },
        { status: 403 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        let consecutiveCompleteChecks = 0;
        let pollCount = 0;

        const send = (data: string) => sendSSE(controller, encoder, data, closed);
        const close = () => {
          closed = true;
          closeSSE(controller, closed);
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
                handleCompletion(jobId, status.stage, send, close);
              }
            } else {
              const prismaStatus = await getDocumentStatus(jobId);
              consecutiveCompleteChecks = handlePollResult(
                prismaStatus,
                jobId,
                send,
                close,
                consecutiveCompleteChecks,
              );

              if (
                prismaStatus &&
                consecutiveCompleteChecks >= UI_TIMING.MAX_CONSECUTIVE_COMPLETE_CHECKS
              ) {
                clearInterval(interval);
                handleCompletion(jobId, prismaStatus.stage, send, close);
              }
            }
          } catch {
            send(
              JSON.stringify({
                type: "warning",
                message: "طابور المعالجة غير متاح — يتم المحاكاة محلياً",
              }),
            );
          }
        }, 2000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          clearTimeout(timeoutId);
          controller.close();
          const count = sseConnectionsByUser.get(session.user.id) ?? 0;
          if (count > 0) sseConnectionsByUser.set(session.user.id, count - 1);
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
    return handleRouteError(error, "stream", "فشل الاتصال بالتدفق");
  }
});
