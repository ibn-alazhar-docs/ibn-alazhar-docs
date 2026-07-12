"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";
import { SearchBar } from "@/ui/search/search-bar";
import { TagFilterSidebar } from "@/ui/tags/tag-filter-sidebar";
import { SearchResultCard, type SearchResult } from "@/ui/search/search-result-card";
import { Card } from "@/ui/card";
import { Button } from "@/ui/button";

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
                <Card className="p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                  <TagFilterSidebar
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                  />
                </Card>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0 order-1 md:order-2 space-y-6">
                {/* Search Bar */}
                <Card className="p-4">
                  <SearchBar onSearch={handleSearch} />
                </Card>

                {/* Search Type Filter */}
                {results && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-color">{t("typeLabel")}</span>
                    {searchTypes.map((st) => (
                      <Button
                        key={st.value}
                        variant={searchType === st.value ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => {
                          setSearchType(st.value);
                          setCurrentPage(1);
                        }}
                      >
                        {st.label}
                      </Button>
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
                          <SearchResultCard
                            key={result.id}
                            result={result}
                            getStatusLabel={getStatusLabel}
                          />
                        ))}
                      </Stack>
                    )}

                    {/* Pagination */}
                    {results.total > results.limit && (
                      <div className="flex justify-center items-center gap-3 mt-6">
                        <Button
                          variant="outline"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          {t("previous")}
                        </Button>
                        <span className="text-sm text-muted-color">
                          {t("pageInfo", {
                            page: results.page,
                            total: Math.ceil(results.total / results.limit),
                          })}
                        </span>
                        <Button
                          variant="outline"
                          disabled={currentPage >= Math.ceil(results.total / results.limit)}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          {t("next")}
                        </Button>
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
