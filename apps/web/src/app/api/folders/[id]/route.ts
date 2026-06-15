import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { renameFolderSchema } from "@/lib/validators/folder";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
      include: {
        _count: {
          select: { documents: true, children: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/GET] Failed:");
    return NextResponse.json({ error: "فشل الحصول على المجلد" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = renameFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صحيحة" },
        { status: 400 },
      );
    }

    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
      select: { id: true },
    });

    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: { name: validation.data.name },
    });

    return NextResponse.json({ folder: updated });
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/PATCH] Failed:");
    return NextResponse.json({ error: "فشل تحديث المجلد" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
      select: { id: true },
    });

    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }

    // Recursive helper to get all descendant folder IDs
    const getDescendantFolderIds = async (folderId: string): Promise<string[]> => {
      const children = await prisma.folder.findMany({
        where: ownedWhere({ parentId: folderId, deletedAt: null }, session!),
        select: { id: true },
      });

      const ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        const subIds = await getDescendantFolderIds(child.id);
        ids.push(...subIds);
      }
      return ids;
    };

    const descendantIds = await getDescendantFolderIds(id);
    const allFolderIds = [id, ...descendantIds];

    // Soft delete all folders
    await prisma.folder.updateMany({
      where: ownedWhere({ id: { in: allFolderIds } }, session!),
      data: { deletedAt: new Date() },
    });

    // Move documents to root (set folderId to null)
    await prisma.document.updateMany({
      where: ownedWhere({ folderId: { in: allFolderIds } }, session!),
      data: { folderId: null },
    });

    return NextResponse.json({ message: "تم حذف المجلد بنجاح" });
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/DELETE] Failed:");
    return NextResponse.json({ error: "فشل حذف المجلد" }, { status: 500 });
  }
}
