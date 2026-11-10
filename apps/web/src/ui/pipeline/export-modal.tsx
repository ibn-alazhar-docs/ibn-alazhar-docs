"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExportIcon, ChevronDownIcon, SpinnerIcon } from "@/ui/icons";
import { Portal } from "@/ui/portal";
import { apiFetch } from "@/shared/api";

interface ExportModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 180_000;

/**
 * ملف التصدير لا يوجد لحظة الإدراج، بل عندما يُنهيه العامل ويحدّث `outputKeys`.
 * التنزيل الفوري بعد الطلب كان يصطدم بـ 409 أو يسلّم نسخة قديمة بلا هذه الخيارات.
 */
async function waitForExport(documentId: string, format: string, timeoutLabel: string) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await apiFetch(
      `/api/documents/${documentId}/export/status?format=${encodeURIComponent(format)}`,
    );
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      downloadUrl?: string;
      message?: string;
    } | null;

    if (!res.ok) {
      throw new Error(data?.message ?? "تعذر التصدير");
    }
    if (data?.status === "ready" && data.downloadUrl) {
      return data.downloadUrl;
    }
    if (data?.status === "failed") {
      throw new Error(data.message ?? "تعذر التصدير");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(timeoutLabel);
}

export function ExportModal({ documentId, isOpen, onClose }: ExportModalProps) {
  const t = useTranslations("pipeline.exportModal");
  const [format, setFormat] = useState("searchable-pdf");
  const [fontSize, setFontSize] = useState("14");
  const [watermark, setWatermark] = useState("");
  const [destination, setDestination] = useState("local");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleExport() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/documents/${documentId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          options: {
            fontSize: Number(fontSize),
            watermark: watermark || undefined,
            destination,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Export failed");
      }

      if (destination === "drive") {
        toast.success(t("successDrive"));
        onClose();
        return;
      }

      const downloadUrl = await waitForExport(documentId, format, t("timeout"));
      toast.success(t("successDownload"));
      window.location.href = downloadUrl;
      onClose();
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
          className="absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="border-b border-line bg-badge/50 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary-color flex items-center gap-2">
              <ExportIcon className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
              <span className="truncate">{t("title")}</span>
            </h3>
          </div>

          {/* Body */}
          <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-primary-color">
                {t("format")}
              </label>
              <div className="relative">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-line bg-badge px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-primary-color outline-none focus:border-success focus:ring-1 focus:ring-success transition-all"
                >
                  <option value="searchable-pdf">{t("formatSearchablePdf")}</option>
                  <option value="pdf">{t("formatPdf")}</option>
                  <option value="docx">{t("formatDocx")}</option>
                  <option value="epub">{t("formatEpub")}</option>
                  <option value="md">{t("formatMd")}</option>
                  <option value="txt">{t("formatTxt")}</option>
                  <option value="json">JSON</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-3 sm:px-4 text-muted-color">
                  <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>

            {format === "pdf" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="text-xs sm:text-sm font-semibold text-primary-color">
                  {t("fontSize")}
                </label>
                <div className="relative">
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-line bg-badge px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-primary-color outline-none focus:border-success focus:ring-1 focus:ring-success transition-all"
                  >
                    <option value="12">{t("small")}</option>
                    <option value="14">{t("medium")}</option>
                    <option value="18">{t("large")}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-3 sm:px-4 text-muted-color">
                    <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                </div>
              </div>
            )}

            {format === "pdf" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="text-xs sm:text-sm font-semibold text-primary-color">
                  {t("watermark")}
                </label>
                <input
                  type="text"
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder={t("watermarkPlaceholder")}
                  className="w-full rounded-lg border border-line bg-badge px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-primary-color outline-none focus:border-success focus:ring-1 focus:ring-success transition-all placeholder:text-muted-color/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-primary-color">
                {t("destination")}
              </label>
              <div className="relative">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-line bg-badge px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-primary-color outline-none focus:border-success focus:ring-1 focus:ring-success transition-all"
                >
                  <option value="local">{t("download")}</option>
                  <option value="drive">{t("drive")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-3 sm:px-4 text-muted-color">
                  <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-badge/30 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-t border-line flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-muted-color transition-colors hover:bg-badge hover:text-primary-color whitespace-nowrap"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-btn-primary-text transition-all bg-success hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[var(--success)]/20 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <SpinnerIcon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate">{t("exporting")}</span>
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
