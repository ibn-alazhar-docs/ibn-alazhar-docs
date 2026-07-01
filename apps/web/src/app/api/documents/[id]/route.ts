import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { documentUpdateSchema } from "@/lib/shared/validators/document";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/backend/audit";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  try {
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);
    return NextResponse.json({ document }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/GET", "حدث خطأ داخلي");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id!;
    const body = await request.json();

    const validation = documentUpdateSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const updated = await useCases.documentCrud.updateDocument(
      id,
      session.user.id,
      validation.data,
    );

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.DOCUMENT_UPDATE,
      entity: "document",
      entityId: id,
      metadata: { fields: Object.keys(validation.data) },
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ document: updated });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/PATCH", "حدث خطأ داخلي");
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
    return NextResponse.json({ success: true, message: "تم حذف المستند" });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/DELETE", "حدث خطأ داخلي");
  }
});
