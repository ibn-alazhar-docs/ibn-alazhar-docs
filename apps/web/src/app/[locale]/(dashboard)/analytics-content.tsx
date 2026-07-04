"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, FileText, Tags, HardDrive, TrendingUp, RefreshCw } from "lucide-react";

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
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-text-secondary w-20 truncate text-start">{item.label}</span>
          <div className="flex-1 h-6 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? "#16A34A",
              }}
            />
          </div>
          <span className="text-xs font-medium text-text-primary w-12 text-end">{item.value}</span>
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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-bg-secondary border border-line rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary-color" />
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      {sub && <div className="text-xs text-text-tertiary mt-1">{sub}</div>}
    </div>
  );
}

export function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

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
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-bg-tertiary rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-bg-tertiary rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    COMPLETED: "#16A34A",
    UPLOADED: "#CA8A04",
    PROCESSING: "#3B82F6",
    FAILED: "#EF4444",
  };

  const statusLabels: Record<string, string> = {
    COMPLETED: "مكتمل",
    UPLOADED: "مرفوع",
    PROCESSING: "قيد المعالجة",
    FAILED: "فشل",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">التحليلات</h1>
          <p className="text-sm text-text-secondary mt-1">نظرة عامة على استخدام المنصة</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 px-2 text-xs border border-line rounded-md bg-bg-primary text-text-primary"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={90}>آخر 90 يوم</option>
          </select>
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="h-8 px-2 text-xs font-medium rounded-md border border-line hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="المستندات"
          value={data?.documents.totalDocuments ?? 0}
          sub={formatBytes(data?.documents.totalSize ?? 0)}
        />
        <StatCard
          icon={Tags}
          label="الوسوم"
          value={data?.tags.totalTags ?? 0}
          sub={`${data?.tags.unusedTags ?? 0} غير مستخدمة`}
        />
        <StatCard
          icon={HardDrive}
          label="المساحة المستخدمة"
          value={formatBytes(data?.documents.totalSize ?? 0)}
          sub={`متوسط ${formatBytes(data?.storage.averageFileSize ?? 0)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="الرفع هذا الأسبوع"
          value={data?.documents.uploadsOverTime.slice(-7).reduce((s, d) => s + d.count, 0) ?? 0}
          sub={`إجمالي ${days} يوم`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-secondary border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary-color" />
            <h2 className="text-sm font-medium text-text-primary">حالة المستندات</h2>
          </div>
          <BarChart
            data={(data?.documents.documentsByStatus ?? []).map((item) => ({
              label: statusLabels[item.status] ?? item.status,
              value: item.count,
              color: statusColors[item.status] ?? "#6B7280",
            }))}
          />
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-primary-color" />
            <h2 className="text-sm font-medium text-text-primary">الرفعات اليومية</h2>
          </div>
          <div className="flex items-end gap-1 h-32">
            {(data?.documents.uploadsOverTime ?? []).slice(-14).map((item) => {
              const maxCount = Math.max(
                ...(data?.documents.uploadsOverTime.map((d) => d.count) ?? [1]),
                1,
              );
              const height = (item.count / maxCount) * 100;
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary-color rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${item.date}: ${item.count}`}
                  />
                  <span className="text-[10px] text-text-tertiary">
                    {new Date(item.date).getDate()}/{new Date(item.date).getMonth() + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tags className="h-4 w-4 text-primary-color" />
            <h2 className="text-sm font-medium text-text-primary">أكثر الوسوم استخداماً</h2>
          </div>
          <BarChart
            data={(data?.tags.topTags ?? []).map((tag) => ({
              label: tag.name,
              value: tag.documentCount,
              color: tag.color,
            }))}
          />
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-4 w-4 text-primary-color" />
            <h2 className="text-sm font-medium text-text-primary">أكبر المستندات</h2>
          </div>
          <div className="space-y-2">
            {(data?.storage.largestDocuments ?? []).map((doc) => (
              <div
                key={doc.title}
                className="flex items-center justify-between py-1.5 border-b border-line last:border-0"
              >
                <span className="text-xs text-text-primary truncate max-w-[200px]">
                  {doc.title}
                </span>
                <span className="text-xs text-text-secondary">{formatBytes(doc.fileSize)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
