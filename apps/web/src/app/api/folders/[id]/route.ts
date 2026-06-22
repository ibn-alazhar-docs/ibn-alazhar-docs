import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { renameFolderSchema } from "@/lib/validators/folder";
import { logger } from "@/lib/logger";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    try {
      const folder = await folderUseCases.getFolderById(id, session.user.id);
      return NextResponse.json({ folder }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error: unknown) {
      if ((error as Error).message === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/GET] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل الحصول على المجلد" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = renameFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    try {
      const updated = await folderUseCases.renameFolder(id, session.user.id, validation.data.name);
      return NextResponse.json({ folder: updated });
    } catch (error: unknown) {
      if ((error as Error).message === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/PATCH] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل تحديث المجلد" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    try {
      await folderUseCases.deleteFolder(id, session.user.id);
      return NextResponse.json({ message: "تم حذف المجلد بنجاح" });
    } catch (error: unknown) {
      if ((error as Error).message === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/DELETE] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل حذف المجلد" } },
      { status: 500 },
    );
  }
}
