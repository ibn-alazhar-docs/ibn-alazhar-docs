import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { contentDispositionHeader } from "@/core/services/export/profiles";
import { tagExportSchema } from "@/core/services/export/validators";
import { useCases } from "@/core/composition-root";
import { NotFoundError, AppError } from "@/shared/errors";

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const parsed = tagExportSchema.safeParse(body);

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

    const { tagId, format, profile, includeSource } = parsed.data;

    const { zipBuffer, zipName } = await useCases.export.exportByTag(
      tagId,
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
    return handleRouteError(error, "export/tag", "تعذر تصدير الوسم");
  }
});
