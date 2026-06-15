import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
      select: { id: true, parentId: true },
    });

    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    // Move documents to root (set folderId to null)
    const docsUpdated = await prisma.document.updateMany({
      where: ownedWhere({ folderId: id }, session),
      data: { folderId: null },
    });

    // Move subfolders to parent (or root if parent is null)
    const subfoldersUpdated = await prisma.folder.updateMany({
      where: ownedWhere({ parentId: id }, session),
      data: { parentId: folder.parentId || null },
    });

    return NextResponse.json({
      message: "تم تفريغ المجلد بنجاح",
      documentsMoved: docsUpdated.count,
      foldersMoved: subfoldersUpdated.count,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error(error, "[folders/[id]/empty/POST] Failed:");
    return NextResponse.json({ error: "فشل تفريغ المجلد", details: errMessage }, { status: 500 });
  }
}
