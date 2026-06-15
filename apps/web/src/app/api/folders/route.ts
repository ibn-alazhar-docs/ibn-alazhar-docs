import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { createFolderSchema } from "@/lib/validators/folder";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    const isAdmin = session.user.role === "ADMIN";
    const folders = await prisma.folder.findMany({
      where: {
        ...(isAdmin ? {} : { userId: session.user.id }),
        deletedAt: null,
        parentId: parentId || null,
      },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { documents: true, children: true },
        },
      },
    });

    return NextResponse.json({ folders });
  } catch (error: unknown) {
    logger.error(error, "[folders/GET] Failed:");
    return NextResponse.json({ error: "فشل الحصول على المجلدات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صحيحة" },
        { status: 400 },
      );
    }

    const { name, parentId, color, icon } = validation.data;

    // Validate parent folder exists and belongs to user
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId: session.user.id, deletedAt: null },
        select: { id: true },
      });

      if (!parentFolder) {
        return NextResponse.json({ error: "المجلد الأصل غير موجود" }, { status: 404 });
      }
    }

    // Get max order for siblings
    const maxOrder = await prisma.folder.aggregate({
      where: {
        userId: session.user.id,
        parentId: parentId || null,
        deletedAt: null,
      },
      _max: { order: true },
    });

    const folder = await prisma.folder.create({
      data: {
        userId: session.user.id,
        name,
        parentId: parentId || null,
        color: color || null,
        icon: icon || null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error: unknown) {
    logger.error(error, "[folders/POST] Failed:");
    return NextResponse.json({ error: "فشل إنشاء المجلد" }, { status: 500 });
  }
}
