"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { motion } from "motion/react";

const VisualRangeSelector = dynamic(
  () => import("./visual-range-selector").then((mod) => mod.VisualRangeSelector),
  { ssr: false },
);
interface FileUploadProps {
  onUploadStart: (jobId: string, fileName: string) => void;
  folderId?: string | null;
}

export function FileUpload({ onUploadStart, folderId }: FileUploadProps) {
  const t = useTranslations("pipeline.upload");
  const [file, setFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showVisualSelector, setShowVisualSelector] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prevent data loss if user navigates away or switches language while a file is selected
  useEffect(() => {
    const hasUnsaved = file !== null;
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).hasUnsavedChanges = hasUnsaved;
      
      if (hasUnsaved) {
        window.onbeforeunload = (e) => {
          e.preventDefault();
          e.returnValue = "";
          return "";
        };
      } else {
        window.onbeforeunload = null;
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        (window as unknown as Record<string, unknown>).hasUnsavedChanges = false;
        window.onbeforeunload = null;
      }
    };
  }, [file]);

  const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (Raised from 100MB)

  function validateFile(f: File): string | null {
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isImage = f.type === "image/jpeg" || f.type === "image/png" || f.name.toLowerCase().endsWith(".jpg") || f.name.toLowerCase().endsWith(".jpeg") || f.name.toLowerCase().endsWith(".png");
    
    if (!isPdf && !isImage) {
      return t("errorInvalidType");
    }
    if (f.size > MAX_SIZE) {
      return t("errorTooLarge");
    }
    return null;
  }

  async function processUpload(finalRangeString?: string) {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) {
        formData.append("folderId", folderId);
      }

      const rangeToUse = finalRangeString !== undefined ? finalRangeString : pageRange;
      if (rangeToUse) {
        formData.append("pageRange", rangeToUse);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        const msg = typeof err.error === "object" ? err.error?.message : err.error;
        throw new Error(msg || t("errorUploadFailed"));
      }

      const result = await response.json();
      onUploadStart(result.jobId, file.name);
      setFile(null);
      setPageRange("");
      setProgress(100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await processUpload();
  }

  if (file && showVisualSelector && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
    return (
      <VisualRangeSelector
        file={file}
        onConfirm={(rangeStr) => {
          setPageRange(rangeStr);
          setShowVisualSelector(false);
          processUpload(rangeStr);
        }}
        onCancel={() => {
          setFile(null);
          setShowVisualSelector(false);
          setPageRange("");
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <motion.div
        whileHover={{
          scale: 1.01,
          borderColor: "var(--success)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) {
            const err = validateFile(dropped);
              if (err) {
                setError(err);
              } else {
                setFile(dropped);
                if (dropped.type === "application/pdf" || dropped.name.toLowerCase().endsWith(".pdf")) {
                  setShowVisualSelector(true);
                }
              }
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) {
              const err = validateFile(selected);
              if (err) {
                setError(err);
              } else {
                setFile(selected);
                if (selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf")) {
                  setShowVisualSelector(true);
                }
              }
            }
          }}
        />

        {file ? (
          <div className="space-y-2">
            <div className="text-lg font-medium text-primary-color">{file.name}</div>
            <div className="text-sm text-muted-color">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mb-2 text-muted-color">
              <svg
                className="w-10 h-10 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="text-lg font-medium text-muted-color">{t("dragDrop")}</div>
            <div className="text-sm text-very-muted">{t("formats")}</div>
          </div>
        )}
      </motion.div>

      {error && (
        <div className="bg-[var(--danger-bg)] border border-[var(--danger)]/20 text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 bg-badge rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--success)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-muted-color text-center">{t("progress")}</div>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.01, boxShadow: "0 4px 14px 0 rgba(22, 163, 74, 0.39)" }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={!file || uploading}
        className="w-full bg-[var(--success)] text-[var(--btn-primary-text)] rounded-lg px-6 py-3 font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {uploading ? t("uploading") : t("uploadButton")}
      </motion.button>
    </form>
  );
}
