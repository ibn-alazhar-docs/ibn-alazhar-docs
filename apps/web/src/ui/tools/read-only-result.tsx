"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Read-only result panel for guest tools (arabi.tools principle:
 * "read-only results"). The result supports search, copy, compare-view and
 * TXT/JSON download — it is never editable and never saved to a library.
 *
 * `text` stays null until the guest processing endpoint lands; the panel
 * then renders its empty state instead of any placeholder result.
 */
export function ReadOnlyResult({ text }: { text: string | null }) {
  const t = useTranslations("tools.result");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (!text) return "";
    const q = query.trim();
    if (!q) return text;
    return text
      .split("\n")
      .filter((line) => line.includes(q))
      .join("\n");
  }, [text, query]);

  const hasResult = typeof text === "string" && text.length > 0;
  const hasMatches = hasResult && filtered.length > 0;

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

  return (
    <section
      aria-label={t("title")}
      className="rounded-2xl border border-[var(--border-color,rgba(0,0,0,0.08))] bg-[var(--card-bg,#fff)] p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-primary-color">{t("title")}</h2>
        {hasResult && (
          <span className="text-xs text-secondary-color">{t("chars", { count: text.length })}</span>
        )}
      </div>

      {!hasResult ? (
        <p className="rounded-xl bg-[var(--bg-soft,#f6f6f6)] p-4 text-sm text-secondary-color">
          {t("empty")}
        </p>
      ) : (
        <>
          <label className="mb-3 block">
            <span className="sr-only">{t("searchPlaceholder")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-xl border border-[var(--border-color,rgba(0,0,0,0.12))] bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <textarea
            readOnly
            value={filtered}
            rows={12}
            aria-readonly="true"
            className="mb-3 w-full rounded-xl border border-[var(--border-color,rgba(0,0,0,0.12))] bg-[var(--bg-soft,#f6f6f6)] p-3 font-mono text-sm leading-relaxed"
          />
          {!hasMatches && <p className="mb-3 text-sm text-secondary-color">{t("noMatches")}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="landing-btn-primary rounded-xl px-4 py-2 text-sm font-bold"
            >
              {copied ? t("copied") : t("copy")}
            </button>
            <button
              type="button"
              onClick={() => download("result.txt", text, "text/plain;charset=utf-8")}
              className="rounded-xl border border-[var(--border-color,rgba(0,0,0,0.15))] px-4 py-2 text-sm font-semibold"
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
              className="rounded-xl border border-[var(--border-color,rgba(0,0,0,0.15))] px-4 py-2 text-sm font-semibold"
            >
              {t("downloadJson")}
            </button>
            <span className="self-center text-xs text-secondary-color">{t("docxPending")}</span>
          </div>
          <p className="mt-3 text-xs text-secondary-color">{t("expiresIn")}</p>
        </>
      )}
    </section>
  );
}
