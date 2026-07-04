"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/frontend/api-client";

// =============================================================================
// Types
// =============================================================================

export interface Document {
  id: string;
  title: string;
  content?: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  folderId?: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  documentCount?: number;
}

export interface DocumentBookmark {
  id: string;
  documentId: string;
  userId: string;
  createdAt: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const queryKeys = {
  documents: ["documents"] as const,
  document: (id: string) => ["documents", id] as const,
  tags: ["tags"] as const,
  tag: (id: string) => ["tags", id] as const,
  bookmarks: ["bookmarks"] as const,
  bookmark: (documentId: string) => ["bookmarks", documentId] as const,
  documentTags: (documentId: string) => ["documents", documentId, "tags"] as const,
  suggestions: (documentId: string) => ["documents", documentId, "suggestions"] as const,
} as const;

// =============================================================================
// Documents
// =============================================================================

export function useDocuments(params?: { folderId?: string; search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.documents, params],
    queryFn: () => apiClient.get<Document[]>("/api/documents", { params }),
    staleTime: 30_000,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: queryKeys.document(id),
    queryFn: () => apiClient.get<Document>(`/api/documents/${id}`),
    staleTime: 30_000,
  });
}

// =============================================================================
// Tags
// =============================================================================

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => apiClient.get<Tag[]>("/api/tags"),
    staleTime: 60_000,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      apiClient.post<{ tag: Tag }>("/api/tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

// =============================================================================
// Bookmarks
// =============================================================================

export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      apiClient.post<{ bookmarked: boolean }>(`/api/documents/${documentId}/bookmark`),
    onMutate: async (documentId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmark(documentId) });
      const previous = queryClient.getQueryData<{ bookmarked: boolean }>(
        queryKeys.bookmark(documentId),
      );
      queryClient.setQueryData(queryKeys.bookmark(documentId), {
        bookmarked: !previous?.bookmarked,
      });
      return { previous };
    },
    onError: (_err, documentId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.bookmark(documentId), context.previous);
      }
    },
    onSettled: (_data, _error, documentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmark(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });
}

// =============================================================================
// Document Tags
// =============================================================================

export function useAddDocumentTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, tagId }: { documentId: string; tagId: string }) =>
      apiClient.post(`/api/documents/${documentId}/tags`, { tagId }),
    onSuccess: (_data, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentTags(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) });
    },
  });
}

// =============================================================================
// Tag Suggestions
// =============================================================================

export function useSuggestTags() {
  return useMutation({
    mutationFn: (documentId: string) =>
      apiClient.post<{
        suggestions: Array<{ name: string; confidence: number; existingTagId: string | null }>;
      }>(`/api/documents/${documentId}/suggest-tags`),
  });
}

export function useApplySuggestedTags() {
  const queryClient = useQueryClient();
  const createTag = useCreateTag();

  return useMutation({
    mutationFn: async ({
      documentId,
      tags,
      existingTagIds,
    }: {
      documentId: string;
      tags: Array<{ name: string; existingTagId: string | null }>;
      existingTagIds: string[];
    }) => {
      const results = [];

      for (const tag of tags) {
        if (tag.existingTagId) {
          if (!existingTagIds.includes(tag.existingTagId)) {
            results.push(
              await apiClient.post(`/api/documents/${documentId}/tags`, {
                tagId: tag.existingTagId,
              }),
            );
          }
        } else {
          const { tag: newTag } = await createTag.mutateAsync({ name: tag.name });
          results.push(
            await apiClient.post(`/api/documents/${documentId}/tags`, { tagId: newTag.id }),
          );
        }
      }

      return results;
    },
    onSuccess: (_data, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentTags(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}
