import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators/auth";

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export const PATCH = withAuth(async (request, { session }) => {
  try {
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
  } catch (error: unknown) {
    return handleRouteError(error, "profile", "فشل حفظ البيانات");
  }
});

export const DELETE = withAuth(async (request, { session }) => {
  try {
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
  } catch (error: unknown) {
    return handleRouteError(error, "profile", "فشل حذف الحساب");
  }
});
