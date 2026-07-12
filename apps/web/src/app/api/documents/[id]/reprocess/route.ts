import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { repos } from "@/core/composition-root";
import { loadConfig, enqueueValidation } from "@ibn-al-azhar-docs/pipeline";
import { ERROR_CODES } from "@/shared/constants";

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
    const document = await repos.document.findFirst(
      { id, userId: session.user.id, deletedAt: null },
      { id: true, status: true, fileName: true, fileSize: true, mimeType: true, storageKey: true },
    );

    if (!document) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.NOT_FOUND, message: "الوثيقة غير موجودة" } },
        { status: 404 },
      );
    }

    // Idempotency: do not restart a document that is actively processing.
    if (document.status !== "FAILED" && document.status !== "UPLOADED") {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.CONFLICT,
            message: "الملف قيد المعالجة بالفعل ولا يمكن إعادة المحاولة الآن",
          },
        },
        { status: 409 },
      );
    }

    // Reset to a clean, pre-processing state. The source object is reused.
    await repos.document.update(id, session.user.id, {
      status: "UPLOADED",
      errorCode: null,
      errorMessage: null,
      outputKeys: null,
      outputFormats: [],
      pageCount: null,
    });

    const config = loadConfig();
    await enqueueValidation(config, {
      id: document.id,
      documentId: document.id,
      userId: session.user.id,
      fileName: document.fileName,
      fileSize: Number(document.fileSize),
      mimeType: document.mimeType,
      storageKey: document.storageKey!,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      jobId: document.id,
      status: "pending",
      message: "تمت إعادة تشغيل المعالجة",
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/reprocess/POST", "تعذر إعادة معالجة الملف");
  }
});
