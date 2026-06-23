import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { searchUseCases } from "@/core/use-cases/search.use-cases";

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const suggestions = await searchUseCases.getSuggestions(session.user.id, query);
    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    return handleRouteError(error, "search/suggest", "فشل تحميل الاقتراحات");
  }
});
