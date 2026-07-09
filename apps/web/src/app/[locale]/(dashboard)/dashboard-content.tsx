"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "@/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  FileTextIcon,
  FolderIcon,
  TagIcon,
  RefreshIcon,
  ChevronRightIcon,
} from "@/ui/icons";
import { type ReactNode } from "react";

interface Document {
  id: string;
  title: string;
  mimeType: string;
  status: string;
  createdAt: Date;
}

interface DashboardContentProps {
  counts: {
    documents: number;
    folders: number;
    tags: number;
    conversions: number;
  };
  recentDocuments: Document[];
}



export function DashboardContent({ counts, recentDocuments }: DashboardContentProps) {
  const tNav = useTranslations("nav");
  const locale = useLocale();

  const tDocs = useTranslations("documents");
  const tFolders = useTranslations("folders");
  const tTags = useTranslations("tags");
  const tConv = useTranslations("conversions");

  const statusVariantMap: Record<
    string,
    "success" | "warning" | "info" | "destructive" | "secondary"
  > = {
    COMPLETED: "success",
    UPLOADED: "warning",
    PROCESSING: "info",
    FAILED: "destructive",
    default: "secondary",
  };

  return (
    <Container>
      <div className="py-8 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {tNav("home")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{tDocs("uploadPrompt")}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={tDocs("title")}
            value={String(counts.documents)}
            href="/files"
            icon={<FileTextIcon className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title={tFolders("title")}
            value={String(counts.folders)}
            href="/folders"
            icon={<FolderIcon className="h-5 w-5" />}
            accent="gold"
          />
          <StatCard
            title={tTags("title")}
            value={String(counts.tags)}
            href="/tags"
            icon={<TagIcon className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title={tConv("title")}
            value={String(counts.conversions)}
            href="/conversions"
            icon={<RefreshIcon className="h-5 w-5" />}
            accent="gold"
          />
        </div>



        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tNav("files")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/files">
                  {tDocs("uploadPrompt").split(" ")[0]} {tNav("files")}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/search">{tNav("search")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/folders">{tFolders("create")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tDocs("recentDocuments")}</CardTitle>
              {recentDocuments.length > 0 && (
                <Link
                  href="/files"
                  className="text-xs font-medium text-[var(--success)] hover:underline transition-colors"
                >
                  {tDocs("viewAll")}
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-6 text-center">
                {tDocs("empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/preview/${doc.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-[var(--border-line)] bg-[var(--page-bg)] p-3 transition-all hover:border-[var(--gold-border)] hover:shadow-sm hover:bg-[var(--hover-bg)]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--badge-bg)]">
                      <FileTextIcon
                        className={`h-5 w-5 ${doc.mimeType === "application/pdf" ? "text-[var(--danger)]" : "text-[var(--info)]"}`}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--success)]">
                        {doc.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant={statusVariantMap[doc.status] ?? "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tDocs(`status.${doc.status}` as unknown as "title")}
                        </Badge>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {new Date(doc.createdAt).toLocaleDateString(locale)}
                        </span>
                      </div>
                    </div>

                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--success)] rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

function StatCard({
  title,
  value,
  href,
  icon,
  accent,
}: {
  title: string;
  value: string;
  href: string;
  icon: ReactNode;
  accent: "primary" | "gold";
}) {
  const accentColor = accent === "gold" ? "var(--gold)" : "var(--success)";
  const accentBg = accent === "gold" ? "var(--gold-bg)" : "var(--badge-bg)";

  return (
    <Link
      href={href}
      className="stat-card-premium group relative overflow-hidden rounded-xl border border-[var(--border-line)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[color-mix(in_srgb,var(--border-line)_50%,currentColor)] hover:-translate-y-0.5"
    >
      {/* Accent glow */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            {title}
          </p>
          <p
            className="mt-2 text-3xl font-bold tracking-tight"
            style={{ color: accentColor, fontFamily: "var(--font-display)" }}
          >
            {value}
          </p>
        </div>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
          style={{ background: accentBg, color: accentColor }}
        >
          {icon}
        </span>
      </div>
    </Link>
  );
}
