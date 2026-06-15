"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { FileUpload } from "@/components/pipeline/file-upload";
import { ConversionStatus } from "@/components/pipeline/conversion-status";
import { FolderTree } from "@/components/folders/folder-tree";
import { Breadcrumbs } from "@/components/folders/breadcrumbs";
import { MoveDialog } from "@/components/folders/move-dialog";
import { TagFilterSidebar } from "@/components/tags/tag-filter-sidebar";
import { TagChip } from "@/components/tags/tag-chip";
import { TagPicker } from "@/components/tags/tag-picker";

interface ActiveJob {
  jobId: string;
  fileName: string;
}

interface Document {
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

interface Breadcrumb {
  id: string;
  name: string;
}

export default function FilesPage() {
  const t = useTranslations("nav");
  const tDocs = useTranslations("documents");
  const tCommon = useTranslations("common");
  const tPreview = useTranslations("pipeline.preview");
  const locale = useLocale();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showBulkTagPicker, setShowBulkTagPicker] = useState(false);

  const loadDocuments = useCallback(async (folderId: string | null) => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams({ limit: "50", sort: "createdAt", order: "desc" });
      if (folderId !== null) {
        params.set("folderId", folderId);
      }
      if (selectedTagIds.length > 0) {
        selectedTagIds.forEach((id) => params.append("tagId", id));
      }
      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch {
      console.error("Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const loadBreadcrumbs = useCallback(async (folderId: string | null) => {
    if (folderId === null) {
      setBreadcrumbs([]);
      return;
    }
    try {
      const res = await fetch(`/api/folders/${folderId}/tree`);
      if (res.ok) {
        const data = await res.json();
        setBreadcrumbs(data.breadcrumbs || []);
      }
    } catch {
      console.error("Failed to load breadcrumbs");
    }
  }, []);

  useEffect(() => {
    loadDocuments(selectedFolderId);
    loadBreadcrumbs(selectedFolderId);
    setSelectedDocs(new Set());
  }, [selectedFolderId, selectedTagIds, loadDocuments, loadBreadcrumbs]);

  function handleUploadStart(jobId: string, fileName: string) {
    setActiveJobs((prev) => [{ jobId, fileName }, ...prev]);
  }

  function handleMarkComplete(jobId: string) {
    setCompletedIds((prev) => [...prev, jobId]);
  }

  function handleFolderSelect(folderId: string | null) {
    setSelectedFolderId(folderId);
  }

  function toggleDocSelection(docId: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map((d) => d.id)));
    }
  }

  function handleBulkMove() {
    setMoveCount(selectedDocs.size);
    setShowMoveDialog(true);
  }

  async function handleMoveSubmit(folderId: string | null) {
    try {
      const res = await fetch("/api/documents/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs), folderId }),
      });

      if (res.ok) {
        setShowMoveDialog(false);
        setSelectedDocs(new Set());
        loadDocuments(selectedFolderId);
      }
    } catch {
      console.error("Failed to move documents");
    }
  }

  async function handleBulkTag(tagId: string) {
    try {
      const res = await fetch("/api/documents/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs), tagId }),
      });

      if (res.ok) {
        setShowBulkTagPicker(false);
        loadDocuments(selectedFolderId);
      }
    } catch {
      console.error("Failed to tag documents");
    }
  }

  async function handleDeleteDocument(docId: string) {
    setDeletingDocId(docId);
  }

  async function confirmDelete(docId: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedDocs((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
        loadDocuments(selectedFolderId);
      }
    } catch {
      console.error("Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  }

  function startEditTitle(doc: Document) {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
  }

  async function saveEditTitle(docId: string) {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, title: editTitle.trim() } : d)),
        );
      }
    } catch {
      console.error("Failed to update title");
    } finally {
      setEditingDocId(null);
      setEditTitle("");
    }
  }

  function cancelEditTitle() {
    setEditingDocId(null);
    setEditTitle("");
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getStatusLabel(status: string): string {
    return tDocs(`status.${status}`) || status;
  }

  function getStatusColor(status: string): string {
    if (status === "COMPLETED") return "bg-[var(--success-bg)] text-[var(--success)]";
    if (status === "FAILED") return "bg-[var(--danger-bg)] text-[var(--danger)]";
    if (status.startsWith("OCR") || status === "SPLITTING")
      return "bg-[var(--info-bg)] text-[var(--info)]";
    return "bg-[var(--badge-bg)] text-[var(--text-muted)]";
  }

  const allSelected = documents.length > 0 && selectedDocs.size === documents.length;

  return (
    <Container>
      <Section padding="md">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <div className="bg-card rounded-xl border border-line p-4 sticky top-4 space-y-6">
              <FolderTree selectedFolderId={selectedFolderId} onSelectFolder={handleFolderSelect} />
              <div className="border-t border-line pt-4">
                <TagFilterSidebar selectedTagIds={selectedTagIds} onTagsChange={setSelectedTagIds} />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Stack gap={6}>
              {/* Header */}
              <div>
                <Heading level={2}>{t("files")}</Heading>
                <Text color="muted">{tDocs("uploadPrompt")}</Text>
              </div>

              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleFolderSelect} />
              )}

              {/* Upload Zone */}
              <div className="bg-card rounded-xl border border-line p-6">
                <FileUpload onUploadStart={handleUploadStart} folderId={selectedFolderId} />
              </div>

              {/* Active Jobs */}
              {activeJobs.length > 0 && (
                <div>
                  <Heading level={3}>{tDocs("activeJobs")}</Heading>
                  <Stack gap={4} className="mt-4">
                    {activeJobs.map((job) => (
                      <div key={job.jobId} className="bg-card rounded-xl border border-line p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-primary-color truncate ms-4">
                            {job.fileName}
                          </h4>
                          <span className="text-xs text-very-muted font-mono shrink-0">
                            {job.jobId.slice(0, 8)}...
                          </span>
                        </div>
                        <ConversionStatus jobId={job.jobId} onComplete={handleMarkComplete} />
                        {completedIds.includes(job.jobId) && (
                          <div className="mt-4 pt-4 border-t border-line">
                            <a
                              href={`/${locale}/preview/${job.jobId}`}
                              className="inline-block px-4 py-2 bg-[var(--success)] text-[var(--btn-primary-text)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                            >
                              {tPreview("previewAndExport")}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </Stack>
                </div>
              )}

              {/* Completed Documents */}
              {!loadingDocs && documents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Heading level={3}>{tDocs("title")}</Heading>
                    {selectedDocs.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-color">
                          {selectedDocs.size} {tCommon("selected")}
                        </span>
                        
                        <div className="relative">
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm font-medium text-[var(--btn-primary-text)] bg-[var(--info)] hover:opacity-90 rounded-lg"
                            onClick={() => setShowBulkTagPicker(!showBulkTagPicker)}
                          >
                            {tDocs("addTags", { fallback: "إضافة وسوم" })}
                          </button>
                          {showBulkTagPicker && (
                            <div className="absolute top-full right-0 mt-2 w-64 z-10 shadow-lg">
                              <TagPicker 
                                selectedTagIds={[]} 
                                onTagsChange={(ids) => {
                                  const tagId = ids[0];
                                  if (tagId) handleBulkTag(tagId);
                                }} 
                                onClose={() => setShowBulkTagPicker(false)}
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm font-medium text-[var(--btn-primary-text)] bg-[var(--success)] hover:opacity-90 rounded-lg"
                          onClick={handleBulkMove}
                        >
                          {tDocs("moveToFolder")}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm font-medium text-[var(--btn-primary-text)] bg-[var(--danger)] hover:opacity-80 rounded-lg"
                          onClick={() => setSelectedDocs(new Set())}
                        >
                          {tDocs("cancelSelection")}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-card rounded-xl border border-line overflow-x-auto">
                    <table className="w-full table-auto min-w-[640px]">
                      <thead>
                        <tr className="border-b border-line text-start sticky top-0 bg-card">
                          <th className="px-3 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              aria-label="تحديد جميع المستندات"
                              className="w-4 h-4 rounded border-[var(--input-border)] accent-[var(--success)]"
                            />
                          </th>
                          <th className="px-3 py-3 text-sm font-medium text-muted-color">
                            {tDocs("table.title")}
                          </th>
                          <th className="px-3 py-3 text-sm font-medium text-muted-color whitespace-nowrap">
                            {tDocs("table.status")}
                          </th>
                          <th className="px-3 py-3 text-sm font-medium text-muted-color whitespace-nowrap">
                            {tDocs("table.pages")}
                          </th>
                          <th className="px-3 py-3 text-sm font-medium text-muted-color whitespace-nowrap">
                            {tDocs("table.size")}
                          </th>
                          <th className="px-3 py-3 text-sm font-medium text-muted-color whitespace-nowrap">
                            {tDocs("table.date")}
                          </th>
                          <th className="px-3 py-3 text-sm font-medium text-muted-color whitespace-nowrap w-20">
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id} className="border-b border-line hover:bg-badge">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedDocs.has(doc.id)}
                                onChange={() => toggleDocSelection(doc.id)}
                                aria-label={`تحديد المستند ${doc.title}`}
                                className="w-4 h-4 rounded border-[var(--input-border)] accent-[var(--success)]"
                              />
                            </td>
                            <td className="px-3 py-2 max-w-[200px]">
                              {editingDocId === doc.id ? (
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditTitle(doc.id);
                                    if (e.key === "Escape") cancelEditTitle();
                                  }}
                                  onBlur={() => saveEditTitle(doc.id)}
                                  autoFocus
                                  className="w-full px-2 py-1 text-sm border border-[var(--input-border)] rounded bg-card text-primary-color focus:outline-none focus:ring-1 focus:ring-[var(--success)]"
                                />
                              ) : (
                                <div className="font-medium text-primary-color truncate text-sm">
                                  {doc.title}
                                </div>
                              )}
                              <div className="flex flex-col gap-1 mt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-very-muted truncate">
                                    {doc.fileName}
                                  </span>
                                  {doc.status === "COMPLETED" && (
                                    <a
                                      href={`/${locale}/preview/${doc.id}`}
                                      className="shrink-0 inline-block px-2 py-0.5 text-xs font-medium bg-[var(--success-bg)] text-[var(--success)] rounded-full hover:bg-[var(--success)] hover:text-[var(--btn-primary-text)] transition-colors"
                                    >
                                      {tCommon("view")}
                                    </a>
                                  )}
                                </div>
                                {doc.tags && doc.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
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
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}
                              >
                                {getStatusLabel(doc.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-color whitespace-nowrap">
                              {doc.pageCount ? tDocs("pagesCount", { count: doc.pageCount }) : "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-color whitespace-nowrap">
                              {formatFileSize(doc.fileSize)}
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-color whitespace-nowrap">
                              {new Date(doc.createdAt).toLocaleDateString(
                                locale === "ar" ? "ar-EG" : "en-US",
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {editingDocId !== doc.id && (
                                  <button
                                    type="button"
                                    onClick={() => startEditTitle(doc)}
                                    className="p-1.5 rounded-lg hover:bg-badge text-muted-color hover:text-primary-color transition-colors"
                                    title="تعديل العنوان"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {editingDocId === doc.id && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => saveEditTitle(doc.id)}
                                      className="p-1.5 rounded-lg bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success)] hover:text-[var(--btn-primary-text)] transition-colors"
                                      title="حفظ"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditTitle}
                                      className="p-1.5 rounded-lg hover:bg-badge text-muted-color hover:text-primary-color transition-colors"
                                      title="إلغاء"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                                {deletingDocId === doc.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => confirmDelete(doc.id)}
                                      className="px-2 py-1 text-xs font-medium bg-[var(--danger)] text-[var(--btn-primary-text)] rounded hover:opacity-80 transition-colors"
                                    >
                                      تأكيد
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingDocId(null)}
                                      className="px-2 py-1 text-xs font-medium text-muted-color hover:text-primary-color transition-colors"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-1.5 rounded-lg hover:bg-[var(--danger-bg)] text-muted-color hover:text-[var(--danger)] transition-colors"
                                    title="حذف"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {activeJobs.length === 0 && !loadingDocs && documents.length === 0 && (
                <div className="text-center py-12">
                  <div className="mb-4 text-muted-color">
                    <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                  </div>
                  <Text color="muted">{tDocs("empty")}</Text>
                </div>
              )}
            </Stack>
          </div>
        </div>
      </Section>

      {/* Move Dialog */}
      {showMoveDialog && (
        <MoveDialog
          selectedCount={moveCount}
          onSubmit={handleMoveSubmit}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </Container>
  );
}
