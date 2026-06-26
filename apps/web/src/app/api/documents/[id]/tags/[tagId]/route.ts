import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  const tagId = params.tagId!;

  try {
    await useCases.documentTag.removeTagFromDocument(id, tagId, session.user.id, session.user.role);
    return NextResponse.json({ success: true, message: "Tag removed" });
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/tags/[tagId]/DELETE",
      "حدث خطأ أثناء إزالة الوسم",
    );
  }
});
