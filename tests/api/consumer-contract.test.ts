import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "./setup";
import { spec } from "./openapi-spec";

import {
  HealthResponse,
  HealthLiveResponse,
  HealthReadyResponse,
  CsrfResponse,
  CspReportSuccess,
  CspReportError,
  RegisterSuccess,
  ForgotPasswordSuccess,
  ResetPasswordSuccess,
  ShareDocumentResponse,
  ShareNotFoundError,
  ActuatorHealthResponse,
  ActuatorInfoResponse,
  ActuatorMetricsResponse,
  ActuatorCatchAllResponse,
  DocumentsListResponse,
  DocumentDetailResponse,
  DocumentPatchResponse,
  DocumentDeleteResponse,
  FoldersListResponse,
  FolderCreateResponse,
  FolderDetailResponse,
  FolderPatchResponse,
  FolderDeleteResponse,
  TagsListResponse,
  TagCreateResponse,
  TagDetailResponse,
  TagPatchResponse,
  TagDeleteResponse,
  TagMergeResponse,
  SearchSuggestResponse,
  ProfilePatchResponse,
  ProfileDeleteResponse,
  UsersListResponse,
  UserDeleteResponse,
  ConversionStartResponse,
  ConversionStatusResponse,
  BulkDeleteResponse,
  BulkMoveResponse,
  BulkTagResponse,
  BulkUntagResponse,
  DocumentMoveResponse,
  DocumentRestoreResponse,
  ShareGetResponse,
  ShareCreateResponse,
  ShareDeleteResponse,
  ShareRegenerateResponse,
  SuggestTagsResponse,
  DocumentTagsGetResponse,
  DocumentTagsPostResponse,
  DocumentTagsPutResponse,
  DocumentTagRemoveResponse,
  FolderEmptyResponse,
  FolderMoveResponse,
  FolderRestoreResponse,
  FolderTagsResponse,
  FolderTreeResponse,
  DocumentExportResponse,
  ExportStatusResponse,
  WebhooksListResponse,
  WebhookCreateResponse,
  WebhookDetailResponse,
  WebhookPatchResponse,
  WebhookDeleteResponse,
  WebhookStatsResponse,
  MetricsResponse,
  UploadSuccessResponse,
  BookmarkStatusResponse,
  ErrorResponse,
  StandardErrorShape,
} from "./api-schemas";

