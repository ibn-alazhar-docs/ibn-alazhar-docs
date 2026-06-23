import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const MIN_QUERY_LENGTH = 2;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const EXCERPT_MAX_LENGTH = 200;
const EXCERPT_CONTEXT_BEFORE = 50;
const EXCERPT_CONTEXT_AFTER = 150;

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type") || "all";
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");
  const tagId = searchParams.get("tagId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_LIMIT), 10)),
  );
  const offset = (page - 1) * limit;

  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      {
        error: { code: "VALIDATION_ERROR", message: `Min ${MIN_QUERY_LENGTH} characters required` },
      },
      { status: 400 },
    );
  }

  const normalizedQuery = query
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/ـ/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedQuery) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid search query" } },
      { status: 400 },
    );
  }

  try {
    const isAdmin = session.user.role === "ADMIN";
    let whereClause = isAdmin
      ? `d."deletedAt" IS NULL`
      : `d."userId" = $1 AND d."deletedAt" IS NULL`;
    const params: (string | number)[] = isAdmin ? [] : [session.user.id];
    let paramIndex = isAdmin ? 1 : 2;

    if (type === "title") {
      whereClause += ` AND (d.searchvector @@ plainto_tsquery('simple', $${paramIndex}) OR d.title ILIKE '%' || $${paramIndex + 1} || '%')`;
      params.push(normalizedQuery, query);
      paramIndex += 2;
    } else if (type === "folder") {
      whereClause += ` AND f.name ILIKE $${paramIndex}`;
      params.push(`%${query}%`);
      paramIndex++;
    } else {
      whereClause += ` AND (d.searchvector @@ plainto_tsquery('simple', $${paramIndex}) OR d.title ILIKE '%' || $${paramIndex + 1} || '%' OR d.searchpreview ILIKE '%' || $${paramIndex + 2} || '%')`;
      params.push(normalizedQuery, query, query);
      paramIndex += 3;
    }

    if (folderId) {
      whereClause += ` AND d."folderId" = $${paramIndex}`;
      params.push(folderId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    let tagJoin = "";
    if (tagId) {
      tagJoin = `INNER JOIN tag_documents td ON d.id = td."documentId" AND td."tagId" = $${paramIndex}`;
      params.push(tagId);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN folders f ON d."folderId" = f.id
      ${tagJoin}
      WHERE ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe<{ total: bigint }[]>(countQuery, ...params);
    const total = Number(countResult[0]?.total || 0);

    const searchParamsList = params;
    const tsQueryIndex = searchParamsList.indexOf(normalizedQuery) + 1;
    const rankClause =
      tsQueryIndex > 0
        ? `ts_rank(d.searchvector, plainto_tsquery('simple', $${tsQueryIndex}))`
        : `0.0`;

    const searchQuery = `
      SELECT
        d.id,
        d.title,
        d."fileName",
        d.status,
        d."pageCount",
        d."fileSize",
        d."outputFormats",
        d."createdAt",
        d."folderId",
        d.searchpreview,
        d.wordcount,
        ${rankClause} AS rank,
        f.name as "folderName"
      FROM documents d
      LEFT JOIN folders f ON d."folderId" = f.id
      ${tagJoin}
      WHERE ${whereClause}
      ORDER BY rank DESC, d."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const results = await prisma.$queryRawUnsafe<
      {
        id: string;
        title: string;
        fileName: string;
        status: string;
        pageCount: number | null;
        fileSize: number;
        outputFormats: string[];
        createdAt: Date;
        folderId: string | null;
        searchPreview: string | null;
        wordCount: number | null;
        rank: number;
        folderName: string | null;
      }[]
    >(searchQuery, ...params);

    const formattedResults = results.map((r) => {
      let excerpt = r.searchPreview || "";
      if (excerpt.length > EXCERPT_MAX_LENGTH) {
        const lowerQ = normalizedQuery.toLowerCase();
        const lowerExcerpt = excerpt.toLowerCase();
        const idx = lowerExcerpt.indexOf(lowerQ);
        if (idx >= 0) {
          const start = Math.max(0, idx - EXCERPT_CONTEXT_BEFORE);
          const end = Math.min(
            excerpt.length,
            idx + normalizedQuery.length + EXCERPT_CONTEXT_AFTER,
          );
          excerpt =
            (start > 0 ? "..." : "") +
            excerpt.slice(start, end) +
            (end < excerpt.length ? "..." : "");
        } else {
          excerpt = excerpt.slice(0, EXCERPT_MAX_LENGTH) + "...";
        }
      }

      const matchedIn: string[] = [];
      if (type === "all" || type === "title") {
        const lowerTitle = r.title.toLowerCase();
        if (lowerTitle.includes(normalizedQuery.toLowerCase())) {
          matchedIn.push("title");
        }
      }
      if (type === "all" || type === "content") {
        if (r.searchPreview?.toLowerCase().includes(normalizedQuery.toLowerCase())) {
          matchedIn.push("content");
        }
      }

      return {
        id: r.id,
        title: r.title,
        fileName: r.fileName,
        excerpt,
        rank: Number(r.rank),
        matchedIn,
        folder: r.folderId ? { id: r.folderId, name: r.folderName } : null,
        pageCount: r.pageCount,
        wordCount: r.wordCount,
        createdAt: r.createdAt,
        status: r.status,
      };
    });

    return NextResponse.json({
      query,
      normalizedQuery,
      total,
      page,
      limit,
      results: formattedResults,
    });
  } catch (error) {
    logger.error(error, "Search error:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Search failed" } },
      { status: 500 },
    );
  }
}
