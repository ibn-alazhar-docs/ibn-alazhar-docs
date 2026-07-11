"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExportIcon, ChevronDownIcon, SpinnerIcon } from "@/ui/icons";
import { Portal } from "@/ui/portal";

interface ExportModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ documentId, isOpen, onClose }: ExportModalProps) {
  const t = useTranslations("pipeline.exportModal");
  const [format, setFormat] = useState("searchable-pdf");
  const [fontSize, setFontSize] = useState("medium");
  const [watermark, setWatermark] = useState("");
  const [pageRange, setPageRange] = useState("");
  const [destination, setDestination] = useState("download");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          options: { fontSize, watermark, destination, pageRange: pageRange || undefined },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Export failed");
      }

      const data = await res.json();
      const jobId = data.jobId;

      if (destination === "drive") {
        toast.success(t("successDrive"));
        onClose();
      } else {
        window.location.href = `/api/export/${encodeURIComponent(jobId)}/${encodeURIComponent(format)}`;
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="border-b border-line bg-badge/50 px-6 py-4">
            <h3 className="text-xl font-bold text-primary-color flex items-center gap-2">
              <ExportIcon className="w-5 h-5 text-[var(--success)]" />
              {t("title")}
            </h3>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary-color">{t("format")}</label>
              <div className="relative">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-line bg-badge px-4 py-3 text-sm text-primary-color outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-[var(--success)] transition-all"
                >
                  <option value="searchable-pdf">{t("formatSearchablePdf")}</option>
                  <option value="pdf">{t("formatPdf")}</option>
                  <option value="docx">{t("formatDocx")}</option>
                  <option value="epub">{t("formatEpub")}</option>
                  <option value="md">{t("formatMd")}</option>
                  <option value="txt">{t("formatTxt")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-4 text-muted-color">
                  <ChevronDownIcon className="h-4 w-4" />
                </div>
              </div>
            </div>

            {format !== "searchable-pdf" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="text-sm font-semibold text-primary-color">{t("fontSize")}</label>
                <div className="relative">
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-line bg-badge px-4 py-3 text-sm text-primary-color outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-[var(--success)] transition-all"
                  >
                    <option value="small">{t("small")}</option>
                    <option value="medium">{t("medium")}</option>
                    <option value="large">{t("large")}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-4 text-muted-color">
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}

            {format !== "searchable-pdf" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="text-sm font-semibold text-primary-color">{t("watermark")}</label>
                <input
                  type="text"
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder={t("watermarkPlaceholder")}
                  className="w-full rounded-xl border border-line bg-badge px-4 py-3 text-sm text-primary-color outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-[var(--success)] transition-all placeholder:text-muted-color/50"
                />
              </div>
            )}

            {format !== "searchable-pdf" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="text-sm font-semibold text-primary-color">{t("pageRange")}</label>
                <input
                  type="text"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder={t("pageRangePlaceholder")}
                  className="w-full rounded-xl border border-line bg-badge px-4 py-3 text-sm text-primary-color outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-[var(--success)] transition-all placeholder:text-muted-color/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary-color">{t("destination")}</label>
              <div className="relative">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-line bg-badge px-4 py-3 text-sm text-primary-color outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-[var(--success)] transition-all"
                >
                  <option value="download">{t("download")}</option>
                  <option value="drive">{t("drive")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-4 text-muted-color">
                  <ChevronDownIcon className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-badge/30 px-6 py-4 border-t border-line flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-muted-color transition-colors hover:bg-badge hover:text-primary-color"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all bg-[var(--success)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[var(--success)]/20"
            >
              {loading ? (
                <>
                  <SpinnerIcon className="h-4 w-4" />
                  {t("exporting")}
                </>
              ) : (
                t("export")
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