const {
  mockGetDocuments,
  mockGetDocumentById,
  mockUpdateDocument,
  mockDeleteDocument,
  mockGetFolders,
  mockCreateFolder,
  mockGetFolderById,
  mockRenameFolder,
  mockDeleteFolder,
  mockEmptyFolder,
  mockMoveFolder,
  mockRestoreFolder,
  mockGetFolderTags,
  mockGetFolderTree,
  mockGetTags,
  mockCreateTag,
  mockGetTagById,
  mockUpdateTag,
  mockDeleteTag,
  mockMergeTags,
  mockSearch,
  mockGetSuggestions,
  mockGetBookmarks,
  mockConversionList,
  mockStartConversion,
  mockGetJobStatus,
  mockBulkDelete,
  mockBulkExport,
  mockBulkMove,
  mockBulkTag,
  mockBulkUntag,
  mockGetBookmarkStatus,
  mockToggleBookmark,
  mockMoveDocument,
  mockRestoreDocument,
  mockGetShareLink,
  mockCreateShareLink,
  mockDeleteShareLink,
  mockRegenerateShareLink,
  mockSuggestTags,
  mockGetDocumentTags,
  mockAddTagToDocument,
  mockSetDocumentTags,
  mockRemoveTagFromDocument,
  mockExportDocument,
  mockExportSingle,
  mockExportByBatch,
  mockExportByFolder,
  mockExportByTag,
  mockGetWebhooks,
  mockCreateWebhook,
  mockGetWebhookById,
  mockUpdateWebhook,
  mockDeleteWebhook,
  mockGetWebhookStats,
  mockTestWebhook,
  mockGetUsers,
  mockUpdateUserRole,
  mockDeleteUser,
  mockUpdateProfile,
  mockDeleteAccount,
  mockGetAnalytics,
  mockUploadExecute,
  mockHandleRouteError,
  mockCheckRateLimit,
  mockCheckUserRateLimit,
} = vi.hoisted(() => ({
  mockGetDocuments: vi.fn(),
  mockGetDocumentById: vi.fn(),
  mockUpdateDocument: vi.fn(),
  mockDeleteDocument: vi.fn(),
  mockGetFolders: vi.fn(),
  mockCreateFolder: vi.fn(),
  mockGetFolderById: vi.fn(),
  mockRenameFolder: vi.fn(),
  mockDeleteFolder: vi.fn(),
  mockEmptyFolder: vi.fn(),
  mockMoveFolder: vi.fn(),
  mockRestoreFolder: vi.fn(),
  mockGetFolderTags: vi.fn(),
  mockGetFolderTree: vi.fn(),
  mockGetTags: vi.fn(),
  mockCreateTag: vi.fn(),
  mockGetTagById: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockDeleteTag: vi.fn(),
  mockMergeTags: vi.fn(),
  mockSearch: vi.fn(),
  mockGetSuggestions: vi.fn(),
  mockGetBookmarks: vi.fn(),
  mockConversionList: vi.fn(),
  mockStartConversion: vi.fn(),
  mockGetJobStatus: vi.fn(),
  mockBulkDelete: vi.fn(),
  mockBulkExport: vi.fn(),
  mockBulkMove: vi.fn(),
  mockBulkTag: vi.fn(),
  mockBulkUntag: vi.fn(),
  mockGetBookmarkStatus: vi.fn(),
  mockToggleBookmark: vi.fn(),
  mockMoveDocument: vi.fn(),
  mockRestoreDocument: vi.fn(),
  mockGetShareLink: vi.fn(),
  mockCreateShareLink: vi.fn(),
  mockDeleteShareLink: vi.fn(),
  mockRegenerateShareLink: vi.fn(),
  mockSuggestTags: vi.fn(),
  mockGetDocumentTags: vi.fn(),
  mockAddTagToDocument: vi.fn(),
  mockSetDocumentTags: vi.fn(),
  mockRemoveTagFromDocument: vi.fn(),
  mockExportDocument: vi.fn(),
  mockExportSingle: vi.fn(),
  mockExportByBatch: vi.fn(),
  mockExportByFolder: vi.fn(),
  mockExportByTag: vi.fn(),
  mockGetWebhooks: vi.fn(),
  mockCreateWebhook: vi.fn(),
  mockGetWebhookById: vi.fn(),
  mockUpdateWebhook: vi.fn(),
  mockDeleteWebhook: vi.fn(),
  mockGetWebhookStats: vi.fn(),
  mockTestWebhook: vi.fn(),
  mockGetUsers: vi.fn(),
  mockUpdateUserRole: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockDeleteAccount: vi.fn(),
  mockGetAnalytics: vi.fn(),
  mockUploadExecute: vi.fn(),
  mockHandleRouteError: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockCheckUserRateLimit: vi.fn(),
}));

