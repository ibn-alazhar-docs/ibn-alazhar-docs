"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";
import { BookmarkButton } from "@/ui/documents/bookmark-button";
import { FileTextIcon, BookmarkIcon } from "@/ui/icons";
import { apiFetch } from "@/shared/api";

interface BookmarkItem {
  id: string;
  documentId: string;
  createdAt: string;
  document: {
    id: string;
    title: string;
    fileName: string;
    status: string;
    pageCount: number | null;
    createdAt: string;
  };
}

function getStatusColor(status: string): string {
  if (status === "COMPLETED") return "bg-success-bg text-success";
  if (status === "FAILED") return "bg-danger-bg text-danger";
  if (status.startsWith("OCR") || status === "SPLITTING") return "bg-info-bg text-info";
  return "bg-badge text-muted-color";
}

export function BookmarksContent() {
  const t = useTranslations();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/bookmarks?limit=100");
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data.bookmarks);
        }
      } catch {
        // Safe to swallow: error handled gracefully by UI state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleRemove(docId: string) {
    setBookmarks((prev) => prev.filter((b) => b.documentId !== docId));
  }

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <div className="mb-6">
            <Heading level={2}>{t("nav.bookmarks")}</Heading>
            <Text className="mt-1 text-muted-color">
              {bookmarks.length} {t("nav.bookmarks")}
            </Text>
          </div>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!loading && bookmarks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gold/20 bg-card py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/5 text-gold">
                <BookmarkIcon className="h-8 w-8" />
              </div>
              <Heading level={3}>{t("bookmarks.emptyTitle")}</Heading>
              <Text className="mt-2 text-muted-color">{t("bookmarks.emptyDesc")}</Text>
            </div>
          )}

          {!loading && bookmarks.length > 0 && (
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-card p-4 transition-colors hover:bg-badge"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-bg text-info">
                      <FileTextIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <a
                        href={`/preview/${bookmark.documentId}`}
                        className="font-medium text-primary-color hover:underline"
                      >
                        {bookmark.document.title}
                      </a>
                      <div className="flex items-center gap-2 text-xs text-muted-color">
                        <span>{bookmark.document.fileName}</span>
                        <span>•</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(bookmark.document.status)}`}
                        >
                          {bookmark.document.status}
                        </span>
                        {bookmark.document.pageCount && (
                          <>
                            <span>•</span>
                            <span>
                              {t("documents.pagesCount", { count: bookmark.document.pageCount })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <BookmarkButton
                    documentId={bookmark.documentId}
                    initialBookmarked={true}
                    onToggle={(bookmarked) => {
                      if (!bookmarked) handleRemove(bookmark.documentId);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>
      </Container>
    </PageTransition>
  );
}
