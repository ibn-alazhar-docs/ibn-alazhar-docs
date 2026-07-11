import { z } from "zod";

export const ErrorCode = z.enum([
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "BAD_REQUEST",
  "NOT_READY",
  "CONFLICT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "AUTH_ERROR",
  "INTERNAL_ERROR",
  "EXPIRED",
  "RATE_LIMITED",
  "NOT_LINKED",
]);

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string().optional(),
    details: z.array(z.any()).optional(),
  }),
});

export const StandardErrorShape = ErrorResponse;

// ─── Error Helpers ──────────────────────────────────────────────────────
export const Error400 = ErrorResponse.extend({
  error: z.object({ code: z.enum(["VALIDATION_ERROR", "BAD_REQUEST"]), message: z.string() }),
});
export const Error401 = ErrorResponse.extend({
  error: z.object({ code: z.literal("UNAUTHORIZED"), message: z.string() }),
});
export const Error403 = ErrorResponse.extend({
  error: z.object({ code: z.literal("FORBIDDEN"), message: z.string() }),
});
export const Error404 = ErrorResponse.extend({
  error: z.object({ code: z.literal("NOT_FOUND"), message: z.string() }),
});
export const Error409 = ErrorResponse.extend({
  error: z.object({ code: z.enum(["NOT_READY", "CONFLICT"]), message: z.string() }),
});
export const Error500 = ErrorResponse.extend({
  error: z.object({ code: z.literal("INTERNAL_ERROR"), message: z.string() }),
});

// ── 1. GET /api/health ────────────────────────────────────────────────
export const HealthResponse = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  uptime: z.number(),
  checks: z.object({
    database: z.object({ status: z.enum(["ok", "error"]), latencyMs: z.number().optional() }),
    memory: z.object({
      status: z.enum(["ok", "warning", "error"]),
      usedMB: z.number(),
      limit: z.number(),
    }),
    workers: z.object({ ocr: z.enum(["ok", "unknown"]), export: z.enum(["ok", "unknown"]) }),
  }),
});

// ── 2. GET /api/health/live ──────────────────────────────────────────
export const HealthLiveResponse = z.object({
  status: z.literal("healthy"),
  timestamp: z.string(),
  uptime: z.number(),
});

// ── 3. GET /api/health/ready ──────────────────────────────────────────
export const HealthReadyResponse = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  version: z.string(),
  timestamp: z.string(),
  checks: z.object({
    postgres: z.object({ status: z.string(), latencyMs: z.number() }),
    redis: z.object({ status: z.string(), latencyMs: z.number() }),
    storage: z.object({ status: z.string(), latencyMs: z.number() }),
  }),
});

// ── 4. GET /api/csrf ─────────────────────────────────────────────────
export const CsrfResponse = z.object({
  csrfToken: z.string(),
});

// ── 5. POST /api/csp-report ──────────────────────────────────────────
export const CspReportSuccess = z.object({ status: z.literal("ok") });
export const CspReportError = z.object({ status: z.literal("error") });

// ── 6. POST /api/auth/register ────────────────────────────────────────
export const RegisterSuccess = z.object({
  message: z.string(),
  userId: z.string(),
});
export const RegisterValidationError = z.object({
  error: z.object({ code: z.literal("VALIDATION_ERROR"), message: z.string() }),
});

// ── 7. GET /api/share/[token] ─────────────────────────────────────────
export const ShareDocumentResponse = z.object({
  document: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    language: z.string().nullable(),
    isRtl: z.boolean(),
    pageCount: z.number().nullable(),
    createdAt: z.string(),
  }),
  content: z.object({ markdown: z.string(), rawText: z.string() }),
  metadata: z.object({
    tags: z.array(z.object({ name: z.string(), color: z.string() })),
    folder: z.string().nullable(),
    exportFormats: z.array(z.string()),
  }),
});
export const ShareNotFoundError = z.object({
  error: z.object({ code: z.enum(["EXPIRED", "NOT_FOUND"]), message: z.string() }),
});

// ── 8. GET /api/share/[token]/export/[format] ────────────────────────
// Binary response (Uint8Array) -- schema for error only
export const ShareExportBadRequest = z.object({
  error: z.object({ code: z.literal("BAD_REQUEST"), message: z.string() }),
});

// ── 9. POST /api/auth/forgot-password ────────────────────────────────
export const ForgotPasswordSuccess = z.object({
  message: z.string(),
});

// ── 10. POST /api/auth/reset-password ────────────────────────────────
export const ResetPasswordSuccess = z.object({
  message: z.string(),
});

// ── 11. GET /api/auth/verify-email ───────────────────────────────────
// 302 redirect — no JSON schema

// ── 12. GET /api/docs/openapi ────────────────────────────────────────
// Returns any JSON object — schema is generic
export const OpenApiResponse = z.record(z.any());