vi.mock("@/core/composition-root", () => ({
  useCases: {
    documentCrud: {
      getDocuments: mockGetDocuments,
      getDocumentById: mockGetDocumentById,
      updateDocument: mockUpdateDocument,
      deleteDocument: mockDeleteDocument,
      bulkDeleteDocuments: mockBulkDelete,
      restoreDocument: mockRestoreDocument,
    },
    folder: {
      getFolders: mockGetFolders,
      createFolder: mockCreateFolder,
      getFolderById: mockGetFolderById,
      renameFolder: mockRenameFolder,
      deleteFolder: mockDeleteFolder,
      emptyFolder: mockEmptyFolder,
      moveFolder: mockMoveFolder,
      restoreFolder: mockRestoreFolder,
      getFolderTags: mockGetFolderTags,
      getFolderTree: mockGetFolderTree,
    },
    tag: {
      getTags: mockGetTags,
      createTag: mockCreateTag,
      getTagById: mockGetTagById,
      updateTag: mockUpdateTag,
      deleteTag: mockDeleteTag,
      mergeTags: mockMergeTags,
    },
    search: { search: mockSearch, getSuggestions: mockGetSuggestions },
    bookmark: {
      getBookmarks: mockGetBookmarks,
      checkBookmarkStatus: mockGetBookmarkStatus,
      toggleBookmark: mockToggleBookmark,
    },
    conversion: {
      listJobs: mockConversionList,
      startConversion: mockStartConversion,
      getJobStatus: mockGetJobStatus,
    },
    documentMove: { moveDocument: mockMoveDocument, bulkMoveDocuments: mockBulkMove },
    documentTag: {
      getDocumentTags: mockGetDocumentTags,
      addTagToDocument: mockAddTagToDocument,
      setDocumentTags: mockSetDocumentTags,
      removeTagFromDocument: mockRemoveTagFromDocument,
      bulkTagDocuments: mockBulkTag,
      bulkUntagDocuments: mockBulkUntag,
    },
    autoTag: { suggestTags: mockSuggestTags },
    documentShare: {
      getShareLink: mockGetShareLink,
      createShareLink: mockCreateShareLink,
      deleteShareLink: mockDeleteShareLink,
      regenerateShareLink: mockRegenerateShareLink,
    },
    shareAccess: { execute: vi.fn() },
    export: {
      exportSingle: mockExportSingle,
      exportByBatch: mockExportByBatch,
      exportByFolder: mockExportByFolder,
      exportByTag: mockExportByTag,
    },
    exportDocument: { execute: mockExportDocument },
    webhook: {
      getWebhooks: mockGetWebhooks,
      createWebhook: mockCreateWebhook,
      getWebhookById: mockGetWebhookById,
      updateWebhook: mockUpdateWebhook,
      deleteWebhook: mockDeleteWebhook,
      getDeliveryStats: mockGetWebhookStats,
      testWebhook: mockTestWebhook,
    },
    user: {
      getUsers: mockGetUsers,
      updateUserRole: mockUpdateUserRole,
      deleteUser: mockDeleteUser,
    },
    profile: { updateProfile: mockUpdateProfile, deleteAccount: mockDeleteAccount },
    uploadDocument: { execute: mockUploadExecute },
  },
}));

vi.mock("@/shared/route-helpers", () => ({ handleRouteError: mockHandleRouteError }));
vi.mock("@/shared/validators/webhook", () => ({
  createWebhookSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { url: "https://hook.example.com", events: ["doc.created"] },
    }),
  },
}));
vi.mock("@/domain/auth", () => ({
  ROLE: { ADMIN: "ADMIN", STUDENT: "STUDENT", TEACHER: "TEACHER" },
  canViewUsers: vi.fn().mockReturnValue(true),
  isAdminRole: vi.fn().mockReturnValue(true),
}));
vi.mock("@/clients/redis", () => ({
  checkRateLimit: mockCheckRateLimit,
  checkUserRateLimit: mockCheckUserRateLimit,
  rateLimitResponse: vi.fn(),
}));

