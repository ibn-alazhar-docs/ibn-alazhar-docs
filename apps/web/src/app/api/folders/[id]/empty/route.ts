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
      const result = await folderUseCases.emptyFolder(id, session.user.id);

      return NextResponse.json({
        message: "تم تفريغ المجلد بنجاح",
        documentsMoved: result.documentsMoved,
        foldersMoved: result.foldersMoved,
      });
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
    const errMessage = error instanceof Error ? (error as Error).message : String(error);
    logger.error(error, "[folders/[id]/empty/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل تفريغ المجلد" } },
      { status: 500 },
    );
  }
}
