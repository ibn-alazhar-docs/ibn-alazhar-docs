"use client";

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
import { DocumentTable } from "@/components/files/document-table";
import { useFilesManager } from "@/hooks/use-files-manager";

export default function FilesPage() {
  const t = useTranslations("nav");
  const tDocs = useTranslations("documents");
  const locale = useLocale();
  const fm = useFilesManager();

  return (
    <PageTransition>
      <Container>
        <Section padding="md">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 shrink-0">
              <div className="sticky top-4 space-y-6 rounded-xl border border-line bg-card p-4">
                <FolderTree
                  selectedFolderId={fm.selectedFolderId}
                  onSelectFolder={fm.handleFolderSelect}
                />
                <div className="border-t border-line pt-4">
                  <TagFilterSidebar
                    selectedTagIds={fm.selectedTagIds}
                    onTagsChange={fm.setSelectedTagIds}
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
                {fm.breadcrumbs.length > 0 && (
                  <Breadcrumbs breadcrumbs={fm.breadcrumbs} onNavigate={fm.handleFolderSelect} />
                )}

                {/* Upload Zone */}
                <div className="rounded-xl border border-line bg-card p-6">
                  <FileUpload onUploadStart={fm.handleUploadStart} folderId={fm.selectedFolderId} />
                </div>

                {/* Active Jobs */}
                <ActiveJobs
                  jobs={fm.activeJobs}
                  completedIds={fm.completedIds}
                  locale={locale}
                  onMarkComplete={fm.handleMarkComplete}
                />

                {/* Document Table Skeleton */}
                {fm.loadingDocs && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-6 w-32 rounded bg-muted animate-pulse" />
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line bg-card">
                      <table className="min-w-[640px] w-full table-auto">
                        <thead>
                          <tr className="border-b border-line text-start">
                            <th className="w-10 px-3 py-3">
                              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-12 rounded bg-muted animate-pulse" />
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                            </th>
                            <th className="px-3 py-3">
                              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                            </th>
                            <th className="w-20 px-3 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {[...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b border-line">
                              <td className="px-3 py-4">
                                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                              </td>
                              <td className="px-3 py-4">
                                <div className="flex flex-col gap-1.5">
                                  <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                                  <div className="h-3 w-32 rounded bg-muted animate-pulse opacity-50" />
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-4 w-10 rounded bg-muted animate-pulse" />
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                              </td>
                              <td className="px-3 py-4">
                                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                              </td>
                              <td className="px-3 py-4">
                                <div className="flex gap-1">
                                  <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
                                  <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
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
                {!fm.loadingDocs && fm.documents.length > 0 && (
                  <DocumentTable
                    documents={fm.documents}
                    selectedDocs={fm.selectedDocs}
                    allSelected={fm.allSelected}
                    onToggleSelect={fm.toggleDocSelection}
                    onToggleSelectAll={fm.toggleSelectAll}
                    editingDocId={fm.editingDocId}
                    editTitle={fm.editTitle}
                    onEditTitleChange={fm.setEditTitle}
                    onStartEdit={fm.startEditTitle}
                    onSaveEdit={fm.saveEditTitle}
                    onCancelEdit={fm.cancelEdit}
                    onDelete={(docId) => fm.setDeletingDocId(docId)}
                    deletingDocId={fm.deletingDocId}
                    onConfirmDelete={fm.confirmDelete}
                    onCancelDelete={fm.cancelDelete}
                    onBulkTag={fm.handleBulkTag}
                    onBulkMove={fm.handleBulkMove}
                    onBulkExport={fm.handleBulkExport}
                    onCancelSelection={fm.cancelSelection}
                    showBulkTagPicker={fm.showBulkTagPicker}
                    onToggleBulkTagPicker={() => fm.setShowBulkTagPicker(!fm.showBulkTagPicker)}
                    locale={locale}
                  />
                )}

                {/* Empty State */}
                {fm.activeJobs.length === 0 && !fm.loadingDocs && fm.documents.length === 0 && (
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
        {fm.showMoveDialog && (
          <MoveDialog
            selectedCount={fm.moveCount}
            onSubmit={fm.handleMoveSubmit}
            onClose={() => fm.setShowMoveDialog(false)}
          />
        )}
      </Container>
    </PageTransition>
  );
}
