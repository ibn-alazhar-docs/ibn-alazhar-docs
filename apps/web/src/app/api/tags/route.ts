import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { createTagSchema, MAX_TAGS_PER_USER } from "@/lib/validators/tag";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const isAdmin = session.user.role === "ADMIN";
    const tags = await prisma.tag.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error: unknown) {
    logger.error(error, "[tags/GET] Failed:");
    return NextResponse.json({ error: "فشل الحصول على الوسوم" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = createTagSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صحيحة" },
        { status: 400 },
      );
    }

    const { name, color } = validation.data;

    const tagCount = await prisma.tag.count({
      where: { userId: session.user.id },
    });

    if (tagCount >= MAX_TAGS_PER_USER) {
      return NextResponse.json(
        { error: `الحد الأقصى ${MAX_TAGS_PER_USER} وسم لكل مستخدم` },
        { status: 400 },
      );
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        userId: session.user.id,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existingTag) {
      return NextResponse.json({ error: "يوجد وسم بهذا الاسم بالفعل" }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: {
        userId: session.user.id,
        name,
        color: color || "#16A34A",
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: unknown) {
    logger.error(error, "[tags/POST] Failed:");
    return NextResponse.json({ error: "فشل إنشاء الوسم" }, { status: 500 });
  }
}
