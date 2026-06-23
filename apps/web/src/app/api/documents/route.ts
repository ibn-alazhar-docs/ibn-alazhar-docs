import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const folderId = searchParams.get("folderId");
  const search = searchParams.get("search");

  try {
    const { documents, total } = await documentUseCases.getDocuments(
      session.user.id,
      session.user.role,
      {
        skip,
        take: limit,
        folderId: folderId ?? undefined,
        search: search ?? undefined,
        deleted: false,
      },
    );

    const serializedDocuments = documents.map((doc) => ({
      ...doc,
      fileSize: Number(doc.fileSize),
    }));

    return NextResponse.json({
      documents: serializedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/GET", "حدث خطأ داخلي");
  }
});
