import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const DOC_STATUS_MAP: Record<string, string> = {
  UPLOADED: "pending",
  VALIDATING: "validating",
  SPLITTING: "splitting",
  OCR_PROCESSING: "ocr",
  CLEANING: "cleaning",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
};

const DOC_PROGRESS_MAP: Record<string, number> = {
  UPLOADED: 0,
  VALIDATING: 10,
  SPLITTING: 25,
  OCR_PROCESSING: 40,
  CLEANING: 65,
  GENERATING: 85,
  COMPLETED: 100,
  FAILED: 0,
};

async function getPrismaStatus(jobId: string): Promise<{ stage: string; progress: number } | null> {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (!doc) return null;
    const stage = DOC_STATUS_MAP[doc.status] ?? "pending";
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

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId مطلوب" }, { status: 400 });
  }

  const document = await prisma.document.findFirst({
    where: { id: jobId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!document) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
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

      const interval = setInterval(async () => {
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
            const prismaStatus = await getPrismaStatus(jobId);

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
}
