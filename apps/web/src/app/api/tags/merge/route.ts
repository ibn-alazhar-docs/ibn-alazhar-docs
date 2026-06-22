import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { mergeTagsSchema } from "@/lib/validators/tag";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = mergeTagsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { sourceTagId, targetTagId } = validation.data;

    if (sourceTagId === targetTagId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "لا يمكن دمج الوسم مع نفسه" } },
        { status: 400 },
      );
    }

    const [sourceTag, targetTag] = await Promise.all([
      prisma.tag.findFirst({
        where: ownedWhere({ id: sourceTagId }, session),
        select: { id: true },
      }),
      prisma.tag.findFirst({
        where: ownedWhere({ id: targetTagId }, session),
        select: { id: true },
      }),
    ]);

    if (!sourceTag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "الوسم المصدري غير موجود" } },
        { status: 404 },
      );
    }

    if (!targetTag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "الوسم الهدف غير موجود" } },
        { status: 404 },
      );
    }

    const sourceDocs = await prisma.tagDocument.findMany({
      where: { tagId: sourceTagId },
      select: { documentId: true },
    });

    const existingTarget = await prisma.tagDocument.findMany({
      where: { tagId: targetTagId },
      select: { documentId: true },
    });

    const existingDocIds = new Set(existingTarget.map((td) => td.documentId));
    const newDocIds = sourceDocs.map((td) => td.documentId).filter((id) => !existingDocIds.has(id));

    if (newDocIds.length > 0) {
      await prisma.tagDocument.createMany({
        data: newDocIds.map((documentId) => ({
          tagId: targetTagId,
          documentId,
        })),
      });
    }

    await prisma.tagDocument.deleteMany({
      where: { tagId: sourceTagId },
    });

    await prisma.tag.delete({
      where: { id: sourceTagId },
    });

    return NextResponse.json({
      success: true,
      affectedDocuments: newDocIds.length,
      message: `تم دمج الوسم بنجاح. تم نقل ${newDocIds.length} مستند`,
    });
  } catch (error: unknown) {
    logger.error(error, "[tags/merge/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل دمج الوسوم" } },
      { status: 500 },
    );
  }
}