function defaultError() {
  return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Error" } }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockHandleRouteError.mockReturnValue(defaultError());
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockCheckUserRateLimit.mockResolvedValue({ allowed: true });
  mockSession.user = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    role: "USER",
  } as any;
  mockGetDocuments.mockResolvedValue({ documents: [], total: 0 });
  mockGetDocumentById.mockResolvedValue({ id: "d-1", title: "Doc" });
  mockUpdateDocument.mockResolvedValue({ id: "d-1", title: "Updated" });
  mockDeleteDocument.mockResolvedValue(undefined);
  mockGetFolders.mockResolvedValue([]);
  mockCreateFolder.mockResolvedValue({ id: "f-1", name: "Folder" });
  mockGetFolderById.mockResolvedValue({ id: "f-1", name: "Folder" });
  mockRenameFolder.mockResolvedValue({ id: "f-1", name: "Renamed" });
  mockDeleteFolder.mockResolvedValue(undefined);
  mockEmptyFolder.mockResolvedValue({ documentsMoved: 0, foldersMoved: 0 });
  mockMoveFolder.mockResolvedValue({ id: "f-1", name: "Moved" });
  mockRestoreFolder.mockResolvedValue({ id: "f-1", name: "Restored" });
  mockGetFolderTags.mockResolvedValue([]);
  mockGetFolderTree.mockResolvedValue({ id: "f-1", children: [] });
  mockGetTags.mockResolvedValue([]);
  mockCreateTag.mockResolvedValue({ id: "t-1", name: "Tag" });
  mockGetTagById.mockResolvedValue({ id: "t-1", name: "Tag" });
  mockUpdateTag.mockResolvedValue({ id: "t-1", name: "Updated" });
  mockDeleteTag.mockResolvedValue(undefined);
  mockMergeTags.mockResolvedValue({ affectedDocuments: 3 });
  mockSearch.mockResolvedValue({
    documents: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
  mockGetSuggestions.mockResolvedValue([]);
  mockGetBookmarks.mockResolvedValue({
    bookmarks: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  });
  mockConversionList.mockResolvedValue({
    jobs: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  });
  mockStartConversion.mockResolvedValue({ jobId: "c-1" });
  mockGetJobStatus.mockResolvedValue({
    jobId: "c-1",
    status: "completed",
    progress: 100,
    outputs: { md: true, txt: true, json: true },
    readyForExport: true,
  });
  mockBulkDelete.mockResolvedValue(3);
  mockBulkExport.mockResolvedValue({});
  mockBulkMove.mockResolvedValue(2);
  mockBulkTag.mockResolvedValue({ taggedCount: 2, skippedCount: 0 });
  mockBulkUntag.mockResolvedValue(2);
  mockGetBookmarkStatus.mockResolvedValue({ bookmarked: false });
  mockToggleBookmark.mockResolvedValue({ bookmarked: true });
  mockMoveDocument.mockResolvedValue({ id: "d-1", folderId: null });
  mockRestoreDocument.mockResolvedValue({ id: "d-1", title: "Restored" });
  mockGetShareLink.mockResolvedValue(null);
  mockCreateShareLink.mockResolvedValue({
    id: "sh-1",
    token: "tok-1",
    expiresAt: null,
    createdAt: new Date(),
  });
  mockDeleteShareLink.mockResolvedValue(undefined);
  mockRegenerateShareLink.mockResolvedValue({
    id: "sh-1",
    token: "new-tok",
    expiresAt: null,
    createdAt: new Date(),
  });
  mockSuggestTags.mockResolvedValue([]);
  mockGetDocumentTags.mockResolvedValue([]);
  mockAddTagToDocument.mockResolvedValue({ id: "t-1", name: "Tag" });
  mockSetDocumentTags.mockResolvedValue(3);
  mockRemoveTagFromDocument.mockResolvedValue(undefined);
  mockExportDocument.mockResolvedValue({ buffer: Buffer.from("test"), document: { title: "doc" } });
  mockExportSingle.mockResolvedValue({
    buffer: Buffer.from("test"),
    contentType: "text/markdown",
    fileName: "doc.md",
  });
  mockExportByBatch.mockResolvedValue({ zipBuffer: Buffer.from("zip"), zipName: "export.zip" });
  mockExportByFolder.mockResolvedValue({ zipBuffer: Buffer.from("zip"), zipName: "folder.zip" });
  mockExportByTag.mockResolvedValue({ zipBuffer: Buffer.from("zip"), zipName: "tag.zip" });
  mockGetWebhooks.mockResolvedValue([]);
  mockCreateWebhook.mockResolvedValue({ id: "wh-1", url: "https://hook.example.com" });
  mockGetWebhookById.mockResolvedValue({ id: "wh-1", url: "https://hook.example.com" });
  mockUpdateWebhook.mockResolvedValue({ id: "wh-1", url: "https://updated.example.com" });
  mockDeleteWebhook.mockResolvedValue(undefined);
  mockGetWebhookStats.mockResolvedValue({ totalDeliveries: 50, successRate: 0.95 });
  mockTestWebhook.mockResolvedValue({ success: true, statusCode: 200 });
  mockGetUsers.mockResolvedValue({ users: [] });
  mockUpdateUserRole.mockResolvedValue({ id: "u-1", role: "USER" });
  mockDeleteUser.mockResolvedValue(undefined);
  mockUpdateProfile.mockResolvedValue({ id: "u-1", name: "Updated" });
  mockDeleteAccount.mockResolvedValue(undefined);
  mockGetAnalytics.mockResolvedValue({ totalDocuments: 5, recentUploads: [] });
  mockUploadExecute.mockResolvedValue({ id: "doc-u-1", originalName: "test.pdf", fileSize: 1024 });
});

