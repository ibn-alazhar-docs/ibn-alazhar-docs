"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/frontend/api-client";

/** Stable query key factories for React Query cache management. */
const queryKeys = {
  documents: ["documents"],
  bookmark: (documentId: string) => ["bookmarks", documentId],
  documentTags: (documentId: string) => ["documents", documentId, "tags"],
  tags: ["tags"],
};

/**
 * Optimistic toggle for document bookmarks.
 * Patches the cache immediately, rolls back on error, and invalidates on settle.
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      apiClient.post<{ bookmarked: boolean }>(`/api/documents/${documentId}/bookmark`),
    onMutate: async (documentId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmark(documentId) });
      const previous = queryClient.getQueryData<{ bookmarked: boolean }>(
        queryKeys.bookmark(documentId),
      );
      queryClient.setQueryData(queryKeys.bookmark(documentId), {
        bookmarked: !previous?.bookmarked,
      });
      return { previous };
    },
    onError: (_err: Error, documentId: string, context: { previous?: { bookmarked: boolean } }) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.bookmark(documentId), context.previous);
      }
    },
    onSettled: (_data: unknown, _error: Error | null, documentId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmark(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });
}
