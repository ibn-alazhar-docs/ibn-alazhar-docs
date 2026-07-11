import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

const bulkDeleteSchema = z
  .object({
    documentIds: z.array(z.string().min(1)).min(1).max(50),
  })
  .strip();

export const POST = withAuth(async (request, { session }) => {
  const parsed = await parseValidatedBody(request, bulkDeleteSchema);

  const { documentIds } = parsed;

  const rateLimit = await checkUserRateLimit("documents:bulk-delete", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const deleted = await useCases.documentCrud.bulkDeleteDocuments(documentIds, session.user.id);

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.DOCUMENT_DELETE,
      entity: "document",
      entityId: documentIds.join(","),
      metadata: { count: deleted, type: "bulk" },
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      deleted,
      message: `تم حذف ${deleted} مستند${deleted > 1 ? "ات" : ""}`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/bulk-delete/POST", "حدث خطأ");
  }
});
