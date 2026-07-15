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
          <span className="text-xs text-secondary-color w-24 truncate text-start shrink-0">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-[var(--hover-bg)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? "var(--success)",
              }}
            />
          </div>
          <span className="text-xs font-semibold text-primary-color w-8 text-end shrink-0">
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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-[var(--card-bg)] p-5 shadow-[var(--shadow-sm)]">
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl opacity-60"
        style={{
          background: accentColor
            ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
            : undefined,
        }}
      />
      <div className="flex items-center gap-2.5 mb-3">
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
      <div
        className="text-2xl font-bold text-primary-color"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-color mt-1">{sub}</div>}
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

export function AnalyticsContent() {
  const t = useTranslations("analytics");
  const tDocs = useTranslations("documents");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  const getStatusLabel = (status: string): string => {
    const label = tDocs(`status.${status}`);
    return label.startsWith("status.") ? status : label;
  };

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      if (res.ok) {
        const analytics = await res.json();
        setData(analytics);
      }
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading && !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--hover-bg)] rounded-lg w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[var(--hover-bg)] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-[var(--hover-bg)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary-color">{t("title")}</h1>
          <p className="text-sm text-secondary-color mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 px-4 text-xs border border-line rounded-lg bg-input text-primary-color focus:outline-none focus:ring-2 focus:ring-input-focus"
          >
            <option value={7}>{t("period7")}</option>
            <option value={30}>{t("period30")}</option>
            <option value={90}>{t("period90")}</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={isLoading}
            aria-label={t("refresh")}
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileTextIcon}
          label={t("stats.documents")}
          value={data?.documents.totalDocuments ?? 0}
          sub={formatBytes(data?.documents.totalSize ?? 0)}
          accentColor="var(--info)"
        />
        <StatCard
          icon={TagsIcon}
          label={t("stats.tags")}
          value={data?.tags.totalTags ?? 0}
          sub={`${data?.tags.unusedTags ?? 0} ${t("stats.unused")}`}
          accentColor="var(--gold)"
        />
        <StatCard
          icon={HardDriveIcon}
          label={t("stats.storageUsed")}
          value={formatBytes(data?.documents.totalSize ?? 0)}
          sub={`${t("stats.avg")} ${formatBytes(data?.storage.averageFileSize ?? 0)}`}
          accentColor="var(--success)"
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
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChartIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={(data?.documents.documentsByStatus ?? []).map((item) => ({
                label: getStatusLabel(item.status),
                value: item.count,
                color: statusColors[item.status] ?? "var(--text-tertiary)",
              }))}
            />
            {data?.documents.documentsByStatus && data.documents.documentsByStatus.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.documents.documentsByStatus.map((item) => (
                  <Badge key={item.status} variant={statusVariants[item.status] ?? "secondary"}>
                    {getStatusLabel(item.status)}: {item.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Uploads Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.dailyUploads")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {(() => {
                const series = data?.documents.uploadsOverTime ?? [];
                if (series.length === 0) {
                  return (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
                      {t("charts.noData")}
                    </div>
                  );
                }
                const maxCount = Math.max(1, ...series.map((d) => d.count));
                return series.slice(-14).map((item) => {
                  const height = (item.count / maxCount) * 100;
                  return (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-success rounded-t-sm transition-all duration-500 hover:opacity-80"
                        style={{ height: `${Math.max(height, 4)}%`, opacity: 0.75 }}
                        title={`${item.date}: ${item.count}`}
                      />
                      <span className="text-[9px] text-muted-color">
                        {new Date(item.date).getDate()}/{new Date(item.date).getMonth() + 1}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TagsIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.topTags")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={(data?.tags.topTags ?? []).map((tag) => ({
                label: tag.name,
                value: tag.documentCount,
                color: tag.color,
              }))}
            />
          </CardContent>
        </Card>

        {/* Largest Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDriveIcon className="h-4 w-4 text-secondary-color" />
              {t("charts.largestDocuments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {(data?.storage.largestDocuments ?? []).map((doc) => (
                <div
                  key={doc.title}
                  className="flex items-center justify-between py-2 border-b border-line last:border-0"
                >
                  <span className="text-xs text-primary-color truncate max-w-[60%]">
                    {doc.title}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {formatBytes(doc.fileSize)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
