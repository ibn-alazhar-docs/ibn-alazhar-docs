"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FolderItem } from "./folder-item";
import { CreateFolderDialog } from "./create-folder-dialog";
import { MoveDialog } from "./move-dialog";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { useFolders } from "./use-folders";
import { FolderIcon } from "@/ui/icons";

interface FolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderTree({ selectedFolderId, onSelectFolder }: FolderTreeProps) {
  const t = useTranslations("folders");
  const tCommon = useTranslations("common");
  const { folders, loading, createFolder, renameFolder, deleteFolder, moveFolder } = useFolders();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCreate(name: string): Promise<void> {
    try {
      await createFolder(name, createParentId);
      toast.success(t("createSuccess"));
      setShowCreateDialog(false);
      setCreateParentId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("createError"));
    }
  }

  async function handleDelete(folderId: string) {
    setIsDeleting(true);
    try {
      await deleteFolder(folderId);
      toast.success(t("deleteSuccess"));
      if (selectedFolderId === folderId) {
        onSelectFolder(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  }

  async function handleMoveSubmit(newParentId: string | null) {
    if (!movingFolderId) return;
    try {
      await moveFolder(movingFolderId, newParentId);
      toast.success(t("moveSuccess"));
      setShowMoveDialog(false);
      setMovingFolderId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("moveError"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-hover" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-color">{t("title")}</h3>
        <button
          type="button"
          className="text-sm font-medium text-[var(--success)] hover:text-[var(--success)]"
          onClick={() => {
            setCreateParentId(null);
            setShowCreateDialog(true);
          }}
        >
          {t("createButton")}
        </button>
      </div>

      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start transition-colors ${
          selectedFolderId === null
            ? "bg-[var(--success-bg)] text-[var(--success)]"
            : "text-primary-color hover:bg-hover"
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <span className="text-lg">
          <FolderIcon className="h-5 w-5 text-muted-color" />
        </span>
        <span className="text-sm font-medium">{t("allFiles")}</span>
      </button>

      {folders.length > 0 ? (
        <div className="space-y-1">
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              onSelect={onSelectFolder}
              onRename={renameFolder}
              onDelete={(folderId) => setDeleteConfirmId(folderId)}
              onMove={(folderId) => {
                setMovingFolderId(folderId);
                setShowMoveDialog(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mb-2 text-muted-color">
            <FolderIcon className="mx-auto h-10 w-10" />
          </div>
          <p className="text-sm text-muted-color">{t("empty")}</p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-[var(--success)] hover:text-[var(--success)]"
            onClick={() => {
              setCreateParentId(null);
              setShowCreateDialog(true);
            }}
          >
            {t("create")}
          </button>
        </div>
      )}

      {showCreateDialog && (
        <CreateFolderDialog
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateDialog(false);
            setCreateParentId(null);
          }}
        />
      )}

      {showMoveDialog && (
        <MoveDialog
          selectedCount={1}
          onSubmit={handleMoveSubmit}
          onClose={() => {
            setShowMoveDialog(false);
            setMovingFolderId(null);
          }}
        />
      )}

      {deleteConfirmId && (
        <ConfirmDialog
          title={t("deleteTitle")}
          message={t("deleteConfirm")}
          confirmLabel={tCommon("delete")}
          cancelLabel={tCommon("cancel")}
          variant="danger"
          isLoading={isDeleting}
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
