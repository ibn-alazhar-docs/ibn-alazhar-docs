import { NextResponse } from "next/server";
import { withAuth, isAdmin } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { adminUserUpdateSchema } from "@/lib/validators/auth";
import { userUseCases } from "@/core/use-cases/user.use-cases";

export const GET = withAuth(async (_request, { session }) => {
  try {
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const users = await userUseCases.getUsers();
    return NextResponse.json({ users });
  } catch (error: unknown) {
    return handleRouteError(error, "users/GET", "فشل الحصول على المستخدمين");
  }
});

export const PATCH = withAuth(async (request, { session }) => {
  try {
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
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

    const user = await userUseCases.updateUserRole(
      validation.data.userId,
      validation.data.role,
      session.user.id,
    );
    return NextResponse.json({ user });
  } catch (error: unknown) {
    return handleRouteError(error, "users/PATCH", "فشل تحديث المستخدم");
  }
});

export const DELETE = withAuth(async (request, { session }) => {
  try {
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "userId required" } },
        { status: 400 },
      );
    }

    await userUseCases.deleteUser(userId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleRouteError(error, "users/DELETE", "فشل حذف المستخدم");
  }
});
