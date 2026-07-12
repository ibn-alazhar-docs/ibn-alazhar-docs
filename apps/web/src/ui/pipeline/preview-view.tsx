"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { UI_TIMING } from "@/shared/constants";

interface PreviewViewProps {
  jobId: string;
}

export function PreviewView({ jobId }: PreviewViewProps) {
  const t = useTranslations("pipeline.preview");

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let isFetching = false;
    let isCompleted = false;

    async function fetchPreview() {
      if (!isMounted || isFetching || isCompleted) return;
      isFetching = true;

      try {
        const res = await fetch(`/api/conversion/${jobId}/status`);

        if (!res.ok) {
          if (res.status === 404) {
            setError(t("notFound"));
            isCompleted = true; // Stop polling on 404
            return;
          }
          return;
        }

        const data = await res.json();

        if (data.status === "completed") {
          isCompleted = true; // Stop polling
          // Fetch the markdown file
          const mdRes = await fetch(`/api/export/${jobId}/md`);
          if (mdRes.ok) {
            const mdText = await mdRes.text();
            if (isMounted) {
              setMarkdown(mdText);
              setError(null);
            }
          } else {
            if (isMounted) setError(t("previewNotFound"));
          }
        } else if (data.status === "failed") {
          isCompleted = true; // Stop polling
          if (isMounted) setError(t("processingFailed"));
        } else {
          // Job in progress, waiting for worker completion
          if (isMounted) setMarkdown(t("processing"));
        }
      } catch {
        // Network issues during polling — retry on next tick
      } finally {
        isFetching = false;
        if (isMounted) {
          // Only set loading false once we either have markdown, or an error, or we know it's processing
          if (isCompleted || markdown === t("processing")) {
            setLoading(false);
          } else if (markdown) {
            setLoading(false);
          } else {
            // For the very first load, we stop the full-page spinner so we can show "processing"
            setLoading(false);
          }
        }

        if (isMounted && !isCompleted) {
          timeoutId = setTimeout(fetchPreview, UI_TIMING.POLL_INTERVAL_MS);
        }
      }
    }

    fetchPreview();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [jobId, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin text-muted-color">
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <p className="text-muted-color">{t("loadingPreview")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-bg border border-danger/20 text-danger p-6 rounded-lg text-center">
        <p className="text-lg font-medium mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-danger underline hover:no-underline"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!markdown) {
    return <div className="text-center py-16 text-muted-color">{t("noPreview")}</div>;
  }

  if (markdown === t("processing")) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="animate-pulse text-muted-color">
          <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <p className="text-lg text-muted-color">{t("documentProcessing")}</p>
        <p className="text-sm text-very-muted">{t("autoUpdate")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-none" dir="rtl">
      <div
        className="font-display text-primary-color"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold mt-8 mb-6 text-primary-color text-center leading-normal border-b border-line pb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold mt-10 mb-4 text-success leading-normal">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-bold mt-8 mb-3 text-primary-color leading-normal">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-lg font-bold mt-6 mb-2 text-primary-color leading-normal">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="mb-6 leading-[2.2] text-justify text-xl">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc ps-8 mb-6 leading-[2.2] space-y-2 text-xl">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal ps-8 mb-6 leading-[2.2] space-y-2 text-xl">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-s-4 border-[var(--gold)] ps-4 py-2 my-6 bg-[var(--gold-bg)] text-[var(--gold)] rounded-e-lg italic">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-info hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-primary-color">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            hr: () => <hr className="my-10 border-line" />,
            table: ({ children }) => (
              <div className="overflow-x-auto my-8">
                <table className="w-full text-base text-start border-collapse border border-line">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-badge border-b border-line">{children}</thead>
            ),
            tbody: ({ children }) => <tbody className="divide-y divide-line">{children}</tbody>,
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => (
              <th className="px-4 py-3 font-semibold text-primary-color border-s border-line first:border-s-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 border-s border-line first:border-s-0 leading-loose">
                {children}
              </td>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
