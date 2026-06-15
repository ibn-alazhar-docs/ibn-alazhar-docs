import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { bulkUntagSchema } from "@/lib/validators/tag";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = bulkUntagSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صالحة" },
        { status: 400 },
      );
    }

    const { documentIds, tagId } = validation.data;

    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id: tagId }, session),
      select: { id: true },
    });

    if (!tag) {
      return NextResponse.json({ error: "الوسم غير موجود" }, { status: 404 });
    }

    const documents = await prisma.document.findMany({
      where: ownedWhere({ id: { in: documentIds }, deletedAt: null }, session),
      select: { id: true },
    });

    if (documents.length !== documentIds.length) {
      const found = new Set(documents.map((d) => d.id));
      const missing = documentIds.filter((id: string) => !found.has(id));
      return NextResponse.json(
        {
          error: "بعض المستندات غير موجودة",
          details: {
            found: documents.length,
            requested: documentIds.length,
            missing,
          },
        },
        { status: 400 },
      );
    }

    const { count } = await prisma.tagDocument.deleteMany({
      where: {
        tagId,
        documentId: { in: documentIds },
      },
    });

    return NextResponse.json({
      success: true,
      untaggedCount: count,
      message: `تمت إزالة الوسم من ${count} مستند`,
    });
  } catch (error: unknown) {
    logger.error(error, "[documents/bulk-untag/POST] Failed:");
    return NextResponse.json({ error: "فشلت عملية إزالة الوسم" }, { status: 500 });
  }
}
