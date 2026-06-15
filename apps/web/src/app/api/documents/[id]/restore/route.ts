import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: ownedWhere({ id, deletedAt: { not: null } }, session),
  });

  if (!document) {
    return NextResponse.json({ error: "المستند غير موجود أو غير محذوف" }, { status: 404 });
  }

  const restored = await prisma.document.update({
    where: { id },
    data: { deletedAt: null },
    select: { id: true, title: true, deletedAt: true, updatedAt: true },
  });

  // Rebuild searchVector on restore
  await prisma.$executeRaw`
    UPDATE documents
    SET searchvector =
      setweight(to_tsvector('simple', coalesce(${document.title}, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(${document.fileName}, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(${document.description || ""}, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce((SELECT searchpreview FROM documents WHERE id = ${id}), '')), 'D')
    WHERE id = ${id}
  `;

  return NextResponse.json({
    document: restored,
    message: "تم استرجاع المستند",
  });
}
