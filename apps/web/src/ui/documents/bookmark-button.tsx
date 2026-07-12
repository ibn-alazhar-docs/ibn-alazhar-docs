"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { BookmarkCheckIcon, BookmarkIcon } from "@/ui/icons";
import { useToggleBookmark } from "@/state/use-queries";

interface BookmarkButtonProps {
  documentId: string;
  initialBookmarked?: boolean;
  onToggle?: (bookmarked: boolean) => void;
}

export function BookmarkButton({
  documentId,
  initialBookmarked = false,
  onToggle,
}: BookmarkButtonProps) {
  const t = useTranslations("common");
  const toggleBookmark = useToggleBookmark();

  const isBookmarked = toggleBookmark.data?.bookmarked ?? initialBookmarked;

  const handleToggle = () => {
    toggleBookmark.mutate(documentId, {
      onSuccess: (data: { bookmarked: boolean }) => onToggle?.(data.bookmarked),
    });
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      type="button"
      onClick={handleToggle}
      disabled={toggleBookmark.isPending}
      className={`rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warning)] ${
        isBookmarked ? "text-warning-500" : "text-muted-color hover:text-warning-500"
      }`}
      title={isBookmarked ? t("removeBookmark") : t("addBookmark")}
      aria-label={isBookmarked ? t("removeBookmark") : t("addBookmark")}
    >
      {isBookmarked ? (
        <BookmarkCheckIcon className="h-5 w-5" />
      ) : (
        <BookmarkIcon className="h-5 w-5" />
      )}
    </motion.button>
  );
}
