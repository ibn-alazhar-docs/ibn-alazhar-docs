import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const folderId = (await params).id;

    const formattedTags = await folderUseCases.getFolderTags(
      folderId,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({ tags: formattedTags });
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/tags/GET] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load folder tags" } },
      { status: 500 },
    );
  }
}
