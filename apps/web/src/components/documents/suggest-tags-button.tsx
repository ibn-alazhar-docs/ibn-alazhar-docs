"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagChip } from "@/components/tags/tag-chip";
import { cn } from "@/lib/frontend/cn";
import { useSuggestTags, useApplySuggestedTags } from "@/lib/frontend/hooks/use-queries";

interface SuggestTagsButtonProps {
  documentId: string;
  existingTagIds: string[];
  onTagsAdded: () => void;
  className?: string;
}

export function SuggestTagsButton({
  documentId,
  existingTagIds,
  onTagsAdded,
  className,
}: SuggestTagsButtonProps) {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const suggestMutation = useSuggestTags();
  const applyMutation = useApplySuggestedTags();

  const suggestions = suggestMutation.data?.suggestions ?? [];

  const fetchSuggestions = () => {
    suggestMutation.mutate(documentId, {
      onSuccess: () => setIsOpen(true),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : tCommon("error"));
      },
    });
  };

  const toggleTag = (name: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const applyTags = () => {
    const tagsToApply = suggestions.filter((s) => selectedTags.has(s.name));

    applyMutation.mutate(
      {
        documentId,
        tags: tagsToApply,
        existingTagIds,
      },
      {
        onSuccess: () => {
          toast.success(t("tagsAdded", { count: selectedTags.size }));
          setIsOpen(false);
          setSelectedTags(new Set());
          onTagsAdded();
        },
        onError: () => {
          toast.error(t("tagsAddedFailed"));
        },
      },
    );
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={fetchSuggestions}
        disabled={suggestMutation.isPending}
        className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md text-text-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
      >
        {suggestMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {t("suggestTags")}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 end-0 z-50 w-72 bg-bg-primary border border-line rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">{t("suggestedTags")}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-tertiary hover:text-text-secondary"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {suggestions.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">{t("noSuggestions")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {suggestions.map((s) => (
                  <TagChip
                    key={s.name}
                    id={s.existingTagId ?? s.name}
                    name={s.name}
                    color={s.existingTagId ? "#16A34A" : "#CA8A04"}
                    size="sm"
                    selected={selectedTags.has(s.name)}
                    onClick={() => toggleTag(s.name)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1 h-7 px-3 text-xs font-medium rounded-md bg-primary-color text-white hover:bg-primary-color/90 transition-colors disabled:opacity-50 flex-1"
                  disabled={selectedTags.size === 0 || applyMutation.isPending}
                  onClick={applyTags}
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {t("applyCount", { count: selectedTags.size })}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center h-7 px-2 text-xs font-medium rounded-md text-text-secondary hover:bg-bg-tertiary transition-colors"
                  onClick={() => {
                    setSelectedTags(
                      new Set(
                        suggestions
                          .filter((s) => !existingTagIds.includes(s.existingTagId ?? ""))
                          .map((s) => s.name),
                      ),
                    );
                  }}
                >
                  {tCommon("selectAll")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
