import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/shared/validators/auth";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { sendResetPasswordEmail } from "@/lib/email/send";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

export async function POST(request: Request) {
  try {
    const rateLimitResult = await checkRateLimit("/api/auth/forgot-password", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Always returns success (token+email only when the user exists) to avoid
    // leaking which emails are registered — no account enumeration.
    const result = await useCases.passwordReset.forgotPassword(normalizedEmail);

    if ("token" in result && "email" in result && result.email && result.token) {
      const sent = await sendResetPasswordEmail({
        to: result.email,
        username: result.email,
        token: result.token,
      });

      if (!sent.success) {
        // Email may be unconfigured (RESEND_API_KEY missing). Log and continue —
        // we still return the generic success response to the caller.
        // eslint-disable-next-line no-console
        console.warn(
          `[auth/forgot-password] Reset email not sent for ${result.email}: ${sent.error ?? "unknown"}`,
        );
      }

      await auditLog({
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
        entity: "user",
        entityId: normalizedEmail,
        ipAddress:
          request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
        metadata: { requested: true },
      });
    }

    // Generic success for every request, regardless of whether the email exists.
    return NextResponse.json(
      { message: "تم إرسال رابط إعادة التعيين إن كان البريد مسجلاً" },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "auth/forgot-password", "حدث خطأ");
  }
}
