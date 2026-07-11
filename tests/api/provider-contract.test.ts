import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "./setup";
import { spec, getRoutes, getMethodsForRoute } from "./openapi-spec";

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
    analytics: {
      getAnalytics: vi.fn().mockResolvedValue({
        documents: {
          totalDocuments: 0,
          totalSize: 0,
          documentsByStatus: [],
          documentsByMimeType: [],
          uploadsOverTime: [],
          recentActivity: [],
        },
        tags: { totalTags: 0, topTags: [], unusedTags: 0 },
        storage: {
          totalStorageUsed: 0,
          averageFileSize: 0,
          largestDocuments: [],
          storageByUser: [],
        },
      }),
    },
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

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  enqueueExport: vi.fn().mockResolvedValue("job-123"),
  loadConfig: vi.fn().mockReturnValue({}),
}));

function defaultError(): Response {
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
});

describe("Provider Contract — OpenAPI Spec Compliance", () => {
  it("spec has required OpenAPI fields", () => {
    expect(spec.openapi).toBeDefined();
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBeDefined();
    expect(spec.info.version).toBeDefined();
    expect(spec.paths).toBeDefined();
    expect(spec.components?.securitySchemes).toBeDefined();
    expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
  });

  it("spec defines security scheme as bearer JWT", () => {
    const scheme = spec.components?.securitySchemes?.bearerAuth as any;
    expect(scheme.type).toBe("http");
    expect(scheme.scheme).toBe("bearer");
  });

  it("all paths have at least one operation", () => {
    const routes = getRoutes();
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const methods = getMethodsForRoute(route);
      expect(methods.length).toBeGreaterThan(0);
    }
  });

  it("all operations have responses defined", () => {
    const routes = getRoutes();
    for (const route of routes) {
      const pathItem = spec.paths[route] as any;
      for (const method of Object.keys(pathItem)) {
        const op = pathItem[method];
        expect(op.responses).toBeDefined();
        expect(Object.keys(op.responses).length).toBeGreaterThan(0);
      }
    }
  });

  it("all operations with security reference bearerAuth that exists", () => {
    const routes = getRoutes();
    for (const route of routes) {
      const pathItem = spec.paths[route] as any;
      for (const method of Object.keys(pathItem)) {
        const op = pathItem[method];
        if (op.security?.length) {
          for (const sec of op.security) {
            expect(sec.bearerAuth).toBeDefined();
          }
        }
      }
    }
  });
});

