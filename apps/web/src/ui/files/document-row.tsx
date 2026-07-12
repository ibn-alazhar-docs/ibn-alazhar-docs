"use client";

import type { Doc } from "./document-table";
import { TagChip } from "@/ui/tags/tag-chip";
import { motion } from "motion/react";
import { useState, memo } from "react";
import { ShareModal } from "@/ui/pipeline/share-modal";
import { ShareIcon, EditIcon, SaveIcon, CancelIcon, DeleteIcon } from "./document-row-icons";
import { Badge } from "@/ui/badge";

interface DocumentRowActionsProps {
  doc: Doc;
  editingDocId: string | null;
  onStartEdit: (doc: Doc) => void;
  onSaveEdit: (docId: string) => void;
  onCancelEdit: () => void;
  onDelete: (docId: string) => void;
  tCommon: { (key: string): string };
}

function DocumentRowActions({
  doc,
  editingDocId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  tCommon,
}: DocumentRowActionsProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isEditing = editingDocId === doc.id;

  return (
    <td className="whitespace-nowrap px-3 py-2">
      <div className="flex items-center gap-1">
        {!isEditing && (
          <motion.button
            whileHover={{ scale: 1.1, color: "var(--primary-color)" }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
            title={tCommon("share")}
            aria-label={tCommon("share")}
          >
            <ShareIcon />
          </motion.button>
        )}
        {!isEditing && (
          <motion.button
            whileHover={{ scale: 1.1, color: "var(--primary-color)" }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => onStartEdit(doc)}
            className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
            title={tCommon("edit")}
            aria-label={tCommon("edit")}
          >
            <EditIcon />
          </motion.button>
        )}
        {isEditing && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, color: "var(--btn-primary-text)" }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => onSaveEdit(doc.id)}
              className="rounded-lg bg-success-bg p-1.5 text-success transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
              title={tCommon("save")}
              aria-label={tCommon("save")}
            >
              <SaveIcon />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, color: "var(--primary-color)" }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
              title={tCommon("cancel")}
              aria-label={tCommon("cancel")}
            >
              <CancelIcon />
            </motion.button>
          </>
        )}
        <motion.button
          whileHover={{ scale: 1.1, color: "var(--danger)" }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => onDelete(doc.id)}
          className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          title={tCommon("delete")}
          aria-label={tCommon("delete")}
        >
          <DeleteIcon />
        </motion.button>
      </div>
      <ShareModal
        documentId={doc.id}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </td>
  );
}

interface DocumentRowProps {
  doc: Doc;
  isSelected: boolean;
  onToggleSelect: (docId: string) => void;
  editingDocId: string | null;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onStartEdit: (doc: Doc) => void;
  onSaveEdit: (docId: string) => void;
  onCancelEdit: () => void;
  onDelete: (docId: string) => void;
  locale: string;
  tDocs: (key: string, opts?: Record<string, unknown>) => string;
  tCommon: { (key: string): string };
  formatFileSize: (bytes: number) => string;
  getStatusLabel: (status: string, t: (key: string) => string) => string;
}

export const DocumentRow = memo(function DocumentRow({
  doc,
  isSelected,
  onToggleSelect,
  editingDocId,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  locale,
  tDocs,
  tCommon,
  formatFileSize,
  getStatusLabel,
}: DocumentRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="border-b border-line hover:bg-badge transition-colors"
      data-testid="document-row"
      data-document-id={doc.id}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(doc.id)}
          aria-label={tDocs("selectAria", { title: doc.title })}
          className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--success)]"
          data-testid="document-select"
        />
      </td>
      <td className="max-w-[200px] px-3 py-2">
        {editingDocId === doc.id ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(doc.id);
              if (e.key === "Escape") onCancelEdit();
            }}
            onBlur={() => onSaveEdit(doc.id)}
            autoFocus
            className="w-full rounded border border-[var(--input-border)] bg-card px-2 py-1 text-sm text-primary-color focus:outline-none focus:ring-1 focus:ring-success"
          />
        ) : (
          <div
            className="truncate text-sm font-medium text-primary-color"
            data-testid="document-title"
          >
            {doc.title}
          </div>
        )}
        <div className="mt-0.5 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs text-very-muted">{doc.fileName}</span>
            {doc.status === "COMPLETED" && (
              <a
                href={`/${locale}/preview/${doc.id}`}
                className="inline-block shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success transition-colors hover:bg-success hover:text-btn-primary-text"
              >
                {tCommon("view")}
              </a>
            )}
          </div>
          {doc.tags && doc.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {doc.tags.map((t) => (
                <TagChip
                  key={t.tag.id}
                  id={t.tag.id}
                  name={t.tag.name}
                  color={t.tag.color}
                  size="sm"
                />
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <Badge
          variant={
            doc.status === "COMPLETED"
              ? "success"
              : doc.status === "FAILED"
                ? "destructive"
                : doc.status === "UPLOADED"
                  ? "warning"
                  : doc.status.startsWith("OCR") ||
                      doc.status === "SPLITTING" ||
                      doc.status === "PROCESSING"
                    ? "info"
                    : "secondary"
          }
          data-testid="document-status"
        >
          {getStatusLabel(doc.status, tDocs)}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-color">
        {doc.pageCount ? tDocs("pagesCount", { count: doc.pageCount }) : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-color">
        {formatFileSize(doc.fileSize)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-color">
        {new Date(doc.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
      </td>
      <DocumentRowActions
        doc={doc}
        editingDocId={editingDocId}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onDelete={onDelete}
        tCommon={tCommon}
      />
    </motion.tr>
  );
});
