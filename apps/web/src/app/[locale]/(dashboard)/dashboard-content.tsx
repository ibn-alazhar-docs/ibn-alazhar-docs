"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { FileTextIcon, FolderIcon, TagIcon, RefreshIcon } from "@/components/ui/icons";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { ReactNode } from "react";

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
  const tDocs = useTranslations("documents");
  const tFolders = useTranslations("folders");
  const tTags = useTranslations("tags");
  const tConv = useTranslations("conversions");

  return (
    <Container>
      <Section padding="lg">
        <Stack gap={8}>
          <Heading level={2}>{tNav("home")}</Heading>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={tDocs("title")}
              value={String(counts.documents)}
              href="/files"
              icon="docs"
              accent="primary"
            />
            <StatCard
              title={tFolders("title")}
              value={String(counts.folders)}
              href="/folders"
              icon="folders"
              accent="gold"
            />
            <StatCard
              title={tTags("title")}
              value={String(counts.tags)}
              href="/tags"
              icon="tags"
              accent="primary"
            />
            <StatCard
              title={tConv("title")}
              value={String(counts.conversions)}
              href="/conversions"
              icon="conversions"
              accent="gold"
            />
          </div>

          <div className="card-manuscript rounded-2xl p-6 sm:p-8">
            <Heading level={3}>{tNav("files")}</Heading>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/files"
                className="inline-flex items-center gap-2 rounded-xl bg-btn-primary px-5 py-2.5 text-sm font-medium text-btn-primary-text shadow-sm transition-all hover:opacity-90 hover:shadow-md"
              >
                {tDocs("uploadPrompt").split(" ")[0]} {tNav("files")}
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-page px-5 py-2.5 text-sm font-medium text-primary-color transition-all hover:bg-hover"
              >
                {tNav("search")}
              </Link>
              <Link
                href="/folders"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-page px-5 py-2.5 text-sm font-medium text-primary-color transition-all hover:bg-hover"
              >
                {tFolders("create")}
              </Link>
            </div>
          </div>

          <div className="card-manuscript rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <Heading level={3}>{tDocs("recentDocuments")}</Heading>
              {recentDocuments.length > 0 && (
                <Link
                  href="/files"
                  className="text-sm font-medium text-[var(--btn-primary-bg)] hover:underline"
                >
                  {tDocs("viewAll")}
                </Link>
              )}
            </div>

            {recentDocuments.length === 0 ? (
              <Text color="muted" className="mt-3">
                {tDocs("empty")}
              </Text>
            ) : (
              <div className="mt-5 space-y-2">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/preview/${doc.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-page p-3 transition-all hover:border-[var(--gold-border)] hover:shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-badge">
                      {doc.mimeType === "application/pdf" ? (
                        <FileTextIcon className="h-5 w-5 text-danger" />
                      ) : (
                        <FileTextIcon className="h-5 w-5 text-info" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary-color transition-colors group-hover:text-[var(--btn-primary-bg)]">
                        {doc.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: "var(--badge-bg)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {tDocs(`status.${doc.status}` as unknown as "title")}
                        </span>
                        <span className="text-xs text-very-muted">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-very-muted transition-colors group-hover:text-[var(--btn-primary-bg)] rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Stack>
      </Section>
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
  icon: string;
  accent: "primary" | "gold";
}) {
  const iconMap: Record<string, ReactNode> = {
    docs: <FileTextIcon />,
    folders: <FolderIcon />,
    tags: <TagIcon />,
    conversions: <RefreshIcon />,
  };

  const accentColor = accent === "gold" ? "var(--gold)" : "var(--btn-primary-bg)";

  return (
    <Link href={href} className="stat-card-premium rounded-2xl p-5 transition-all">
      <div className="flex items-center justify-between">
        <Text color="muted" className="text-xs font-medium uppercase tracking-wide">
          {title}
        </Text>
        <span
          className="text-very-muted transition-colors"
          style={{ color: "var(--text-tertiary)" }}
        >
          {iconMap[icon]}
        </span>
      </div>
      <div className="mt-1" style={{ fontFamily: "var(--font-display)" }}>
        <span className="text-3xl font-bold tracking-tight" style={{ color: accentColor }}>
          {value}
        </span>
      </div>
    </Link>
  );
}
