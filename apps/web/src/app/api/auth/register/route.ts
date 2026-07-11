import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { registerSchema } from "@/shared/validators/auth";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";
import { ConflictError } from "@/shared/errors";

export async function POST(request: Request) {
  try {
    const rateLimitResult = await checkRateLimit("/api/auth/register", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const validation = await parseValidatedBody(request, registerSchema);

    const { name, email, password } = validation;

    const user = await (async () => {
      try {
        return await useCases.registration.register(name, email, password);
      } catch (error: unknown) {
        // Avoid account enumeration: do not disclose whether an email is already
        // registered. Surface a generic success-style response instead of a 409.
        if (error instanceof ConflictError) {
          return null;
        }
        throw error;
      }
    })();

    if (!user) {
      return NextResponse.json(
        { message: "إذا لم يكن البريد مسجلاً، ستصلك رسالة التأكيد قريباً" },
        { status: 200 },
      );
    }

    await auditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.REGISTER,
      entity: "user",
      entityId: user.id,
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ message: "أُنشئ الحساب", userId: user.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: error?.message || "حدث خطأ", stack: error?.stack } }, { status: 500 });
  }
}
