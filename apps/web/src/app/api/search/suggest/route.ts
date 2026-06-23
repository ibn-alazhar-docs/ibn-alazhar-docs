import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const titleSuggestions = await prisma.$queryRawUnsafe<
      { text: string; type: string; count: bigint }[]
    >(
      `SELECT DISTINCT title as text, 'title' as type, COUNT(*) as count
       FROM documents
       WHERE "userId" = $1
         AND "deletedAt" IS NULL
         AND normalize_arabic(title) ILIKE normalize_arabic($2)
       GROUP BY title
       LIMIT 5`,
      session.user.id,
      `%${query}%`,
    );

    const folderSuggestions = await prisma.$queryRawUnsafe<
      { text: string; type: string; count: bigint }[]
    >(
      `SELECT DISTINCT name as text, 'folder' as type, COUNT(*) as count
       FROM folders
       WHERE "userId" = $1
         AND "deletedAt" IS NULL
         AND normalize_arabic(name) ILIKE normalize_arabic($2)
       GROUP BY name
       LIMIT 3`,
      session.user.id,
      `%${query}%`,
    );

    const tagSuggestions = await prisma.$queryRawUnsafe<
      { text: string; type: string; count: bigint; id: string }[]
    >(
      `SELECT DISTINCT t.name as text, 'tag' as type, COUNT(td."documentId") as count, t.id
       FROM tags t
       LEFT JOIN tag_documents td ON t.id = td."tagId"
       WHERE t."userId" = $1
         AND normalize_arabic(t.name) ILIKE normalize_arabic($2)
       GROUP BY t.id, t.name
       ORDER BY count DESC
       LIMIT 3`,
      session.user.id,
      `%${query}%`,
    );

    const allSuggestions = [
      ...titleSuggestions.map((s) => ({
        text: s.text,
        type: s.type,
        count: Number(s.count),
      })),
      ...folderSuggestions.map((s) => ({
        text: s.text,
        type: s.type,
        count: Number(s.count),
      })),
      ...tagSuggestions.map((s) => ({
        text: s.text,
        type: s.type,
        count: Number(s.count),
        id: s.id,
      })),
    ]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({ suggestions: allSuggestions });
  } catch (error) {
    logger.error(error, "Search suggest error:");
    return NextResponse.json(
      { error: { code: "SEARCH_SUGGEST_ERROR", message: "فشل تحميل الاقتراحات" } },
      { status: 500 },
    );
  }
}
