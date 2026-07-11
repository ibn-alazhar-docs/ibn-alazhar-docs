// ── Site ──────────────────────────────────────────────────────────────────────
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ibnalazhar-docs.vercel.app";

// ── Re-export from shared ─────────────────────────────────────────────────────
export { ERROR_CODES, FAILURE_CATEGORIES } from "@ibn-al-azhar-docs/shared";
export type {
  ErrorCode,
  FailureCategory,
  DocStatus,
  ExportFormat,
} from "@ibn-al-azhar-docs/shared";
export { STATUS_LABELS, DOC_STATUS_MAP } from "@ibn-al-azhar-docs/shared";

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

// ── UI timing ──────────────────────────────────────────────────────────────────
export const UI_TIMING = {
  TOAST_RESET_MS: 2000,
  POLL_INTERVAL_MS: 5000,
  SSE_CLOSE_DELAY_MS: 500,
  MAX_CONSECUTIVE_COMPLETE_CHECKS: 2,
} as const;

// ── Durations ──────────────────────────────────────────────────────────────────
export const DURATIONS = {
  SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
  ONE_DAY_MS: 86400 * 1000,
} as const;

// ── Limits (content) ──────────────────────────────────────────────────────────
export const CONTENT_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_FOLDER_NAME_LENGTH: 100,
  MAX_FOLDER_DEPTH: 5,
  MAX_TAG_NAME_LENGTH: 50,
  MAX_TAG_COLOR_LENGTH: 7,
} as const;

// ── Search suggestion limits ───────────────────────────────────────────────────
export const SUGGESTION_LIMITS = {
  MAX_TITLE_SUGGESTIONS: 5,
  MAX_FOLDER_SUGGESTIONS: 3,
  MAX_TAG_SUGGESTIONS: 3,
} as const;

// ── Pagination ─────────────────────────────────────────────────────────────────
export const PAGINATION = {
  CONVERSION_PAGE_SIZE: 20,
} as const;

// ── Brand ─────────────────────────────────────────────────────────────────────
export const DEFAULT_TAG_COLOR = "#16A34A";
