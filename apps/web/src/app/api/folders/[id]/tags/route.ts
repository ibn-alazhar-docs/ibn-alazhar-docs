import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const folderId = (await params).id;
    const isRoot = folderId === "root";

    const whereFolder = isRoot ? { folderId: null } : { folderId };
    const where = ownedWhere({ deletedAt: null, ...whereFolder }, session);

    // Get tags for all documents in this folder
    const tags = await prisma.tag.findMany({
      where: {
        userId: session.user.role === "ADMIN" ? undefined : session.user.id,
        documents: {
          some: {
            document: where,
          },
        },
      },
      include: {
        _count: {
          select: {
            documents: {
              where: {
                document: where,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedTags = tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      count: t._count.documents,
    })).sort((a, b) => b.count - a.count); // sort by count desc

    return NextResponse.json({ tags: formattedTags });
  } catch (error: unknown) {
    logger.error(error, "[folders/[id]/tags/GET] Failed:");
    return NextResponse.json({ error: "Failed to load folder tags" }, { status: 500 });
  }
}
