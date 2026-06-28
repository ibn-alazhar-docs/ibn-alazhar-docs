import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const schema = z.object({ documentId: z.string().min(1, "documentId مطلوب") }).strip();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "documentId مطلوب" } },
        { status: 400 },
      );
    }

    const { documentId } = validation.data;

    const result = await useCases.conversion.startConversion(documentId, session);
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: "splitting",
      message: "بدأت معالجة التحويل",
    });
  } catch (error) {
    return handleRouteError(error, "conversion/start", "فشلت معالجة التحويل");
  }
});
