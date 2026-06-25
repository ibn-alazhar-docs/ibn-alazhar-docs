import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { normalizeStage, DOC_PROGRESS_MAP } from "@/lib/conversion-status-utils";
import { handleRouteError } from "@/lib/route-helpers";
import { documentRepository } from "@/core/repositories";

async function getDocumentStatus(
  jobId: string,
): Promise<{ stage: string; progress: number } | null> {
  try {
    const doc = await documentRepository.findFirst({ id: jobId }, { status: true });
    if (!doc) return null;
    const stage = normalizeStage(doc.status);
    const progress = DOC_PROGRESS_MAP[doc.status] ?? 0;
    return { stage, progress };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "jobId مطلوب" } },
        { status: 400 },
      );
    }

    const document = await documentRepository.findFirst(
      { id: jobId, userId: session.user.id, deletedAt: null },
      { id: true },
    );
    if (!document) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "غير مصرح" } },
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
        const MAX_POLLS = 300;
        const TIMEOUT_MS = 10 * 60 * 1000;

        const timeoutId = setTimeout(() => {
          if (!closed) {
            sendEvent(JSON.stringify({ type: "timeout", message: "انتهت مهلة الاتصال" }));
            closeStream();
          }
        }, TIMEOUT_MS);

        const interval = setInterval(async () => {
          pollCount++;

          if (pollCount >= MAX_POLLS) {
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
                setTimeout(closeStream, 500);
              }
            } else {
              const prismaStatus = await getDocumentStatus(jobId);

              if (prismaStatus) {
                if (prismaStatus.stage === "completed" || prismaStatus.stage === "failed") {
                  consecutiveCompleteChecks++;
                  if (consecutiveCompleteChecks >= 2) {
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
                    setTimeout(closeStream, 500);
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
}
