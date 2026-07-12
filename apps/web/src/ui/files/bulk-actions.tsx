"use client";

import { TagPicker } from "@/ui/tags/tag-picker";

interface BulkActionsProps {
  selectedCount: number;
  onBulkTag: (tagId: string) => void;
  onBulkMove: () => void;
  onBulkExport: () => void;
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
  onBulkExport,
  onCancelSelection,
  showBulkTagPicker,
  onToggleBulkTagPicker,
  tCommon,
  tDocs,
}: BulkActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-color">
        {selectedCount} {tCommon("selected")}
      </span>

      <div className="relative">
        <button
          type="button"
          className="rounded-lg bg-info px-3 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90"
          onClick={onToggleBulkTagPicker}
        >
          {tDocs("addTags")}
        </button>
        {showBulkTagPicker && (
          <div className="absolute end-0 top-full z-50 mt-2 w-64 shadow-lg">
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
        className="rounded-lg bg-success px-3 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90"
        onClick={onBulkMove}
      >
        {tDocs("moveToFolder")}
      </button>
      <button
        type="button"
        className="rounded-lg bg-warning-500 px-3 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90"
        onClick={onBulkExport}
      >
        {tDocs("exportSelected")}
      </button>
      <button
        type="button"
        className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-btn-primary-text hover:opacity-80"
        onClick={onCancelSelection}
      >
        {tDocs("cancelSelection")}
      </button>
    </div>
  );
}
