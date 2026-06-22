import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const share = await prisma.shareLink.findFirst({
      where: ownedWhere({ documentId: id }, session),
    });

    if (!share) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found" } },
        { status: 404 },
      );
    }

    await prisma.shareLink.delete({
      where: { id: share.id },
    });

    return NextResponse.json({ success: true, message: "Sharing disabled" });
  } catch (error: unknown) {
    logger.error(error, "[share] Delete failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to disable sharing" } },
      { status: 500 },
    );
  }
}
