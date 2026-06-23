import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { getErrorMessage } from "@/lib/errors";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id!;

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
    return handleRouteError(error, "folders/[id]/tree/GET", "فشل تحميل شجرة المجلدات");
  }
});
