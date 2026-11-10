"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChartIcon,
  FileTextIcon,
  TagsIcon,
  HardDriveIcon,
  TrendingUpIcon,
  RefreshIcon,
} from "@/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";

interface DocumentAnalytics {
  totalDocuments: number;
  totalSize: number;
  documentsByStatus: Array<{ status: string; count: number }>;
  documentsByMimeType: Array<{ mimeType: string; count: number; totalSize: number }>;
  uploadsOverTime: Array<{ date: string; count: number }>;
  recentActivity: Array<{ action: string; count: number; date: string }>;
}

interface TagAnalytics {
  totalTags: number;
  topTags: Array<{ name: string; color: string; documentCount: number }>;
  unusedTags: number;
}

interface StorageAnalytics {
  totalStorageUsed: number;
  storageByUser: Array<{
    userId: string;
    userName: string;
    totalSize: number;
    documentCount: number;
  }>;
  averageFileSize: number;
  largestDocuments: Array<{ title: string; fileSize: number; mimeType: string }>;
}

interface AnalyticsData {
  documents: DocumentAnalytics;
  tags: TagAnalytics;
  storage: StorageAnalytics;
}

interface AnalyticsContentProps {
  initialData?: AnalyticsData;
  initialDays?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function BarChart({
  data,
  maxVal,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  maxVal?: number;
}) {
  const max = maxVal ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-start text-xs text-secondary-color">
            {item.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-full bg-[var(--hover-bg)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? "var(--success)",
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-end text-xs font-semibold text-primary-color">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accentColor,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  loading?: boolean;
}) {
  return (
    <div className="relative min-h-[132px] overflow-hidden rounded-xl border border-line bg-card p-5 shadow-[var(--shadow-sm)]">
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl opacity-60"
        style={{
          background: accentColor
            ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
            : undefined,
        }}
      />
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--badge-bg)" }}
        >
          <Icon className="h-4 w-4 text-success" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-color">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-20 rounded bg-[var(--hover-bg)]" />
          <div className="h-4 w-28 rounded bg-[var(--hover-bg)]" />
        </div>
      ) : (
        <>
          <div
            className="text-2xl font-bold text-primary-color"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {value}
          </div>
          {sub ? (
            <div className="mt-1 min-h-4 text-xs text-muted-color">{sub}</div>
          ) : (
            <div className="mt-1 min-h-4" />
          )}
        </>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = {
  COMPLETED: "var(--success)",
  UPLOADED: "var(--gold)",
  PROCESSING: "var(--info)",
  FAILED: "var(--danger)",
};

const statusVariants: Record<string, "success" | "warning" | "info" | "destructive"> = {
  COMPLETED: "success",
  UPLOADED: "warning",
  PROCESSING: "info",
  FAILED: "destructive",
};

export function AnalyticsContent({ initialData, initialDays = 30 }: AnalyticsContentProps) {
  const t = useTranslations("analytics");
  const tDocs = useTranslations("documents");
  const [data, setData] = useState<AnalyticsData | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [days, setDays] = useState(initialDays);

  const getStatusLabel = (status: string): string => {
    const label = tDocs(`status.${status}`);
    return label.startsWith("status.") ? status : label;
  };

  const fetchAnalytics = useCallback(
    async (targetDays = days) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analytics?days=${targetDays}`);
        if (res.ok) {
          const analytics = await res.json();
          setData(analytics);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    if (initialData && days === initialDays) return;
    void fetchAnalytics(days);
  }, [days, fetchAnalytics, initialData, initialDays]);

  const initialLoading = isLoading && !data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex min-h-[52px] items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary-color">{t("title")}</h1>
          <p className="mt-1 text-sm text-secondary-color">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-lg border border-line bg-input px-4 text-xs text-primary-color focus:outline-none focus:ring-2 focus:ring-input-focus"
          >
            <option value={7}>{t("period7")}</option>
            <option value={30}>{t("period30")}</option>
            <option value={90}>{t("period90")}</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAnalytics(days)}
            disabled={isLoading}
            aria-label={t("refresh")}
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          icon={FileTextIcon}
          label={t("stats.documents")}
          value={data?.documents.totalDocuments ?? 0}
          sub={formatBytes(data?.documents.totalSize ?? 0)}
          accentColor="var(--info)"
          loading={initialLoading}
        />
        <StatCard
          icon={TagsIcon}
          label={t("stats.tags")}
          value={data?.tags.totalTags ?? 0}
          sub={`${data?.tags.unusedTags ?? 0} ${t("stats.unused")}`}
          accentColor="var(--gold)"
          loading={initialLoading}
        />
        <StatCard
          icon={HardDriveIcon}
          label={t("stats.storageUsed")}
          value={formatBytes(data?.documents.totalSize ?? 0)}
          sub={`${t("stats.avg")} ${formatBytes(data?.storage.averageFileSize ?? 0)}`}
          accentColor="var(--success)"
          loading={initialLoading}
        />
        <StatCard
          icon={TrendingUpIcon}
          label={t("stats.uploadsThisWeek")}
          value={
            data?.documents.uploadsOverTime
              ? data.documents.uploadsOverTime.slice(-7).reduce((s, d) => s + d.count, 0)
              : 0
          }
          sub={t("stats.totalDays", { days })}
          accentColor="var(--danger)"
          loading={initialLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Document Status */}
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChartIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.status")}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[220px]">
            {initialLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-24 rounded bg-[var(--hover-bg)]" />
                    <div className="h-5 flex-1 rounded-full bg-[var(--hover-bg)]" />
                    <div className="h-4 w-8 rounded bg-[var(--hover-bg)]" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <BarChart
                  data={(data?.documents.documentsByStatus ?? []).map((item) => ({
                    label: getStatusLabel(item.status),
                    value: item.count,
                    color: statusColors[item.status] ?? "var(--text-tertiary)",
                  }))}
                />
                <div className="mt-4 flex min-h-[28px] flex-wrap gap-2">
                  {(data?.documents.documentsByStatus ?? []).map((item) => (
                    <Badge key={item.status} variant={statusVariants[item.status] ?? "secondary"}>
                      {getStatusLabel(item.status)}: {item.count}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Daily Uploads Chart */}
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileTextIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.dailyUploads")}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[220px]">
            <div className="flex h-40 items-end gap-2">
              {initialLoading ? (
                <div className="flex h-full w-full items-end gap-2 animate-pulse">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-sm bg-[var(--hover-bg)]"
                        style={{ height: `${20 + (i % 5) * 12}%` }}
                      />
                      <div className="h-2 w-4 rounded bg-[var(--hover-bg)]" />
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const series = data?.documents.uploadsOverTime ?? [];
                  if (series.length === 0) {
                    return (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        {t("charts.noData")}
                      </div>
                    );
                  }
                  const maxCount = Math.max(1, ...series.map((d) => d.count));
                  return series.slice(-14).map((item) => {
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={item.date} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm bg-success transition-all duration-500 hover:opacity-80"
                          style={{ height: `${Math.max(height, 4)}%`, opacity: 0.75 }}
                          title={`${item.date}: ${item.count}`}
                        />
                        <span className="text-[9px] text-muted-color">
                          {new Date(item.date).getDate()}/{new Date(item.date).getMonth() + 1}
                        </span>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TagsIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.topTags")}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[220px]">
            {initialLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-24 rounded bg-[var(--hover-bg)]" />
                    <div className="h-5 flex-1 rounded-full bg-[var(--hover-bg)]" />
                    <div className="h-4 w-8 rounded bg-[var(--hover-bg)]" />
                  </div>
                ))}
              </div>
            ) : (
              <BarChart
                data={(data?.tags.topTags ?? []).map((tag) => ({
                  label: tag.name,
                  value: tag.documentCount,
                  color: tag.color,
                }))}
              />
            )}
          </CardContent>
        </Card>

        {/* Largest Documents */}
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <HardDriveIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.largestDocuments")}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[220px]">
            {initialLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-line py-2 last:border-0"
                  >
                    <div className="h-4 w-2/3 rounded bg-[var(--hover-bg)]" />
                    <div className="h-5 w-16 rounded bg-[var(--hover-bg)]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(data?.storage.largestDocuments ?? []).length === 0 ? (
                  <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                    {t("charts.noData")}
                  </div>
                ) : (
                  (data?.storage.largestDocuments ?? []).map((doc) => (
                    <div
                      key={doc.title}
                      className="flex items-center justify-between border-b border-line py-2 last:border-0"
                    >
                      <span className="max-w-[60%] truncate text-xs text-primary-color">
                        {doc.title}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatBytes(doc.fileSize)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
