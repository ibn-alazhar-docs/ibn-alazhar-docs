import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { isAdminRole } from "@/domain/auth";
import { handleRouteError } from "@/lib/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { adminUserUpdateSchema, adminUserDeleteSchema } from "@/lib/validators/auth";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit";
import type { Role } from "@/domain/auth";

export const GET = withAuth(async (request, { session }) => {
  try {
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const rateLimitResult = await checkUserRateLimit("admin:users", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await useCases.user.getUsers(page, limit);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "users/GET", "فشل الحصول على المستخدمين");
  }
});

export const PATCH = withAuth(async (request, { session }) => {
  try {
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const rateLimitResult = await checkUserRateLimit("admin:users", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const body = await request.json();
    const validation = adminUserUpdateSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const user = await useCases.user.updateUserRole(
      validation.data.userId,
      validation.data.role as Role,
      session.user.id,
    );
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGE,
      entity: "user",
      entityId: validation.data.userId,
      metadata: { newRole: validation.data.role },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ user });
  } catch (error: unknown) {
    return handleRouteError(error, "users/PATCH", "فشل تحديث المستخدم");
  }
});

export const DELETE = withAuth(async (request, { session }) => {
  try {
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const rateLimitResult = await checkUserRateLimit("admin:users", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const body = await request.json();
    const validation = adminUserDeleteSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "userId required" } },
        { status: 400 },
      );
    }
    const { userId } = validation.data;

    await useCases.user.deleteUser(userId, session.user.id);
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.USER_DELETE,
      entity: "user",
      entityId: userId,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleRouteError(error, "users/DELETE", "فشل حذف المستخدم");
  }
});
