"use client";

import { useState, useEffect, useCallback } from "react";
import type { Doc } from "@/ui/files/document-table";
import { apiFetch } from "@/shared/api";
import { logger } from "@/shared/logger";

interface ActiveJob {
  jobId: string;
  fileName: string;
  createdAt?: string; // PERFORMANCE FIX: Track job start time for adaptive polling
}

interface Breadcrumb {
  id: string;
  name: string;
}

export interface UseFilesManagerReturn {
  activeJobs: ActiveJob[];
  completedIds: string[];
  documents: Doc[];
  loadingDocs: boolean;
  selectedFolderId: string | null;
  breadcrumbs: Breadcrumb[];
  selectedDocs: Set<string>;
  showMoveDialog: boolean;
  moveCount: number;
  editingDocId: string | null;
  editTitle: string;
  deletingDocId: string | null;
  selectedTagIds: string[];
  showBulkTagPicker: boolean;
  allSelected: boolean;
  handleUploadStart: (jobId: string, fileName: string) => void;
  handleMarkComplete: (jobId: string) => void;
  handleFolderSelect: (folderId: string | null) => void;
  toggleDocSelection: (docId: string) => void;
  toggleSelectAll: () => void;
  handleBulkMove: () => void;
  handleMoveSubmit: (folderId: string | null) => Promise<void>;
  handleBulkTag: (tagId: string) => Promise<void>;
  confirmDelete: (docId: string) => Promise<void>;
  startEditTitle: (doc: Doc) => void;
  saveEditTitle: (docId: string) => Promise<void>;
  cancelEdit: () => void;
  cancelDelete: () => void;
  cancelSelection: () => void;
  setShowMoveDialog: (open: boolean) => void;
  setSelectedTagIds: (ids: string[]) => void;
  setShowBulkTagPicker: (open: boolean) => void;
  setEditTitle: (value: string) => void;
  setDeletingDocId: (docId: string | null) => void;
  handleBulkExport: () => Promise<void>;
  isDeleting: boolean;
}

