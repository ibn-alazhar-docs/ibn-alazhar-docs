import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const restored = await documentUseCases.restoreDocument(id, session.user.id);
    return NextResponse.json({
      success: true,
      document: restored,
      message: "تم استعادة المستند بنجاح",
    });
  } catch (error: unknown) {
    if ((error as Error).message === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستند غير موجود" } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "حدث خطأ داخلي" } },
      { status: 500 },
    );
  }
}
