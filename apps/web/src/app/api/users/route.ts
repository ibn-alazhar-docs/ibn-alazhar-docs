import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { isAdminRole, canViewUsers } from "@/domain/auth";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { adminUserUpdateSchema, adminUserDeleteSchema } from "@/shared/validators/auth";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";
import type { Role } from "@/domain/auth";

export const GET = withAuth(async (request, { session }) => {
  try {
    if (!canViewUsers(session.user.role)) {
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
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    return handleRouteError(error, "users/GET", "تعذر جلب المستخدمين");
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

    const validation = await parseValidatedBody(request, adminUserUpdateSchema);

    const user = await useCases.user.updateUserRole(
      validation.userId,
      validation.role as Role,
      session.user.id,
    );
    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGE,
      entity: "user",
      entityId: validation.userId,
      metadata: { newRole: validation.role },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ user });
  } catch (error: unknown) {
    return handleRouteError(error, "users/PATCH", "تعذر تحديث المستخدم");
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

    const validation = await parseValidatedBody(request, adminUserDeleteSchema);
    const { userId } = validation;

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
    return handleRouteError(error, "users/DELETE", "تعذر حذف المستخدم");
  }
});
