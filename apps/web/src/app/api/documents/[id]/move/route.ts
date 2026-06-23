import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { getErrorMessage } from "@/lib/types";

const moveSchema = z.object({
  folderId: z.string().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json();

  const validation = moveSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
      { status: 400 },
    );
  }

  const { folderId } = validation.data;

  try {
    const updated = await documentUseCases.moveDocument(id, session.user.id, folderId);
    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (error: unknown) {
    if (getErrorMessage(error) === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستند غير موجود" } },
        { status: 404 },
      );
    }
    if (getErrorMessage(error) === "FOLDER_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المجلد الهدف غير موجود" } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "حدث خطأ داخلي" } },
      { status: 500 },
    );
  }
}
