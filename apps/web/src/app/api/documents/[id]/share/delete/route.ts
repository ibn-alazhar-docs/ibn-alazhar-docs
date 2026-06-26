import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    await useCases.documentShare.deleteShareLink(id, session.user.id);
    return NextResponse.json({ success: true, message: "Sharing disabled" });
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/share/delete/DELETE",
      "حدث خطأ أثناء تعطيل المشاركة",
    );
  }
});
