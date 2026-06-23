import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { addTagToDocumentSchema, setDocumentTagsSchema } from "@/lib/validators/tag";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const tags = await documentUseCases.getDocumentTags(id, session.user.id);
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/tags/GET", "حدث خطأ أثناء تحميل الأوسمة");
  }
});

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id!;
  const body = await request.json();
  const validation = addTagToDocumentSchema.safeParse(body);

  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "Invalid data" } },
      { status: 400 },
    );
  }

  const { tagId } = validation.data;

  try {
    const tag = await documentUseCases.addTagToDocument(
      id,
      tagId,
      session.user.id,
      session.user.role,
    );
    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/tags/POST", "حدث خطأ أثناء إضافة الوسم");
  }
});

export const PUT = withAuth(async (request, { session, params }) => {
  const id = params.id!;
  const body = await request.json();
  const validation = setDocumentTagsSchema.safeParse(body);

  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "Invalid data" } },
      { status: 400 },
    );
  }

  const { tagIds } = validation.data;

  try {
    const tagCount = await documentUseCases.setDocumentTags(
      id,
      tagIds,
      session.user.id,
      session.user.role,
    );
    return NextResponse.json({ success: true, tagCount });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/tags/PUT", "حدث خطأ أثناء تعيين الأوسمة");
  }
});
