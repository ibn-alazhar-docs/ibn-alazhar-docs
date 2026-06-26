import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const folderId = params.id!;

    const formattedTags = await useCases.folder.getFolderTags(
      folderId,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({ tags: formattedTags });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/tags/GET", "فشل تحميل أوسمة المجلد");
  }
});
