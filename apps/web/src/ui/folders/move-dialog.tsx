"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { buildFolderTree, type FolderNode } from "@/core/folder-tree";
import { FolderIcon } from "@/ui/icons";
import { Button } from "@/ui/button";
import { Portal } from "@/ui/portal";
import { apiFetch } from "@/shared/api";

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
      const response = await apiFetch("/api/folders");
      if (!response.ok) throw new Error(t("loadError"));
      const data = await response.json();
      setFolders(buildFolderTree(data.folders || [], null));
    } catch {
      // Ignored for now
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  function renderFolder(folder: FolderNode, level = 0) {
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-hover transition-colors ${
            isSelected ? "bg-success-bg text-success" : "text-primary-color"
          }`}
          style={{ paddingInlineStart: `${level * 16 + 12}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <span className="text-muted-color">
            <FolderIcon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium truncate" dir="auto">
            {folder.name}
          </span>
        </div>
        {hasChildren && <div>{folder.children.map((child) => renderFolder(child, level + 1))}</div>}
      </div>
    );
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-[100]"
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line shadow-lg">
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
                    selectedFolderId === null ? "bg-success-bg text-success" : "text-primary-color"
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
              <Button type="button" variant="outline" onClick={onClose}>
                {tCommon("cancel")}
              </Button>
              <Button type="button" onClick={() => onSubmit(selectedFolderId)}>
                {t("moveButton", { count: selectedCount })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
