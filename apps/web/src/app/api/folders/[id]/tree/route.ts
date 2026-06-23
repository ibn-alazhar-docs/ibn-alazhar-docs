import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { getErrorMessage } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    try {
      const result = await folderUseCases.getFolderTree(id, session.user.id);
      return NextResponse.json(result, {
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
      });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/tree/GET] Failed:");
    return NextResponse.json(
      { error: { code: "FOLDER_TREE_ERROR", message: "فشل تحميل شجرة المجلدات" } },
      { status: 500 },
    );
  }
}
