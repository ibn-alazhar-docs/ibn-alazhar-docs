import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { useCases } from "@/core/composition-root";

const documentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    folderId: z.string().cuid().optional(),
    search: z.string().max(200).optional(),
  })
  .strip();

export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const validated = documentsQuerySchema.parse({
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    folderId: searchParams.get("folderId") || undefined,
    search: searchParams.get("search") || undefined,
  });

  const skip = (validated.page - 1) * validated.limit;

  try {
    const { documents, total } = await useCases.documentCrud.getDocuments(
      session.user.id,
      session.user.role,
      {
        skip,
        take: validated.limit,
        folderId: validated.folderId,
        search: validated.search,
        deleted: false,
      },
    );

    const serializedDocuments = documents.map((doc) => ({
      ...doc,
      fileSize: Number(doc.fileSize),
    }));

    return NextResponse.json(
      {
        documents: serializedDocuments,
        pagination: {
          page: validated.page,
          limit: validated.limit,
          total,
          totalPages: Math.ceil(total / validated.limit),
        },
      },
      { headers: { "Cache-Control": "no-store, must-revalidate" } },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "documents/GET", "حدث خطأ");
  }
});
