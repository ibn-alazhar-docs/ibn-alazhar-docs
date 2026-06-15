"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FolderItem } from "./folder-item";
import { CreateFolderDialog } from "./create-folder-dialog";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  children: FolderNode[];
  _count: { documents: number; children: number };
}

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

  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch("/api/folders");
      if (!response.ok) throw new Error("Failed to load folders");
      const data = await response.json();

      // Build tree from flat list
      interface FlatFolder {
        id: string;
        name: string;
        parentId: string | null;
        color: string | null;
        icon: string | null;
        order: number;
        _count: { documents: number; children: number };
      }

      const allFolders: (FlatFolder & { children: FolderNode[] })[] = data.folders.map(
        (f: FlatFolder) => ({
          ...f,
          children: [] as FolderNode[],
        }),
      );
      const folderMap = new Map(allFolders.map((f) => [f.id, f]));
      const rootFolders: FolderNode[] = [];

      for (const folder of allFolders) {
        if (folder.parentId && folderMap.has(folder.parentId)) {
          const parent = folderMap.get(folder.parentId);
          if (parent) {
            parent.children.push(folder);
          }
        } else if (!folder.parentId) {
          rootFolders.push(folder);
        }
      }

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

  async function handleCreate(name: string) {
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
    if (!confirm(t("deleteConfirm"))) return;

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
    }
  }

  async function handleMove(_folderId: string, _parentId: string | null) {
    // TODO: Show move dialog in Phase 2B-2
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-hover rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Root level actions */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-color">{t("title")}</h3>
        <button
          type="button"
          className="text-sm text-[var(--success)] hover:text-[var(--success)] font-medium"
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
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start transition-colors ${
          selectedFolderId === null
            ? "bg-[var(--success-bg)] text-[var(--success)]"
            : "hover:bg-hover text-primary-color"
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <span className="text-lg">
          <svg className="w-5 h-5 text-muted-color" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
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
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </div>
      ) : (
          <div className="text-center py-8">
          <div className="mb-2 text-muted-color">
            <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <p className="text-sm text-muted-color">{t("empty")}</p>
          <button
            type="button"
            className="mt-2 text-sm text-[var(--success)] hover:text-[var(--success)] font-medium"
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
    </div>
  );
}
