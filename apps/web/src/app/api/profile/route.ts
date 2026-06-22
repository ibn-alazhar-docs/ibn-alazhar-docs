import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators/auth";
import { logger } from "@/lib/logger";

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
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
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل حفظ البيانات" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "كلمة المرور مطلوبة" } },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستخدم غير موجود" } },
        { status: 404 },
      );
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash ?? "");
    if (!valid) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "كلمة المرور غير صحيحة" } },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(error, "[profile] Delete failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل حذف الحساب" } },
      { status: 500 },
    );
  }
}