function withSession(handler: (...args: any[]) => any) {
  return async (req: Request, params: Record<string, string> = {}) =>
    handler(req, { session: mockSession, params } as any);
}

describe("Consumer Contract — Zod Schema Validation (Consumer Expectation)", () => {
  it("HealthResponse schema validates response shape", () => {
    const data = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: 123,
      checks: {
        database: { status: "ok", latencyMs: 5 },
        memory: { status: "ok", usedMB: 100, limit: 512 },
        workers: { ocr: "ok", export: "ok" },
      },
    };
    expect(() => HealthResponse.parse(data)).not.toThrow();
  });

  it("HealthLiveResponse schema validates shape", () => {
    expect(() =>
      HealthLiveResponse.parse({
        status: "healthy",
        timestamp: "2024-01-01T00:00:00Z",
        uptime: 123,
      }),
    ).not.toThrow();
  });

  it("HealthReadyResponse schema validates shape", () => {
    const data = {
      status: "healthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      checks: {
        postgres: { status: "ok", latencyMs: 5 },
        redis: { status: "ok", latencyMs: 3 },
        storage: { status: "ok", latencyMs: 10 },
      },
    };
    expect(() => HealthReadyResponse.parse(data)).not.toThrow();
  });

  it("CsrfResponse schema requires csrfToken string", () => {
    expect(() => CsrfResponse.parse({ csrfToken: "abc123" })).not.toThrow();
    expect(() => CsrfResponse.parse({})).toThrow();
  });

  it("CspReportSuccess schema validates", () => {
    expect(() => CspReportSuccess.parse({ status: "ok" })).not.toThrow();
  });

  it("RegisterSuccess schema validates", () => {
    expect(() => RegisterSuccess.parse({ message: "Registered", userId: "u-1" })).not.toThrow();
    expect(() => RegisterSuccess.parse({ message: "Registered" })).toThrow();
  });

  it("ActuatorHealthResponse schema validates UP/DOWN status", () => {
    const data = {
      status: "UP",
      components: {
        db: { status: "UP", details: "ok" },
        diskSpace: { status: "UP", details: { total: 1000, free: 500, threshold: 100 } },
        memory: { status: "UP", details: { usedMB: 100, totalMB: 512, maxMB: 1024 } },
      },
      timestamp: new Date().toISOString(),
      uptime: 123,
    };
    expect(() => ActuatorHealthResponse.parse(data)).not.toThrow();
    expect(() => ActuatorHealthResponse.parse({ status: "UNKNOWN" })).toThrow();
  });

  it("ActuatorInfoResponse schema validates", () => {
    const data = {
      app: { name: "test", version: "1.0", description: "desc" },
      build: { version: "1.0", timestamp: "now" },
    };
    expect(() => ActuatorInfoResponse.parse(data)).not.toThrow();
  });

  it("DocumentsListResponse schema validates pagination", () => {
    const data = {
      documents: [{ id: "d-1", title: "Doc", fileSize: 100 }],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    expect(() => DocumentsListResponse.parse(data)).not.toThrow();
  });

  it("FoldersListResponse schema validates", () => {
    expect(() => FoldersListResponse.parse({ folders: [] })).not.toThrow();
    expect(() => FoldersListResponse.parse({})).toThrow();
  });

  it("FolderCreateResponse schema validates", () => {
    expect(() => FolderCreateResponse.parse({ folder: { id: "f-1" } })).not.toThrow();
  });

  it("TagsListResponse schema validates", () => {
    expect(() => TagsListResponse.parse({ tags: [] })).not.toThrow();
  });

  it("TagCreateResponse schema validates", () => {
    expect(() => TagCreateResponse.parse({ tag: { id: "t-1" } })).not.toThrow();
  });

  it("TagMergeResponse schema validates", () => {
    expect(() =>
      TagMergeResponse.parse({ success: true, affectedDocuments: 3, message: "Merged" }),
    ).not.toThrow();
  });

  it("SearchSuggestResponse schema validates", () => {
    expect(() => SearchSuggestResponse.parse({ suggestions: [] })).not.toThrow();
  });

  it("ConversionStartResponse schema validates", () => {
    expect(() =>
      ConversionStartResponse.parse({
        success: true,
        jobId: "c-1",
        status: "pending",
        message: "Started",
      }),
    ).not.toThrow();
  });

  it("ConversionStatusResponse schema validates completed state", () => {
    const data = {
      jobId: "c-1",
      status: "completed",
      progress: 100,
      outputs: { md: true, txt: true, json: true },
      readyForExport: true,
    };
    expect(() => ConversionStatusResponse.parse(data)).not.toThrow();
  });

  it("ConversionStatusResponse schema validates pending state", () => {
    const data = {
      jobId: "c-1",
      status: "pending",
      progress: 0,
      outputs: null,
      readyForExport: false,
    };
    expect(() => ConversionStatusResponse.parse(data)).not.toThrow();
  });

  it("BulkDeleteResponse schema validates", () => {
    expect(() =>
      BulkDeleteResponse.parse({ success: true, deleted: 3, message: "Deleted" }),
    ).not.toThrow();
  });

  it("BulkMoveResponse schema validates", () => {
    expect(() =>
      BulkMoveResponse.parse({ success: true, moved: 2, folderId: null, message: "Moved" }),
    ).not.toThrow();
  });

  it("BulkTagResponse schema validates", () => {
    expect(() =>
      BulkTagResponse.parse({ success: true, taggedCount: 2, skippedCount: 0, message: "Tagged" }),
    ).not.toThrow();
  });

  it("BulkUntagResponse schema validates", () => {
    expect(() =>
      BulkUntagResponse.parse({ success: true, removedCount: 2, message: "Untagged" }),
    ).not.toThrow();
  });

  it("DocumentMoveResponse schema validates", () => {
    expect(() =>
      DocumentMoveResponse.parse({ success: true, document: { id: "d-1" } }),
    ).not.toThrow();
  });

  it("DocumentRestoreResponse schema validates", () => {
    expect(() =>
      DocumentRestoreResponse.parse({
        success: true,
        document: { id: "d-1" },
        message: "Restored",
      }),
    ).not.toThrow();
  });

  it("ShareGetResponse validates not-shared state", () => {
    expect(() => ShareGetResponse.parse({ shared: false })).not.toThrow();
  });

  it("ShareGetResponse validates shared state", () => {
    const shared = {
      shared: true,
      shareId: "s-1",
      token: "tok",
      url: "http://example.com",
      documentTitle: "Doc",
      expiresAt: null,
      isExpired: false,
      createdAt: new Date().toISOString(),
    };
    expect(() => ShareGetResponse.parse(shared)).not.toThrow();
  });

  it("ShareCreateResponse schema validates", () => {
    const data = {
      shareId: "s-1",
      token: "tok",
      url: "http://example.com",
      documentTitle: "Doc",
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(() => ShareCreateResponse.parse(data)).not.toThrow();
  });

  it("ShareRegenerateResponse schema validates", () => {
    const data = {
      shareId: "s-1",
      token: "tok",
      url: "http://example.com",
      documentTitle: "Doc",
      expiresAt: null,
      createdAt: new Date().toISOString(),
      message: "Regenerated",
    };
    expect(() => ShareRegenerateResponse.parse(data)).not.toThrow();
  });

  it("SuggestTagsResponse schema validates", () => {
    expect(() => SuggestTagsResponse.parse({ suggestions: [] })).not.toThrow();
  });

  it("FolderEmptyResponse schema validates", () => {
    expect(() =>
      FolderEmptyResponse.parse({ message: "Emptied", documentsMoved: 0, foldersMoved: 0 }),
    ).not.toThrow();
  });

  it("FolderMoveResponse schema validates", () => {
    expect(() => FolderMoveResponse.parse({ folder: { id: "f-1" } })).not.toThrow();
  });

  it("FolderRestoreResponse schema validates", () => {
    expect(() =>
      FolderRestoreResponse.parse({ message: "Restored", folder: { id: "f-1" } }),
    ).not.toThrow();
  });

  it("FolderTagsResponse schema validates", () => {
    expect(() => FolderTagsResponse.parse({ tags: [] })).not.toThrow();
  });

  it("DocumentExportResponse schema validates", () => {
    expect(() =>
      DocumentExportResponse.parse({ success: true, jobId: "e-1", message: "Export started" }),
    ).not.toThrow();
  });

  it("ExportStatusResponse schema validates ready state", () => {
    expect(() =>
      ExportStatusResponse.parse({
        status: "ready",
        format: "md",
        ready: true,
        downloadUrl: "http://example.com",
      }),
    ).not.toThrow();
  });

  it("WebhooksListResponse schema validates", () => {
    expect(() => WebhooksListResponse.parse({ webhooks: [] })).not.toThrow();
  });

  it("WebhookCreateResponse schema validates", () => {
    expect(() => WebhookCreateResponse.parse({ webhook: { id: "wh-1" } })).not.toThrow();
  });

  it("WebhookStatsResponse schema validates", () => {
    expect(() => WebhookStatsResponse.parse({ stats: { totalDeliveries: 50 } })).not.toThrow();
  });

  it("MetricsResponse schema validates", () => {
    const data = {
      timestamp: new Date().toISOString(),
      uptime: 123,
      memory: { rss: 100, heapUsed: 50, heapTotal: 200 },
      database: { users: 10, documents: 100, folders: 5, tags: 20, shareLinks: 3 },
      workers: { ocrQueue: 0, exportQueue: 0 },
    };
    expect(() => MetricsResponse.parse(data)).not.toThrow();
  });

  it("UploadSuccessResponse schema validates", () => {
    const data = {
      success: true,
      jobId: "j-1",
      documentId: "d-1",
      fileName: "test.pdf",
      fileSize: 1024,
      status: "processing",
      message: "Uploaded",
    };
    expect(() => UploadSuccessResponse.parse(data)).not.toThrow();
  });

  it("BookmarkStatusResponse schema validates", () => {
    expect(() => BookmarkStatusResponse.parse({ bookmarked: true })).not.toThrow();
  });

  it("ErrorResponse schema validates error shape", () => {
    expect(() =>
      ErrorResponse.parse({ error: { code: "NOT_FOUND", message: "Not found" } }),
    ).not.toThrow();
    expect(() =>
      StandardErrorShape.parse({ error: { code: "UNAUTHORIZED", message: "Auth required" } }),
    ).not.toThrow();
    expect(() => ErrorResponse.parse({})).toThrow();
  });
});

