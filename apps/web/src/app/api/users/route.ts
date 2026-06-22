import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { adminUserUpdateSchema } from "@/lib/validators/auth";

export async function GET() {
  try {
    await requireRole("ADMIN");

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error && (error as Error).message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    const body = await request.json();
    const validation = adminUserUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { userId, role } = validation.data;

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot change your own role" } },
        { status: 400 },
      );
    }

    // Verify user is not soft-deleted
    const userExists = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستخدم غير موجود" } },
        { status: 404 },
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && (error as Error).message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "userId required" } },
        { status: 400 },
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot delete yourself" } },
        { status: 400 },
      );
    }

    // Verify user exists and is active
    const userExists = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستخدم غير موجود" } },
        { status: 404 },
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error as Error).message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}
