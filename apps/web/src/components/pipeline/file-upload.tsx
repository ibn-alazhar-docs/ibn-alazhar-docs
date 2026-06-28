"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { useFileUpload } from "@/hooks/use-file-upload";

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
  const {
    file,
    setPageRange,
    uploading,
    progress,
    error,
    showVisualSelector,
    setShowVisualSelector,
    inputRef,
    processUpload,
    handleFileSelect,
    reset,
  } = useFileUpload({ folderId, onUploadStart });

  if (
    file &&
    showVisualSelector &&
    (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
  ) {
    return (
      <VisualRangeSelector
        file={file}
        onConfirm={(rangeStr) => {
          setPageRange(rangeStr);
          setShowVisualSelector(false);
          processUpload(rangeStr);
        }}
        onCancel={() => reset()}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        processUpload();
      }}
      className="space-y-4"
    >
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
          if (dropped) handleFileSelect(dropped);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFileSelect(selected);
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
          {t(error)}
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
