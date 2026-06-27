import { ValidationError } from "@/lib/errors";
import { isAdminRole } from "@/domain/auth";
import { LIMITS } from "@/lib/constants";
import type { ISearchRepository } from "@/domain/repositories/search.repository.interface";

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
  constructor(private readonly searchRepository: ISearchRepository) {}

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
    const limit = Math.min(
      LIMITS.SEARCH_MAX_PAGE_LIMIT,
      Math.max(1, filters.limit || LIMITS.SEARCH_DEFAULT_PAGE_LIMIT),
    );
    const offset = (page - 1) * limit;

    if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
      throw new ValidationError(`Min ${LIMITS.MIN_SEARCH_QUERY_LENGTH} characters required`);
    }

    const normalizedQuery = this.normalizeArabic(query);
    if (!normalizedQuery) throw new ValidationError("Invalid search query");

    const admin = isAdminRole(role);

    const searchParams = {
      userId,
      isAdmin: admin,
      normalizedQuery,
      rawQuery: query,
      type,
      folderId,
      status,
      tagId,
      limit,
      offset,
    };

    const [total, rows] = await Promise.all([
      this.searchRepository.countDocuments(searchParams),
      this.searchRepository.searchDocuments(searchParams),
    ]);

    const formattedResults: SearchResult[] = rows.map((r) => {
      let excerpt = r.searchpreview || "";
      if (excerpt.length > LIMITS.SEARCH_EXCERPT_MAX_LENGTH) {
        const lowerQ = normalizedQuery.toLowerCase();
        const lowerExcerpt = excerpt.toLowerCase();
        const idx = lowerExcerpt.indexOf(lowerQ);
        if (idx >= 0) {
          const start = Math.max(0, idx - LIMITS.SEARCH_EXCERPT_CONTEXT_BEFORE);
          const end = Math.min(
            excerpt.length,
            idx + normalizedQuery.length + LIMITS.SEARCH_EXCERPT_CONTEXT_AFTER,
          );
          excerpt =
            (start > 0 ? "..." : "") +
            excerpt.slice(start, end) +
            (end < excerpt.length ? "..." : "");
        } else {
          excerpt = excerpt.slice(0, LIMITS.SEARCH_EXCERPT_MAX_LENGTH) + "...";
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

    const [titleSuggestions, folderSuggestions, tagSuggestions] = await Promise.all([
      this.searchRepository.getTitleSuggestions(userId, query),
      this.searchRepository.getFolderSuggestions(userId, query),
      this.searchRepository.getTagSuggestions(userId, query),
    ]);

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
