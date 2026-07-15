"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { LinkIcon, TrashIcon, GlobeIcon, ClockIcon } from "@/ui/icons";
import { UI_TIMING } from "@/shared/constants";
import { Portal } from "@/ui/portal";
import { apiFetch } from "@/shared/api";

interface ShareModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  documentStatus?: string;
}

export function ShareModal({ documentId, isOpen, onClose, documentStatus }: ShareModalProps) {
  const t = useTranslations("shareModal");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState<"7" | "30" | "never">("never");
  const [error, setError] = useState<string | null>(null);

  const isReady = documentStatus === "COMPLETED";
  const isFailed = documentStatus === "FAILED";

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchShareStatus();
    } else {
      // Reset state when closed
      setCopied(false);
      setExpiresIn("never");
      setError(null);
    }
  }, [isOpen, documentId]);

  async function fetchShareStatus() {
    setFetching(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`);
      if (res.ok) {
        const data = await res.json();
        setShared(data.shared);
        if (data.url) {
          setShareUrl(data.url);
        } else if (data.token) {
          setShareUrl(`${window.location.origin}/share/${data.token}`);
        }
      } else {
        setShared(false);
      }
    } catch {
      setShared(false);
    } finally {
      setFetching(false);
    }
  }

  async function handleCreateLink() {
    setLoading(true);
    setError(null);
    try {
      const expirationMap = {
        "7": "7days",
        "30": "30days",
        never: "never",
      } as const;
      const expiration = expirationMap[expiresIn];

      const res = await apiFetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiration }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || t("error"));
      }

      const data = await res.json();
      setShared(true);
      if (data.url) {
        setShareUrl(data.url);
      } else if (data.token) {
        setShareUrl(`${window.location.origin}/share/${data.token}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/documents/${documentId}/share`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || t("error"));
      }

      setShared(false);
      setShareUrl(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), UI_TIMING.TOAST_RESET_MS);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-overlay backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-card shadow-lg"
            >
              {/* Header */}
              <div className="border-b border-line px-6 py-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg text-success">
                  <GlobeIcon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-primary-color">{t("title")}</h3>
              </div>

              {/* Body */}
              <div className="p-6">
                {error && (
                  <div
                    className="mb-4 p-3 bg-danger-bg border border-danger/20 rounded-lg text-sm text-danger text-start"
                    dir="auto"
                  >
                    {error}
                  </div>
                )}

                {fetching ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-success border-t-transparent" />
                  </div>
                ) : shared ? (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-color">
                        {t("shareLink")}
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-line bg-badge p-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card">
                          <LinkIcon className="h-4 w-4 text-muted-color" />
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={shareUrl || ""}
                          className="min-w-0 w-full bg-transparent text-sm text-primary-color outline-none truncate"
                          dir="ltr"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCopy}
                          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                            copied
                              ? "bg-success text-btn-primary-text"
                              : "bg-success-bg text-success hover:bg-success hover:text-btn-primary-text"
                          }`}
                        >
                          {copied ? t("copied") : t("copyLink")}
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex justify-between gap-2">
                      <button
                        onClick={handleRegenerateLink}
                        disabled={loading}
                        className="flex items-center gap-2 text-sm font-medium text-primary-color hover:text-success disabled:opacity-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t("regenerateLink")}
                      </button>
                      <button
                        onClick={handleRevokeLink}
                        disabled={loading}
                        className="flex items-center gap-2 text-sm font-medium text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                        {t("revokeLink")}
                      </button>
                    </div>
                  </div>
                ) : !isReady ? (
                  <div className="space-y-4">
                    <div
                      className={`p-3 rounded-lg text-sm text-start border ${
                        isFailed
                          ? "bg-danger-bg border-danger/20 text-danger"
                          : "bg-badge border-line text-muted-color"
                      }`}
                      dir="auto"
                    >
                      <p className="font-medium">{isFailed ? t("failed") : t("notReady")}</p>
                      <p className="mt-1 text-xs opacity-90">
                        {isFailed ? t("failedHint") : t("notReadyHint")}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateLink}
                      disabled
                      className="w-full rounded-lg bg-success py-3 text-sm font-semibold text-btn-primary-text shadow-md opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {t("createLink")}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-color">
                        <ClockIcon className="h-4 w-4" />
                        {t("expiration")}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "7", label: t("expires7Days") },
                          { value: "30", label: t("expires30Days") },
                          { value: "never", label: t("expiresNever") },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setExpiresIn(opt.value as "7" | "30" | "never")}
                            className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                              expiresIn === opt.value
                                ? "border-success bg-success-bg text-success"
                                : "border-line bg-card text-muted-color hover:bg-badge hover:text-primary-color"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateLink}
                      disabled={loading}
                      className="w-full rounded-lg bg-success py-3 text-sm font-semibold text-btn-primary-text shadow-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                      {t("createLink")}
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-line bg-badge/50 px-6 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-color transition-colors hover:bg-line"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
