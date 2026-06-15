"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface PreviewViewProps {
  jobId: string;
}

export function PreviewView({ jobId }: PreviewViewProps) {
  const t = useTranslations("pipeline.preview");

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      try {
        setLoading(true);
        const res = await fetch(`/api/conversion/${jobId}/status`);

        if (!res.ok) {
          if (res.status === 404) {
            setError(t("notFound"));
            return;
          }
          throw new Error(t("loadFailed"));
        }

        const data = await res.json();

        if (data.status === "completed") {
          // Fetch the markdown file
          const mdRes = await fetch(`/api/export/${jobId}/md`);
          if (mdRes.ok) {
            const mdText = await mdRes.text();
            setMarkdown(mdText);
          } else {
            setError(t("previewNotFound"));
          }
        } else if (data.status === "failed") {
          setError(t("processingFailed"));
        } else {
          // Still processing
          setMarkdown(t("processing"));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("loadFailed"));
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
    const interval = setInterval(fetchPreview, 5000);
    return () => clearInterval(interval);
  }, [jobId, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin text-muted-color">
            <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <p className="text-muted-color">{t("loadingPreview")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--danger-bg)] border border-[var(--danger)]/20 text-[var(--danger)] p-6 rounded-lg text-center">
        <p className="text-lg font-medium mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-[var(--danger)] underline hover:no-underline"
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
          <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
        <p className="text-lg text-muted-color">{t("documentProcessing")}</p>
        <p className="text-sm text-very-muted">{t("autoUpdate")}</p>
      </div>
    );
  }

  // Markdown rendering with proper list and paragraph tracking
  const parseMarkdownToHtml = (md: string): string => {
    const lines = md.split("\n");
    const escapeHtml = (str: string): string =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    let html = "";
    let inList: "ul" | "ol" | null = null;
    let inParagraph = false;

    const closeParagraph = () => {
      if (inParagraph) {
        html += "</p>\n";
        inParagraph = false;
      }
    };

    const closeList = () => {
      if (inList) {
        html += `</${inList}>\n`;
        inList = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === "") {
        closeParagraph();
        continue;
      }

      if (trimmed === "---") {
        closeParagraph();
        closeList();
        html += '<hr class="my-6 border-line" />\n';
        continue;
      }

      if (trimmed.startsWith("# ")) {
        closeParagraph();
        closeList();
        html += `<h1 class="text-2xl font-bold mt-8 mb-4">${escapeHtml(trimmed.slice(2))}</h1>\n`;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        closeParagraph();
        closeList();
        html += `<h2 class="text-xl font-bold mt-6 mb-3 text-[var(--success)]">${escapeHtml(trimmed.slice(3))}</h2>\n`;
        continue;
      }
      if (trimmed.startsWith("### ")) {
        closeParagraph();
        closeList();
        html += `<h3 class="text-lg font-bold mt-4 mb-2">${escapeHtml(trimmed.slice(4))}</h3>\n`;
        continue;
      }

      if (trimmed.startsWith("- ")) {
        closeParagraph();
        if (inList !== "ul") {
          closeList();
          html += '<ul class="my-4 ps-6 list-disc">\n';
          inList = "ul";
        }
        html += `  <li class="mb-1 leading-relaxed">${escapeHtml(trimmed.slice(2))}</li>\n`;
        continue;
      }

      const olMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
      if (olMatch) {
        closeParagraph();
        if (inList !== "ol") {
          closeList();
          html += '<ol class="my-4 ps-6 list-decimal">\n';
          inList = "ol";
        }
        html += `  <li class="mb-1 leading-relaxed">${escapeHtml(olMatch[1] ?? "")}</li>\n`;
        continue;
      }

      closeList();
      if (!inParagraph) {
        html += '<p class="mb-4 leading-relaxed">';
        inParagraph = true;
      } else {
        html += " ";
      }
      html += escapeHtml(trimmed);
    }

    closeParagraph();
    closeList();
    return html;
  };

  const renderedHtml = parseMarkdownToHtml(markdown);

  return (
    <div className="prose prose-lg max-w-none" dir="rtl">
      <div
        className="font-cairo leading-relaxed text-primary-color"
        dangerouslySetInnerHTML={{
          __html: renderedHtml,
        }}
      />
    </div>
  );
}
