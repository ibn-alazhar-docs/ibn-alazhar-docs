import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const PATCH = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  try {
    const restored = await useCases.documentCrud.restoreDocument(id, session.user.id);
    return NextResponse.json({
      success: true,
      document: restored,
      message: "تم استعادة المستند بنجاح",
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/restore/PATCH", "حدث خطأ داخلي");
  }
});
