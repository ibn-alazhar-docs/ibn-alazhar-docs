import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUseCases } from "@/core/use-cases/document.use-cases";

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const folderId = searchParams.get("folderId");
  const search = searchParams.get("search");

  // Since use cases currently expect 'skip', 'take', 'folderId', 'search', 'deleted'
  // Let's pass what we have
  try {
    const { documents, total } = await documentUseCases.getDocuments(
      session.user.id,
      session.user.role,
      {
        skip,
        take: limit,
        folderId: folderId ?? undefined,
        search: search ?? undefined,
        deleted: false, // Default to not returning deleted documents unless specified?
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
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "حدث خطأ داخلي" } },
      { status: 500 },
    );
  }
}
