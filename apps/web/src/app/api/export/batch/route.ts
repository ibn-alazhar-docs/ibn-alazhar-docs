import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { contentDispositionHeader } from "@/lib/export/profiles";
import { batchExportSchema } from "@/lib/export/validators";
import { useCases } from "@/core/composition-root";
import { NotFoundError, AppError } from "@/lib/errors";

export const POST = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkUserRateLimit("export:bulk", session.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "تم تجاوز الحد الأقصى" } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.retryAfterMs ?? 60_000) / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const parsed = batchExportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid data",
            details: parsed.error.issues,
          },
        },
        { status: 400 },
      );
    }

    const { documentIds, format, profile, includeSource } = parsed.data;

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
    return handleRouteError(error, "export/batch/POST", "فشل التصدير الجماعي");
  }
});