// ── 13. GET /api/actuator/health ─────────────────────────────────────
export const ActuatorHealthResponse = z.object({
  status: z.enum(["UP", "DOWN"]),
  components: z.object({
    db: z.object({ status: z.enum(["UP", "DOWN"]), details: z.union([z.string(), z.undefined()]) }),
    diskSpace: z.object({
      status: z.enum(["UP", "DOWN"]),
      details: z.object({ total: z.number(), free: z.number(), threshold: z.number() }).optional(),
    }),
    memory: z.object({
      status: z.enum(["UP", "DOWN"]),
      details: z.object({ usedMB: z.number(), totalMB: z.number(), maxMB: z.number() }),
    }),
  }),
  timestamp: z.string(),
  uptime: z.number(),
});

// ── 14. GET /api/actuator/info ───────────────────────────────────────
export const ActuatorInfoResponse = z.object({
  app: z.object({ name: z.string(), version: z.string(), description: z.string() }),
  build: z.object({ version: z.string(), timestamp: z.string() }),
});

// ── 15. GET /api/actuator/metrics ────────────────────────────────────
export const ActuatorMetricsResponse = z.object({
  process: z.object({
    uptime: z.number(),
    startTime: z.string(),
    cpu: z.object({ user: z.number(), system: z.number() }),
    memory: z.object({
      rss: z.number(),
      heapTotal: z.number(),
      heapUsed: z.number(),
      external: z.number(),
      arrayBuffers: z.number(),
    }),
  }),
  timestamp: z.string(),
});

// ── 16. GET /api/actuator/prometheus — plain text ────────────────────
// ── 17. GET /api/metrics/prometheus — plain text ──────────────────────

// ── 18. GET /api/actuator/[...path] ──────────────────────────────────
export const ActuatorCatchAllResponse = z.object({
  error: z.object({ code: z.literal("NOT_FOUND"), message: z.string() }),
});

