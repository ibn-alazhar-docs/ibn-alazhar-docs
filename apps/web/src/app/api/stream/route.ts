import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { normalizeStage, DOC_PROGRESS_MAP } from "@/lib/conversion-status-utils";
import { handleRouteError } from "@/lib/route-helpers";
import { repos } from "@/core/composition-root";
import { ERROR_CODES, LIMITS, UI_TIMING } from "@/lib/constants";

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

export const GET = withAuth(async (request, { session }) => {
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

        const sendEvent = (data: string) => {
          if (!closed) {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        };

        const closeStream = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };

        sendEvent(JSON.stringify({ type: "connected", jobId }));

        let consecutiveCompleteChecks = 0;
        let pollCount = 0;

        const timeoutId = setTimeout(() => {
          if (!closed) {
            sendEvent(JSON.stringify({ type: "timeout", message: "انتهت مهلة الاتصال" }));
            closeStream();
          }
        }, LIMITS.SSE_TIMEOUT_MS);

        const interval = setInterval(async () => {
          pollCount++;

          if (pollCount >= LIMITS.MAX_SSE_POLL_COUNT) {
            clearInterval(interval);
            clearTimeout(timeoutId);
            if (!closed) {
              sendEvent(JSON.stringify({ type: "timeout", message: "انتهت مهلة الاتصال" }));
              closeStream();
            }
            return;
          }
          if (closed) {
            clearInterval(interval);
            return;
          }

          try {
            const { getJobStatus, loadConfig } = await import("@ibn-al-azhar-docs/pipeline");
            const config = loadConfig();
            const status = await getJobStatus(config, jobId);

            if (status) {
              consecutiveCompleteChecks = 0;
              sendEvent(
                JSON.stringify({
                  type: "progress",
                  jobId,
                  stage: status.stage,
                  progress: status.progress,
                }),
              );

              if (status.stage === "completed" || status.stage === "failed") {
                clearInterval(interval);
                sendEvent(
                  JSON.stringify({
                    type: "complete",
                    jobId,
                    status: status.stage,
                  }),
                );
                setTimeout(closeStream, UI_TIMING.SSE_CLOSE_DELAY_MS);
              }
            } else {
              const prismaStatus = await getDocumentStatus(jobId);

              if (prismaStatus) {
                if (prismaStatus.stage === "completed" || prismaStatus.stage === "failed") {
                  consecutiveCompleteChecks++;
                  if (consecutiveCompleteChecks >= UI_TIMING.MAX_CONSECUTIVE_COMPLETE_CHECKS) {
                    clearInterval(interval);
                    sendEvent(
                      JSON.stringify({
                        type: "progress",
                        jobId,
                        stage: prismaStatus.stage,
                        progress: prismaStatus.progress,
                      }),
                    );
                    sendEvent(
                      JSON.stringify({
                        type: "complete",
                        jobId,
                        status: prismaStatus.stage,
                      }),
                    );
                    setTimeout(closeStream, UI_TIMING.SSE_CLOSE_DELAY_MS);
                    return;
                  }
                } else {
                  consecutiveCompleteChecks = 0;
                }

                sendEvent(
                  JSON.stringify({
                    type: "progress",
                    jobId,
                    stage: prismaStatus.stage,
                    progress: prismaStatus.progress,
                  }),
                );
              } else {
                sendEvent(
                  JSON.stringify({
                    type: "progress",
                    jobId,
                    stage: "pending",
                    progress: 0,
                  }),
                );
              }
            }
          } catch {
            sendEvent(
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