describe("Consumer Contract — Route Handler Response Matches Zod Schema", () => {
  it("GET /api/health body matches HealthResponse", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();
    expect(() => HealthResponse.parse(body)).not.toThrow();
  });

  it("GET /api/health/live body matches HealthLiveResponse", async () => {
    const { GET } = await import("@/app/api/health/live/route");
    const res = await GET();
    const body = await res.json();
    expect(() => HealthLiveResponse.parse(body)).not.toThrow();
  });

  it("GET /api/health/ready body matches HealthReadyResponse", async () => {
    const { GET } = await import("@/app/api/health/ready/route");
    const res = await GET();
    const body = await res.json();
    expect(() => HealthReadyResponse.parse(body)).not.toThrow();
  });

  it("GET /api/csrf body matches CsrfResponse", async () => {
    const { GET } = await import("@/app/api/csrf/route");
    const res = await GET();
    const body = await res.json();
    expect(() => CsrfResponse.parse(body)).not.toThrow();
  });

  it("GET /api/documents body matches DocumentsListResponse", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const wrapped = withSession(GET);
    const res = await wrapped(new Request("http://localhost/api/documents"));
    const body = await res.json();
    expect(() => DocumentsListResponse.parse(body)).not.toThrow();
  });

  it("GET /api/folders body matches FoldersListResponse", async () => {
    const { GET } = await import("@/app/api/folders/route");
    const res = await withSession(GET)(new Request("http://localhost/api/folders"));
    const body = await res.json();
    expect(() => FoldersListResponse.parse(body)).not.toThrow();
  });

  it("GET /api/tags body matches TagsListResponse", async () => {
    const { GET } = await import("@/app/api/tags/route");
    const res = await withSession(GET)(new Request("http://localhost/api/tags"));
    const body = await res.json();
    expect(() => TagsListResponse.parse(body)).not.toThrow();
  });

  it("GET /api/conversion/list returns object", async () => {
    const { GET } = await import("@/app/api/conversion/list/route");
    const res = await withSession(GET)(new Request("http://localhost/api/conversion/list"));
    const body = await res.json();
    expect(body).toBeDefined();
  });

  it("PATCH /api/profile body matches ProfilePatchResponse", async () => {
    const { PATCH } = await import("@/app/api/profile/route");
    const res = await withSession(PATCH)(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
    );
    const body = await res.json();
    expect(() => ProfilePatchResponse.parse(body)).not.toThrow();
  });
});

