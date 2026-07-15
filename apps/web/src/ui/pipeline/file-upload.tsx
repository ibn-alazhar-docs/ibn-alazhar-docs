"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { useFileUpload } from "@/state/use-file-upload";
import { FileTextIcon } from "@/ui/icons";

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
    setError,
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
      data-testid="file-upload-form"
    >
      <motion.div
        whileHover={{
          scale: 1.01,
          borderColor: file ? "var(--gold)" : "var(--success)",
          boxShadow: "0 4px 20px var(--shadow-color, rgba(0,0,0,0.05))",
        }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          file
            ? "border-gold/50 bg-gold-bg/30"
            : "border-line hover:border-success/50 hover:bg-success-bg/20"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-success", "bg-success-bg/30");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("border-success", "bg-success-bg/30");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-success", "bg-success-bg/30");
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
          data-testid="file-input"
        />

        <div className="flex flex-col items-center gap-3 sm:gap-4">
          {/* Icon - always visible */}
          <div className={`${file ? "text-gold" : "text-muted-color"} transition-colors`}>
            <FileTextIcon className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>

          {/* Main text */}
          <div className="space-y-2 w-full">
            {file ? (
              <>
                <div className="text-sm sm:text-base font-semibold text-primary-color truncate px-4 max-w-full">
                  {file.name}
                </div>
                <div className="text-xs sm:text-sm text-muted-color">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="mt-2 text-xs sm:text-sm text-danger hover:text-danger/80 underline transition-colors"
                >
                  {t("../../documents.remove") || "إزالة"}
                </button>
              </>
            ) : (
              <>
                <div className="text-base sm:text-lg font-medium text-muted-color px-2">
                  {t("dragDrop")}
                </div>
                <div className="text-xs sm:text-sm text-very-muted px-2">{t("formats")}</div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {error && (
        <div
          className="bg-danger-bg border border-danger/20 text-danger px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm max-w-full break-words hyphens-auto text-start"
          role="alert"
          aria-live="polite"
          style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex-1 leading-relaxed">
              {error.startsWith("pipeline.") || error.startsWith("common.")
                ? t(error.replace("pipeline.upload.", ""))
                : error.startsWith("error")
                  ? t(error)
                  : error}
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="flex-shrink-0 text-danger hover:text-danger/80 p-1.5 -m-1 min-w-[40px] min-h-[40px] flex items-center justify-center text-xl leading-none"
              aria-label={t("dismiss")}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 bg-badge rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-muted-color text-center">{t("progress")}</div>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.01, boxShadow: "var(--btn-shadow)" }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={!file || uploading}
        className="w-full bg-success text-btn-primary-text rounded-lg px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
        data-testid="upload-button"
      >
        {uploading ? t("uploading") : t("uploadButton")}
      </motion.button>
    </form>
  );
}
