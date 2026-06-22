"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { PageTransition } from "@/components/ui/page-transition";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { SearchBar } from "@/components/search/search-bar";
import { TagFilterSidebar } from "@/components/tags/tag-filter-sidebar";

interface SearchResult {
  id: string;
  title: string;
  fileName: string;
  excerpt: string;
  rank: number;
  matchedIn: string[];
  folder: { id: string; name: string } | null;
  pageCount: number | null;
  wordCount: number | null;
  createdAt: string;
  status: string;
}

interface SearchResponse {
  query: string;
  normalizedQuery: string;
  total: number;
  page: number;
  limit: number;
  results: SearchResult[];
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("search");
  const tDocs = useTranslations("documents");
  const initialQuery = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchType, setSearchType] = useState("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const performSearch = useCallback(
    async (query: string, page: number, type: string) => {
      if (!query || query.trim().length < 2) {
        setResults(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query,
          page: page.toString(),
          limit: "20",
          type,
        });

        if (selectedTagIds.length > 0) {
          selectedTagIds.forEach((id) => params.append("tagId", id));
        }

        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || t("error"));
        }

        const data = await res.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, currentPage, searchType);
    }
  }, [initialQuery, currentPage, searchType, selectedTagIds, performSearch]);

  function handleSearch(query: string) {
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setCurrentPage(1);
  }

  function getStatusLabel(status: string): string {
    return tDocs(`status.${status}`) || status;
  }

  const searchTypes = [
    { value: "all", label: t("types.all") },
    { value: "title", label: t("types.title") },
    { value: "content", label: t("types.content") },
    { value: "folder", label: t("types.folder") },
  ];

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <Stack gap={6}>
            {/* Header */}
            <div>
              <Heading level={2}>{t("title")}</Heading>
              <Text color="muted">{t("subtitle")}</Text>
            </div>

            <div className="flex gap-6 flex-col md:flex-row">
              {/* Sidebar */}
              <div className="w-full md:w-64 shrink-0 order-2 md:order-1">
                <div className="bg-card rounded-xl border border-line p-4 sticky top-4">
                  <TagFilterSidebar
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                  />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 order-1 md:order-2 space-y-6">
                {/* Search Bar */}
                <div className="bg-card rounded-xl border border-line p-4">
                  <SearchBar onSearch={handleSearch} />
                </div>

                {/* Search Type Filter */}
                {results && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-color">{t("typeLabel")}</span>
                    {searchTypes.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          searchType === st.value
                            ? "bg-[var(--success-bg)] text-[var(--success)] font-medium"
                            : "text-muted-color hover:bg-hover"
                        }`}
                        onClick={() => {
                          setSearchType(st.value);
                          setCurrentPage(1);
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="text-center py-8">
                    <div className="mb-2 text-muted-color">
                      <svg
                        className="w-10 h-10 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <Text color="muted">{t("searching")}</Text>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-danger border border-line rounded-lg p-4">
                    <Text color="error">{error}</Text>
                  </div>
                )}

                {/* Results */}
                {results && !loading && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Text color="muted">
                        {results.total} {results.total === 1 ? t("result") : t("results")}
                      </Text>
                    </div>

                    {results.results.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mb-4 text-muted-color">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                        <Text color="muted">
                          {t("noResults")} &quot;{results.query}&quot;
                        </Text>
                      </div>
                    ) : (
                      <Stack gap={4}>
                        {results.results.map((result) => (
                          <div
                            key={result.id}
                            className="bg-card rounded-xl border border-line p-4 hover:border-line transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">
                                    <svg
                                      className="w-5 h-5 text-muted-color"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  </span>
                                  <h3 className="font-medium text-primary-color truncate">
                                    {result.title}
                                  </h3>
                                  {result.matchedIn.includes("title") && (
                                    <span className="px-1.5 py-0.5 text-xs bg-[var(--success-bg)] text-[var(--success)] rounded">
                                      {t("matchTitle")}
                                    </span>
                                  )}
                                  {result.matchedIn.includes("content") && (
                                    <span className="px-1.5 py-0.5 text-xs bg-[var(--info-bg)] text-[var(--info)] rounded">
                                      {t("matchContent")}
                                    </span>
                                  )}
                                </div>

                                {result.excerpt && (
                                  <p className="text-sm text-muted-color line-clamp-2 mb-2">
                                    {result.excerpt}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-xs text-very-muted">
                                  {result.folder && (
                                    <span>
                                      <svg
                                        className="w-4 h-4 inline text-muted-color"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                        />
                                      </svg>{" "}
                                      {result.folder.name}
                                    </span>
                                  )}
                                  {result.pageCount && (
                                    <span>
                                      {result.pageCount} {tDocs("pageCount")}
                                    </span>
                                  )}
                                  {result.wordCount && (
                                    <span>
                                      {result.wordCount.toLocaleString(
                                        locale === "ar" ? "ar-EG" : "en-US",
                                      )}
                                    </span>
                                  )}
                                  <span>
                                    {new Date(result.createdAt).toLocaleDateString(
                                      locale === "ar" ? "ar-EG" : "en-US",
                                    )}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full ${
                                      result.status === "COMPLETED"
                                        ? "bg-[var(--success-bg)] text-[var(--success)]"
                                        : "bg-[var(--badge-bg)] text-[var(--text-muted)]"
                                    }`}
                                  >
                                    {getStatusLabel(result.status)}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                <span className="text-xs text-very-muted">
                                  {(result.rank * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </Stack>
                    )}

                    {/* Pagination */}
                    {results.total > results.limit && (
                      <div className="flex justify-center gap-2 mt-6">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover rounded-lg disabled:opacity-50"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          {t("previous")}
                        </button>
                        <span className="px-4 py-2 text-sm text-muted-color">
                          {t("pageInfo", {
                            page: results.page,
                            total: Math.ceil(results.total / results.limit),
                          })}
                        </span>
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover rounded-lg disabled:opacity-50"
                          disabled={currentPage >= Math.ceil(results.total / results.limit)}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          {t("next")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {!results && !loading && !error && (
                  <div className="text-center py-12">
                    <div className="mb-4 text-muted-color">
                      <svg
                        className="w-12 h-12 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <Text color="muted">{t("subtitle")}</Text>
                  </div>
                )}
              </div>
            </div>
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
