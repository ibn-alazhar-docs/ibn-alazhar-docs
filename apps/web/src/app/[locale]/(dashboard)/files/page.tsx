"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/container";
import { PageTransition } from "@/components/ui/page-transition";
import { Section } from "@/components/ui/section";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { FileUpload } from "@/components/pipeline/file-upload";
import { FolderTree } from "@/components/folders/folder-tree";
import { Breadcrumbs } from "@/components/folders/breadcrumbs";
import { MoveDialog } from "@/components/folders/move-dialog";
import { TagFilterSidebar } from "@/components/tags/tag-filter-sidebar";
import { ActiveJobs } from "@/components/files/active-jobs";
import { DocumentTable, type Doc } from "@/components/files/document-table";

interface ActiveJob {
  jobId: string;
  fileName: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

export default function FilesPage() {
  const t = useTranslations("nav");
  const tDocs = useTranslations("documents");
  const locale = useLocale();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
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
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
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

  function startEditTitle(doc: Doc) {
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

  const allSelected = documents.length > 0 && selectedDocs.size === documents.length;

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 shrink-0">
              <div className="sticky top-4 space-y-6 rounded-xl border border-line bg-card p-4">
                <FolderTree
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={handleFolderSelect}
                />
                <div className="border-t border-line pt-4">
                  <TagFilterSidebar
                    selectedTagIds={selectedTagIds}
                    onTagsChange={setSelectedTagIds}
                  />
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1">
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
                <div className="rounded-xl border border-line bg-card p-6">
                  <FileUpload onUploadStart={handleUploadStart} folderId={selectedFolderId} />
                </div>

                {/* Active Jobs */}
                <ActiveJobs
                  jobs={activeJobs}
                  completedIds={completedIds}
                  locale={locale}
                  onMarkComplete={handleMarkComplete}
                />

                {/* Document Table Skeleton */}
                {loadingDocs && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-6 w-32 rounded bg-muted animate-pulse"></div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line bg-card">
                      <table className="min-w-[640px] w-full table-auto">
                        <thead>
                          <tr className="border-b border-line text-start">
                            <th className="w-10 px-3 py-3">
                              <div className="h-4 w-4 rounded bg-muted animate-pulse"></div>
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-24 rounded bg-muted animate-pulse"></div>
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-16 rounded bg-muted animate-pulse"></div>
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-12 rounded bg-muted animate-pulse"></div>
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-16 rounded bg-muted animate-pulse"></div>
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-20 rounded bg-muted animate-pulse"></div>
                            </th>
                            <th className="w-20 px-3 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b border-line">
                              <td className="px-3 py-4">
                                <div className="h-4 w-4 rounded bg-muted animate-pulse"></div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="flex flex-col gap-1.5">
                                  <div className="h-4 w-48 rounded bg-muted animate-pulse"></div>
                                  <div className="h-3 w-32 rounded bg-muted animate-pulse opacity-50"></div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-5 w-20 rounded-full bg-muted animate-pulse"></div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-4 w-10 rounded bg-muted animate-pulse"></div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-4 w-16 rounded bg-muted animate-pulse"></div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-4 w-24 rounded bg-muted animate-pulse"></div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="flex gap-1">
                                  <div className="h-7 w-7 rounded-lg bg-muted animate-pulse"></div>
                                  <div className="h-7 w-7 rounded-lg bg-muted animate-pulse"></div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Document Table */}
                {!loadingDocs && documents.length > 0 && (
                  <DocumentTable
                    documents={documents}
                    selectedDocs={selectedDocs}
                    allSelected={allSelected}
                    onToggleSelect={toggleDocSelection}
                    onToggleSelectAll={toggleSelectAll}
                    editingDocId={editingDocId}
                    editTitle={editTitle}
                    onEditTitleChange={setEditTitle}
                    onStartEdit={startEditTitle}
                    onSaveEdit={saveEditTitle}
                    onCancelEdit={() => {
                      setEditingDocId(null);
                      setEditTitle("");
                    }}
                    onDelete={(docId) => setDeletingDocId(docId)}
                    deletingDocId={deletingDocId}
                    onConfirmDelete={confirmDelete}
                    onCancelDelete={() => setDeletingDocId(null)}
                    onBulkTag={handleBulkTag}
                    onBulkMove={handleBulkMove}
                    onCancelSelection={() => setSelectedDocs(new Set())}
                    showBulkTagPicker={showBulkTagPicker}
                    onToggleBulkTagPicker={() => setShowBulkTagPicker(!showBulkTagPicker)}
                    locale={locale}
                  />
                )}

                {/* Empty State */}
                {activeJobs.length === 0 && !loadingDocs && documents.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card py-20 px-6 text-center shadow-sm transition-all duration-300">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)] shadow-sm">
                      <svg
                        className="h-10 w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                    </div>
                    <Heading level={3} className="mb-3 text-primary-color">
                      {tDocs("empty")}
                    </Heading>
                    <Text color="muted" className="max-w-md">
                      {tDocs("uploadPrompt")}
                    </Text>
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
    </PageTransition>
  );
}
