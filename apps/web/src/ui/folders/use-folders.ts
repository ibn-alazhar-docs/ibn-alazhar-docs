"use client";

import { useState, useEffect, useCallback } from "react";
import { buildFolderTree, type FolderNode } from "@/core/folder-tree";

export function useFolders() {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch("/api/folders");
      if (!response.ok) return;
      const data = await response.json();
      setFolders(buildFolderTree(data.folders, null));
    } catch {
      // Silently ignore — folders will remain empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  async function createFolder(name: string, parentId: string | null): Promise<void> {
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create folder");
    }

    await loadFolders();
  }

  async function renameFolder(folderId: string, newName: string): Promise<void> {
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
  }

  async function deleteFolder(folderId: string): Promise<void> {
    const response = await fetch(`/api/folders/${folderId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete folder");
    }

    await loadFolders();
  }

  async function moveFolder(folderId: string, newParentId: string | null): Promise<void> {
    const response = await fetch(`/api/folders/${folderId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: newParentId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to move folder");
    }

    await loadFolders();
  }

  return {
    folders,
    loading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
  };
}
