import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    try {
      const restored = await folderUseCases.restoreFolder(id, session.user.id);
      return NextResponse.json({
        message: "تم استعادة المجلد بنجاح",
        folder: restored,
      });
    } catch (error: unknown) {
      if ((error as Error).message === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      if ((error as Error).message === "PARENT_DELETED") {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message:
                "لا يمكن استعادة المجلد لأن المجلد الأب محذوف. يرجى استعادة المجلد الأب أولاً.",
            },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/restore/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل استعادة المجلد" } },
      { status: 500 },
    );
  }
}
