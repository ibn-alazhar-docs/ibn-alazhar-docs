import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json();
  const { folderId } = body;

  const document = await prisma.document.findFirst({
    where: ownedWhere({ id, deletedAt: null }, session),
  });

  if (!document) {
    return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
  }

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id: folderId, deletedAt: null }, session),
    });
    if (!folder) {
      return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
    }
  }

  const updated = await prisma.document.update({
    where: { id },
    data: { folderId: folderId || null },
    select: { id: true, title: true, folderId: true, updatedAt: true },
  });

  return NextResponse.json({
    document: updated,
    message: folderId ? "تم نقل المستند إلى المجلد" : "تم إزالة المستند من المجلد",
  });
}
