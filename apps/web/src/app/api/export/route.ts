import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { singleExportSchema } from "@/core/services/export/validators";
import { contentDispositionHeader } from "@/core/services/export/profiles";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";

export const POST = withAuth(async (request, { session }) => {
  const parsed = await parseValidatedBody(request, singleExportSchema);

  const rateLimit = await checkUserRateLimit("export:single", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const { documentId, format, profile, includeSource } = parsed;

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
