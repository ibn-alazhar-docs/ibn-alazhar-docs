import { NextResponse } from "next/server";
import { withAuth, ownedWhere } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const share = await prisma.shareLink.findFirst({
      where: ownedWhere({ documentId: id }, session),
    });

    if (!share) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Share link not found" } },
        { status: 404 },
      );
    }

    await prisma.shareLink.delete({
      where: { id: share.id },
    });

    return NextResponse.json({ success: true, message: "Sharing disabled" });
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/share/delete/DELETE",
      "حدث خطأ أثناء تعطيل المشاركة",
    );
  }
});
