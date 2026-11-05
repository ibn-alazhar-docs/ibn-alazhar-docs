import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { loadConfig, saveAuditSession } from "@ibn-al-azhar-docs/pipeline";

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id!;

  const rateLimit = await checkUserRateLimit("documents:audit:save", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "طلب غير صالح: JSON غير سليم" } },
      { status: 400 },
    );
  }

  const payload = (
    body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  ) as Record<string, unknown>;

  try {
    await useCases.documentCrud.getDocumentById(id, session.user.id, session.user.role);

    const config = loadConfig();
    const result = await saveAuditSession(config, id, {
      filename: typeof payload.filename === "string" ? payload.filename : undefined,
      sourceText: typeof payload.sourceText === "string" ? payload.sourceText : undefined,
      convertedMarkdown:
        typeof payload.convertedMarkdown === "string" ? payload.convertedMarkdown : undefined,
      bookTitle: typeof payload.bookTitle === "string" ? payload.bookTitle : undefined,
      metadata:
        payload.metadata && typeof payload.metadata === "object"
          ? (payload.metadata as Record<string, unknown>)
          : undefined,
    });

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      sessionMeta: result.meta,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/audit/save/POST", "تعذر حفظ جلسة التدقيق");
  }
});
