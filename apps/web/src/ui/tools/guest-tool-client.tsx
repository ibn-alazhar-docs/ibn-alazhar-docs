"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GUEST_TOOLS_LIMITS, validateGuestFile, type GuestTool } from "@/shared/tools/guest-limits";
import { ReadOnlyResult } from "./read-only-result";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Guest tool page body. No account, no session, no library writes:
 * - files are validated client-side against the 99MB / 1000p guest limits
 *   (PDF page count via a lazily-loaded pdf.js — never in the initial bundle),
 * - results are read-only (see ReadOnlyResult),
 * - tools whose backend is an external sidecar degrade gracefully instead of
 *   breaking the page or faking a result.
 */
interface GuestToolClientProps {
  tool: GuestTool;
  name: string;
  tagline: string;
  cta: string;
}

export function GuestToolClient({ tool, name, tagline, cta }: GuestToolClientProps) {
  const t = useTranslations("tools");
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const errorMessage = (key: string | null): string | null => {
    if (!key) return null;
    if (key === "TOO_LARGE") return t("upload.tooLarge");
    if (key === "TOO_MANY_PAGES") return t("upload.tooManyPages");
    if (key === "UNSUPPORTED_TYPE") return t("upload.unsupportedType");
    return null;
  };

  async function countPdfPages(selected: File): Promise<number | null> {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "/pdf.worker.min.mjs",
          window.location.origin,
        ).href;
      }
      const data = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const pages = pdf.numPages;
      await (pdf as unknown as { destroy(): Promise<void> }).destroy();
      return pages;
    } catch {
      return null; // page count is enforced again server-side; never block on it
    }
  }

  async function handleFile(selected: File | null) {
    setSubmitted(false);
    setPageCount(null);
    setErrorKey(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const initial = validateGuestFile(selected);
    if (!initial.valid) {
      setFile(null);
      setErrorKey(initial.code ?? "UNSUPPORTED_TYPE");
      return;
    }
    setFile(selected);
    const isPdf = selected.type === "application/pdf" || /\.pdf$/i.test(selected.name);
    if (isPdf) {
      setCounting(true);
      const pages = await countPdfPages(selected);
      setCounting(false);
      if (pages !== null) {
        setPageCount(pages);
        const withPages = validateGuestFile(selected, pages);
        if (!withPages.valid) {
          setFile(null);
          setErrorKey(withPages.code ?? "TOO_MANY_PAGES");
        }
      }
    }
  }

  const err = errorMessage(errorKey);
  const isSidecar = tool.status === "sidecar-pending";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link
        href="/tools"
        className="text-sm font-medium text-muted-color no-underline transition-colors hover:text-primary-color"
      >
        {t("back")}
      </Link>

      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-primary-color sm:text-3xl">{name}</h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {t("noAccountBadge")}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-secondary-color sm:text-base">{tagline}</p>
      </header>

      {isSidecar ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          {t("guest.sidecarPending")}
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--border-color,rgba(0,0,0,0.08))] bg-[var(--card-bg,#fff)] p-5">
          <label htmlFor="guest-file" className="mb-2 block text-sm font-semibold">
            {t("upload.label")}
          </label>
          <input
            id="guest-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-dashed border-[var(--border-color,rgba(0,0,0,0.2))] p-4 text-sm"
          />
          <p className="mt-2 text-xs leading-relaxed text-secondary-color">
            {t("upload.limitsHint")}
          </p>

          {counting && (
            <p className="mt-3 text-sm text-secondary-color">{t("upload.countingPages")}</p>
          )}
          {file && !err && (
            <p className="mt-3 text-sm text-secondary-color">
              {t("upload.selectedFile", { name: file.name, size: formatBytes(file.size) })}
              {pageCount !== null && ` · ${t("upload.pagesDetected", { count: pageCount })}`}
            </p>
          )}
          {err && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800"
            >
              {err}
            </p>
          )}

          <div className="mt-4 rounded-xl bg-[var(--bg-soft,#f6f6f6)] p-4">
            <h2 className="mb-1 text-sm font-bold">{t("guest.queueTitle")}</h2>
            <p className="text-sm leading-relaxed text-secondary-color">
              {t("guest.queueBody")} ({GUEST_TOOLS_LIMITS.maxFileSizeMB}MB /{" "}
              {GUEST_TOOLS_LIMITS.maxPages}p)
            </p>
          </div>

          <button
            type="button"
            disabled={!file || counting}
            onClick={() => setSubmitted(true)}
            className="landing-btn-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cta}
          </button>
          {submitted && (
            <p className="mt-3 rounded-xl bg-[var(--bg-soft,#f6f6f6)] p-4 text-sm leading-relaxed text-secondary-color">
              {t("guest.pendingBackend")}
            </p>
          )}
        </section>
      )}

      <p className="text-xs leading-relaxed text-secondary-color">{t("guest.readOnlyNote")}</p>

      <ReadOnlyResult text={null} />
    </div>
  );
}
