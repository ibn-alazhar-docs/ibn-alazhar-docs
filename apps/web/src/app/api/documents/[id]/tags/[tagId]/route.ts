import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id, tagId } = await params;

    try {
      await documentUseCases.removeTagFromDocument(id, tagId, session.user.id, session.user.role);
      return NextResponse.json({ success: true, message: "Tag removed" });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Document not found" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "TAG_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Tag not found" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "TAG_NOT_ASSIGNED") {
        return NextResponse.json({ success: true, message: "Tag was not assigned" });
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/[tagId]/DELETE] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to remove tag" } },
      { status: 500 },
    );
  }
}
