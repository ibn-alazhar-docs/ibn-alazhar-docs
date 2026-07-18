"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/shared/api";

// MUST stay in sync with MAX_UPLOAD_SIZE_MB (server-side validator). A client
// gate far above the server limit produces late, confusing "file too large"
// failures after the upload has already streamed. Default server limit is 50MB.
const MAX_SIZE = 50 * 1024 * 1024;

interface UseFileUploadOptions {
  folderId?: string | null;
  onUploadStart: (jobId: string, fileName: string) => void;
}

export function useFileUpload({ folderId, onUploadStart }: UseFileUploadOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showVisualSelector, setShowVisualSelector] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function validateFile(f: File): string | null {
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isImage =
      f.type === "image/jpeg" ||
      f.type === "image/png" ||
      f.name.toLowerCase().endsWith(".jpg") ||
      f.name.toLowerCase().endsWith(".jpeg") ||
      f.name.toLowerCase().endsWith(".png");

    if (!isPdf && !isImage) {
      return "errorInvalidType";
    }
    if (f.size > MAX_SIZE) {
      return "errorTooLarge";
    }
    return null;
  }

  async function processUpload(finalRangeString?: string) {
    if (!file) {
      console.warn("[upload] processUpload called but no file selected");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      console.warn("[upload] validation failed:", validationError);
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      console.log("[upload] starting health check...");
      const health = await fetch("/api/health/ready", { cache: "no-store" });
      console.log("[upload] health check:", health.status);
      if (!health.ok) {
        setError("servicesUnavailable");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (folderId) {
        formData.append("folderId", folderId);
      }

      const rangeToUse = finalRangeString !== undefined ? finalRangeString : pageRange;
      if (rangeToUse) {
        formData.append("pageRange", rangeToUse);
      }

      console.log("[upload] sending POST /api/upload, size:", file.size, "bytes");
      const response = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("[upload] response status:", response.status);

      if (!response.ok) {
        let errText: string;
        try {
          errText = await response.text();
        } catch {
          errText = `HTTP ${response.status}`;
        }
        console.error("[upload] error response:", errText);
        let err;
        try {
          err = JSON.parse(errText);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
        }
        const msg = typeof err.error === "object" ? err.error?.message : err.error;
        throw new Error(msg || "errorUploadFailed");
      }

      const result = await response.json();
      console.log("[upload] response body:", JSON.stringify(result).slice(0, 300));

      if (result.error) {
        const msg = typeof result.error === "object" ? result.error?.message : result.error;
        throw new Error(msg || "errorUploadFailed");
      }

      if (!result.jobId) {
        throw new Error("السيرفر لم يُرجِع معرّف المهمة. حاول مرة أخرى.");
      }

      console.log("[upload] success, jobId:", result.jobId);
      onUploadStart(result.jobId, file.name);
      setFile(null);
      setPageRange("");
      setProgress(100);
    } catch (err: unknown) {
      console.error("[upload] failed:", err);
      setError(err instanceof Error ? err.message : "errorUploadFailed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(selected: File) {
    const err = validateFile(selected);
    if (err) {
      setError(err);
      return;
    }
    setFile(selected);
    if (selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf")) {
      setShowVisualSelector(true);
    }
  }

  function reset() {
    setFile(null);
    setPageRange("");
    setShowVisualSelector(false);
    setError(null);
  }

  return {
    file,
    setFile,
    pageRange,
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
    validateFile,
  };
}
