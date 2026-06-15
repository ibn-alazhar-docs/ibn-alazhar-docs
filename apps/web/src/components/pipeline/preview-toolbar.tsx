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
    <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-card border-b border-line">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-muted-color hover:text-primary-color transition-colors p-1"
          title={t("back")}
        >
          <svg
            className="w-5 h-5"
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
        <h2 className="text-sm font-medium text-primary-color truncate max-w-[200px] sm:max-w-[400px]">
          {fileName}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-very-muted ms-2">{t("export")}</span>
        <button
          onClick={() => handleExport("md")}
          className="px-3 py-1.5 text-xs font-medium bg-card border border-line text-primary-color rounded-md hover:bg-badge transition-colors"
        >
          .md
        </button>
        <button
          onClick={() => handleExport("txt")}
          className="px-3 py-1.5 text-xs font-medium bg-card border border-line text-primary-color rounded-md hover:bg-badge transition-colors"
        >
          .txt
        </button>
        <button
          onClick={() => handleExport("json")}
          className="px-3 py-1.5 text-xs font-medium bg-card border border-line text-primary-color rounded-md hover:bg-badge transition-colors"
        >
          .json
        </button>
      </div>
    </div>
  );
}
