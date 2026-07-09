import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

const suggestQuerySchema = z
  .object({
    q: z.string().max(200).optional().default(""),
  })
  .strip();

export const GET = withAuth(async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const validated = suggestQuerySchema.parse({
      q: searchParams.get("q") || undefined,
    });

    const rateLimitResult = await checkRateLimit("/api/search/suggest", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const suggestions = await useCases.search.getSuggestions(session.user.id, validated.q);
    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "search/suggest", "تعذر تحميل الاقتراحات");
  }
});
