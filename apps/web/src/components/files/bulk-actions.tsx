"use client";

import { TagPicker } from "@/components/tags/tag-picker";

interface BulkActionsProps {
  selectedCount: number;
  onBulkTag: (tagId: string) => void;
  onBulkMove: () => void;
  onCancelSelection: () => void;
  showBulkTagPicker: boolean;
  onToggleBulkTagPicker: () => void;
  tCommon: { (key: string): string };
  tDocs: (key: string, opts?: Record<string, unknown>) => string;
}

export function BulkActions({
  selectedCount,
  onBulkTag,
  onBulkMove,
  onCancelSelection,
  showBulkTagPicker,
  onToggleBulkTagPicker,
  tCommon,
  tDocs,
}: BulkActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-color">
        {selectedCount} {tCommon("selected")}
      </span>

      <div className="relative">
        <button
          type="button"
          className="rounded-lg bg-[var(--info)] px-3 py-1.5 text-sm font-medium text-[var(--btn-primary-text)] hover:opacity-90"
          onClick={onToggleBulkTagPicker}
        >
          {tDocs("addTags", { fallback: "إضافة وسوم" })}
        </button>
        {showBulkTagPicker && (
          <div className="absolute end-0 top-full z-10 mt-2 w-64 shadow-lg">
            <TagPicker
              selectedTagIds={[]}
              onTagsChange={(ids) => {
                const tagId = ids[0];
                if (tagId) onBulkTag(tagId);
              }}
              onClose={onToggleBulkTagPicker}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className="rounded-lg bg-[var(--success)] px-3 py-1.5 text-sm font-medium text-[var(--btn-primary-text)] hover:opacity-90"
        onClick={onBulkMove}
      >
        {tDocs("moveToFolder")}
      </button>
      <button
        type="button"
        className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-sm font-medium text-[var(--btn-primary-text)] hover:opacity-80"
        onClick={onCancelSelection}
      >
        {tDocs("cancelSelection")}
      </button>
    </div>
  );
}
