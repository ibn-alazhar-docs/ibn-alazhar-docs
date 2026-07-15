import { PrismaClient } from "@prisma/client";
import { SUGGESTION_LIMITS } from "@/shared/constants";
import type {
  ISearchRepository,
  SearchQueryParams,
  SearchDocumentRow,
  SuggestionRow,
} from "@/domain/repositories/search.repository.interface";

export interface SearchCountResult {
  total: bigint;
}

export class SearchRepository implements ISearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countDocuments(params: SearchQueryParams): Promise<number> {
    const { whereClause, tagJoin, params: sqlParams } = this.buildWhereClause(params);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN folders f ON d."folderId" = f.id
      ${tagJoin}
      WHERE ${whereClause}
    `;

    const countResult = await this.prisma.$queryRawUnsafe<SearchCountResult[]>(
      countQuery,
      ...sqlParams,
    );
    return Number(countResult[0]?.total || 0);
  }

  async searchDocuments(params: SearchQueryParams): Promise<SearchDocumentRow[]> {
    const { whereClause, tagJoin, params: sqlParams, rankClause } = this.buildWhereClause(params);

    const paramIndex = sqlParams.length + 1;

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

    return this.prisma.$queryRawUnsafe<SearchDocumentRow[]>(
      searchQuery,
      ...sqlParams,
      params.limit,
      params.offset,
    );
  }

  async getTitleSuggestions(userId: string, query: string): Promise<SuggestionRow[]> {
    return this.prisma.$queryRawUnsafe<SuggestionRow[]>(
      `SELECT DISTINCT title as text, 'title' as type, COUNT(*) as count
       FROM documents
       WHERE "userId" = $1 AND "deletedAt" IS NULL
         AND normalize_arabic(title) ILIKE normalize_arabic($2)
       GROUP BY title LIMIT ${SUGGESTION_LIMITS.MAX_TITLE_SUGGESTIONS}`,
      userId,
      `%${query}%`,
    );
  }

  async getFolderSuggestions(userId: string, query: string): Promise<SuggestionRow[]> {
    return this.prisma.$queryRawUnsafe<SuggestionRow[]>(
      `SELECT DISTINCT name as text, 'folder' as type, COUNT(*) as count
       FROM folders
       WHERE "userId" = $1 AND "deletedAt" IS NULL
         AND normalize_arabic(name) ILIKE normalize_arabic($2)
       GROUP BY name LIMIT ${SUGGESTION_LIMITS.MAX_FOLDER_SUGGESTIONS}`,
      userId,
      `%${query}%`,
    );
  }

  async getTagSuggestions(userId: string, query: string): Promise<SuggestionRow[]> {
    return this.prisma.$queryRawUnsafe<SuggestionRow[]>(
      `SELECT DISTINCT t.name as text, 'tag' as type, COUNT(td."documentId") as count, t.id
       FROM tags t
       LEFT JOIN tag_documents td ON t.id = td."tagId"
       WHERE t."userId" = $1
         AND normalize_arabic(t.name) ILIKE normalize_arabic($2)
       GROUP BY t.id, t.name
       ORDER BY count DESC LIMIT ${SUGGESTION_LIMITS.MAX_TAG_SUGGESTIONS}`,
      userId,
      `%${query}%`,
    );
  }

  private buildWhereClause(params: SearchQueryParams) {
    const { userId, isAdmin, normalizedQuery, rawQuery, type, folderId, status, tagId } = params;

    // كل مستخدم يبحث في مستنداته فقط
    let whereClause = `d."userId" = $1 AND d."deletedAt" IS NULL`;
    const sqlParams: (string | number)[] = [userId!];
    let paramIndex = 2;

    if (type === "title") {
      whereClause += ` AND (d.searchvector @@ plainto_tsquery('simple', $${paramIndex}) OR d.title ILIKE '%' || $${paramIndex + 1} || '%')`;
      sqlParams.push(normalizedQuery, rawQuery);
      paramIndex += 2;
    } else if (type === "folder") {
      whereClause += ` AND f.name ILIKE $${paramIndex}`;
      sqlParams.push(`%${rawQuery}%`);
      paramIndex++;
    } else {
      whereClause += ` AND (d.searchvector @@ plainto_tsquery('simple', $${paramIndex}) OR d.title ILIKE '%' || $${paramIndex + 1} || '%' OR d.searchpreview ILIKE '%' || $${paramIndex + 2} || '%')`;
      sqlParams.push(normalizedQuery, rawQuery, rawQuery);
      paramIndex += 3;
    }

    if (folderId) {
      whereClause += ` AND d."folderId" = $${paramIndex}`;
      sqlParams.push(folderId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND d.status = $${paramIndex}`;
      sqlParams.push(status);
      paramIndex++;
    }

    let tagJoin = "";
    if (tagId) {
      tagJoin = `INNER JOIN tag_documents td ON d.id = td."documentId" AND td."tagId" = $${paramIndex}`;
      sqlParams.push(tagId);
      paramIndex++;
    }

    const tsQueryIndex = sqlParams.indexOf(normalizedQuery) + 1;
    const rankClause =
      tsQueryIndex > 0
        ? `ts_rank(d.searchvector, plainto_tsquery('simple', $${tsQueryIndex}))`
        : `0.0`;

    return { whereClause, tagJoin, params: sqlParams, rankClause };
  }
}
