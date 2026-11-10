import { describe, expect, it } from "vitest";
import {
  ACTIVE_JOBS_FAST_WINDOW_MS,
  ACTIVE_JOBS_MEDIUM_WINDOW_MS,
  ACTIVE_JOBS_POLL_EMPTY_MS,
  ACTIVE_JOBS_POLL_FALLBACK_MS,
  ACTIVE_JOBS_POLL_FAST_MS,
  ACTIVE_JOBS_POLL_MEDIUM_MS,
  ACTIVE_JOBS_POLL_SLOW_MS,
  ACTIVE_JOBS_STORAGE_KEY,
  DOCUMENTS_PAGE_LIMIT,
  MAX_STORED_JOBS,
  queryKeys,
} from "@/state/query-constants";

describe("query-constants", () => {
  it("keeps React Query key shapes identical", () => {
    expect(queryKeys.documents).toEqual(["documents"]);
    expect(queryKeys.tags).toEqual(["tags"]);
    expect(queryKeys.bookmark("doc-1")).toEqual(["bookmarks", "doc-1"]);
    expect(queryKeys.documentTags("doc-1")).toEqual(["documents", "doc-1", "tags"]);
  });

  it("keeps polling intervals and storage constants identical", () => {
    expect(ACTIVE_JOBS_STORAGE_KEY).toBe("ibn-al-azhar-docs:active-jobs");
    expect(MAX_STORED_JOBS).toBe(10);
    expect(DOCUMENTS_PAGE_LIMIT).toBe("50");
    expect(ACTIVE_JOBS_POLL_EMPTY_MS).toBe(10000);
    expect(ACTIVE_JOBS_POLL_FALLBACK_MS).toBe(5000);
    expect(ACTIVE_JOBS_POLL_FAST_MS).toBe(3000);
    expect(ACTIVE_JOBS_POLL_MEDIUM_MS).toBe(6000);
    expect(ACTIVE_JOBS_POLL_SLOW_MS).toBe(10000);
    expect(ACTIVE_JOBS_FAST_WINDOW_MS).toBe(120000);
    expect(ACTIVE_JOBS_MEDIUM_WINDOW_MS).toBe(300000);
  });
});
