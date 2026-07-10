"use client";

import { useTranslations } from "next-intl";
import { DocumentRow } from "./document-row";
import { BulkActions } from "./bulk-actions";
import { ConfirmDialog } from "@/ui/confirm-dialog";

export interface Doc {
  id: string;
  title: string;
  fileName: string;
  status: string;
  pageCount: number | null;
  fileSize: number;
  outputFormats: string[];
  createdAt: string;
  folderId: string | null;
  tags?: { tag: { id: string; name: string; color: string } }[];
}

interface DocumentTableProps {
  documents: Doc[];
  selectedDocs: Set<string>;
  allSelected: boolean;
  onToggleSelect: (docId: string) => void;
  onToggleSelectAll: () => void;
  editingDocId: string | null;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onStartEdit: (doc: Doc) => void;
  onSaveEdit: (docId: string) => void;
  onCancelEdit: () => void;
  onDelete: (docId: string) => void;
  deletingDocId: string | null;
  onConfirmDelete: (docId: string) => void;
  onCancelDelete: () => void;
  onBulkTag: (tagId: string) => void;
  onBulkMove: () => void;
  onBulkExport: () => void;
  onCancelSelection: () => void;
  showBulkTagPicker: boolean;
  onToggleBulkTagPicker: () => void;
  locale: string;
  isDeleting: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  return t(`status.${status}`) || status;
}

export function DocumentTable({
  documents,
  selectedDocs,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  editingDocId,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  deletingDocId,
  onConfirmDelete,
  onCancelDelete,
  onBulkTag,
  onBulkMove,
  onBulkExport,
  onCancelSelection,
  showBulkTagPicker,
  onToggleBulkTagPicker,
  locale,
  isDeleting,
}: DocumentTableProps) {
  const tDocs = useTranslations("documents") as unknown as (
    key: string,
    opts?: Record<string, unknown>,
  ) => string;
  const tCommon = useTranslations("common") as unknown as (key: string) => string;

  // Find the document currently being deleted for its title in the confirm dialog
  const deletingDoc = documents.find((d) => d.id === deletingDocId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-color">{tDocs("title")}</h3>
        {selectedDocs.size > 0 && (
          <BulkActions
            selectedCount={selectedDocs.size}
            onBulkTag={onBulkTag}
            onBulkMove={onBulkMove}
            onBulkExport={onBulkExport}
            onCancelSelection={onCancelSelection}
            showBulkTagPicker={showBulkTagPicker}
            onToggleBulkTagPicker={onToggleBulkTagPicker}
            tCommon={tCommon}
            tDocs={tDocs}
          />
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-[640px] w-full table-auto">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-line bg-card text-start">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label={tCommon("selectAll")}
                  className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--success)]"
                />
              </th>
              <th className="px-3 py-3 text-sm font-medium text-muted-color">
                {tDocs("table.title")}
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-color">
                {tDocs("table.status")}
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-color">
                {tDocs("table.pages")}
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-color">
                {tDocs("table.size")}
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-color">
                {tDocs("table.date")}
              </th>
              <th className="w-20 whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-color" />
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                isSelected={selectedDocs.has(doc.id)}
                onToggleSelect={onToggleSelect}
                editingDocId={editingDocId}
                editTitle={editTitle}
                onEditTitleChange={onEditTitleChange}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                locale={locale}
                tDocs={tDocs}
                tCommon={tCommon}
                formatFileSize={formatFileSize}
                getStatusLabel={getStatusLabel}
              />
            ))}
          </tbody>
        </table>
      </div>

      {deletingDocId && (
        <ConfirmDialog
          title={tDocs("deleteConfirmTitle")}
          message={tDocs("deleteConfirmDesc", { name: deletingDoc?.title })}
          confirmLabel={tCommon("delete")}
          cancelLabel={tCommon("cancel")}
          variant="danger"
          isLoading={isDeleting}
          onConfirm={() => deletingDocId && onConfirmDelete(deletingDocId)}
          onCancel={onCancelDelete}
        />
      )}
    </div>
  );
}
