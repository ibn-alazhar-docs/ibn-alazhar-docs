import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

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
    if (getErrorMessage(error) === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 },
      );
    }
    if (getErrorMessage(error) === "NO_SHARE_LINK") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No share link exists" } },
        { status: 404 },
      );
    }
    logger.error(error, "[share] Regenerate failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to regenerate link" } },
      { status: 500 },
    );
  }
}
