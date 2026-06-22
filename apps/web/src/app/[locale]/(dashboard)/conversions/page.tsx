"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/container";
import { PageTransition } from "@/components/ui/page-transition";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { ConversionStatus } from "@/components/pipeline/conversion-status";

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

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  PROCESSING: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  COMPLETED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  FAILED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  CANCELLED: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-400" },
};

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
      const res = await fetch(`/api/conversion/list?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      // ignore
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
              <input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder={tConv("searchPlaceholder")}
                className="flex-1 px-4 py-2.5 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--success)] focus:border-transparent text-sm"
                dir="ltr"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-[var(--success)] text-[var(--btn-primary-text)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
              >
                {tConv("searchButton")}
              </button>
            </form>

            {/* Searched Job Status */}
            {searched && jobId && (
              <div className="bg-card rounded-xl border border-line p-6">
                <div className="mb-4">
                  <span className="text-xs text-very-muted font-mono">{jobId}</span>
                </div>
                <ConversionStatus jobId={jobId} />
                <div className="mt-4 pt-4 border-t border-line flex gap-2">
                  <a
                    href={`/${locale}/preview/${jobId}`}
                    className="px-4 py-2 bg-[var(--success)] text-[var(--btn-primary-text)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                  >
                    {tPreview("previewDocument")}
                  </a>
                  <a
                    href={`/api/export/${jobId}/md`}
                    className="px-4 py-2 bg-card border border-line text-primary-color rounded-lg text-sm font-medium hover:bg-badge transition-colors"
                  >
                    {tPreview("downloadMd")}
                  </a>
                  <a
                    href={`/api/export/${jobId}/txt`}
                    className="px-4 py-2 bg-card border border-line text-primary-color rounded-lg text-sm font-medium hover:bg-badge transition-colors"
                  >
                    {tPreview("downloadTxt")}
                  </a>
                </div>
              </div>
            )}

            {searched && !jobId && (
              <div className="text-center py-8">
                <Text color="muted">{tConv("enterJobId")}</Text>
              </div>
            )}

            {/* Conversions List */}
            <div className="bg-card rounded-xl border border-line overflow-hidden">
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
                        const style = STATUS_STYLE[job.status] ?? {
                          bg: "bg-gray-100",
                          text: "text-gray-700",
                        };
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
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                              >
                                {tConv(job.status.toLowerCase())}
                              </span>
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
                                <a
                                  href={`/${locale}/preview/${job.documentId}`}
                                  className="px-3 py-1.5 bg-[var(--success)] text-[var(--btn-primary-text)] rounded-lg text-xs font-medium hover:opacity-90 transition-colors"
                                >
                                  {tConv("viewResults")}
                                </a>
                                <a
                                  href={`/api/conversion/${job.id}/status`}
                                  className="px-3 py-1.5 bg-card border border-line text-primary-color rounded-lg text-xs font-medium hover:bg-badge transition-colors"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  API
                                </a>
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
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-line text-primary-color hover:bg-badge disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  <span className="text-xs text-muted-color">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-line text-primary-color hover:bg-badge disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </Stack>
        </Section>
      </Container>
    </PageTransition>
  );
}
