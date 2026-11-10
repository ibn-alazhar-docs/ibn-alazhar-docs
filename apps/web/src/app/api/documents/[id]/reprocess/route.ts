import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

/**
 * Manual retry / requeue endpoint. Re-runs the pipeline for a document that
 * failed (or stalled) without forcing the user to re-upload the source file.
 * The stored object is reused, so this is both idempotent and cheap.
 */
export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id!;

  const rateLimitResult = await checkUserRateLimit("documents:reprocess", session.user.id);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  try {
    const result = await useCases.documentReprocess.reprocess(id, session.user.id);

    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.documentId,
      status: "pending",
      message: "تمت إعادة تشغيل المعالجة",
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/reprocess/POST", "تعذر إعادة معالجة الملف");
  }
});
