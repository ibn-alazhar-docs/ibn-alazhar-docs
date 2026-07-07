import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { singleExportSchema } from "@/lib/backend/export/validators";
import { contentDispositionHeader } from "@/lib/backend/export/profiles";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/backend/audit";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const parsed = singleExportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid data",
        },
      },
      { status: 400 },
    );
  }

  const rateLimit = await checkUserRateLimit("export:single", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const { documentId, format, profile, includeSource } = parsed.data;

  try {
    const result = await useCases.export.exportSingle(
      documentId,
      { format, includeSource, profile },
      session,
    );

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.EXPORT_SINGLE,
      entity: "document",
      entityId: documentId,
      metadata: { format, profile },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return new NextResponse(Buffer.from(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": contentDispositionHeader(result.fileName),
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "export", "تعذر التصدير");
  }
});
