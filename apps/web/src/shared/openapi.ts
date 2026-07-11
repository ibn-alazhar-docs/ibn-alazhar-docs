export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Ibn Al-Azhar Docs API",
    version: "1.0.0",
    description:
      "REST API for the Ibn Al-Azhar Docs platform — an Arabic-first document processing pipeline supporting OCR, conversion, export, and sharing.",
    contact: { name: "Ibn Al-Azhar Docs" },
  },
  servers: [{ url: "/api", description: "Same-origin API (use relative paths)" }],
  tags: [
    { name: "Auth", description: "Authentication and registration" },
    { name: "Health", description: "Service health and readiness checks" },
    { name: "Metrics", description: "Admin system metrics" },
    { name: "Profile", description: "User profile management" },
    { name: "Upload", description: "Document upload" },
    { name: "Conversion", description: "Document conversion pipeline" },
    { name: "Documents", description: "Document CRUD and management" },
    { name: "Export", description: "Document export to various formats" },
    { name: "Folders", description: "Folder organization and tree management" },
    { name: "Search", description: "Full-text search and suggestions" },
    { name: "Share", description: "Public document sharing" },
    { name: "Stream", description: "Server-Sent Events for real-time updates" },
    { name: "Tags", description: "Tag CRUD and management" },
    { name: "Users", description: "Admin user management" },
  ],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    userId: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Full health check",
        security: [],
        responses: {
          "200": {
            description: "Service healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthCheck" },
              },
            },
          },
          "503": {
            description: "Service unhealthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthCheck" },
              },
            },
          },
        },
      },
    },
    "/api/health/live": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        security: [],
        responses: {
          "200": {
            description: "Server is alive",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["healthy"] },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness check (dependencies)",
        security: [],
        responses: {
          "200": {
            description: "All dependencies healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadinessCheck" },
              },
            },
          },
          "503": {
            description: "Dependency unhealthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadinessCheck" },
              },
            },
          },
        },
      },
    },
    "/api/metrics": {
      get: {
        tags: ["Metrics"],
        summary: "Admin system metrics",
        responses: {
          "200": {
            description: "System metrics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Metrics" },
              },
            },
          },
        },
      },
    },
    "/api/profile": {
      patch: {
        tags: ["Profile"],
        summary: "Update profile name",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProfileUpdateInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "Delete account (soft-delete)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AccountDeleteInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Account deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/upload": {
      post: {
        tags: ["Upload"],
        summary: "Upload a document (PDF/image)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/UploadInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Upload accepted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UploadResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/conversion/start": {
      post: {
        tags: ["Conversion"],
        summary: "Start document conversion (splitting + OCR)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConversionStartInput" },
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
          "400": { $ref: "#/components/responses/ValidationError" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/conversion/list": {
      get: {
        tags: ["Conversion"],
        summary: "List conversion jobs",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Conversion jobs list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedConversions" },
              },
            },
          },
        },
      },
    },
    "/api/conversion/{id}/status": {
      get: {
        tags: ["Conversion"],
        summary: "Get conversion job status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Conversion status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversionStatus" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/documents": {
      get: {
        tags: ["Documents"],
        summary: "List documents with pagination and filters",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "folderId",
            in: "query",
            schema: { type: "string", description: "CUID" },
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string", maxLength: 200 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated document list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedDocuments" },
              },
            },
          },
        },
      },
    },
    "/api/documents/{id}": {
      get: {
        tags: ["Documents"],
        summary: "Get a single document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Document details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/Document" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Documents"],
        summary: "Update document metadata",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentUpdateInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Document updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/Document" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Soft-delete a document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Document deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/bulk-move": {
      post: {
        tags: ["Documents"],
        summary: "Bulk move documents to a folder",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkMoveInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Documents moved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    moved: { type: "integer" },
                    folderId: { type: "string", nullable: true },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/bulk-tag": {
      post: {
        tags: ["Documents"],
        summary: "Bulk add a tag to documents",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkTagInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Tags applied",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    taggedCount: { type: "integer" },
                    skippedCount: { type: "integer" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/bulk-untag": {
      post: {
        tags: ["Documents"],
        summary: "Bulk remove a tag from documents",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkTagInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Tags removed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    removedCount: { type: "integer" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/move": {
      patch: {
        tags: ["Documents"],
        summary: "Move a document to a folder (or root)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  folderId: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Document moved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    document: { $ref: "#/components/schemas/Document" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/restore": {
      patch: {
        tags: ["Documents"],
        summary: "Restore a soft-deleted document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Document restored",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    document: { $ref: "#/components/schemas/Document" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/tags": {
      get: {
        tags: ["Documents"],
        summary: "List tags on a document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Document tags",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tags: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Tag" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Add a tag to a document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tagId: { type: "string", description: "Tag ID" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Tag added",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    tag: { $ref: "#/components/schemas/Tag" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      put: {
        tags: ["Documents"],
        summary: "Replace all tags on a document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tagIds: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 50,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tags replaced",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    tagCount: { type: "integer" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/tags/{tagId}": {
      delete: {
        tags: ["Documents"],
        summary: "Remove a tag from a document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "tagId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Tag removed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/share": {
      get: {
        tags: ["Documents"],
        summary: "Get document share info",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Share info",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareInfo" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Create a share link",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  expiration: {
                    type: "string",
                    enum: ["never", "7days", "30days"],
                    default: "never",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Share link created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareLink" },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete a share link",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Share link deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/documents/{id}/share/regenerate": {
      post: {
        tags: ["Documents"],
        summary: "Regenerate a share token",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Share token regenerated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareLink" },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/export": {
      post: {
        tags: ["Documents"],
        summary: "Start document export",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DocumentExportInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Export started",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    jobId: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/documents/{id}/export/status": {
      get: {
        tags: ["Documents"],
        summary: "Check document export status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "format",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Export status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["processing", "ready"],
                    },
                    format: { type: "string" },
                    ready: { type: "boolean" },
                    downloadUrl: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/export": {
      post: {
        tags: ["Export"],
        summary: "Export a single document (direct download)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SingleExportInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Binary file download",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/export/{id}/{format}": {
      get: {
        tags: ["Export"],
        summary: "Download an export by ID and format",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "format",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: ["md", "txt", "json", "docx", "epub", "pdf", "searchable-pdf"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Binary file stream",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/export/batch": {
      post: {
        tags: ["Export"],
        summary: "Batch export multiple documents as ZIP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchExportInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "ZIP file download",
            content: {
              "application/zip": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/export/folder": {
      post: {
        tags: ["Export"],
        summary: "Export all documents in a folder as ZIP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FolderExportInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "ZIP file download",
            content: {
              "application/zip": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/export/tag": {
      post: {
        tags: ["Export"],
        summary: "Export all documents with a tag as ZIP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TagExportInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "ZIP file download",
            content: {
              "application/zip": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/folders": {
      get: {
        tags: ["Folders"],
        summary: "List folders (optionally by parent)",
        parameters: [
          {
            name: "parentId",
            in: "query",
            schema: { type: "string", description: "Filter by parent folder" },
          },
        ],
        responses: {
          "200": {
            description: "Folder list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    folders: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Folder" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Folders"],
        summary: "Create a folder",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateFolderInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Folder created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    folder: { $ref: "#/components/schemas/Folder" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/folders/{id}": {
      get: {
        tags: ["Folders"],
        summary: "Get a single folder",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Folder details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    folder: { $ref: "#/components/schemas/Folder" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Folders"],
        summary: "Rename a folder",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Folder renamed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    folder: { $ref: "#/components/schemas/Folder" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      delete: {
        tags: ["Folders"],
        summary: "Delete a folder (soft-delete children)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Folder deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/folders/{id}/tree": {
      get: {
        tags: ["Folders"],
        summary: "Get recursive folder tree",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Folder tree",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    folder: { $ref: "#/components/schemas/FolderTree" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/folders/{id}/move": {
      post: {
        tags: ["Folders"],
        summary: "Move a folder to a new parent",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  parentId: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Folder moved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    folder: { $ref: "#/components/schemas/Folder" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/folders/{id}/empty": {
      post: {
        tags: ["Folders"],
        summary: "Move all children out of a folder (empty it)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Folder emptied",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    documentsMoved: { type: "integer" },
                    foldersMoved: { type: "integer" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/folders/{id}/restore": {
      post: {
        tags: ["Folders"],
        summary: "Restore a soft-deleted folder and its children",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Folder restored",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    folder: { $ref: "#/components/schemas/Folder" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/folders/{id}/tags": {
      get: {
        tags: ["Folders"],
        summary: "List tags associated with a folder",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Folder tags",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tags: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Tag" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/search": {
      get: {
        tags: ["Search"],
        summary: "Full-text search across documents",
        parameters: [
          {
            name: "q",
            in: "query",
            schema: { type: "string", maxLength: 200 },
          },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["title", "folder", "all"],
              default: "all",
            },
          },
          {
            name: "folderId",
            in: "query",
            schema: { type: "string", description: "CUID" },
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"],
            },
          },
          {
            name: "tagId",
            in: "query",
            schema: { type: "string", description: "CUID" },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
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
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/SearchResult" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/search/suggest": {
      get: {
        tags: ["Search"],
        summary: "Search suggestions (autocomplete)",
        parameters: [
          {
            name: "q",
            in: "query",
            schema: { type: "string", maxLength: 200 },
          },
        ],
        responses: {
          "200": {
            description: "Suggestions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/share/{token}": {
      get: {
        tags: ["Share"],
        summary: "View a shared document (public)",
        security: [],
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Shared document data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SharedDocument" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "410": {
            description: "Share link expired",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "object",
                      properties: {
                        code: { type: "string", enum: ["EXPIRED"] },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/share/{token}/export/{format}": {
      get: {
        tags: ["Share"],
        summary: "Export a shared document (public)",
        security: [],
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "format",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: ["md", "txt", "json", "docx", "pdf", "epub", "searchable-pdf"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Binary file",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/stream": {
      get: {
        tags: ["Stream"],
        summary: "Server-Sent Events stream for real-time updates",
        parameters: [
          {
            name: "jobId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "SSE event stream",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  description: "Events: connected, progress, complete, timeout, warning",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "object",
                      properties: {
                        code: { type: "string", enum: ["FORBIDDEN"] },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/tags": {
      get: {
        tags: ["Tags"],
        summary: "List all tags",
        responses: {
          "200": {
            description: "Tags list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tags: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Tag" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Create a tag",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTagInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Tag created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tag: { $ref: "#/components/schemas/Tag" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/tags/{id}": {
      get: {
        tags: ["Tags"],
        summary: "Get a single tag",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Tag details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tag: { $ref: "#/components/schemas/Tag" },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Tags"],
        summary: "Update a tag",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTagInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Tag updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tag: { $ref: "#/components/schemas/Tag" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Tags"],
        summary: "Delete a tag",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Tag deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/tags/merge": {
      post: {
        tags: ["Tags"],
        summary: "Merge one tag into another",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sourceTagId: { type: "string" },
                  targetTagId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tags merged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    affectedDocuments: { type: "integer" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users (admin only)",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated user list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user role (admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["ADMIN", "STUDENT", "TEACHER"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User role updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user (admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "NextAuth.js session cookie (auto-set after login)",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      HealthCheck: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
          timestamp: { type: "string", format: "date-time" },
          uptime: { type: "number" },
          checks: {
            type: "object",
            properties: {
              database: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok", "error"] },
                  latencyMs: { type: "number" },
                },
              },
              memory: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok", "warning", "error"] },
                  usedMB: { type: "number" },
                  limit: { type: "number" },
                },
              },
              workers: {
                type: "object",
                properties: {
                  ocr: { type: "string", enum: ["ok", "unknown"] },
                  export: { type: "string", enum: ["ok", "unknown"] },
                },
              },
            },
          },
        },
      },
      ReadinessCheck: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
          version: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          checks: {
            type: "object",
            properties: {
              postgres: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  latencyMs: { type: "number" },
                },
              },
              redis: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  latencyMs: { type: "number" },
                },
              },
              minio: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  latencyMs: { type: "number" },
                },
              },
            },
          },
        },
      },
      Metrics: {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
          uptime: { type: "number" },
          memory: {
            type: "object",
            properties: {
              rss: { type: "number" },
              heapUsed: { type: "number" },
              heapTotal: { type: "number" },
            },
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
          },
          workers: {
            type: "object",
            properties: {
              ocrQueue: { type: "integer" },
              exportQueue: { type: "integer" },
            },
          },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password", "confirmPassword"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          email: { type: "string", format: "email" },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 128,
            description: "Must contain uppercase, lowercase, and digit",
          },
          confirmPassword: { type: "string" },
        },
      },
      ProfileUpdateInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
        },
      },
      AccountDeleteInput: {
        type: "object",
        required: ["password"],
        properties: {
          password: { type: "string" },
        },
      },
      UploadInput: {
        type: "object",
        required: ["file"],
        properties: {
          file: {
            type: "string",
            format: "binary",
            description: "PDF, JPEG, or PNG file",
          },
          folderId: {
            type: "string",
            nullable: true,
            description: "Target folder CUID",
          },
          pageRange: {
            type: "string",
            nullable: true,
            description: "e.g. '1-5' or '3'",
          },
        },
      },
      UploadResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          jobId: { type: "string" },
          documentId: { type: "string" },
          fileName: { type: "string" },
          fileSize: { type: "integer" },
          status: { type: "string", enum: ["pending"] },
          message: { type: "string" },
        },
      },
      ConversionStartInput: {
        type: "object",
        required: ["documentId"],
        properties: {
          documentId: { type: "string" },
        },
      },
      ConversionStartResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          jobId: { type: "string" },
          status: { type: "string", enum: ["splitting"] },
          message: { type: "string" },
        },
      },
      PaginatedConversions: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ConversionJob" },
          },
          total: { type: "integer" },
          page: { type: "integer" },
          limit: { type: "integer" },
        },
      },
      ConversionJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          documentId: { type: "string" },
          status: {
            type: "string",
            enum: ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"],
          },
          progress: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ConversionStatus: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          status: { type: "string" },
          progress: { type: "integer" },
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
      },
      PaginatedDocuments: {
        type: "object",
        properties: {
          documents: {
            type: "array",
            items: { $ref: "#/components/schemas/Document" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      Document: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string" },
          language: { type: "string" },
          isRtl: { type: "boolean" },
          pageCount: { type: "integer" },
          fileSize: { type: "integer" },
          mimeType: { type: "string" },
          folderId: { type: "string", nullable: true },
          userId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DocumentUpdateInput: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", nullable: true, maxLength: 500 },
          folderId: { type: "string", nullable: true },
        },
      },
      BulkMoveInput: {
        type: "object",
        required: ["documentIds"],
        properties: {
          documentIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 50,
          },
          folderId: { type: "string", nullable: true },
        },
      },
      BulkTagInput: {
        type: "object",
        required: ["documentIds", "tagId"],
        properties: {
          documentIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 50,
          },
          tagId: { type: "string" },
        },
      },
      ShareInfo: {
        type: "object",
        properties: {
          shared: { type: "boolean" },
          shareId: { type: "string" },
          token: { type: "string" },
          url: { type: "string" },
          documentTitle: { type: "string" },
          expiresAt: { type: "string", nullable: true },
          isExpired: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ShareLink: {
        type: "object",
        properties: {
          shareId: { type: "string" },
          token: { type: "string" },
          url: { type: "string" },
          documentTitle: { type: "string" },
          expiresAt: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      DocumentExportInput: {
        type: "object",
        required: ["format"],
        properties: {
          format: {
            type: "string",
            enum: ["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"],
          },
          options: {
            type: "object",
            properties: {
              destination: {
                type: "string",
                enum: ["local", "drive"],
              },
              profile: {
                type: "string",
                enum: ["research", "archive", "plain", "developer"],
              },
            },
          },
        },
      },
      SingleExportInput: {
        type: "object",
        required: ["documentId", "format", "profile"],
        properties: {
          documentId: { type: "string" },
          format: {
            type: "string",
            enum: ["md", "txt", "json", "zip", "docx", "epub", "pdf"],
          },
          profile: {
            type: "string",
            enum: ["research", "archive", "plain", "developer"],
          },
          includeSource: { type: "boolean", default: false },
          pageRange: { type: "string" },
        },
      },
      BatchExportInput: {
        type: "object",
        required: ["documentIds", "format", "profile"],
        properties: {
          documentIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 50,
          },
          format: {
            type: "string",
            enum: ["md", "txt", "json", "zip", "docx", "epub", "pdf"],
          },
          profile: {
            type: "string",
            enum: ["research", "archive", "plain", "developer"],
          },
          includeSource: { type: "boolean", default: false },
        },
      },
      FolderExportInput: {
        type: "object",
        required: ["folderId", "format", "profile"],
        properties: {
          folderId: { type: "string" },
          format: {
            type: "string",
            enum: ["md", "txt", "json", "zip", "docx", "epub", "pdf"],
          },
          profile: {
            type: "string",
            enum: ["research", "archive", "plain", "developer"],
          },
          includeSource: { type: "boolean", default: false },
          recursive: { type: "boolean", default: true },
        },
      },
      TagExportInput: {
        type: "object",
        required: ["tagId", "format", "profile"],
        properties: {
          tagId: { type: "string" },
          format: {
            type: "string",
            enum: ["md", "txt", "json", "zip", "docx", "epub", "pdf"],
          },
          profile: {
            type: "string",
            enum: ["research", "archive", "plain", "developer"],
          },
          includeSource: { type: "boolean", default: false },
        },
      },
      Folder: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          parentId: { type: "string", nullable: true },
          color: { type: "string", nullable: true },
          icon: { type: "string", nullable: true },
          userId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      FolderTree: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          parentId: { type: "string", nullable: true },
          children: {
            type: "array",
            items: { $ref: "#/components/schemas/FolderTree" },
          },
        },
      },
      CreateFolderInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          parentId: { type: "string", nullable: true },
          color: {
            type: "string",
            nullable: true,
            description: "Hex color (e.g. #16A34A)",
          },
          icon: { type: "string", nullable: true, maxLength: 50 },
        },
      },
      SearchResult: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          status: { type: "string" },
          folderId: { type: "string", nullable: true },
          snippet: { type: "string" },
          score: { type: "number" },
        },
      },
      SharedDocument: {
        type: "object",
        properties: {
          document: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string", nullable: true },
              language: { type: "string" },
              isRtl: { type: "boolean" },
              pageCount: { type: "integer" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          content: {
            type: "object",
            properties: {
              markdown: { type: "string" },
              rawText: { type: "string" },
            },
          },
          metadata: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    color: { type: "string" },
                  },
                },
              },
              folder: { type: "string", nullable: true },
              exportFormats: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTagInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          color: {
            type: "string",
            default: "#16A34A",
            description: "Hex color",
          },
        },
      },
      UpdateTagInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          color: { type: "string", description: "Hex color" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", nullable: true },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "STUDENT", "TEACHER"] },
          image: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "Unauthorized (not authenticated)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      RateLimited: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: {
                  type: "object",
                  properties: {
                    code: { type: "string", enum: ["RATE_LIMITED"] },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
        headers: {
          "Retry-After": {
            schema: { type: "integer" },
            description: "Seconds to wait before retrying",
          },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
} as const;
