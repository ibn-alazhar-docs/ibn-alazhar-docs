import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

const searchParamsSchema = z
  .object({
    q: z.string().max(200).optional().default(""),
    type: z.enum(["title", "folder", "content", "all"]).optional().default("all"),
    folderId: z.string().cuid().optional(),
    status: z.enum(["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
    tagId: z.string().cuid().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strip();

export const GET = withAuth(async (request, { session }) => {
  try {
    const rateLimitResult = await checkUserRateLimit("search:query", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const { searchParams } = new URL(request.url);
    const params = {
      q: searchParams.get("q") || undefined,
      type: searchParams.get("type") || undefined,
      folderId: searchParams.get("folderId") || undefined,
      status: searchParams.get("status") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const validated = searchParamsSchema.parse(params);

    const result = await useCases.search.search(session.user.id, session.user.role, {
      query: validated.q,
      type: validated.type,
      folderId: validated.folderId,
      status: validated.status,
      tagId: validated.tagId,
      page: validated.page,
      limit: validated.limit,
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    return handleRouteError(error, "search", "تعذر البحث");
  }
});