export function useFilesManager(): UseFilesManagerReturn {
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
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = useCallback(
    async (folderId: string | null) => {
      setLoadingDocs(true);
      try {
        const params = new URLSearchParams({ limit: "50", sort: "createdAt", order: "desc" });
        if (folderId !== null) {
          params.set("folderId", folderId);
        }
        if (selectedTagIds.length > 0) {
          selectedTagIds.forEach((id) => params.append("tagId", id));
        }
        const res = await fetch(`/api/documents?${params}`, {
          cache: "no-store",
          credentials: "include",
        });

        // Handle 401: clear active jobs and stop polling to prevent glitch loop
        if (res.status === 401) {
          setActiveJobs([]);
          setLoadingDocs(false);
          logger.error("Unauthorized: session expired. Cleared active jobs.");
          // Optionally redirect to login after a delay
          setTimeout(() => {
            window.location.href = "/ar/login";
          }, 2000);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents);

          // Restore active jobs that are still processing on the backend
          const processingStatuses = [
            "UPLOADED",
            "VALIDATING",
            "SPLITTING",
            "OCR_PROCESSING",
            "CLEANING",
            "GENERATING",
          ];
          const serverActiveJobs = data.documents
            .filter((d: { status: string }) => processingStatuses.includes(d.status))
            .map(
              (d: {
                id: string;
                status: string;
                originalName?: string;
                fileName?: string;
                title?: string;
                createdAt?: string;
              }) => ({
                jobId: d.id,
                fileName: d.originalName || d.fileName || d.title,
                createdAt: d.createdAt || new Date().toISOString(), // PERFORMANCE FIX: Track creation time
              }),
            );

          setActiveJobs((prev) => {
            const currentIds = new Set(prev.map((j) => j.jobId));
            const newJobs = serverActiveJobs.filter(
              (j: { jobId: string }) => !currentIds.has(j.jobId),
            );
            if (newJobs.length === 0) return prev;
            return [...newJobs, ...prev];
          });
        }
      } catch {
        logger.error("Failed to load documents");
      } finally {
        setLoadingDocs(false);
      }
    },
    [selectedTagIds],
  );

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
      logger.error("Failed to load breadcrumbs");
    }
  }, []);

  useEffect(() => {
    loadDocuments(selectedFolderId);
    loadBreadcrumbs(selectedFolderId);
    setSelectedDocs(new Set());
  }, [selectedFolderId, selectedTagIds, loadDocuments, loadBreadcrumbs]);

  // PERFORMANCE FIX: Poll only when needed, with smarter interval
  useEffect(() => {
    if (activeJobs.length === 0) return;

    // Adaptive polling: faster for first minute, then slower
    const getInterval = () => {
      if (activeJobs.length === 0) return 10000;

      const oldestJob = activeJobs[0];
      if (!oldestJob || !oldestJob.createdAt) return 5000; // Fallback if no timestamp

      const jobAge = Date.now() - new Date(oldestJob.createdAt).getTime();

      // First 2 minutes: poll every 3 seconds (faster feedback)
      if (jobAge < 120000) return 3000;
      // Next 3 minutes: poll every 6 seconds
      if (jobAge < 300000) return 6000;
      // After 5 minutes: poll every 10 seconds (likely stuck)
      return 10000;
    };

    const interval = setInterval(() => {
      loadDocuments(selectedFolderId);
    }, getInterval());

    return () => clearInterval(interval);
  }, [activeJobs.length, selectedFolderId, loadDocuments]);

  function handleUploadStart(jobId: string, fileName: string) {
    setActiveJobs((prev) => [{ jobId, fileName, createdAt: new Date().toISOString() }, ...prev]); // PERFORMANCE FIX: Track start time
    loadDocuments(selectedFolderId);
  }

  function handleMarkComplete(jobId: string) {
    setCompletedIds((prev) => [...prev, jobId]);
    loadDocuments(selectedFolderId);
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
      const res = await apiFetch("/api/documents/bulk-move", {
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
      logger.error("Failed to move documents");
    }
  }

  async function handleBulkTag(tagId: string) {
    try {
      const res = await apiFetch("/api/documents/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs), tagId }),
      });
      if (res.ok) {
        setShowBulkTagPicker(false);
        loadDocuments(selectedFolderId);
      }
    } catch {
      logger.error("Failed to tag documents");
    }
  }

  async function confirmDelete(docId: string) {
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedDocs((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
        // Optimistic update
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } else {
        const body = await res.json().catch(() => null);
        logger.error({ status: res.status, body }, "Delete failed");
      }
    } catch (err) {
      logger.error({ err }, "Failed to delete document");
    } finally {
      setIsDeleting(false);
      setDeletingDocId(null);
    }
  }

  function startEditTitle(doc: Doc) {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
  }

  async function saveEditTitle(docId: string) {
    if (!editTitle.trim()) return;
    const newTitle = editTitle.trim();
    const previousDocs = [...documents];

    // Optimistic update
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, title: newTitle } : d)));

    setEditingDocId(null);
    setEditTitle("");

    try {
      const res = await apiFetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        logger.error("Failed to update title: response not ok");
        setDocuments(previousDocs); // Revert
      }
    } catch {
      logger.error("Failed to update title");
      setDocuments(previousDocs); // Revert
    }
  }

  function cancelEdit() {
    setEditingDocId(null);
    setEditTitle("");
  }

  function cancelDelete() {
    setDeletingDocId(null);
  }

  function cancelSelection() {
    setSelectedDocs(new Set());
  }

  async function handleBulkExport() {
    const ids = Array.from(selectedDocs);
    try {
      const res = await apiFetch("/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ids, format: "zip", profile: "archive" }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${ids.length}_docs.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("تعذر التصدير");
    }
  }

  const allSelected = documents.length > 0 && selectedDocs.size === documents.length;

  return {
    activeJobs,
    completedIds,
    documents,
    loadingDocs,
    selectedFolderId,
    breadcrumbs,
    selectedDocs,
    showMoveDialog,
    moveCount,
    editingDocId,
    editTitle,
    deletingDocId,
    selectedTagIds,
    showBulkTagPicker,
    allSelected,
    handleUploadStart,
    handleMarkComplete,
    handleFolderSelect,
    toggleDocSelection,
    toggleSelectAll,
    handleBulkMove,
    handleMoveSubmit,
    handleBulkTag,
    confirmDelete,
    startEditTitle,
    saveEditTitle,
    cancelEdit,
    cancelDelete,
    cancelSelection,
    isDeleting,
    setShowMoveDialog,
    setSelectedTagIds,
    setShowBulkTagPicker,
    setEditTitle,
    setDeletingDocId,
    handleBulkExport,
  };
}
