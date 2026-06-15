import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { moveFolderSchema, MAX_FOLDER_DEPTH } from "@/lib/validators/folder";
import { logger } from "@/lib/logger";

async function getFolderDepth(folderId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId) {
    const currentFolder: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!currentFolder?.parentId) break;
    depth++;
    currentId = currentFolder.parentId;
  }

  return depth;
}

async function isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
  let currentId: string | null = descendantId;

  while (currentId) {
    if (currentId === ancestorId) return true;

    const currentFolder: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = currentFolder?.parentId ?? null;
  }

  return false;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = moveFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صحيحة" },
        { status: 400 },
      );
    }

    const { parentId } = validation.data;

    // Validate source folder exists and belongs to user
    const sourceFolder = await prisma.folder.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
      select: { id: true, parentId: true },
    });

    if (!sourceFolder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    // Cannot move folder into itself
    if (id === parentId) {
      return NextResponse.json({ error: "لا يمكن نقل المجلد إلى نفسه" }, { status: 400 });
    }

    // Validate target folder exists and belongs to user (if not root)
    if (parentId) {
      const targetFolder = await prisma.folder.findFirst({
        where: ownedWhere({ id: parentId, deletedAt: null }, session),
        select: { id: true },
      });

      if (!targetFolder) {
        return NextResponse.json({ error: "المجلد الهدف غير موجود" }, { status: 404 });
      }

      // Check circular reference
      const wouldCreateCircular = await isDescendant(id, parentId);
      if (wouldCreateCircular) {
        return NextResponse.json(
          { error: "لا يمكن نقل المجلد إلى مجلد فرعي منه" },
          { status: 400 },
        );
      }
    }

    // Check depth limit
    if (parentId) {
      const parentDepth = await getFolderDepth(parentId);
      if (parentDepth + 1 >= MAX_FOLDER_DEPTH) {
        return NextResponse.json(
          { error: `الحد الأقصى لعمق المجلدات هو ${MAX_FOLDER_DEPTH} مستويات` },
          { status: 400 },
        );
      }
    }

    // Move folder
    const updated = await prisma.folder.update({
      where: { id },
      data: { parentId: parentId || null },
    });

    return NextResponse.json({ folder: updated });
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/move/POST] Failed:");
    return NextResponse.json({ error: "فشل نقل المجلد" }, { status: 500 });
  }
}
