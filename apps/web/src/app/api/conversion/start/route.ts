import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "documentId مطلوب" } },
        { status: 400 },
      );
    }

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
