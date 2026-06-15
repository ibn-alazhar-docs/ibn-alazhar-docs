import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators/auth";
import { logger } from "@/lib/logger";

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صحيحة" },
        { status: 400 },
      );
    }

    const { name } = validation.data;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    logger.error(error, "[profile] Update failed:");
    return NextResponse.json({ error: "فشل حفظ البيانات" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(error, "[profile] Delete failed:");
    return NextResponse.json({ error: "فشل حذف الحساب" }, { status: 500 });
  }
}
