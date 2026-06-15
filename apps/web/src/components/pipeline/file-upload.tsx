"use client";

import { useState, useRef, type FormEvent } from "react";
import { useTranslations } from "next-intl";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (Raised from 100MB)

  function validateFile(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return t("errorInvalidType");
    }
    if (f.size > MAX_SIZE) {
      return t("errorTooLarge");
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      if (pageRange) {
        formData.append("pageRange", pageRange);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-line transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) {
            const err = validateFile(dropped);
            if (err) setError(err);
            else setFile(dropped);
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
              if (err) setError(err);
              else setFile(selected);
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
              <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="text-lg font-medium text-muted-color">{t("dragDrop")}</div>
            <div className="text-sm text-very-muted">{t("formats")}</div>
          </div>
        )}
      </div>

      {file && file.type === "application/pdf" && (
        <div className="space-y-1 text-right" dir="rtl">
          <label htmlFor="pageRange" className="block text-sm font-medium text-muted-color">
            تحديد نطاق الصفحات (اختياري)
          </label>
          <input
            id="pageRange"
            type="text"
            value={pageRange}
            disabled={uploading}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="مثال: 1-5, 8, 10-12 (اتركه فارغاً لمعالجة الملف بالكامل)"
            className="w-full rounded-lg border border-line bg-page px-4 py-2 text-sm text-primary-color placeholder-very-muted focus:border-[var(--success)] focus:outline-none transition-colors"
          />
          <p className="text-xs text-very-muted">
            يمكنك تحديد صفحات منفردة أو نطاقات (مثل: 1-5 للفصل، أو 8، أو 10-12).
          </p>
        </div>
      )}

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

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full bg-[var(--success)] text-[var(--btn-primary-text)] rounded-lg px-6 py-3 font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {uploading ? t("uploading") : t("uploadButton")}
      </button>
    </form>
  );
}
