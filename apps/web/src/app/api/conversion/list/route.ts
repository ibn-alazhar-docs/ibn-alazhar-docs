import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { useCases } from "@/core/composition-root";

const conversionListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    status: z.enum(["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  })
  .strip();

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const validated = conversionListQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      status: searchParams.get("status") || undefined,
    });

    const result = await useCases.conversion.listJobs(session, validated);

    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    return handleRouteError(error, "conversion/list", "فشل تحميل قائمة التحويلات");
  }
});
