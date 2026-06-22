"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FolderItem } from "./folder-item";
import { CreateFolderDialog } from "./create-folder-dialog";
import { MoveDialog } from "./move-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buildFolderTree, type FolderNode } from "@/lib/build-folder-tree";

interface FolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderTree({ selectedFolderId, onSelectFolder }: FolderTreeProps) {
  const t = useTranslations("folders");
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch("/api/folders");
      if (!response.ok) throw new Error("Failed to load folders");
      const data = await response.json();
      const rootFolders = buildFolderTree(data.folders);
      setFolders(rootFolders);
    } catch (error) {
      console.error("Failed to load folders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  async function handleCreate(name: string): Promise<void> {
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: createParentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create folder");
      }

      await loadFolders();
      setShowCreateDialog(false);
      setCreateParentId(null);
    } catch (error) {
      console.error("Failed to create folder:", error);
      throw error;
    }
  }

  async function handleRename(folderId: string, newName: string) {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename folder");
      }

      await loadFolders();
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  }

  async function handleDelete(folderId: string) {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete folder");
      }

      if (selectedFolderId === folderId) {
        onSelectFolder(null);
      }

      await loadFolders();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleMove(folderId: string, _parentId: string | null) {
    setMovingFolderId(folderId);
    setShowMoveDialog(true);
  }

  async function handleMoveSubmit(newParentId: string | null) {
    if (!movingFolderId) return;
    try {
      const response = await fetch(`/api/folders/${movingFolderId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: newParentId }),
      });
      if (response.ok) {
        setShowMoveDialog(false);
        setMovingFolderId(null);
        await loadFolders();
      }
    } catch (error) {
      console.error("Failed to move folder:", error);
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
      {/* Root level actions */}
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

      {/* All Files option */}
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
          <svg
            className="h-5 w-5 text-muted-color"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </span>
        <span className="text-sm font-medium">{t("allFiles")}</span>
      </button>

      {/* Folder tree */}
      {folders.length > 0 ? (
        <div className="space-y-1">
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              onSelect={onSelectFolder}
              onRename={handleRename}
              onDelete={(folderId) => setDeleteConfirmId(folderId)}
              onMove={handleMove}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mb-2 text-muted-color">
            <svg
              className="mx-auto h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
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

      {/* Create folder dialog */}
      {showCreateDialog && (
        <CreateFolderDialog
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateDialog(false);
            setCreateParentId(null);
          }}
        />
      )}

      {/* Move folder dialog */}
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

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <ConfirmDialog
          title={t("deleteTitle", { fallback: "حذف المجلد" })}
          message={t("deleteConfirm")}
          confirmLabel="حذف"
          cancelLabel="إلغاء"
          variant="danger"
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
