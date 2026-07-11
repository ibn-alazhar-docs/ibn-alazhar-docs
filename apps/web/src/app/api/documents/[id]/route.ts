import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { documentUpdateSchema } from "@/shared/validators/document";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  try {
    const document = await useCases.documentCrud.getDocumentById(
      id,
      session.user.id,
      session.user.role,
    );
    return NextResponse.json({ document }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/GET", "حدث خطأ");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id!;
    const validation = await parseValidatedBody(request, documentUpdateSchema);

    const updated = await useCases.documentCrud.updateDocument(
      id,
      session.user.id,
      validation,
    );

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.DOCUMENT_UPDATE,
      entity: "document",
      entityId: id,
      metadata: { fields: Object.keys(validation) },
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ document: updated });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/PATCH", "حدث خطأ");
  }
});

export const DELETE = withAuth(async (request, { session, params }) => {
  const id = params.id!;
  try {
    const rateLimit = await checkUserRateLimit("documents:delete", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }
    await useCases.documentCrud.deleteDocument(id, session.user.id);
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.DOCUMENT_DELETE,
      entity: "document",
      entityId: id,
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ success: true, message: "حُذف المستند" });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/DELETE", "حدث خطأ");
  }
});
