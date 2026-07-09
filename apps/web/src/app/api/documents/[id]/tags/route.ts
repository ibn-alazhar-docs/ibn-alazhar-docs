import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { addTagToDocumentSchema, setDocumentTagsSchema } from "@/shared/validators/tag";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const tags = await useCases.documentTag.getDocumentTags(id, session.user.id);
    return NextResponse.json({ tags }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/tags/GET", "تعذر تحميل الأوسمة");
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

  const rateLimit = await checkUserRateLimit("documents:tags", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const tag = await useCases.documentTag.addTagToDocument(
      id,
      tagId,
      session.user.id,
      session.user.role,
    );
    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/tags/POST", "تعذرت إضافة الوسم");
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

  const rateLimit = await checkUserRateLimit("documents:tags", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const tagCount = await useCases.documentTag.setDocumentTags(
      id,
      tagIds,
      session.user.id,
      session.user.role,
    );
    return NextResponse.json({ success: true, tagCount });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/tags/PUT", "تعذر تعيين الأوسمة");
  }
});
