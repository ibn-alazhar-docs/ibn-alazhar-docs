import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { updateTagSchema } from "@/lib/validators/tag";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id }, session),
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "الوسم غير موجود" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ tag });
  } catch (error: unknown) {
    logger.error(error, "[tags/[id]/GET] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل الحصول على الوسم" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = updateTagSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });

    if (!tag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "الوسم غير موجود" } },
        { status: 404 },
      );
    }

    const { name, color } = validation.data;

    if (name) {
      const existingTag = await prisma.tag.findFirst({
        where: ownedWhere(
          {
            name: { equals: name, mode: "insensitive" },
            id: { not: id },
          },
          session,
        ),
      });

      if (existingTag) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "يوجد وسم بهذا الاسم بالفعل" } },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json({ tag: updated });
  } catch (error: unknown) {
    logger.error(error, "[tags/[id]/PATCH] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل تحديث الوسم" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });

    if (!tag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "الوسم غير موجود" } },
        { status: 404 },
      );
    }

    await prisma.tagDocument.deleteMany({
      where: { tagId: id },
    });

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم حذف الوسم بنجاح" });
  } catch (error: unknown) {
    logger.error(error, "[tags/[id]/DELETE] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل حذف الوسم" } },
      { status: 500 },
    );
  }
}
