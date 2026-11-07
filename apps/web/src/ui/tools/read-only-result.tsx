"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizeArabicForSearch } from "@/shared/arabic-search-normalize";

/**
 * Read-only result panel for guest tools (arabi.tools principle:
 * "read-only results"). The result supports search, copy and TXT/JSON/DOCX
 * download — it is never editable and never saved to a library.
 *
 * When `downloads` is present the files come from the server (`?format=` on the job
 * route), which is what gives an Arabic `filename*=UTF-8''` download name and the
 * real DOCX; without it the panel falls back to a client-side blob.
 */
export interface ResultDownloads {
  jobId: string;
  route?: "native" | "ocr";
  engine?: string;
  docxAvailable?: boolean;
}

/**
 * بحث عربي يتجاهل التشكيل والتطويل وألف/ياء/تاء/همزات المتغيرة — التعريف
 * الواحد في `@/shared/arabic-search-normalize` (لا تُعاد طبقة هنا).
 */
function normalizeForSearch(value: string): string {
  return normalizeArabicForSearch(value).replace(/\s+/g, " ").trim();
}

export function ReadOnlyResult({
  text,
  downloads = null,
}: {
  text: string | null;
  downloads?: ResultDownloads | null;
}) {
  const t = useTranslations("tools.result");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const { filtered, matchCount } = useMemo(() => {
    if (!text) return { filtered: "", matchCount: 0 };
    const q = normalizeForSearch(query);
    if (!q) return { filtered: text, matchCount: 0 };
    const kept = text.split("\n").filter((line) => normalizeForSearch(line).includes(q));
    return { filtered: kept.join("\n"), matchCount: kept.length };
  }, [text, query]);

  const hasResult = typeof text === "string" && text.length > 0;
  const searching = normalizeForSearch(query).length > 0;
  const noMatches = hasResult && searching && matchCount === 0;

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const secondary = "rounded-brand-md border border-line px-4 py-2 text-sm font-semibold";

  return (
    <section aria-label={t("title")} className="rounded-brand-lg border border-line bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-primary-color">{t("title")}</h2>
        {hasResult && (
          <span className="text-xs text-secondary-color">{t("chars", { count: text.length })}</span>
        )}
      </div>

      {!hasResult ? (
        <p className="rounded-brand-md bg-hover p-4 text-sm text-secondary-color">{t("empty")}</p>
      ) : (
        <>
          <label className="mb-3 block">
            <span className="sr-only">{t("searchPlaceholder")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-brand-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </label>
          {searching && !noMatches && (
            <p className="mb-2 text-xs text-secondary-color">
              {t("matchCount", { count: matchCount })}
            </p>
          )}
          <textarea
            readOnly
            value={filtered}
            rows={12}
            aria-readonly="true"
            className="mb-3 w-full rounded-brand-md border border-line bg-hover p-3 font-mono text-sm leading-relaxed"
          />
          {noMatches && <p className="mb-3 text-sm text-secondary-color">{t("noMatches")}</p>}
          {downloads && (downloads.route || downloads.engine) && (
            <p className="mb-3 text-xs text-secondary-color">
              {t("via", {
                route: downloads.route === "ocr" ? t("routeOcr") : t("routeNative"),
                engine: downloads.engine ?? "—",
              })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="landing-btn-primary rounded-brand-md px-4 py-2 text-sm font-bold"
            >
              {copied ? t("copied") : t("copy")}
            </button>
            {downloads ? (
              <>
                <a
                  href={`/api/tools/guest/jobs/${downloads.jobId}?format=txt`}
                  className={secondary}
                >
                  {t("downloadTxt")}
                </a>
                <a
                  href={`/api/tools/guest/jobs/${downloads.jobId}?format=json`}
                  className={secondary}
                >
                  {t("downloadJson")}
                </a>
                {downloads.docxAvailable && (
                  <a
                    href={`/api/tools/guest/jobs/${downloads.jobId}?format=docx`}
                    className={secondary}
                  >
                    {t("downloadDocx")}
                  </a>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => download("result.txt", text, "text/plain;charset=utf-8")}
                  className={secondary}
                >
                  {t("downloadTxt")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      "result.json",
                      JSON.stringify({ text, chars: text.length }, null, 2),
                      "application/json;charset=utf-8",
                    )
                  }
                  className={secondary}
                >
                  {t("downloadJson")}
                </button>
                <span className="self-center text-xs text-secondary-color">{t("docxPending")}</span>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-secondary-color">{t("expiresIn")}</p>
        </>
      )}
    </section>
  );
}
