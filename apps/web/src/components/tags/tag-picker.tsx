"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TagChip } from "./tag-chip";
import { TAG_COLORS } from "@/lib/validators/tag";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagPickerProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  onClose?: () => void;
}

export function TagPicker({ selectedTagIds, onTagsChange, onClose }: TagPickerProps) {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(
          data.tags.map((t: { id: string; name: string; color: string }) => ({
            id: t.id,
            name: t.name,
            color: t.color,
          })),
        );
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

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setError(null);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (res.ok) {
        const data = await res.json();
        setTags([...tags, data.tag]);
        onTagsChange([...selectedTagIds, data.tag.id]);
        setNewTagName("");
        setIsCreating(false);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create tag");
      }
    } catch {
      setError("Error");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-line p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary-color">{t("addTag")}</h3>
        {onClose && (
          <button
            type="button"
            className="text-very-muted hover:text-muted-color text-sm"
            onClick={onClose}
          >
            {tCommon("close")}
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={`${tCommon("search")}...`}
        className="w-full px-3 py-2 text-sm border border-line rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
      />

      {/* Selected tags */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags
            .filter((tag) => selectedTagIds.includes(tag.id))
            .map((tag) => (
              <TagChip
                key={tag.id}
                id={tag.id}
                name={tag.name}
                color={tag.color}
                onRemove={() => toggleTag(tag.id)}
                size="md"
              />
            ))}
        </div>
      )}

      {/* Tag list */}
      {loading ? (
        <div className="text-sm text-very-muted py-2">{tCommon("loading")}</div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {filteredTags.length === 0 ? (
            <div className="text-sm text-very-muted py-2">
              {searchQuery ? tCommon("noResults") : t("noTags")}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-[var(--success-bg)] text-[var(--success)]"
                      : "hover:bg-hover text-primary-color"
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-start">{tag.name}</span>
                  {selectedTagIds.includes(tag.id) && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create new tag */}
      {isCreating ? (
        <div className="mt-3 border-t border-line pt-3">
          {error && <div className="mb-2 text-xs text-[var(--danger)]">{error}</div>}
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full px-3 py-2 text-sm border border-line rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--success)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTag();
              if (e.key === "Escape") setIsCreating(false);
            }}
          />
          <div className="flex gap-1 mb-2">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-6 h-6 rounded-full transition-transform ${
                  newTagColor === color ? "scale-125 ring-2 ring-offset-1" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewTagColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-primary-color hover:bg-hover rounded-lg"
              onClick={() => setIsCreating(false)}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-[var(--btn-primary-text)] bg-[var(--success)] hover:opacity-90 rounded-lg"
              onClick={handleCreateTag}
            >
              {tCommon("save")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-3 w-full px-3 py-2 text-sm font-medium text-[var(--success)] hover:bg-[var(--success-bg)] rounded-lg border border-dashed border-[var(--success)]/30 transition-colors"
          onClick={() => setIsCreating(true)}
        >
          + {t("createNew")}
        </button>
      )}
    </div>
  );
}
