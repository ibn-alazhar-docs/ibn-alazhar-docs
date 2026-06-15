import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id, tagId } = await params;

    const document = await prisma.document.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id: tagId }, session),
      select: { id: true },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.tagDocument.deleteMany({
      where: {
        tagId,
        documentId: id,
      },
    });

    return NextResponse.json({ success: true, message: "Tag removed" });
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/[tagId]/DELETE] Failed:");
    return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 });
  }
}
