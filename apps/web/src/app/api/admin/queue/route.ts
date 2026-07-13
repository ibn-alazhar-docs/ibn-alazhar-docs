import { NextResponse } from "next/server";
import { withAdminAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { loadConfig, getFailedJobs, enqueueValidation } from "@ibn-al-azhar-docs/pipeline";
import { repos } from "@/core/composition-root";
import { ERROR_CODES } from "@/shared/constants";
import type { ProcessingJob } from "@ibn-al-azhar-docs/pipeline";

export const dynamic = "force-dynamic";

/**
 * Admin DLQ inspection + manual recovery.
 *  - GET  : list dead-lettered jobs (failed after retry exhaustion).
 *  - POST : { action: "requeue", jobId } re-enqueues a failed document's
 *           pipeline from scratch without forcing a re-upload, or
 *           { action: "requeueAll" } retries every failed job.
 */
export const GET = withAdminAuth(async () => {
  try {
    const config = loadConfig();
    const failed = await getFailedJobs(config);
    return NextResponse.json({ count: failed.length, jobs: failed });
  } catch (error: unknown) {
    return handleRouteError(error, "admin/queue/GET", "تعذر جلب قائمة المهام الفاشلة");
  }
});

async function requeueJob(jobId: string): Promise<{ requeued: boolean; reason?: string }> {
  const config = loadConfig();
  const failed = await getFailedJobs(config);
  const target = failed.find((j) => j.jobId === jobId);
  if (!target) return { requeued: false, reason: "not_found" };

  const data = target.originalData as ProcessingJob;
  if (!data?.documentId) return { requeued: false, reason: "no_document" };

  const document = await repos.document.findFirst(
    { id: data.documentId, deletedAt: null },
    {
      id: true,
      status: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      userId: true,
    },
  );
  if (!document) return { requeued: false, reason: "document_gone" };

  // Reset to a clean pre-processing state and re-enqueue. Source object reused.
  await repos.document.update(document.id, document.userId, {
    status: "UPLOADED",
    errorCode: null,
    errorMessage: null,
    outputKeys: null,
    outputFormats: [],
    pageCount: null,
    needsReview: false,
  });

  await enqueueValidation(config, {
    id: document.id,
    documentId: document.id,
    userId: document.userId,
    fileName: document.fileName,
    fileSize: Number(document.fileSize),
    mimeType: document.mimeType,
    storageKey: document.storageKey!,
    status: "pending",
    progress: 0,
    createdAt: new Date().toISOString(),
  });

  return { requeued: true };
}

export const POST = withAdminAuth(async (request) => {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      jobId?: string;
    };

    if (body.action === "requeue" && body.jobId) {
      const result = await requeueJob(body.jobId);
      if (!result.requeued) {
        const map: Record<string, string> = {
          not_found: "المهمة غير موجودة في قائمة الفشل",
          no_document: "بيانات المهمة غير مكتملة",
          document_gone: "الوثيقة محذوفة أو غير موجودة",
        };
        return NextResponse.json(
          {
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: map[result.reason ?? ""] ?? "تعذرت إعادة المحاولة",
            },
          },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, jobId: body.jobId });
    }

    if (body.action === "requeueAll") {
      const config = loadConfig();
      const failed = await getFailedJobs(config);
      let requeued = 0;
      for (const job of failed) {
        const r = await requeueJob(job.jobId);
        if (r.requeued) requeued += 1;
      }
      return NextResponse.json({ success: true, requeued, total: failed.length });
    }

    return NextResponse.json(
      { error: { code: ERROR_CODES.BAD_REQUEST, message: "إجراء غير معروف" } },
      { status: 400 },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "admin/queue/POST", "تعذرت إعادة المحاولة");
  }
});
