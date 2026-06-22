import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUpdateSchema } from "@/lib/validators/document";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const document = await documentUseCases.getDocumentById(id, session.user.id);
    return NextResponse.json({ document });
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json();

  const validation = documentUpdateSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
      { status: 400 },
    );
  }

  try {
    const updated = await documentUseCases.updateDocument(id, session.user.id, validation.data);
    return NextResponse.json({ document: updated });
  } catch (error: unknown) {
    if ((error as Error).message === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستند غير موجود" } },
        { status: 404 },
      );
    }
    if ((error as Error).message === "FOLDER_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "حدث خطأ داخلي" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    await documentUseCases.deleteDocument(id, session.user.id);
    return NextResponse.json({ success: true, message: "تم حذف المستند" });
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
