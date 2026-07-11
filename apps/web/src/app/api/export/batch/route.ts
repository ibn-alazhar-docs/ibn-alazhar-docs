import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { contentDispositionHeader } from "@/core/services/export/profiles";
import { batchExportSchema } from "@/core/services/export/validators";
import { useCases } from "@/core/composition-root";
import { NotFoundError, AppError } from "@/shared/errors";

export const POST = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkUserRateLimit("export:bulk", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const parsed = await parseValidatedBody(request, batchExportSchema);

    const { documentIds, format, profile, includeSource } = parsed;

    const { zipBuffer, zipName } = await useCases.export.exportByBatch(
      documentIds,
      { format, profile, includeSource },
      session,
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }
    return handleRouteError(error, "export/batch/POST", "تعذر التصدير الجماعي");
  }
});