// ── 19. GET /api/documents ────────────────────────────────────────────
export const DocumentListItem = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  fileSize: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional(),
  folderId: z.string().nullable().optional(),
  userId: z.string().optional(),
  originalName: z.string().optional(),
  mimeType: z.string().optional(),
  description: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  isRtl: z.boolean().optional(),
  pageCount: z.number().nullable().optional(),
  outputFormats: z.array(z.string()).optional(),
  outputKeys: z.record(z.any()).nullable().optional(),
});
export const DocumentsListResponse = z.object({
  documents: z.array(DocumentListItem),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ── 20. GET|PATCH|DELETE /api/documents/[id] ─────────────────────────
export const DocumentDetailResponse = z.object({
  document: z.record(z.any()),
});
export const DocumentPatchResponse = z.object({
  document: z.record(z.any()),
});
export const DocumentDeleteResponse = z.object({
  success: z.literal(true),
  message: z.string(),
});

// ── 21. GET|POST /api/folders ─────────────────────────────────────────
export const FoldersListResponse = z.object({
  folders: z.array(z.record(z.any())),
});
export const FolderCreateResponse = z.object({
  folder: z.record(z.any()),
});

// ── 22. GET|PATCH|DELETE /api/folders/[id] ──────────────────────────
export const FolderDetailResponse = z.object({
  folder: z.record(z.any()),
});
export const FolderPatchResponse = z.object({
  folder: z.record(z.any()),
});
export const FolderDeleteResponse = z.object({
  message: z.string(),
});

// ── 23. GET|POST /api/tags ───────────────────────────────────────────
export const TagsListResponse = z.object({
  tags: z.array(z.record(z.any())),
});
export const TagCreateResponse = z.object({
  tag: z.record(z.any()),
});

// ── 24. GET|PATCH|DELETE /api/tags/[id] ─────────────────────────────
export const TagDetailResponse = z.object({
  tag: z.record(z.any()),
});
export const TagPatchResponse = z.object({
  tag: z.record(z.any()),
});
export const TagDeleteResponse = z.object({
  success: z.literal(true),
  message: z.string(),
});

// ── 25. POST /api/tags/merge ─────────────────────────────────────────
export const TagMergeResponse = z.object({
  success: z.literal(true),
  affectedDocuments: z.number(),
  message: z.string(),
});

// ── 26. GET /api/search ──────────────────────────────────────────────
// Returns paginated search results — generic object
export const SearchResponse = z.record(z.any());

// ── 27. GET /api/search/suggest ──────────────────────────────────────
export const SearchSuggestResponse = z.object({
  suggestions: z.array(z.record(z.any())),
});

// ── 28. GET /api/bookmarks ──────────────────────────────────────────
// Returns bookmarks list — generic object
export const BookmarksResponse = z.record(z.any());

// ── 29. PATCH|DELETE /api/profile ────────────────────────────────────
export const ProfilePatchResponse = z.object({
  user: z.record(z.any()),
});
export const ProfileDeleteResponse = z.object({
  success: z.literal(true),
});

// ── 30. GET|PATCH|DELETE /api/users ──────────────────────────────────
export const UsersListResponse = z.object({
  users: z.array(z.record(z.any())),
});
export const UserPatchResponse = z.object({
  user: z.record(z.any()),
});
export const UserDeleteResponse = z.object({
  success: z.literal(true),
});

// ── 31. GET /api/analytics ───────────────────────────────────────────
export const AnalyticsResponse = z.record(z.any());

// ── 32. GET /api/conversion/list ─────────────────────────────────────
export const ConversionListResponse = z.record(z.any());

// ── 33. POST /api/conversion/start ───────────────────────────────────
export const ConversionStartResponse = z.object({
  success: z.literal(true),
  jobId: z.string(),
  status: z.string(),
  message: z.string(),
});

// ── 34. GET /api/conversion/[id]/status ──────────────────────────────
export const ConversionStatusBase = z.object({
  jobId: z.string(),
  status: z.string(),
  progress: z.number(),
});
export const ConversionStatusCompleted = ConversionStatusBase.extend({
  status: z.literal("completed"),
  progress: z.literal(100),
  outputs: z.object({ md: z.literal(true), txt: z.literal(true), json: z.literal(true) }),
  readyForExport: z.literal(true),
});
export const ConversionStatusFailed = ConversionStatusBase.extend({
  status: z.literal("failed"),
  progress: z.literal(0),
  outputs: z.null(),
  readyForExport: z.literal(false),
});
export const ConversionStatusPending = z.object({
  jobId: z.string(),
  status: z.string(),
  progress: z.number(),
  outputs: z.null(),
  readyForExport: z.literal(false),
});
export const ConversionStatusResponse = z.union([
  ConversionStatusCompleted,
  ConversionStatusFailed,
  ConversionStatusPending,
]);

// ── 35. POST /api/documents/bulk-delete ──────────────────────────────
export const BulkDeleteResponse = z.object({
  success: z.literal(true),
  deleted: z.number(),
  message: z.string(),
});

// ── 36. POST /api/documents/bulk-export ──────────────────────────────
export const BulkExportResponse = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .and(z.record(z.any()));

// ── 37. POST /api/documents/bulk-move ────────────────────────────────
export const BulkMoveResponse = z.object({
  success: z.literal(true),
  moved: z.number(),
  folderId: z.string().nullable(),
  message: z.string(),
});

// ── 38. POST /api/documents/bulk-tag ─────────────────────────────────
export const BulkTagResponse = z.object({
  success: z.literal(true),
  taggedCount: z.number(),
  skippedCount: z.number(),
  message: z.string(),
});

// ── 39. POST /api/documents/bulk-untag ────────────────────────────────
export const BulkUntagResponse = z.object({
  success: z.literal(true),
  removedCount: z.number(),
  message: z.string(),
});

// ── 40. GET|POST /api/documents/[id]/bookmark ───────────────────────
export const BookmarkStatusResponse = z.object({
  bookmarked: z.boolean(),
});

// ── 41. PATCH /api/documents/[id]/move ───────────────────────────────
export const DocumentMoveResponse = z.object({
  success: z.literal(true),
  document: z.record(z.any()),
});

// ── 42. PATCH /api/documents/[id]/restore ────────────────────────────
export const DocumentRestoreResponse = z.object({
  success: z.literal(true),
  document: z.record(z.any()),
  message: z.string(),
});

// ── 43. GET|POST|DELETE /api/documents/[id]/share ────────────────────
export const ShareGetShared = z.object({
  shared: z.literal(true),
  shareId: z.string(),
  token: z.string(),
  url: z.string(),
  documentTitle: z.string(),
  expiresAt: z.string().nullable(),
  isExpired: z.boolean(),
  createdAt: z.string(),
});
export const ShareGetNotShared = z.object({
  shared: z.literal(false),
});
export const ShareGetResponse = z.discriminatedUnion("shared", [ShareGetShared, ShareGetNotShared]);
export const ShareCreateResponse = z.object({
  shareId: z.string(),
  token: z.string(),
  url: z.string(),
  documentTitle: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});
export const ShareDeleteResponse = z.object({
  success: z.literal(true),
});

// ── 44. POST /api/documents/[id]/share/regenerate ──────────────────────
export const ShareRegenerateResponse = z.object({
  shareId: z.string(),
  token: z.string(),
  url: z.string(),
  documentTitle: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  message: z.string(),
});

// ── 45. POST /api/documents/[id]/suggest-tags ───────────────────────
export const SuggestTagsResponse = z.object({
  suggestions: z.array(z.record(z.any())),
});

// ── 46. GET|POST|PUT /api/documents/[id]/tags ───────────────────────
export const DocumentTagsGetResponse = z.object({
  tags: z.array(z.record(z.any())),
});
export const DocumentTagsPostResponse = z.object({
  success: z.literal(true),
  tag: z.record(z.any()),
});
export const DocumentTagsPutResponse = z.object({
  success: z.literal(true),
  tagCount: z.number(),
});

// ── 47. DELETE /api/documents/[id]/tags/[tagId] ─────────────────────
export const DocumentTagRemoveResponse = z.object({
  success: z.literal(true),
  message: z.string(),
});

// ── 48. POST /api/folders/[id]/empty ─────────────────────────────────
export const FolderEmptyResponse = z.object({
  message: z.string(),
  documentsMoved: z.number(),
  foldersMoved: z.number(),
});

// ── 49. POST /api/folders/[id]/move ──────────────────────────────────
export const FolderMoveResponse = z.object({
  folder: z.record(z.any()),
});

// ── 50. POST /api/folders/[id]/restore ───────────────────────────────
export const FolderRestoreResponse = z.object({
  message: z.string(),
  folder: z.record(z.any()),
});

// ── 51. GET /api/folders/[id]/tags ───────────────────────────────────
export const FolderTagsResponse = z.object({
  tags: z.array(z.record(z.any())),
});

// ── 52. GET /api/folders/[id]/tree ───────────────────────────────────
export const FolderTreeResponse = z.record(z.any());

// ── 53. POST /api/documents/[id]/export ─────────────────────────────
export const DocumentExportResponse = z.object({
  success: z.literal(true),
  jobId: z.string(),
  message: z.string(),
});

// ── 54. GET /api/documents/[id]/export/status ──────────────────────
export const ExportStatusReady = z.object({
  status: z.literal("ready"),
  format: z.string(),
  ready: z.literal(true),
  downloadUrl: z.string(),
});
export const ExportStatusProcessing = z.object({
  status: z.literal("processing"),
  format: z.string(),
  ready: z.literal(false),
});
export const ExportStatusResponse = z.discriminatedUnion("ready", [
  ExportStatusReady,
  ExportStatusProcessing,
]);

// ── 55. POST /api/export — Binary file ───────────────────────────────
// ── 56. GET /api/export/[id]/[format] — Binary file ──────────────────
// ── 57. POST /api/export/batch — Binary ZIP ──────────────────────────
// ── 58. POST /api/export/folder — Binary ZIP ─────────────────────────
// ── 59. POST /api/export/tag — Binary ZIP ────────────────────────────
export const ExportError = z.object({
  error: z.object({
    code: z.enum(["VALIDATION_ERROR", "BAD_REQUEST", "NOT_FOUND"]),
    message: z.string(),
    details: z.array(z.any()).optional(),
  }),
});

// ── 60. GET|POST /api/webhooks ───────────────────────────────────────
export const WebhooksListResponse = z.object({
  webhooks: z.array(z.record(z.any())),
});
export const WebhookCreateResponse = z.object({
  webhook: z.record(z.any()),
});

// ── 61. GET|PATCH|DELETE /api/webhooks/[id] ─────────────────────────
export const WebhookDetailResponse = z.object({
  webhook: z.record(z.any()),
});
export const WebhookPatchResponse = z.object({
  webhook: z.record(z.any()),
});
export const WebhookDeleteResponse = z.object({
  success: z.literal(true),
  message: z.string(),
});

// ── 62. GET /api/webhooks/stats ──────────────────────────────────────
export const WebhookStatsResponse = z.object({
  stats: z.record(z.any()),
});

// ── 63. POST /api/webhooks/[id]/test ─────────────────────────────────
export const WebhookTestResponse = z.record(z.any());

// ── 64. GET /api/metrics ─────────────────────────────────────────────
export const MetricsResponse = z.object({
  timestamp: z.string(),
  uptime: z.number(),
  memory: z.object({ rss: z.number(), heapUsed: z.number(), heapTotal: z.number() }),
  database: z.object({
    users: z.number(),
    documents: z.number(),
    folders: z.number(),
    tags: z.number(),
    shareLinks: z.number(),
  }),
  workers: z.object({ ocrQueue: z.number(), exportQueue: z.number() }),
});

// ── 65. POST /api/upload ────────────────────────────────────────────
export const UploadSuccessResponse = z.object({
  success: z.literal(true),
  jobId: z.string(),
  documentId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  status: z.string(),
  message: z.string(),
});

// ── 66. GET /api/stream — SSE (text/event-stream) ───────────────────
// ── 67. GET /api/dashboard/stream — SSE (text/event-stream) ─────────

// ── 68. GET|POST /api/auth/[...nextauth] — NextAuth (delegated) ────
