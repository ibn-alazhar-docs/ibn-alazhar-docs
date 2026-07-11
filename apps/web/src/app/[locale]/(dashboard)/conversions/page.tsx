"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";
import { PAGINATION } from "@/shared/constants";
import { ConversionStatus } from "@/ui/pipeline/conversion-status";
import { Card } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";

interface ConversionJob {
  id: string;
  documentId: string;
  sourceFormat: string;
  targetFormat: string;
  status: string;
  progress: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  document: {
    id: string;
    title: string;
    fileName: string;
  };
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversionsPage() {
  const t = useTranslations("nav");
  const tConv = useTranslations("conversions");
  const tPreview = useTranslations("pipeline.preview");
  const locale = useLocale();

  const [jobId, setJobId] = useState("");
  const [searched, setSearched] = useState(false);

  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJobs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conversion/list?page=${p}&limit=${PAGINATION.CONVERSION_PAGE_SIZE}`,
      );
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      // Safe to swallow: error handled gracefully by UI state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(page);
  }, [page, fetchJobs]);

  // Auto-refresh active conversions every 5s
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "PENDING" || j.status === "PROCESSING");
    if (!hasActive) return;

    const interval = setInterval(() => {
      fetchJobs(page);
    }, 5000);
    return () => clearInterval(interval);
  }, [jobs, page, fetchJobs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (jobId.trim()) setSearched(true);
  }

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <Stack gap={6}>
            <div>
              <Heading level={2}>{t("conversions")}</Heading>
              <Text color="muted">{tConv("subtitle")}</Text>
            </div>

            {/* Search by Job ID */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <Input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder={tConv("searchPlaceholder")}
                dir="ltr"
              />
              <Button type="submit">{tConv("searchButton")}</Button>
            </form>

            {/* Searched Job Status */}
            {searched && jobId && (
              <Card className="p-6">
                <div className="mb-4">
                  <span className="text-xs text-very-muted font-mono">{jobId}</span>
                </div>
                <ConversionStatus jobId={jobId} />
                <div className="mt-4 pt-4 border-t border-line flex gap-2">
                  <Button asChild>
                    <a href={`/${locale}/preview/${encodeURIComponent(jobId)}`}>
                      {tPreview("previewDocument")}
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/export/${encodeURIComponent(jobId)}/md`}>
                      {tPreview("downloadMd")}
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/export/${encodeURIComponent(jobId)}/txt`}>
                      {tPreview("downloadTxt")}
                    </a>
                  </Button>
                </div>
              </Card>
            )}

            {searched && !jobId && (
              <div className="text-center py-8">
                <Text color="muted">{tConv("enterJobId")}</Text>
              </div>
            )}

            {/* Conversions List */}
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-line">
                <Heading level={3}>{tConv("allConversions")}</Heading>
              </div>

              {loading && jobs.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Text color="muted">{tConv("loading")}</Text>
                </div>
              ) : jobs.length === 0 ? (
                <div className="px-6 py-12 text-center">
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <Text color="muted">{tConv("noConversions")}</Text>
                  <Text color="muted" className="text-sm mt-1">
                    {tConv("noConversionsHint")}
                  </Text>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-start">
                        <th className="px-6 py-3 font-medium text-muted-color">
                          {tConv("document")}
                        </th>
                        <th className="px-6 py-3 font-medium text-muted-color">
                          {tConv("status")}
                        </th>
                        <th className="px-6 py-3 font-medium text-muted-color">
                          {tConv("progress")}
                        </th>
                        <th className="px-6 py-3 font-medium text-muted-color">
                          {tConv("createdAt")}
                        </th>
                        <th className="px-6 py-3 font-medium text-muted-color">
                          {tConv("actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => {
                        const isActive = job.status === "PENDING" || job.status === "PROCESSING";
                        return (
                          <tr
                            key={job.id}
                            className="border-b border-line last:border-b-0 hover:bg-badge/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium text-primary-color">
                                {job.document.title}
                              </div>
                              <div className="text-xs text-very-muted mt-0.5">
                                {job.document.fileName}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  job.status === "COMPLETED"
                                    ? "success"
                                    : job.status === "FAILED"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {tConv(job.status.toLowerCase())}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {isActive ? (
                                <div className="w-24">
                                  <div className="h-2 bg-badge rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[var(--success)] transition-all duration-500"
                                      style={{
                                        width: `${job.progress > 0 ? Math.max(5, job.progress) : 5}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-very-muted mt-1 block">
                                    {job.progress}%
                                  </span>
                                </div>
                              ) : job.status === "COMPLETED" ? (
                                <span className="text-xs text-[var(--success)] font-medium">
                                  100%
                                </span>
                              ) : (
                                <span className="text-xs text-very-muted">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-color whitespace-nowrap">
                              {formatDate(job.createdAt, locale)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button size="sm" asChild>
                                  <a href={`/${locale}/preview/${job.documentId}`}>
                                    {tConv("viewResults")}
                                  </a>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <a
                                    href={`/api/conversion/${job.id}/status`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    API
                                  </a>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-line flex items-center justify-between">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    ←
                  </Button>
                  <span className="text-xs text-muted-color">
                    {page} / {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    →
                  </Button>
                </div>
              )}
            </Card>
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
