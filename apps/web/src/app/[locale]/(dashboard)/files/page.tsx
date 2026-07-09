"use client";

import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/ui/container";
import { PageTransition } from "@/ui/page-transition";
import { Section } from "@/ui/section";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";
import { FileUpload } from "@/ui/pipeline/file-upload";
import { FolderTree } from "@/ui/folders/folder-tree";
import { Breadcrumbs } from "@/ui/folders/breadcrumbs";
import { MoveDialog } from "@/ui/folders/move-dialog";
import { TagFilterSidebar } from "@/ui/tags/tag-filter-sidebar";
import { ActiveJobs } from "@/ui/files/active-jobs";
import { DocumentTable } from "@/ui/files/document-table";
import { FolderIcon } from "@/ui/icons";
import { useFilesManager } from "@/state/use-files-manager";
import { Card } from "@/ui/card";

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
              <Card className="sticky top-4 space-y-6 p-4">
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
              </Card>
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
                <Card className="p-6">
                  <FileUpload onUploadStart={fm.handleUploadStart} folderId={fm.selectedFolderId} />
                </Card>

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
                    <Card className="overflow-x-auto">
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
                    </Card>
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
                    isDeleting={fm.isDeleting}
                  />
                )}

                {/* Empty State */}
                {fm.activeJobs.length === 0 && !fm.loadingDocs && fm.documents.length === 0 && (
                  <Card className="flex flex-col items-center justify-center border-dashed border-gold/35 py-20 px-6 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/5 text-gold shadow-sm">
                      <FolderIcon className="h-10 w-10" />
                    </div>
                    <Heading level={3} className="mb-3 text-primary-color">
                      {tDocs("empty")}
                    </Heading>
                    <Text color="muted" className="max-w-md">
                      {tDocs("uploadPrompt")}
                    </Text>
                  </Card>
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
