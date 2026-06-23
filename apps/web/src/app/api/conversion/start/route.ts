import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { conversionUseCases } from "@/core/use-cases/conversion.use-cases";

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const { documentId } = body;

  if (!documentId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "documentId مطلوب" } },
      { status: 400 },
    );
  }

  const result = await conversionUseCases.startConversion(documentId, session);
  return NextResponse.json({
    success: true,
    jobId: result.jobId,
    status: "splitting",
    message: "بدأت معالجة التحويل",
  });
});
