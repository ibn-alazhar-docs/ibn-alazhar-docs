import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators/auth";
import { registrationUseCases } from "@/core/use-cases/registration.use-cases";
import { handleRouteError } from "@/lib/route-helpers";

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

    const user = await registrationUseCases.register(name, email, password);

    return NextResponse.json(
      { message: "تم إنشاء الحساب بنجاح", userId: user.id },
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "auth/register", "حدث خطأ غير متوقع");
  }
}
