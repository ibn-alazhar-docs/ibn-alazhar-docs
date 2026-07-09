import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/shared/validators/auth";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

export async function POST(request: Request) {
  try {
    const rateLimitResult = await checkRateLimit("/api/auth/reset-password", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { email, token, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Throws ValidationError (-> 400) for an invalid or expired token.
    await useCases.passwordReset.resetPassword(normalizedEmail, token, password);

    await auditLog({
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
      entity: "user",
      entityId: normalizedEmail,
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ message: "تم تغيير كلمة المرور بنجاح" }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "auth/reset-password", "تعذر إعادة تعيين كلمة المرور");
  }
}
