import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";

const MIN_QUERY_LENGTH = 2;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const EXCERPT_MAX_LENGTH = 200;
const EXCERPT_CONTEXT_BEFORE = 50;
const EXCERPT_CONTEXT_AFTER = 150;

export interface SearchFilters {
  query: string;
  type?: string;
  folderId?: string;
  status?: string;
  tagId?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  fileName: string;
  excerpt: string;
  rank: number;
  matchedIn: string[];
  folder: { id: string; name: string | null } | null;
  pageCount: number | null;
  wordCount: number | null;
  createdAt: Date;
  status: string;
}

export class SearchUseCases {
  private normalizeArabic(text: string): string {
    return text
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/ـ/g, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async search(userId: string, role: string, filters: SearchFilters) {
    const { query, type = "all", folderId, status, tagId } = filters;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, filters.limit || DEFAULT_PAGE_LIMIT));
    const offset = (page - 1) * limit;

    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      throw new ValidationError(`Min ${MIN_QUERY_LENGTH} characters required`);
    }

    const normalizedQuery = this.normalizeArabic(query);
    if (!normalizedQuery) throw new ValidationError("Invalid search query");

    const isAdmin = role === "ADMIN";
    let whereClause = isAdmin
      ? `d."deletedAt" IS NULL`
      : `d."userId" = $1 AND d."deletedAt" IS NULL`;
    const params: (string | number)[] = isAdmin ? [] : [userId];
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
        searchpreview: string | null;
        wordcount: number | null;
        rank: number;
        folderName: string | null;
      }[]
    >(searchQuery, ...params);

    const formattedResults: SearchResult[] = results.map((r) => {
      let excerpt = r.searchpreview || "";
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
        if (r.title.toLowerCase().includes(normalizedQuery.toLowerCase())) matchedIn.push("title");
      }
      if (type === "all" || type === "content") {
        if (r.searchpreview?.toLowerCase().includes(normalizedQuery.toLowerCase()))
          matchedIn.push("content");
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
        wordCount: r.wordcount,
        createdAt: r.createdAt,
        status: r.status,
      };
    });

    return { query, normalizedQuery, total, page, limit, results: formattedResults };
  }

  async getSuggestions(userId: string, query: string) {
    if (!query || query.trim().length < 2) return [];

    const titleSuggestions = await prisma.$queryRawUnsafe<
      { text: string; type: string; count: bigint }[]
    >(
      `SELECT DISTINCT title as text, 'title' as type, COUNT(*) as count
       FROM documents
       WHERE "userId" = $1 AND "deletedAt" IS NULL
         AND normalize_arabic(title) ILIKE normalize_arabic($2)
       GROUP BY title LIMIT 5`,
      userId,
      `%${query}%`,
    );

    const folderSuggestions = await prisma.$queryRawUnsafe<
      { text: string; type: string; count: bigint }[]
    >(
      `SELECT DISTINCT name as text, 'folder' as type, COUNT(*) as count
       FROM folders
       WHERE "userId" = $1 AND "deletedAt" IS NULL
         AND normalize_arabic(name) ILIKE normalize_arabic($2)
       GROUP BY name LIMIT 3`,
      userId,
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
       ORDER BY count DESC LIMIT 3`,
      userId,
      `%${query}%`,
    );

    return [
      ...titleSuggestions.map((s) => ({ text: s.text, type: s.type, count: Number(s.count) })),
      ...folderSuggestions.map((s) => ({ text: s.text, type: s.type, count: Number(s.count) })),
      ...tagSuggestions.map((s) => ({
        text: s.text,
        type: s.type,
        count: Number(s.count),
        id: s.id,
      })),
    ]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
}

export const searchUseCases = new SearchUseCases();
