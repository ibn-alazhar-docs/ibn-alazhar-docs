import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const rateLimitResult = await checkUserRateLimit("share:regenerate", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const updated = await useCases.documentShare.regenerateShareLink(id, session.user.id);
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);

    const url = `/share/${updated.token}`;

    return NextResponse.json({
      shareId: updated.id,
      token: updated.token,
      url,
      documentTitle: document.title,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      message: "Link regenerated. Old link is now invalid.",
    });
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/share/regenerate/POST",
      "تعذر إعادة إنشاء الرابط",
    );
  }
});
