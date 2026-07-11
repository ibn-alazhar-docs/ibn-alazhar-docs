import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { AppError } from "@/shared/errors";
import { profileUpdateSchema } from "@/shared/validators/auth";
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

    const validation = await parseValidatedBody(request, profileUpdateSchema);

    const user = await useCases.profile.updateProfile(session.user.id, validation.name);

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

    const parsed = await parseValidatedBody(request, deleteAccountSchema);

    await useCases.profile.deleteAccount(session.user.id, parsed.password);

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
