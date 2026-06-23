import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { documentUpdateSchema } from "@/lib/validators/document";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  try {
    const document = await documentUseCases.getDocumentById(id, session.user.id);
    return NextResponse.json({ document });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/GET", "حدث خطأ داخلي");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  const id = params.id!;
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
    return handleRouteError(error, "documents/PATCH", "حدث خطأ داخلي");
  }
});

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;
  try {
    await documentUseCases.deleteDocument(id, session.user.id);
    return NextResponse.json({ success: true, message: "تم حذف المستند" });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/DELETE", "حدث خطأ داخلي");
  }
});
