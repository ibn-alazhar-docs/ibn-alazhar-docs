// ── Site ──────────────────────────────────────────────────────────────────────
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ibnalazhar-docs.vercel.app";

// ── Error codes ───────────────────────────────────────────────────────────────
export const ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMITED: "RATE_LIMITED",
  BAD_REQUEST: "BAD_REQUEST",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  // Domain-specific
  FOLDER_NOT_FOUND: "FOLDER_NOT_FOUND",
  TAG_NOT_FOUND: "TAG_NOT_FOUND",
  TARGET_NOT_FOUND: "TARGET_NOT_FOUND",
  NO_SHARE_LINK: "NO_SHARE_LINK",
  SOME_NOT_FOUND: "SOME_NOT_FOUND",
  SOME_TAGS_NOT_FOUND: "SOME_TAGS_NOT_FOUND",
  TAG_NOT_ASSIGNED: "TAG_NOT_ASSIGNED",
  PARENT_DELETED: "PARENT_DELETED",
  CIRCULAR_REFERENCE: "CIRCULAR_REFERENCE",
  MAX_DEPTH_REACHED: "MAX_DEPTH_REACHED",
  NOT_READY: "NOT_READY",
  AUTH_ERROR: "AUTH_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ── Limits ────────────────────────────────────────────────────────────────────
export const LIMITS = {
  MAX_PAGE_LIMIT: 100,
  DEFAULT_PAGE_LIMIT: 50,
  MAX_MERGE_DOCS: 10_000,
  MAX_SSE_CONNECTIONS_PER_USER: 3,
  MAX_SSE_POLL_COUNT: 300,
  SSE_TIMEOUT_MS: 10 * 60 * 1000,
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  SESSION_MAX_AGE: 24 * 60 * 60,
  MIN_SEARCH_QUERY_LENGTH: 2,
  SEARCH_DEFAULT_PAGE_LIMIT: 20,
  SEARCH_MAX_PAGE_LIMIT: 50,
  SEARCH_EXCERPT_MAX_LENGTH: 200,
  SEARCH_EXCERPT_CONTEXT_BEFORE: 50,
  SEARCH_EXCERPT_CONTEXT_AFTER: 150,
} as const;

// ── Brand ─────────────────────────────────────────────────────────────────────
export const DEFAULT_TAG_COLOR = "#16A34A";
