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
      where: ownedWhere({ id, deletedAt: { not: null } }, session),
      select: { id: true, parentId: true },
    });

    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود أو غير محذوف" }, { status: 404 });
    }

    // Check parent still exists if folder has a parent
    if (folder.parentId) {
      const parent = await prisma.folder.findFirst({
        where: ownedWhere({
          id: folder.parentId,
          deletedAt: null,
        }, session),
        select: { id: true },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "المجلد الأصلي غير موجود. اختر مجلداً آخر" },
          { status: 400 },
        );
      }
    }

    // Restore folder
    const restored = await prisma.folder.update({
      where: { id },
      data: { deletedAt: null },
    });

    return NextResponse.json({ folder: restored });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error(error, "[folders/[id]/restore/POST] Failed:");
    return NextResponse.json({ error: "فشل استعادة المجلد", details: errMessage }, { status: 500 });
  }
}
