import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export const POST = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const updated = await documentUseCases.regenerateShareLink(id, session.user.id);
    const document = await documentUseCases.getDocumentById(id, session.user.id);

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
      "حدث خطأ أثناء إعادة إنشاء الرابط",
    );
  }
});
