"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { FolderNode } from "@/lib/build-folder-tree";

interface MoveDialogProps {
  selectedCount: number;
  onSubmit: (folderId: string | null) => void;
  onClose: () => void;
}

export function MoveDialog({ selectedCount, onSubmit, onClose }: MoveDialogProps) {
  const t = useTranslations("folders");
  const tCommon = useTranslations("common");
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch("/api/folders");
      if (!response.ok) throw new Error("Failed to load folders");
      const data = await response.json();

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

  function renderFolder(folder: FolderNode, level: number = 0) {
    const indent = level * 20;
    const hasChildren = folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-hover transition-colors ${
            isSelected ? "bg-[var(--success-bg)] text-[var(--success)]" : "text-primary-color"
          }`}
          style={{ paddingRight: `${indent + 12}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <span className="text-lg">
            <svg
              className="w-5 h-5 text-muted-color"
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
          <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
          <span className="text-xs text-very-muted bg-hover px-2 py-0.5 rounded-full">
            {folder._count.documents}
          </span>
        </div>
        {hasChildren && <div>{folder.children.map((child) => renderFolder(child, level + 1))}</div>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-primary-color mb-2">{t("moveTitle")}</h2>
          <p className="text-sm text-muted-color mb-4">
            {selectedCount > 1
              ? t("moveSelectedPlural", { count: selectedCount })
              : t("moveSelected", { count: selectedCount })}
          </p>

          {loading ? (
            <div className="space-y-2 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-hover rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto mb-4 border border-line rounded-lg">
              {/* Root option */}
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-hover transition-colors border-b border-line ${
                  selectedFolderId === null
                    ? "bg-[var(--success-bg)] text-[var(--success)]"
                    : "text-primary-color"
                }`}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="text-lg">
                  <svg
                    className="w-5 h-5 text-muted-color"
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
                <span className="text-sm font-medium">{t("root")}</span>
              </div>

              {/* Folder tree */}
              {folders.length > 0 ? (
                <div className="p-2">{folders.map((folder) => renderFolder(folder))}</div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-color">{t("noFolders")}</div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover rounded-lg"
              onClick={onClose}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] bg-[var(--success)] hover:opacity-90 rounded-lg disabled:opacity-50"
              onClick={() => onSubmit(selectedFolderId)}
            >
              {t("moveButton", { count: selectedCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
