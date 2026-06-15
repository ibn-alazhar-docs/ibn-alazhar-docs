"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  _count: { documents: number };
}

interface TagFilterSidebarProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export function TagFilterSidebar({ selectedTagIds, onTagsChange }: TagFilterSidebarProps) {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags);
      }
    } catch {
      console.error("Failed to fetch tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  if (loading) {
    return (
      <div className="p-3">
        <div className="text-xs text-very-muted">...</div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-muted-color uppercase tracking-wide">
          {t("title")}
        </h3>
        {selectedTagIds.length > 0 && (
          <button
            type="button"
            className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80"
            onClick={clearAll}
          >
            {tCommon("close")}
          </button>
        )}
      </div>

      <div className="space-y-0.5">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isSelected
                  ? "bg-[var(--success-bg)] text-[var(--success)] font-medium"
                  : "text-primary-color hover:bg-hover"
              }`}
              onClick={() => toggleTag(tag.id)}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-start truncate">{tag.name}</span>
              <span className="text-xs text-very-muted">{tag._count.documents}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
