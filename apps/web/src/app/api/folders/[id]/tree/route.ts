import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id!;
    const result = await useCases.folder.getFolderTree(id, session.user.id);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/tree/GET", "تعذر تحميل شجرة المجلدات");
  }
});
