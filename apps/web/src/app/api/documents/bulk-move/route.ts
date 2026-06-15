import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const MAX_BULK_SIZE = 50;

export async function POST(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { documentIds, folderId } = body;

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return NextResponse.json({ error: "لم يتم تحديد مستندات" }, { status: 400 });
  }

  if (documentIds.length > MAX_BULK_SIZE) {
    return NextResponse.json(
      { error: `الحد الأقصى ${MAX_BULK_SIZE} مستند في المرة` },
      { status: 400 },
    );
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

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id: folderId, deletedAt: null }, session),
    });
    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }
  }

  const result = await prisma.document.updateMany({
    where: ownedWhere({ id: { in: documentIds } }, session),
    data: { folderId: folderId || null },
  });

  return NextResponse.json({
    success: true,
    moved: result.count,
    folderId,
    message: `تم نقل ${result.count} مستند${result.count > 1 ? "ات" : ""}`,
  });
}
