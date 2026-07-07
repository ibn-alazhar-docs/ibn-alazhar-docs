import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { AppError } from "@/lib/shared/errors";
import { profileUpdateSchema } from "@/lib/shared/validators/auth";
import { useCases } from "@/core/composition-root";

const deleteAccountSchema = z
  .object({
    password: z.string().min(1),
  })
  .strip();

export const PATCH = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkUserRateLimit("account:update", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const user = await useCases.profile.updateProfile(session.user.id, validation.data.name);

    return NextResponse.json({ user });
  } catch (error: unknown) {
    return handleRouteError(error, "profile", "تعذر حفظ البيانات");
  }
});

export const DELETE = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkUserRateLimit("account:delete", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "كلمة المرور مطلوبة" } },
        { status: 400 },
      );
    }

    await useCases.profile.deleteAccount(session.user.id, parsed.data.password);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }
    return handleRouteError(error, "profile", "تعذر حذف الحساب");
  }
});
