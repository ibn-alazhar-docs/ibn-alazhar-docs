"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CONTENT_LIMITS } from "@/lib/shared/constants";

interface CreateFolderDialogProps {
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function CreateFolderDialog({ onSubmit, onClose }: CreateFolderDialogProps) {
  const t = useTranslations("folders");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    if (name.trim().length > CONTENT_LIMITS.MAX_FOLDER_NAME_LENGTH) {
      setError(t("nameTooLong"));
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-line rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-primary-color mb-4">{t("createNew")}</h2>

          {error && (
            <div className="mb-4 p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-lg text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="folder-name"
                className="block text-sm font-medium text-primary-color mb-2"
              >
                {t("nameLabel")}
              </label>
              <input
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={t("namePlaceholder")}
                className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover rounded-lg"
                onClick={onClose}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] bg-[var(--success)] hover:opacity-90 rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? "..." : t("create")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
