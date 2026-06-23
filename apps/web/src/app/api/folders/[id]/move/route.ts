import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { moveFolderSchema, MAX_FOLDER_DEPTH } from "@/lib/validators/folder";
import { logger } from "@/lib/logger";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { getErrorMessage } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = moveFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { parentId } = validation.data;

    try {
      const updated = await folderUseCases.moveFolder(id, session.user.id, parentId);
      return NextResponse.json({ folder: updated });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "CIRCULAR_REFERENCE") {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "لا يمكن نقل المجلد إلى نفسه أو مجلد فرعي منه",
            },
          },
          { status: 400 },
        );
      }
      if (getErrorMessage(error) === "TARGET_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد الهدف غير موجود" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "MAX_DEPTH_REACHED") {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: `الحد الأقصى لعمق المجلدات هو ${MAX_FOLDER_DEPTH} مستويات`,
            },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/move/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل نقل المجلد" } },
      { status: 500 },
    );
  }
}
