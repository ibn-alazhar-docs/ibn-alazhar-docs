import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { name, email, password } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash,
            deletedAt: null,
            role: "STUDENT",
            locale: "ar",
          },
        });
        return NextResponse.json(
          { message: "تم إعادة تنشيط الحساب بنجاح", userId: existingUser.id },
          { status: 201 },
        );
      }
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "هذا البريد الإلكتروني مسجل مسبقاً" } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        locale: "ar",
      },
    });

    return NextResponse.json(
      { message: "تم إنشاء الحساب بنجاح", userId: user.id },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع" } },
      { status: 500 },
    );
  }
}
