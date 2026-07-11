import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const folderId = params.id!;

    const formattedTags = await useCases.folder.getFolderTags(
      folderId,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json(
      { tags: formattedTags },
      { headers: { "Cache-Control": "private, max-age=10" } },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/tags/GET", "تعذر تحميل أوسمة المجلد");
  }
});
