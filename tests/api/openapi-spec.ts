import type { OpenAPI } from "openapi-types";

export const spec: OpenAPI.Document = {
  openapi: "3.1.0",
  info: {
    title: "Ibn Al-Azhar Docs API",
    version: "1.0.0",
    description: "Arabic-first, RTL-first document processing platform API for Azhar students",
  },
  servers: [{ url: "http://localhost:3000", description: "Local development" }],
  tags: [
    { name: "Health", description: "Health check endpoints" },
    { name: "Actuator", description: "Spring Boot-style actuator endpoints" },
    { name: "Auth", description: "Authentication and user management" },
    { name: "Documents", description: "Document CRUD and management" },
    { name: "Folders", description: "Folder CRUD and management" },
    { name: "Tags", description: "Tag CRUD and management" },
    { name: "Search", description: "Search endpoints" },
    { name: "Bookmarks", description: "Bookmark management" },
    { name: "Profile", description: "User profile management" },
    { name: "Users", description: "Admin user management" },
    { name: "Conversion", description: "Document format conversion" },
    { name: "Export", description: "Document export" },
    { name: "Share", description: "Document sharing" },
    { name: "Webhooks", description: "Webhook management" },
    { name: "Analytics", description: "Usage analytics" },
    { name: "Upload", description: "File upload" },
    { name: "Stream", description: "Server-Sent Events streaming" },
    { name: "CSP", description: "Content Security Policy reporting" },
    { name: "CSRF", description: "CSRF token management" },
    { name: "OpenAPI", description: "OpenAPI specification endpoint" },
  ],
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Overall system health",
        responses: {
          "200": {
            description: "Healthy",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } },
            },
          },
          "503": {
            description: "Unhealthy or degraded",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } },
            },
          },
        },
      },
    },
    "/api/health/live": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        responses: {
          "200": {
            description: "Alive",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthLiveResponse" } },
            },
          },
        },
      },
    },
    "/api/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness probe",
        responses: {
          "200": {
            description: "Ready",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthReadyResponse" } },
            },
          },
          "503": {
            description: "Not ready",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthReadyResponse" } },
            },
          },
        },
      },
    },
    // ── Actuator ────────────────────────────────────────────────────────────
    "/api/actuator/health": {
      get: {
        tags: ["Actuator"],
        summary: "Spring Boot-style actuator health",
        responses: {
          "200": {
            description: "UP",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActuatorHealthResponse" },
              },
            },
          },
          "503": {
            description: "DOWN",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActuatorHealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/actuator/info": {
      get: {
        tags: ["Actuator"],
        summary: "Application info",
        responses: {
          "200": {
            description: "Info",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ActuatorInfoResponse" } },
            },
          },
        },
      },
    },
    "/api/actuator/metrics": {
      get: {
        tags: ["Actuator"],
        summary: "Process metrics",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Metrics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActuatorMetricsResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/actuator/prometheus": {
      get: {
        tags: ["Actuator"],
        summary: "Prometheus metrics (plain text)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Prometheus metrics", content: { "text/plain": {} } },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/actuator/{path}": {
      get: {
        tags: ["Actuator"],
        summary: "Catch-all for unknown actuator paths",
        parameters: [
          {
            name: "path",
            in: "path",
            required: true,
            schema: { type: "array", items: { type: "string" } },
          },
        ],
        responses: {
          "404": {
            description: "Not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActuatorCatchAllResponse" },
              },
            },
          },
        },
      },
    },
    // ── CSRF ────────────────────────────────────────────────────────────────
    "/api/csrf": {
      get: {
        tags: ["CSRF"],
        summary: "Get CSRF token",
        responses: {
          "200": {
            description: "CSRF token",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CsrfResponse" } },
            },
          },
        },
      },
    },
    // ── CSP ─────────────────────────────────────────────────────────────────
    "/api/csp-report": {
      post: {
        tags: ["CSP"],
        summary: "Report CSP violations",
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": {
            description: "Accepted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CspReportSuccess" } },
            },
          },
          "400": {
            description: "Invalid body",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CspReportError" } },
            },
          },
        },
      },
    },
    // ── OpenAPI ──────────────────────────────────────────────────────────────
    "/api/docs/openapi": {
      get: {
        tags: ["OpenAPI"],
        summary: "Get OpenAPI specification",
        responses: {
          "200": { description: "OpenAPI spec", content: { "application/json": {} } },
        },
      },
    },
    // ── Auth ────────────────────────────────────────────────────────────────
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  name: { type: "string" },
                },
                required: ["email", "password", "name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Registered",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/RegisterSuccess" } },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { email: { type: "string" } },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email sent",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ForgotPasswordSuccess" },
              },
            },
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  token: { type: "string" },
                  password: { type: "string" },
                },
                required: ["email", "token", "password"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordSuccess" } },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/auth/verify-email": {
      get: {
        tags: ["Auth"],
        summary: "Verify email address",
        parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "302": { description: "Redirect to login" },
        },
      },
    },
    "/api/auth/{nextauth}": {
      get: {
        tags: ["Auth"],
        summary: "NextAuth.js handler",
        responses: { "200": { description: "NextAuth response" } },
      },
      post: {
        tags: ["Auth"],
        summary: "NextAuth.js handler",
        responses: { "200": { description: "NextAuth response" } },
      },
    },
    // ── Documents ────────────────────────────────────────────────────────────
    "/api/documents": {
      get: {
        tags: ["Documents"],
        summary: "List documents",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          { name: "folderId", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string", maxLength: 200 } },
        ],
        responses: {
          "200": {
            description: "Documents list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentsListResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Create a document (placeholder)",
        security: [{ bearerAuth: [] }],
        responses: {
          "405": { description: "Method not allowed — use upload" },
        },
      },
    },
    "/api/documents/{id}": {
      get: {
        tags: ["Documents"],
        summary: "Get document by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Document detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentDetailResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      patch: {
        tags: ["Documents"],
        summary: "Update document",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": {
            description: "Updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentPatchResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Soft-delete document",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentDeleteResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/bulk-delete": {
      post: {
        tags: ["Documents"],
        summary: "Bulk delete documents",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { documentIds: { type: "array", items: { type: "string" } } },
                required: ["documentIds"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk deleted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BulkDeleteResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/bulk-export": {
      post: {
        tags: ["Documents"],
        summary: "Bulk export documents",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  documentIds: { type: "array", items: { type: "string" } },
                  format: { type: "string" },
                },
                required: ["documentIds", "format"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk export result",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BulkExportResponse" } },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/bulk-move": {
      post: {
        tags: ["Documents"],
        summary: "Bulk move documents",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  documentIds: { type: "array", items: { type: "string" } },
                  folderId: { type: "string", nullable: true },
                },
                required: ["documentIds"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk moved",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BulkMoveResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/bulk-tag": {
      post: {
        tags: ["Documents"],
        summary: "Bulk tag documents",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  documentIds: { type: "array", items: { type: "string" } },
                  tagId: { type: "string" },
                },
                required: ["documentIds", "tagId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk tagged",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BulkTagResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/bulk-untag": {
      post: {
        tags: ["Documents"],
        summary: "Bulk untag documents",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  documentIds: { type: "array", items: { type: "string" } },
                  tagId: { type: "string" },
                },
                required: ["documentIds", "tagId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bulk untagged",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BulkUntagResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/bookmark": {
      get: {
        tags: ["Documents"],
        summary: "Get bookmark status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Bookmark status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookmarkStatusResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Toggle bookmark",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Toggled",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookmarkStatusResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/move": {
      patch: {
        tags: ["Documents"],
        summary: "Move document to folder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { folderId: { type: "string", nullable: true } },
                required: ["folderId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Moved",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/DocumentMoveResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/restore": {
      patch: {
        tags: ["Documents"],
        summary: "Restore soft-deleted document",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Restored",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentRestoreResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/share": {
      get: {
        tags: ["Documents"],
        summary: "Get share link status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Share status",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ShareGetResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Create share link",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { expiresInDays: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Share created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ShareCreateResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Remove share link",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Share removed",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ShareDeleteResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/share/regenerate": {
      post: {
        tags: ["Documents"],
        summary: "Regenerate share link",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Regenerated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareRegenerateResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/suggest-tags": {
      post: {
        tags: ["Documents"],
        summary: "Suggest tags for a document",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Tag suggestions",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SuggestTagsResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/tags": {
      get: {
        tags: ["Documents"],
        summary: "Get document tags",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Document tags",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentTagsGetResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Add tag to document",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { tagId: { type: "string" } },
                required: ["tagId"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Tag added",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentTagsPostResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      put: {
        tags: ["Documents"],
        summary: "Replace all tags on document",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { tagIds: { type: "array", items: { type: "string" } } },
                required: ["tagIds"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tags replaced",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentTagsPutResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/tags/{tagId}": {
      delete: {
        tags: ["Documents"],
        summary: "Remove tag from document",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "tagId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Tag removed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentTagRemoveResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/export": {
      post: {
        tags: ["Documents"],
        summary: "Request document export",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { format: { type: "string" } },
                required: ["format"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Export started",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentExportResponse" },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/export/status": {
      get: {
        tags: ["Documents"],
        summary: "Check export status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Export status",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ExportStatusResponse" } },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Folders ──────────────────────────────────────────────────────────────
    "/api/folders": {
      get: {
        tags: ["Folders"],
        summary: "List folders",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Folders list",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FoldersListResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Folders"],
        summary: "Create folder",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, parentId: { type: "string" } },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Folder created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderCreateResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/folders/{id}": {
      get: {
        tags: ["Folders"],
        summary: "Get folder by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Folder detail",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderDetailResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      patch: {
        tags: ["Folders"],
        summary: "Rename folder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" } },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Folder renamed",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderPatchResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Folders"],
        summary: "Delete folder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Folder deleted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderDeleteResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/folders/{id}/empty": {
      post: {
        tags: ["Folders"],
        summary: "Empty folder (move contents to root)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Folder emptied",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderEmptyResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/folders/{id}/move": {
      post: {
        tags: ["Folders"],
        summary: "Move folder to another parent",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { parentId: { type: "string", nullable: true } },
                required: ["parentId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Folder moved",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderMoveResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/folders/{id}/restore": {
      post: {
        tags: ["Folders"],
        summary: "Restore soft-deleted folder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Folder restored",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FolderRestoreResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/folders/{id}/tags": {
      get: {
        tags: ["Folders"],
        summary: "Get tags used in folder",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Folder tags",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderTagsResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/folders/{id}/tree": {
      get: {
        tags: ["Folders"],
        summary: "Get folder tree",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Folder tree",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FolderTreeResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Tags ──────────────────────────────────────────────────────────────────
    "/api/tags": {
      get: {
        tags: ["Tags"],
        summary: "List tags",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Tags list",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TagsListResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Create tag",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, color: { type: "string" } },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Tag created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TagCreateResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/tags/{id}": {
      get: {
        tags: ["Tags"],
        summary: "Get tag by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Tag detail",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TagDetailResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      patch: {
        tags: ["Tags"],
        summary: "Update tag",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, color: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tag updated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TagPatchResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Tags"],
        summary: "Delete tag",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Tag deleted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TagDeleteResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/tags/merge": {
      post: {
        tags: ["Tags"],
        summary: "Merge two tags",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { sourceTagId: { type: "string" }, targetTagId: { type: "string" } },
                required: ["sourceTagId", "targetTagId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tags merged",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TagMergeResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Search ────────────────────────────────────────────────────────────────
    "/api/search": {
      get: {
        tags: ["Search"],
        summary: "Search documents",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SearchResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/search/suggest": {
      get: {
        tags: ["Search"],
        summary: "Get search suggestions",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Suggestions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchSuggestResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Bookmarks ──────────────────────────────────────────────────────────────
    "/api/bookmarks": {
      get: {
        tags: ["Bookmarks"],
        summary: "List bookmarks",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Bookmarks",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BookmarksResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Bookmarks"],
        summary: "Add bookmark",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { documentId: { type: "string" } },
                required: ["documentId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bookmarked",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BookmarksResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove bookmark",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { documentId: { type: "string" } },
                required: ["documentId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bookmark removed",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BookmarksResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Profile ────────────────────────────────────────────────────────────────
    "/api/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ProfilePatchResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update profile",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": {
            description: "Updated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ProfilePatchResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "Delete account",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfileDeleteResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Users ──────────────────────────────────────────────────────────────────
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Users list",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/UsersListResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { userId: { type: "string" } },
                required: ["userId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User deleted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/UserDeleteResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Analytics ──────────────────────────────────────────────────────────────
    "/api/analytics": {
      get: {
        tags: ["Analytics"],
        summary: "Get usage analytics",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "days", in: "query", schema: { type: "integer", default: 30 } }],
        responses: {
          "200": {
            description: "Analytics",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AnalyticsResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Conversion ──────────────────────────────────────────────────────────────
    "/api/conversion/list": {
      get: {
        tags: ["Conversion"],
        summary: "List conversion jobs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Conversion jobs",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversionListResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/conversion/start": {
      post: {
        tags: ["Conversion"],
        summary: "Start document conversion",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { documentId: { type: "string" } },
                required: ["documentId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Conversion started",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversionStartResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/conversion/{id}/status": {
      get: {
        tags: ["Conversion"],
        summary: "Get conversion job status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Job status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversionStatusResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Export ──────────────────────────────────────────────────────────────────
    "/api/export": {
      post: {
        tags: ["Export"],
        summary: "Export document (binary)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { documentId: { type: "string" }, format: { type: "string" } },
                required: ["documentId", "format"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Binary file", content: { "application/octet-stream": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/export/{id}/{format}": {
      get: {
        tags: ["Export"],
        summary: "Download exported file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Binary file", content: { "application/octet-stream": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/export/batch": {
      post: {
        tags: ["Export"],
        summary: "Export multiple documents as ZIP",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  documentIds: { type: "array", items: { type: "string" } },
                  format: { type: "string" },
                },
                required: ["documentIds", "format"],
              },
            },
          },
        },
        responses: {
          "200": { description: "ZIP file", content: { "application/zip": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/export/folder": {
      post: {
        tags: ["Export"],
        summary: "Export folder as ZIP",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { folderId: { type: "string" }, format: { type: "string" } },
                required: ["folderId", "format"],
              },
            },
          },
        },
        responses: {
          "200": { description: "ZIP file", content: { "application/zip": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/export/tag": {
      post: {
        tags: ["Export"],
        summary: "Export tagged documents as ZIP",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { tagId: { type: "string" }, format: { type: "string" } },
                required: ["tagId", "format"],
              },
            },
          },
        },
        responses: {
          "200": { description: "ZIP file", content: { "application/zip": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Share ──────────────────────────────────────────────────────────────────
    "/api/share/{token}": {
      get: {
        tags: ["Share"],
        summary: "Access shared document (public)",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Shared document",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareDocumentResponse" },
              },
            },
          },
          "404": {
            description: "Not found/expired",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ShareNotFoundError" } },
            },
          },
        },
      },
    },
    "/api/share/{token}/export/{format}": {
      get: {
        tags: ["Share"],
        summary: "Export shared document (public)",
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Binary file", content: { "application/octet-stream": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareExportBadRequest" },
              },
            },
          },
          "404": {
            description: "Share not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ShareNotFoundError" } },
            },
          },
        },
      },
    },
    // ── Webhooks ────────────────────────────────────────────────────────────────
    "/api/webhooks": {
      get: {
        tags: ["Webhooks"],
        summary: "List webhooks",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Webhooks list",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/WebhooksListResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      post: {
        tags: ["Webhooks"],
        summary: "Create webhook",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  events: { type: "array", items: { type: "string" } },
                },
                required: ["url", "events"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Webhook created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookCreateResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/webhooks/{id}": {
      get: {
        tags: ["Webhooks"],
        summary: "Get webhook by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Webhook detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookDetailResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      patch: {
        tags: ["Webhooks"],
        summary: "Update webhook",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "200": {
            description: "Webhook updated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/WebhookPatchResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
      delete: {
        tags: ["Webhooks"],
        summary: "Delete webhook",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Webhook deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookDeleteResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/webhooks/stats": {
      get: {
        tags: ["Webhooks"],
        summary: "Get webhook delivery stats",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Webhook stats",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/WebhookStatsResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/webhooks/{id}/test": {
      post: {
        tags: ["Webhooks"],
        summary: "Test webhook delivery",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Test result",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/WebhookTestResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Metrics ────────────────────────────────────────────────────────────────
    "/api/metrics": {
      get: {
        tags: ["Health"],
        summary: "Application metrics (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Metrics",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/MetricsResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/documents/{id}/reprocess": {
      post: {
        tags: ["Documents"],
        summary: "Re-process a document through the OCR pipeline",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "202": { description: "Re-processing enqueued" },
          "404": { description: "Not found" },
          "409": { description: "Already processing" },
        },
      },
    },
    "/api/admin/queue": {
      get: {
        tags: ["Metrics"],
        summary: "List dead-letter-queue failed jobs (admin)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Failed jobs from the DLQ" } },
      },
      post: {
        tags: ["Metrics"],
        summary: "Requeue failed jobs from the DLQ (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: { action: { type: "string" }, jobId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Requeued" },
          "400": { description: "Invalid action or missing jobId" },
        },
      },
    },
    "/api/debug/exec": {
      post: {
        tags: ["Health"],
        summary: "Run a shell command for diagnostics (admin, disabled in production)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["command"],
                properties: { command: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Command output" },
          "403": { description: "Debug API disabled or not admin" },
          "500": { description: "Command failed" },
        },
      },
    },
    "/api/debug/pg": {
      post: {
        tags: ["Health"],
        summary: "Run a read-only SQL query for diagnostics (admin, disabled in production)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["query"],
                properties: { query: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Query result" },
          "403": { description: "Debug API disabled or not admin" },
          "500": { description: "Query failed" },
        },
      },
    },
    "/api/metrics/prometheus": {
      get: {
        tags: ["Health"],
        summary: "Prometheus metrics (plain text)",
        responses: {
          "200": { description: "Prometheus metrics", content: { "text/plain": {} } },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Upload ──────────────────────────────────────────────────────────────────
    "/api/upload": {
      post: {
        tags: ["Upload"],
        summary: "Upload a document",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  folderId: { type: "string" },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Uploaded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UploadSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "413": {
            description: "Payload too large",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    // ── Stream ──────────────────────────────────────────────────────────────────
    "/api/stream": {
      get: {
        tags: ["Stream"],
        summary: "SSE stream for job progress",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "jobId", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "SSE stream", content: { "text/event-stream": {} } },
          "400": {
            description: "Bad request",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/dashboard/stream": {
      get: {
        tags: ["Stream"],
        summary: "SSE stream for dashboard updates",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "SSE stream", content: { "text/event-stream": {} } },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: [
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
                ],
              },
              message: { type: "string" },
              requestId: { type: "string" },
              details: { type: "array", items: {} },
            },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
          timestamp: { type: "string" },
          uptime: { type: "number" },
          checks: {
            type: "object",
            properties: {
              database: {
                type: "object",
                properties: { status: { type: "string" }, latencyMs: { type: "number" } },
                required: ["status"],
              },
              memory: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  usedMB: { type: "number" },
                  limit: { type: "number" },
                },
                required: ["status", "usedMB", "limit"],
              },
              workers: {
                type: "object",
                properties: { ocr: { type: "string" }, export: { type: "string" } },
                required: ["ocr", "export"],
              },
            },
            required: ["database", "memory", "workers"],
          },
        },
        required: ["status", "timestamp", "uptime", "checks"],
      },
      HealthLiveResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy"] },
          timestamp: { type: "string" },
          uptime: { type: "number" },
        },
        required: ["status", "timestamp", "uptime"],
      },
      HealthReadyResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
          version: { type: "string" },
          timestamp: { type: "string" },
          checks: {
            type: "object",
            properties: {
              postgres: {
                type: "object",
                properties: { status: { type: "string" }, latencyMs: { type: "number" } },
                required: ["status", "latencyMs"],
              },
              redis: {
                type: "object",
                properties: { status: { type: "string" }, latencyMs: { type: "number" } },
                required: ["status", "latencyMs"],
              },
              storage: {
                type: "object",
                properties: { status: { type: "string" }, latencyMs: { type: "number" } },
                required: ["status", "latencyMs"],
              },
            },
            required: ["postgres", "redis", "storage"],
          },
        },
        required: ["status", "version", "timestamp", "checks"],
      },
      ActuatorHealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["UP", "DOWN"] },
          components: {
            type: "object",
            properties: {
              db: {
                type: "object",
                properties: { status: { type: "string" } },
                required: ["status"],
              },
              diskSpace: {
                type: "object",
                properties: { status: { type: "string" } },
                required: ["status"],
              },
              memory: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  details: {
                    type: "object",
                    properties: {
                      usedMB: { type: "number" },
                      totalMB: { type: "number" },
                      maxMB: { type: "number" },
                    },
                  },
                },
                required: ["status"],
              },
            },
            required: ["db", "diskSpace", "memory"],
          },
          timestamp: { type: "string" },
          uptime: { type: "number" },
        },
        required: ["status", "components", "timestamp", "uptime"],
      },
      ActuatorInfoResponse: {
        type: "object",
        properties: {
          app: {
            type: "object",
            properties: {
              name: { type: "string" },
              version: { type: "string" },
              description: { type: "string" },
            },
            required: ["name", "version", "description"],
          },
          build: {
            type: "object",
            properties: { version: { type: "string" }, timestamp: { type: "string" } },
            required: ["version", "timestamp"],
          },
        },
        required: ["app", "build"],
      },
      ActuatorMetricsResponse: {
        type: "object",
        properties: {
          process: {
            type: "object",
            properties: {
              uptime: { type: "number" },
              startTime: { type: "string" },
              cpu: {
                type: "object",
                properties: { user: { type: "number" }, system: { type: "number" } },
                required: ["user", "system"],
              },
              memory: {
                type: "object",
                properties: {
                  rss: { type: "number" },
                  heapTotal: { type: "number" },
                  heapUsed: { type: "number" },
                  external: { type: "number" },
                  arrayBuffers: { type: "number" },
                },
                required: ["rss", "heapTotal", "heapUsed", "external", "arrayBuffers"],
              },
            },
            required: ["uptime", "startTime", "cpu", "memory"],
          },
          timestamp: { type: "string" },
        },
        required: ["process", "timestamp"],
      },
      ActuatorCatchAllResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      CsrfResponse: {
        type: "object",
        properties: { csrfToken: { type: "string" } },
        required: ["csrfToken"],
      },
      CspReportSuccess: {
        type: "object",
        properties: { status: { type: "string", enum: ["ok"] } },
        required: ["status"],
      },
      CspReportError: {
        type: "object",
        properties: { status: { type: "string", enum: ["error"] } },
        required: ["status"],
      },
      RegisterSuccess: {
        type: "object",
        properties: { message: { type: "string" }, userId: { type: "string" } },
        required: ["message", "userId"],
      },
      ForgotPasswordSuccess: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
      ResetPasswordSuccess: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
      ShareDocumentResponse: {
        type: "object",
        properties: {
          document: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              language: { type: "string" },
              isRtl: { type: "boolean" },
              pageCount: { type: "number" },
              createdAt: { type: "string" },
            },
            required: ["id", "title", "isRtl", "createdAt"],
          },
          content: {
            type: "object",
            properties: { markdown: { type: "string" }, rawText: { type: "string" } },
            required: ["markdown", "rawText"],
          },
          metadata: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, color: { type: "string" } },
                },
              },
              folder: { type: "string" },
              exportFormats: { type: "array", items: { type: "string" } },
            },
            required: ["tags", "exportFormats"],
          },
        },
        required: ["document", "content", "metadata"],
      },
      ShareNotFoundError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      ShareExportBadRequest: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      DocumentListItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          status: { type: "string" },
          fileSize: { type: "number" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          folderId: { type: "string" },
          userId: { type: "string" },
          originalName: { type: "string" },
          mimeType: { type: "string" },
          description: { type: "string" },
          language: { type: "string" },
          isRtl: { type: "boolean" },
          pageCount: { type: "number" },
          outputFormats: { type: "array", items: { type: "string" } },
        },
        required: ["id", "title", "fileSize"],
      },
      DocumentsListResponse: {
        type: "object",
        properties: {
          documents: { type: "array", items: { $ref: "#/components/schemas/DocumentListItem" } },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
            required: ["page", "limit", "total", "totalPages"],
          },
        },
        required: ["documents", "pagination"],
      },
      DocumentDetailResponse: {
        type: "object",
        properties: { document: { type: "object" } },
        required: ["document"],
      },
      DocumentPatchResponse: {
        type: "object",
        properties: { document: { type: "object" } },
        required: ["document"],
      },
      DocumentDeleteResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, message: { type: "string" } },
        required: ["success", "message"],
      },
      BulkDeleteResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          deleted: { type: "integer" },
          message: { type: "string" },
        },
        required: ["success", "deleted", "message"],
      },
      BulkExportResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, message: { type: "string" } },
        required: ["success", "message"],
      },
      BulkMoveResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          moved: { type: "integer" },
          folderId: { type: "string" },
          message: { type: "string" },
        },
        required: ["success", "moved", "message"],
      },
      BulkTagResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          taggedCount: { type: "integer" },
          skippedCount: { type: "integer" },
          message: { type: "string" },
        },
        required: ["success", "taggedCount", "skippedCount", "message"],
      },
      BulkUntagResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          removedCount: { type: "integer" },
          message: { type: "string" },
        },
        required: ["success", "removedCount", "message"],
      },
      BookmarkStatusResponse: {
        type: "object",
        properties: { bookmarked: { type: "boolean" } },
        required: ["bookmarked"],
      },
      DocumentMoveResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, document: { type: "object" } },
        required: ["success", "document"],
      },
      DocumentRestoreResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          document: { type: "object" },
          message: { type: "string" },
        },
        required: ["success", "document", "message"],
      },
      ShareGetResponse: {
        type: "object",
        properties: {
          shared: { type: "boolean" },
          shareId: { type: "string" },
          token: { type: "string" },
          url: { type: "string" },
          documentTitle: { type: "string" },
          expiresAt: { type: "string" },
          isExpired: { type: "boolean" },
          createdAt: { type: "string" },
        },
        required: ["shared"],
      },
      ShareCreateResponse: {
        type: "object",
        properties: {
          shareId: { type: "string" },
          token: { type: "string" },
          url: { type: "string" },
          documentTitle: { type: "string" },
          expiresAt: { type: "string" },
          createdAt: { type: "string" },
        },
        required: ["shareId", "token", "url", "documentTitle", "createdAt"],
      },
      ShareDeleteResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] } },
        required: ["success"],
      },
      ShareRegenerateResponse: {
        type: "object",
        properties: {
          shareId: { type: "string" },
          token: { type: "string" },
          url: { type: "string" },
          documentTitle: { type: "string" },
          expiresAt: { type: "string" },
          createdAt: { type: "string" },
          message: { type: "string" },
        },
        required: ["shareId", "token", "url", "documentTitle", "createdAt", "message"],
      },
      SuggestTagsResponse: {
        type: "object",
        properties: { suggestions: { type: "array", items: { type: "object" } } },
        required: ["suggestions"],
      },
      DocumentTagsGetResponse: {
        type: "object",
        properties: { tags: { type: "array", items: { type: "object" } } },
        required: ["tags"],
      },
      DocumentTagsPostResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, tag: { type: "object" } },
        required: ["success", "tag"],
      },
      DocumentTagsPutResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, tagCount: { type: "integer" } },
        required: ["success", "tagCount"],
      },
      DocumentTagRemoveResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, message: { type: "string" } },
        required: ["success", "message"],
      },
      DocumentExportResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          jobId: { type: "string" },
          message: { type: "string" },
        },
        required: ["success", "jobId", "message"],
      },
      ExportStatusResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ready", "processing"] },
          format: { type: "string" },
          ready: { type: "boolean" },
          downloadUrl: { type: "string" },
        },
        required: ["status", "format", "ready"],
      },
      FoldersListResponse: {
        type: "object",
        properties: { folders: { type: "array", items: { type: "object" } } },
        required: ["folders"],
      },
      FolderCreateResponse: {
        type: "object",
        properties: { folder: { type: "object" } },
        required: ["folder"],
      },
      FolderDetailResponse: {
        type: "object",
        properties: { folder: { type: "object" } },
        required: ["folder"],
      },
      FolderPatchResponse: {
        type: "object",
        properties: { folder: { type: "object" } },
        required: ["folder"],
      },
      FolderDeleteResponse: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
      FolderEmptyResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          documentsMoved: { type: "integer" },
          foldersMoved: { type: "integer" },
        },
        required: ["message", "documentsMoved", "foldersMoved"],
      },
      FolderMoveResponse: {
        type: "object",
        properties: { folder: { type: "object" } },
        required: ["folder"],
      },
      FolderRestoreResponse: {
        type: "object",
        properties: { message: { type: "string" }, folder: { type: "object" } },
        required: ["message", "folder"],
      },
      FolderTagsResponse: {
        type: "object",
        properties: { tags: { type: "array", items: { type: "object" } } },
        required: ["tags"],
      },
      FolderTreeResponse: { type: "object" },
      TagsListResponse: {
        type: "object",
        properties: { tags: { type: "array", items: { type: "object" } } },
        required: ["tags"],
      },
      TagCreateResponse: {
        type: "object",
        properties: { tag: { type: "object" } },
        required: ["tag"],
      },
      TagDetailResponse: {
        type: "object",
        properties: { tag: { type: "object" } },
        required: ["tag"],
      },
      TagPatchResponse: {
        type: "object",
        properties: { tag: { type: "object" } },
        required: ["tag"],
      },
      TagDeleteResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, message: { type: "string" } },
        required: ["success", "message"],
      },
      TagMergeResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          affectedDocuments: { type: "integer" },
          message: { type: "string" },
        },
        required: ["success", "affectedDocuments", "message"],
      },
      SearchResponse: { type: "object" },
      SearchSuggestResponse: {
        type: "object",
        properties: { suggestions: { type: "array", items: { type: "object" } } },
        required: ["suggestions"],
      },
      BookmarksResponse: { type: "object" },
      ProfilePatchResponse: {
        type: "object",
        properties: { user: { type: "object" } },
        required: ["user"],
      },
      ProfileDeleteResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] } },
        required: ["success"],
      },
      UsersListResponse: {
        type: "object",
        properties: { users: { type: "array", items: { type: "object" } } },
        required: ["users"],
      },
      UserDeleteResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] } },
        required: ["success"],
      },
      AnalyticsResponse: { type: "object" },
      ConversionListResponse: { type: "object" },
      ConversionStartResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          jobId: { type: "string" },
          status: { type: "string" },
          message: { type: "string" },
        },
        required: ["success", "jobId", "status", "message"],
      },
      ConversionStatusResponse: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          status: { type: "string" },
          progress: { type: "number" },
          outputs: {
            type: "object",
            nullable: true,
            properties: {
              md: { type: "boolean" },
              txt: { type: "boolean" },
              json: { type: "boolean" },
            },
          },
          readyForExport: { type: "boolean" },
        },
        required: ["jobId", "status", "progress", "readyForExport"],
      },
      MetricsResponse: {
        type: "object",
        properties: {
          timestamp: { type: "string" },
          uptime: { type: "number" },
          memory: {
            type: "object",
            properties: {
              rss: { type: "number" },
              heapUsed: { type: "number" },
              heapTotal: { type: "number" },
            },
            required: ["rss", "heapUsed", "heapTotal"],
          },
          database: {
            type: "object",
            properties: {
              users: { type: "integer" },
              documents: { type: "integer" },
              folders: { type: "integer" },
              tags: { type: "integer" },
              shareLinks: { type: "integer" },
            },
            required: ["users", "documents", "folders", "tags", "shareLinks"],
          },
          workers: {
            type: "object",
            properties: { ocrQueue: { type: "integer" }, exportQueue: { type: "integer" } },
            required: ["ocrQueue", "exportQueue"],
          },
        },
        required: ["timestamp", "uptime", "memory", "database", "workers"],
      },
      UploadSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          jobId: { type: "string" },
          documentId: { type: "string" },
          fileName: { type: "string" },
          fileSize: { type: "number" },
          status: { type: "string" },
          message: { type: "string" },
        },
        required: ["success", "jobId", "documentId", "fileName", "fileSize", "status", "message"],
      },
      WebhooksListResponse: {
        type: "object",
        properties: { webhooks: { type: "array", items: { type: "object" } } },
        required: ["webhooks"],
      },
      WebhookCreateResponse: {
        type: "object",
        properties: { webhook: { type: "object" } },
        required: ["webhook"],
      },
      WebhookDetailResponse: {
        type: "object",
        properties: { webhook: { type: "object" } },
        required: ["webhook"],
      },
      WebhookPatchResponse: {
        type: "object",
        properties: { webhook: { type: "object" } },
        required: ["webhook"],
      },
      WebhookDeleteResponse: {
        type: "object",
        properties: { success: { type: "boolean", enum: [true] }, message: { type: "string" } },
        required: ["success", "message"],
      },
      WebhookStatsResponse: {
        type: "object",
        properties: { stats: { type: "object" } },
        required: ["stats"],
      },
      WebhookTestResponse: { type: "object" },
    },
  },
};

export function getRoutes(): string[] {
  return Object.keys(spec.paths);
}

export function getMethodsForRoute(route: string): string[] {
  const methods = spec.paths[route];
  if (!methods) return [];
  return Object.keys(methods).map((m) => m.toUpperCase());
}

export function getSuccessStatus(route: string, method: string): number[] {
  const pathItem = spec.paths[route];
  if (!pathItem) return [];
  const op = pathItem[method.toLowerCase() as keyof typeof pathItem] as any;
  if (!op?.responses) return [];
  return Object.keys(op.responses)
    .filter((s) => parseInt(s) < 400)
    .map(Number);
}
