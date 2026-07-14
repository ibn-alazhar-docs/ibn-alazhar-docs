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
    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
      <span className="text-xs sm:text-sm text-muted-color whitespace-nowrap">
        {selectedCount} {tCommon("selected")}
      </span>

      <div className="relative">
        <button
          type="button"
          className="rounded-lg bg-info px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-btn-primary-text hover:opacity-90 whitespace-nowrap"
          onClick={onToggleBulkTagPicker}
        >
          {tDocs("addTags")}
        </button>
        {showBulkTagPicker && (
          <div className="absolute end-0 sm:end-auto start-0 sm:start-auto top-full z-50 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-sm shadow-lg">
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
        className="rounded-lg bg-success px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-btn-primary-text hover:opacity-90 whitespace-nowrap"
        onClick={onBulkMove}
      >
        {tDocs("moveToFolder")}
      </button>
      <button
        type="button"
        className="rounded-lg bg-warning-500 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-btn-primary-text hover:opacity-90 whitespace-nowrap"
        onClick={onBulkExport}
      >
        {tDocs("exportSelected")}
      </button>
      <button
        type="button"
        className="rounded-lg bg-danger px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-btn-primary-text hover:opacity-80 whitespace-nowrap"
        onClick={onCancelSelection}
      >
        {tDocs("cancelSelection")}
      </button>
    </div>
  );
}
