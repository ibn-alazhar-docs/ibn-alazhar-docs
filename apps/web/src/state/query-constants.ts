/** Shared React Query keys and polling intervals for state hooks. */

/** Stable query key factories for React Query cache management. */
export const queryKeys = {
  documents: ["documents"],
  bookmark: (documentId: string) => ["bookmarks", documentId],
  documentTags: (documentId: string) => ["documents", documentId, "tags"],
  tags: ["tags"],
};

export const ACTIVE_JOBS_STORAGE_KEY = "ibn-al-azhar-docs:active-jobs";
export const MAX_STORED_JOBS = 10;

export const DOCUMENTS_PAGE_LIMIT = "50";

export const ACTIVE_JOBS_POLL_EMPTY_MS = 10000;
export const ACTIVE_JOBS_POLL_FALLBACK_MS = 5000;
export const ACTIVE_JOBS_POLL_FAST_MS = 3000;
export const ACTIVE_JOBS_POLL_MEDIUM_MS = 6000;
export const ACTIVE_JOBS_POLL_SLOW_MS = 10000;
export const ACTIVE_JOBS_FAST_WINDOW_MS = 120000;
export const ACTIVE_JOBS_MEDIUM_WINDOW_MS = 300000;
