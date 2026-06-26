import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);

    const result = await useCases.conversion.listJobs(session, {
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "50", 10),
      status: searchParams.get("status") || undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "conversion/list", "فشل تحميل قائمة التحويلات");
  }
});