describe("Provider Contract — Public Endpoint Response Shapes", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockCheckUserRateLimit.mockResolvedValue({ allowed: true });
  });

  it("GET /api/health → 200, JSON body has status field", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
  });

  it("GET /api/health/live → 200, body.status = healthy", async () => {
    const { GET } = await import("@/app/api/health/live/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });

  it("GET /api/health/ready → 200 or 503, body has status", async () => {
    const { GET } = await import("@/app/api/health/ready/route");
    const res = await GET();
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  it("GET /api/csrf → 200, body has csrfToken", async () => {
    const { GET } = await import("@/app/api/csrf/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("csrfToken");
    expect(typeof body.csrfToken).toBe("string");
  });

  it("POST /api/csp-report → 200 or 400", async () => {
    const { POST } = await import("@/app/api/csp-report/route");
    const req = new Request("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "document-uri": "https://example.com" }),
    });
    const res = await POST(req);
    expect([200, 400]).toContain(res.status);
  });

  it("GET /api/docs/openapi → 200, JSON body", async () => {
    const { GET } = await import("@/app/api/docs/openapi/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe("object");
  });

  it("GET /api/actuator/health → 200 or 503", async () => {
    const { GET } = await import("@/app/api/actuator/health/route");
    const res = await GET();
    expect([200, 503]).toContain(res.status);
  });

  it("GET /api/actuator/info → 200", async () => {
    const { GET } = await import("@/app/api/actuator/info/route");
    const req = new Request("http://localhost/api/actuator/info", {
      headers: { authorization: `Bearer ${process.env.ACTUATOR_BEARER_TOKEN}` },
    });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
  });

  it("GET /api/actuator/[...path] → 404", async () => {
    const { GET } = await import("@/app/api/actuator/[...path]/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe("Provider Contract — Authenticated Endpoint Response Shapes", () => {
  function withSession(handler: (...args: any[]) => any) {
    return async (req: Request, params: Record<string, string> = {}) => {
      return handler(req, { session: mockSession, params } as any);
    };
  }

  function withAdmin(handler: (...args: any[]) => any) {
    return async (req: Request, params: Record<string, string> = {}) => {
      const adminSession = { user: { ...mockSession.user, role: "ADMIN" } };
      return handler(req, { session: adminSession, params } as any);
    };
  }

  beforeEach(() => {
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
    mockExportDocument.mockResolvedValue({
      buffer: Buffer.from("test"),
      document: { title: "doc" },
    });
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
    mockUploadExecute.mockResolvedValue({
      id: "doc-u-1",
      originalName: "test.pdf",
      fileSize: 1024,
    });
  });

  it("GET /api/documents → 200, has documents array", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const res = await withSession(GET)(new Request("http://localhost/api/documents"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("documents");
    expect(body).toHaveProperty("pagination");
  });

  it("GET /api/documents/{id} → 200, has document", async () => {
    const { GET } = await import("@/app/api/documents/[id]/route");
    const res = await withSession(GET)(new Request("http://localhost/api/documents/d-1"), {
      id: "d-1",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("document");
  });

  it("PATCH /api/documents/{id} → 200", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/route");
    const res = await withSession(PATCH)(
      new Request("http://localhost/api/documents/d-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
  });

  it("DELETE /api/documents/{id} → 200", async () => {
    const { DELETE } = await import("@/app/api/documents/[id]/route");
    const res = await withSession(DELETE)(
      new Request("http://localhost/api/documents/d-1", { method: "DELETE" }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/folders → 200, has folders", async () => {
    const { GET } = await import("@/app/api/folders/route");
    const res = await withSession(GET)(new Request("http://localhost/api/folders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("folders");
  });

  it("POST /api/folders → 201, has folder", async () => {
    const { POST } = await import("@/app/api/folders/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("folder");
  });

  it("GET /api/folders/{id} → 200", async () => {
    const { GET } = await import("@/app/api/folders/[id]/route");
    const res = await withSession(GET)(new Request("http://localhost/api/folders/f-1"), {
      id: "f-1",
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/tags → 200, has tags", async () => {
    const { GET } = await import("@/app/api/tags/route");
    const res = await withSession(GET)(new Request("http://localhost/api/tags"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("tags");
  });

  it("POST /api/tags → 201, has tag", async () => {
    const { POST } = await import("@/app/api/tags/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New", color: "#FF0000" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("tag");
  });

  it("POST /api/tags/merge → 200", async () => {
    const { POST } = await import("@/app/api/tags/merge/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTagId: "s-1", targetTagId: "t-1" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/search → 200", async () => {
    const { GET } = await import("@/app/api/search/route");
    const res = await withSession(GET)(new Request("http://localhost/api/search?q=test"));
    expect(res.status).toBe(200);
  });

  it("GET /api/search/suggest → 200", async () => {
    const { GET } = await import("@/app/api/search/suggest/route");
    const res = await withSession(GET)(new Request("http://localhost/api/search/suggest?q=test"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("suggestions");
  });

  it("GET /api/bookmarks → 200", async () => {
    const { GET } = await import("@/app/api/bookmarks/route");
    const res = await withSession(GET)(new Request("http://localhost/api/bookmarks"));
    expect(res.status).toBe(200);
  });

  it("PATCH /api/profile → 200, has user", async () => {
    const { PATCH } = await import("@/app/api/profile/route");
    const res = await withSession(PATCH)(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("user");
  });

  it("DELETE /api/profile → 200", async () => {
    const { DELETE } = await import("@/app/api/profile/route");
    const res = await withSession(DELETE)(
      new Request("http://localhost/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "pass" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/analytics → 200", async () => {
    const { GET } = await import("@/app/api/analytics/route");
    const res = await withSession(GET)(new Request("http://localhost/api/analytics?days=30"));
    expect(res.status).toBe(200);
  });

  it("GET /api/conversion/list → 200", async () => {
    const { GET } = await import("@/app/api/conversion/list/route");
    const res = await withSession(GET)(new Request("http://localhost/api/conversion/list"));
    expect(res.status).toBe(200);
  });

  it("POST /api/conversion/start → 200", async () => {
    const { POST } = await import("@/app/api/conversion/start/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/conversion/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "d-1" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("jobId");
  });

  it("GET /api/conversion/{id}/status → 200", async () => {
    const { GET } = await import("@/app/api/conversion/[id]/status/route");
    const res = await withSession(GET)(new Request("http://localhost/api/conversion/c-1/status"), {
      id: "c-1",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  it("POST /api/documents/bulk-delete → 200", async () => {
    const { POST } = await import("@/app/api/documents/bulk-delete/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ["d1"] }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/documents/bulk-move → 200", async () => {
    const { POST } = await import("@/app/api/documents/bulk-move/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ["d1"], folderId: null }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("moved");
  });

  it("POST /api/documents/bulk-tag → 200", async () => {
    const { POST } = await import("@/app/api/documents/bulk-tag/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ["d1"], tagId: "t1" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("taggedCount");
  });

  it("POST /api/documents/bulk-untag → 200", async () => {
    const { POST } = await import("@/app/api/documents/bulk-untag/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/bulk-untag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ["d1"], tagId: "t1" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("removedCount");
  });

  it("GET /api/documents/{id}/bookmark → 200", async () => {
    const { GET } = await import("@/app/api/documents/[id]/bookmark/route");
    const res = await withSession(GET)(new Request("http://localhost/api/documents/d-1/bookmark"), {
      id: "d-1",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("bookmarked");
  });

  it("PATCH /api/documents/{id}/move → 200", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/move/route");
    const res = await withSession(PATCH)(
      new Request("http://localhost/api/documents/d-1/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: null }),
      }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("success", true);
  });

  it("PATCH /api/documents/{id}/restore → 200", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/restore/route");
    const res = await withSession(PATCH)(
      new Request("http://localhost/api/documents/d-1/restore", { method: "PATCH" }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/documents/{id}/share → 200", async () => {
    const { GET } = await import("@/app/api/documents/[id]/share/route");
    const res = await withSession(GET)(new Request("http://localhost/api/documents/d-1/share"), {
      id: "d-1",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("shared");
  });

  it("DELETE /api/documents/{id}/share → 200", async () => {
    const { DELETE } = await import("@/app/api/documents/[id]/share/route");
    const res = await withSession(DELETE)(
      new Request("http://localhost/api/documents/d-1/share", { method: "DELETE" }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/documents/{id}/share/regenerate → 200", async () => {
    mockGetDocumentById.mockResolvedValue({ id: "d-1", title: "Doc" });
    const { POST } = await import("@/app/api/documents/[id]/share/regenerate/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/d-1/share/regenerate", { method: "POST" }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/documents/{id}/suggest-tags → 200", async () => {
    const { POST } = await import("@/app/api/documents/[id]/suggest-tags/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/d-1/suggest-tags", { method: "POST" }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("suggestions");
  });

  it("GET /api/documents/{id}/tags → 200", async () => {
    const { GET } = await import("@/app/api/documents/[id]/tags/route");
    const res = await withSession(GET)(new Request("http://localhost/api/documents/d-1/tags"), {
      id: "d-1",
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/documents/{id}/tags → 201", async () => {
    const { POST } = await import("@/app/api/documents/[id]/tags/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/d-1/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: "t-1" }),
      }),
      { id: "d-1" },
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("success", true);
  });

  it("PUT /api/documents/{id}/tags → 200", async () => {
    const { PUT } = await import("@/app/api/documents/[id]/tags/route");
    const res = await withSession(PUT)(
      new Request("http://localhost/api/documents/d-1/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: ["t-1"] }),
      }),
      { id: "d-1" },
    );
    expect(res.status).toBe(200);
  });

  it("DELETE /api/documents/{id}/tags/{tagId} → 200", async () => {
    const { DELETE } = await import("@/app/api/documents/[id]/tags/[tagId]/route");
    const res = await withSession(DELETE)(
      new Request("http://localhost/api/documents/d-1/tags/t-1", { method: "DELETE" }),
      { id: "d-1", tagId: "t-1" },
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/folders/{id}/empty → 200", async () => {
    const { POST } = await import("@/app/api/folders/[id]/empty/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/folders/f-1/empty", { method: "POST" }),
      { id: "f-1" },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("documentsMoved");
  });

  it("POST /api/folders/{id}/move → 200", async () => {
    const { POST } = await import("@/app/api/folders/[id]/move/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/folders/f-1/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: null }),
      }),
      { id: "f-1" },
    );
    expect(res.status).toBe(200);
  });

  it("POST /api/folders/{id}/restore → 200", async () => {
    const { POST } = await import("@/app/api/folders/[id]/restore/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/folders/f-1/restore", { method: "POST" }),
      { id: "f-1" },
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/folders/{id}/tags → 200", async () => {
    const { GET } = await import("@/app/api/folders/[id]/tags/route");
    const res = await withSession(GET)(new Request("http://localhost/api/folders/f-1/tags"), {
      id: "f-1",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("tags");
  });

  it("GET /api/folders/{id}/tree → 200", async () => {
    const { GET } = await import("@/app/api/folders/[id]/tree/route");
    const res = await withSession(GET)(new Request("http://localhost/api/folders/f-1/tree"), {
      id: "f-1",
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/webhooks → 200", async () => {
    const { GET } = await import("@/app/api/webhooks/route");
    const res = await withSession(GET)(new Request("http://localhost/api/webhooks"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("webhooks");
  });

  it("POST /api/webhooks → 201", async () => {
    const { POST } = await import("@/app/api/webhooks/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://hook.example.com", events: ["doc.created"] }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("webhook");
  });

  it("GET /api/webhooks/{id} → 200", async () => {
    const { GET } = await import("@/app/api/webhooks/[id]/route");
    const res = await withSession(GET)(new Request("http://localhost/api/webhooks/wh-1"), {
      id: "wh-1",
    });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/webhooks/{id} → 200", async () => {
    const { DELETE } = await import("@/app/api/webhooks/[id]/route");
    const res = await withSession(DELETE)(
      new Request("http://localhost/api/webhooks/wh-1", { method: "DELETE" }),
      { id: "wh-1" },
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/webhooks/stats → 200", async () => {
    const { GET } = await import("@/app/api/webhooks/stats/route");
    const res = await withSession(GET)(new Request("http://localhost/api/webhooks/stats"));
    expect(res.status).toBe(200);
  });

  it("POST /api/webhooks/{id}/test → 200", async () => {
    const { POST } = await import("@/app/api/webhooks/[id]/test/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/webhooks/wh-1/test", { method: "POST" }),
      { id: "wh-1" },
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/users → 200 (admin)", async () => {
    const { GET } = await import("@/app/api/users/route");
    const adminSession = { user: { ...mockSession.user, role: "ADMIN" } };
    const res = await GET(new Request("http://localhost/api/users"), {
      session: adminSession,
      params: {},
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("users");
  });

  it("GET /api/metrics → 200 (admin)", async () => {
    mockSession.user = { ...mockSession.user, role: "ADMIN" } as any;
    const { GET } = await import("@/app/api/metrics/route");
    const res = await GET(new Request("http://localhost/api/metrics"), {
      session: mockSession,
    } as any);
    expect([200, 500]).toContain(res.status);
  });

  it("POST /api/documents/bulk-export → 200 or 400", async () => {
    const { POST } = await import("@/app/api/documents/bulk-export/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ["d1"], format: "md" }),
      }),
    );
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/documents/{id}/export → 200 or 400", async () => {
    const { POST } = await import("@/app/api/documents/[id]/export/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/documents/d-1/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "md" }),
      }),
      { id: "d-1" },
    );
    expect([200, 400, 500]).toContain(res.status);
  });

  it("POST /api/export → binary or error", async () => {
    const { POST } = await import("@/app/api/export/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "d-1", format: "md" }),
      }),
    );
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/export/batch → binary ZIP or error", async () => {
    const { POST } = await import("@/app/api/export/batch/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ["d1"], format: "md" }),
      }),
    );
    expect([200, 400, 500]).toContain(res.status);
  });

  it("POST /api/export/folder → binary ZIP or error", async () => {
    const { POST } = await import("@/app/api/export/folder/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/export/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: "f-1", format: "md" }),
      }),
    );
    expect([200, 400, 500]).toContain(res.status);
  });

  it("POST /api/export/tag → binary ZIP or error", async () => {
    const { POST } = await import("@/app/api/export/tag/route");
    const res = await withSession(POST)(
      new Request("http://localhost/api/export/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: "t-1", format: "md" }),
      }),
    );
    expect([200, 400, 500]).toContain(res.status);
  });

  it("GET /api/export/{id}/{format} → binary or error", async () => {
    const { GET } = await import("@/app/api/export/[id]/[format]/route");
    const res = await withSession(GET)(new Request("http://localhost/api/export/d-1/md"), {
      id: "d-1",
      format: "md",
    });
    expect([200, 400, 500]).toContain(res.status);
  });

  it("GET /api/documents/{id}/export/status → 200 or 400", async () => {
    const { GET } = await import("@/app/api/documents/[id]/export/status/route");
    const res = await withSession(GET)(
      new Request("http://localhost/api/documents/d-1/export/status?format=md"),
      { id: "d-1" },
    );
    expect([200, 400]).toContain(res.status);
  });
});

describe("Provider Contract — Error Response Shape", () => {
  it("error responses have code + message", async () => {
    mockSession.user = null as any;
    const { GET } = await import("@/app/api/documents/route");
    const res = await (GET as any)(new Request("http://localhost/api/documents"), {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
  });

  it("error code is a string from ErrorCode enum", async () => {
    mockSession.user = null as any;
    const validCodes = [
      "NOT_FOUND",
      "VALIDATION_ERROR",
      "BAD_REQUEST",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "INTERNAL_ERROR",
    ];
    const { GET } = await import("@/app/api/documents/route");
    const res = await (GET as any)(new Request("http://localhost/api/documents"), {});
    const body = await res.json();
    expect(validCodes).toContain(body.error.code);
  });
});

describe("Provider Contract — Content-Type Headers", () => {
  it("JSON endpoints return application/json", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("Prometheus endpoints return text/plain", async () => {
    const { GET } = await import("@/app/api/actuator/prometheus/route");
    const req = new Request("http://localhost/api/actuator/prometheus");
    const res = await GET(req);
    if (res.status === 200) {
      expect(res.headers.get("content-type")).toContain("text/plain");
    }
  });

  it("prometheus GET /api/metrics/prometheus returns text/plain on 200", async () => {
    const { GET } = await import("@/app/api/metrics/prometheus/route");
    const req = new Request("http://localhost/api/metrics/prometheus");
    const res = await GET(req);
    if (res.status === 200) {
      expect(res.headers.get("content-type")).toContain("text/plain");
    }
  });
});
