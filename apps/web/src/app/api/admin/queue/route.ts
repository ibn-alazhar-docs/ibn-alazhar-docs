import { NextResponse } from "next/server";
import { withAdminAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { adminQueueUseCases } from "@/core/services/admin-queue.use-cases";
import { ERROR_CODES } from "@/shared/constants";

export const dynamic = "force-dynamic";

export const GET = withAdminAuth(async () => {
  try {
    const failed = await adminQueueUseCases.listFailedJobs();
    return NextResponse.json({ count: failed.length, jobs: failed });
  } catch (error: unknown) {
    return handleRouteError(error, "admin/queue/GET", "تعذر جلب قائمة المهام الفاشلة");
  }
});

export const POST = withAdminAuth(async (request) => {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      jobId?: string;
    };

    if (body.action === "requeue" && body.jobId) {
      const result = await adminQueueUseCases.requeueJob(body.jobId);
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
      const { requeued, total } = await adminQueueUseCases.requeueAll();
      return NextResponse.json({ success: true, requeued, total });
    }

    return NextResponse.json(
      { error: { code: ERROR_CODES.BAD_REQUEST, message: "إجراء غير معروف" } },
      { status: 400 },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "admin/queue/POST", "تعذرت إعادة المحاولة");
  }
});
