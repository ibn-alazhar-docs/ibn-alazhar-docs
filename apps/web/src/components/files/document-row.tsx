"use client";

import type { Doc } from "./document-table";
import { TagChip } from "@/components/tags/tag-chip";
import { motion } from "motion/react";
import { useState } from "react";
import { ShareModal } from "@/components/pipeline/share-modal";
import { Share2 } from "lucide-react";

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
  deletingDocId: string | null;
  onConfirmDelete: (docId: string) => void;
  onCancelDelete: () => void;
  locale: string;
  tDocs: (key: string, opts?: Record<string, unknown>) => string;
  tCommon: { (key: string): string };
  formatFileSize: (bytes: number) => string;
  getStatusLabel: (status: string, t: (key: string) => string) => string;
  getStatusColor: (status: string) => string;
}

export function DocumentRow({
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
  deletingDocId,
  onConfirmDelete,
  onCancelDelete,
  locale,
  tDocs,
  tCommon,
  formatFileSize,
  getStatusLabel,
  getStatusColor,
}: DocumentRowProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="border-b border-line hover:bg-badge transition-colors"
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(doc.id)}
          aria-label={`تحديد المستند ${doc.title}`}
          className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--success)]"
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
            className="w-full rounded border border-[var(--input-border)] bg-card px-2 py-1 text-sm text-primary-color focus:outline-none focus:ring-1 focus:ring-[var(--success)]"
          />
        ) : (
          <div className="truncate text-sm font-medium text-primary-color">{doc.title}</div>
        )}
        <div className="mt-0.5 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs text-very-muted">{doc.fileName}</span>
            {doc.status === "COMPLETED" && (
              <a
                href={`/${locale}/preview/${doc.id}`}
                className="inline-block shrink-0 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--success)] transition-colors hover:bg-[var(--success)] hover:text-[var(--btn-primary-text)]"
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
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(doc.status)}`}
        >
          {getStatusLabel(doc.status, tDocs)}
        </span>
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
      <td className="whitespace-nowrap px-3 py-2">
        <div className="flex items-center gap-1">
          {editingDocId !== doc.id && (
            <motion.button
              whileHover={{
                scale: 1.1,
                color: "var(--primary-color)",
              }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
              title="Share"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </motion.button>
          )}
          {editingDocId !== doc.id && (
            <motion.button
              whileHover={{
                scale: 1.1,
                color: "var(--primary-color)",
              }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => onStartEdit(doc)}
              className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
              title={tCommon("edit")}
              aria-label={tCommon("edit")}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </motion.button>
          )}
          {editingDocId === doc.id && (
            <>
              <motion.button
                whileHover={{
                  scale: 1.1,
                  color: "var(--btn-primary-text)",
                }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => onSaveEdit(doc.id)}
                className="rounded-lg bg-[var(--success-bg)] p-1.5 text-[var(--success)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
                title={tCommon("save")}
                aria-label={tCommon("save")}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.button>
              <motion.button
                whileHover={{
                  scale: 1.1,
                  color: "var(--primary-color)",
                }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)]"
                title={tCommon("cancel")}
                aria-label={tCommon("cancel")}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            </>
          )}
          {deletingDocId === doc.id ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 rounded bg-[var(--danger-bg)] p-1"
            >
              <span className="text-[10px] font-bold text-[var(--danger)] uppercase px-1">?</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onConfirmDelete(doc.id)}
                className="rounded bg-[var(--danger)] px-2 py-0.5 text-xs font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                aria-label={tCommon("confirm")}
              >
                {tCommon("confirm")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onCancelDelete}
                className="px-2 py-0.5 text-xs font-medium text-[var(--danger)] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                aria-label={tCommon("cancel")}
              >
                {tCommon("cancel")}
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              whileHover={{
                scale: 1.1,
                color: "var(--danger)",
              }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => onDelete(doc.id)}
              className="rounded-lg p-1.5 text-muted-color transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
              title={tCommon("delete")}
              aria-label={tCommon("delete")}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </motion.button>
          )}
        </div>
        <ShareModal
          documentId={doc.id}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      </td>
    </motion.tr>
  );
}
