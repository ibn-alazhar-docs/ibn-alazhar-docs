import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  children: FolderNode[];
  _count: { documents: number; children: number };
}

function buildTree(
  folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    color: string | null;
    icon: string | null;
    order: number;
    _count: { documents: number; children: number };
  }>,
  parentId: string | null,
): FolderNode[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      color: f.color,
      icon: f.icon,
      order: f.order,
      children: buildTree(folders, f.id),
      _count: f._count,
    }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    // Get the target folder
    const targetFolder = await prisma.folder.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
      select: { id: true, name: true },
    });

    if (!targetFolder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    // Get all folders for this user
    const allFolders = await prisma.folder.findMany({
      where: ownedWhere({ deletedAt: null }, session),
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { documents: true, children: true },
        },
      },
    });

    const tree = buildTree(allFolders, null);

    return NextResponse.json({ tree, targetFolder });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error(error, "[folders/[id]/tree/GET] Failed:");
    return NextResponse.json(
      { error: "فشل获取 شجرة المجلدات", details: errMessage },
      { status: 500 },
    );
  }
}
