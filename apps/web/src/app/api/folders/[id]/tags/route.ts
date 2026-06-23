import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const folderId = params.id!;

    const formattedTags = await folderUseCases.getFolderTags(
      folderId,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({ tags: formattedTags });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/tags/GET", "فشل تحميل أوسمة المجلد");
  }
});
