import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { updateTagSchema } from "@/lib/validators/tag";
import { tagUseCases } from "@/core/use-cases/tag.use-cases";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );
    const tag = await tagUseCases.getTagById(id, session);
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/GET", "فشل الحصول على الوسم");
  }
});

export const PATCH = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );
    const body = await request.json();
    const validation = updateTagSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const tag = await tagUseCases.updateTag(id, validation.data, session);
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/PATCH", "فشل تحديث الوسم");
  }
});

export const DELETE = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );
    await tagUseCases.deleteTag(id, session);
    return NextResponse.json({ success: true, message: "تم حذف الوسم بنجاح" });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/[id]/DELETE", "فشل حذف الوسم");
  }
});
