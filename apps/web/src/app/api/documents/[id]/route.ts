import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { documentUpdateSchema } from "@/lib/validators/document";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { checkUserRateLimit } from "@/lib/rate-limit";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  try {
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);
    return NextResponse.json({ document });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/GET", "حدث خطأ داخلي");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
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

  try {
    const updated = await useCases.documentCrud.updateDocument(
      id,
      session.user.id,
      validation.data,
    );
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
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.retryAfterMs ?? 60_000) / 1000)),
          },
        },
      );
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
