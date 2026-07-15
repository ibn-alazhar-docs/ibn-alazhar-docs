"use client";

import { useTranslations } from "next-intl";

interface PreviewToolbarProps {
  jobId: string;
  fileName: string;
  onBack: () => void;
}

export function PreviewToolbar({ jobId, fileName, onBack }: PreviewToolbarProps) {
  const t = useTranslations("pipeline.preview");

  async function handleExport(format: string) {
    const url = `/api/export/${jobId}/${format}`;
    window.open(url, "_blank");
  }

  return (
    <div className="sticky top-0 z-40 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 bg-card border-b border-line shadow-sm">
      {/* Back button + Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onBack}
          className="shrink-0 text-muted-color hover:text-primary-color transition-colors rounded-lg p-1.5 sm:p-2 min-h-8 min-w-8 sm:min-h-10 sm:min-w-10 flex items-center justify-center"
          aria-label={t("back")}
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 rtl:-scale-x-100"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <h2 className="text-xs sm:text-sm font-medium text-primary-color truncate min-w-0">
          {fileName}
        </h2>
      </div>

      {/* Export buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
        <span className="text-[10px] sm:text-xs text-very-muted hidden sm:inline">{t("export")}</span>
        <button
          onClick={() => handleExport("md")}
          dir="ltr"
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-card border border-line text-primary-color rounded-md sm:rounded-lg hover:bg-badge transition-colors"
        >
          .md
        </button>
        <button
          onClick={() => handleExport("txt")}
          dir="ltr"
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-card border border-line text-primary-color rounded-md sm:rounded-lg hover:bg-badge transition-colors"
        >
          .txt
        </button>
        <button
          onClick={() => handleExport("json")}
          dir="ltr"
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-card border border-line text-primary-color rounded-md sm:rounded-lg hover:bg-badge transition-colors"
        >
          .json
        </button>
        <button
          onClick={() => handleExport("docx")}
          dir="ltr"
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-primary-color border border-primary-color text-card rounded-md sm:rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
        >
          .docx
        </button>
        <button
          onClick={() => handleExport("epub")}
          dir="ltr"
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-primary-color border border-primary-color text-card rounded-md sm:rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
        >
          .epub
        </button>
      </div>
    </div>
  );
}
