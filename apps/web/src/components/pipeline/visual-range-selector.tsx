"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import * as pdfjsLib from "pdfjs-dist";

import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

// Use local worker from public directory to avoid unpkg redirect/CORS issues
// Turbopack does not support ?url imports for .mjs files currently.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface Range {
  id: string;
  from: number;
  to: number;
}

interface VisualRangeSelectorProps {
  file: File;
  onConfirm: (rangeString: string) => void;
  onCancel: () => void;
}

export function VisualRangeSelector({ file, onConfirm, onCancel }: VisualRangeSelectorProps) {
  const t = useTranslations("documents");
  const [numPages, setNumPages] = useState<number>(0);
  const [ranges, setRanges] = useState<Range[]>([{ id: Date.now().toString(), from: 1, to: 1 }]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!active) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setRanges([{ id: Date.now().toString(), from: 1, to: pdf.numPages }]);
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };
    loadPdf();
    return () => {
      active = false;
      if (pdfDoc) (pdfDoc as unknown as { destroy(): void }).destroy();
    };
  }, [file]);

  const addRange = () => {
    setRanges([...ranges, { id: Date.now().toString(), from: 1, to: numPages }]);
  };

  const removeRange = (id: string) => {
    setRanges(ranges.filter((r) => r.id !== id));
  };

  const updateRange = (id: string, field: "from" | "to", value: number) => {
    setRanges(
      ranges.map((r) => {
        if (r.id !== id) return r;
        const newValue = Math.max(1, Math.min(value, numPages));

        if (field === "from") {
          return { ...r, from: newValue, to: Math.max(newValue, r.to) };
        } else {
          return { ...r, from: Math.min(r.from, newValue), to: newValue };
        }
      }),
    );
  };

  const handleConfirm = () => {
    // Convert ranges to string like "1-5, 8, 10-12"
    const rangeString = ranges
      .map((r) => {
        if (r.from === r.to) return `${r.from}`;
        return `${r.from}-${r.to}`;
      })
      .join(", ");
    onConfirm(rangeString);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-line bg-page">
        <Text color="muted">{t("uploading") || "Loading..."}</Text>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <Heading level={3}>{t("ranges") || "Split Document"}</Heading>
          <div className="rounded-lg bg-[var(--badge-bg)] px-3 py-1 text-sm font-semibold text-primary-color">
            إجمالي الصفحات: {numPages}
          </div>
        </div>

        <div className="space-y-4">
          {ranges.map((range, index) => (
            <div key={range.id} className="rounded-xl border border-line bg-page p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Range {index + 1}</span>
                {ranges.length > 1 && (
                  <button
                    onClick={() => removeRange(range.id)}
                    className="text-danger hover:underline text-xs"
                  >
                    {t("remove") || "Remove"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <label className="mb-1.5 block text-xs font-medium text-very-muted uppercase tracking-wider">
                    {t("from") || "From"}
                  </label>
                  <div className="flex items-center bg-card border border-line rounded-lg overflow-hidden transition-all focus-within:border-[var(--success)] focus-within:ring-1 focus-within:ring-[var(--success)]">
                    <button
                      type="button"
                      onClick={() => updateRange(range.id, "from", range.from - 1)}
                      className="shrink-0 px-3 py-1.5 text-lg font-medium text-muted-color hover:bg-hover hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={range.from <= 1 || numPages === 0}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, numPages)}
                      value={range.from}
                      dir="ltr"
                      onChange={(e) => updateRange(range.id, "from", parseInt(e.target.value) || 1)}
                      className="w-16 bg-transparent py-1.5 text-center text-sm outline-none font-bold text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                    />
                    <button
                      type="button"
                      onClick={() => updateRange(range.id, "from", range.from + 1)}
                      className="shrink-0 px-3 py-1.5 text-lg font-medium text-muted-color hover:bg-hover hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={range.from >= Math.max(1, numPages) || numPages === 0}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="mb-1.5 block text-xs font-medium text-very-muted uppercase tracking-wider">
                    {t("to") || "To"}
                  </label>
                  <div className="flex items-center bg-card border border-line rounded-lg overflow-hidden transition-all focus-within:border-[var(--success)] focus-within:ring-1 focus-within:ring-[var(--success)]">
                    <button
                      type="button"
                      onClick={() => updateRange(range.id, "to", range.to - 1)}
                      className="shrink-0 px-3 py-1.5 text-lg font-medium text-muted-color hover:bg-hover hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={range.to <= 1 || numPages === 0}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, numPages)}
                      value={range.to}
                      dir="ltr"
                      onChange={(e) => updateRange(range.id, "to", parseInt(e.target.value) || 1)}
                      className="w-16 bg-transparent py-1.5 text-center text-sm outline-none font-bold text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                    />
                    <button
                      type="button"
                      onClick={() => updateRange(range.id, "to", range.to + 1)}
                      className="shrink-0 px-3 py-1.5 text-lg font-medium text-muted-color hover:bg-hover hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={range.to >= Math.max(1, numPages) || numPages === 0}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addRange}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--btn-primary-bg)] hover:text-[var(--btn-primary-bg)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t("addRange") || "Add Range"}
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            className="w-full rounded-xl bg-btn-primary py-3 text-sm font-bold text-btn-primary-text shadow-sm transition-all hover:opacity-90"
          >
            {t("uploadButton") || "Upload & Process"}
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl border border-line bg-page py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-hover"
          >
            {t("cancel") || "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
