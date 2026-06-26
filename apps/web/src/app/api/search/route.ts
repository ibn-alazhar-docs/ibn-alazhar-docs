import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);

    const result = await useCases.search.search(session.user.id, session.user.role, {
      query: searchParams.get("q") || "",
      type: searchParams.get("type") || undefined,
      folderId: searchParams.get("folderId") || undefined,
      status: searchParams.get("status") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "20", 10),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleRouteError(error, "search", "فشل البحث");
  }
});
