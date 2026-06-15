import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { bulkTagSchema } from "@/lib/validators/tag";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = bulkTagSchema.safeParse(body);

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

    const existingAssociations = await prisma.tagDocument.findMany({
      where: {
        tagId,
        documentId: { in: documentIds },
      },
      select: { documentId: true },
    });

    const existingSet = new Set(existingAssociations.map((e) => e.documentId));
    const newDocs = documentIds.filter((id: string) => !existingSet.has(id));

    if (newDocs.length > 0) {
      await prisma.tagDocument.createMany({
        data: newDocs.map((documentId) => ({
          tagId,
          documentId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      taggedCount: newDocs.length,
      skippedCount: existingSet.size,
      message: `تم وسم ${newDocs.length} مستند`,
    });
  } catch (error: unknown) {
    logger.error(error, "[documents/bulk-tag/POST] Failed:");
    return NextResponse.json({ error: "فشلت عملية الوسم" }, { status: 500 });
  }
}
