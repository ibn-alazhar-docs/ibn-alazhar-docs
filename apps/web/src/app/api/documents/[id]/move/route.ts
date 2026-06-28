import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

const moveSchema = z
  .object({
    folderId: z.string().nullable(),
  })
  .strip();

export const PATCH = withAuth(async (request, { session, params }) => {
  const id = params.id!;
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
    const updated = await useCases.documentMove.moveDocument(id, session.user.id, folderId);
    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/move/PATCH", "حدث خطأ داخلي");
  }
});
