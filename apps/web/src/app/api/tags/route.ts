import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { createTagSchema } from "@/lib/validators/tag";
import { tagUseCases } from "@/core/use-cases/tag.use-cases";

export const GET = withAuth(async (_request, { session }) => {
  try {
    const tags = await tagUseCases.getTags(session);
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/GET", "فشل الحصول على الوسوم");
  }
});

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const validation = createTagSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const tag = await tagUseCases.createTag(validation.data.name, validation.data.color, session);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/POST", "فشل إنشاء الوسم");
  }
});