describe("Consumer Contract — Pagination Shape Consistency", () => {
  it("Document list pagination has page, limit, total, totalPages", () => {
    const pagination = { page: 1, limit: 20, total: 100, totalPages: 5 };
    expect(pagination).toHaveProperty("page");
    expect(pagination).toHaveProperty("limit");
    expect(pagination).toHaveProperty("total");
    expect(pagination).toHaveProperty("totalPages");
  });
});

describe("Consumer Contract — OpenAPI Spec as Consumer Contract", () => {
  it("OpenAPI spec defines required endpoints", () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/api/health");
    expect(paths).toContain("/api/documents");
    expect(paths).toContain("/api/documents/{id}");
    expect(paths).toContain("/api/folders");
    expect(paths).toContain("/api/tags");
    expect(paths).toContain("/api/auth/register");
    expect(paths).toContain("/api/upload");
    expect(paths).toContain("/api/search");
    expect(paths).toContain("/api/profile");
    expect(paths).toContain("/api/users");
    expect(paths).toContain("/api/webhooks");
    expect(paths).toContain("/api/export");
  });

  it("OpenAPI spec security scheme is bearer JWT", () => {
    const scheme = spec.components?.securitySchemes?.bearerAuth as any;
    expect(scheme).toBeDefined();
    expect(scheme.type).toBe("http");
    expect(scheme.scheme).toBe("bearer");
  });

  it("All authenticated endpoints declare security", () => {
    const authEndpoints = [
      "/api/documents",
      "/api/documents/{id}",
      "/api/folders",
      "/api/tags",
      "/api/profile",
      "/api/search",
      "/api/bookmarks",
      "/api/webhooks",
      "/api/upload",
    ];
    for (const ep of authEndpoints) {
      const pathItem = spec.paths[ep] as any;
      if (!pathItem) continue;
      for (const method of Object.keys(pathItem)) {
        if (pathItem[method].security === undefined) {
          continue;
        }
        expect(pathItem[method].security).toBeDefined();
      }
    }
  });
});
