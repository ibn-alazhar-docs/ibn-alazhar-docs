# 🗺️ Test Map — What Tests What

> Complete mapping of source code to test files across the monorepo.

---

## Pipeline (`packages/pipeline/src/`)

| Source File       | Test File(s)                                                                | Coverage |
| ----------------- | --------------------------------------------------------------------------- | -------- |
| `config.ts`       | `tests/backend/config.test.ts`                                              | ✅ Full  |
| `ocr.ts`          | `tests/backend/ocr-manager.test.ts`                                         | ✅ Full  |
| `ocr-provider.ts` | `tests/backend/ocr-types.test.ts`                                           | ✅ Full  |
| `storage.ts`      | `tests/backend/storage.test.ts`, `tests/backend/storage-rate-limit.test.ts` | ✅ Full  |
| `types.ts`        | `tests/backend/types.test.ts`                                               | ✅ Full  |
| `google-drive.ts` | `tests/backend/google-drive.test.ts`                                        | ✅ Full  |

### OCR Providers

| Source File                  | Test File(s)                                | Coverage |
| ---------------------------- | ------------------------------------------- | -------- |
| `ocr-providers/gemini.ts`    | `tests/backend/ocr-providers-cloud.test.ts` | ✅ Full  |
| `ocr-providers/google.ts`    | `tests/backend/ocr-providers-cloud.test.ts` | ✅ Full  |
| `ocr-providers/surya.ts`     | `tests/backend/ocr-providers-local.test.ts` | ✅ Full  |
| `ocr-providers/tesseract.ts` | `tests/backend/ocr-providers-local.test.ts` | ✅ Full  |
| `ocr-providers/types.ts`     | `tests/backend/ocr-types.test.ts`           | ✅ Full  |

### Text Processing

| Source File         | Test File(s)                                                     | Coverage |
| ------------------- | ---------------------------------------------------------------- | -------- |
| `text/clean.ts`     | `tests/backend/text.test.ts`, `tests/backend/edge-cases.test.ts` | ✅ Full  |
| `text/analyze.ts`   | `tests/backend/text.test.ts`                                     | ✅ Full  |
| `text/constants.ts` | `tests/backend/text.test.ts`                                     | ✅ Full  |
| `text/index.ts`     | `tests/backend/text.test.ts`                                     | ✅ Full  |

### Output Formats

| Source File          | Test File(s)                   | Coverage |
| -------------------- | ------------------------------ | -------- |
| `output/index.ts`    | `tests/backend/output.test.ts` | ✅ Full  |
| `output/markdown.ts` | `tests/backend/output.test.ts` | ✅ Full  |
| `output/json.ts`     | `tests/backend/output.test.ts` | ✅ Full  |
| `output/txt.ts`      | `tests/backend/output.test.ts` | ✅ Full  |
| `output/pdf.ts`      | `tests/backend/output.test.ts` | ✅ Full  |
| `output/pandoc.ts`   | `tests/backend/output.test.ts` | ✅ Full  |

### Queue

| Source File           | Test File(s)                                 | Coverage |
| --------------------- | -------------------------------------------- | -------- |
| `queue/index.ts`      | `tests/backend/queue.test.ts`                | ✅ Full  |
| `queue/connection.ts` | `tests/backend/queue-infrastructure.test.ts` | ✅ Full  |
| `queue/enqueue.ts`    | `tests/backend/queue.test.ts`                | ✅ Full  |
| `queue/workers.ts`    | `tests/backend/queue.test.ts`                | ✅ Full  |
| `queue/dlq.ts`        | `tests/backend/queue-infrastructure.test.ts` | ✅ Full  |
| `queue/metrics.ts`    | `tests/backend/queue.test.ts`                | ✅ Full  |
| `queue/categorize.ts` | `tests/backend/queue.test.ts`                | ✅ Full  |

### Property-Based / Edge

| Source File                    | Test File(s)                                   | Coverage       |
| ------------------------------ | ---------------------------------------------- | -------------- |
| `text/clean.ts` + `ocr.ts`     | `tests/backend/property-based.test.ts`         | ✅ Full        |
| `text/clean.ts` + `storage.ts` | `tests/backend/edge-cases.test.ts`             | ✅ Full        |
| Pipeline + Queue + Text        | `tests/integration/full-pipeline-flow.test.ts` | ✅ Integration |

---

## Database (`packages/database/src/`)

| Source File     | Test File(s)                                                                         | Coverage |
| --------------- | ------------------------------------------------------------------------------------ | -------- |
| `index.ts`      | `tests/backend/database-constraints.test.ts`, `tests/backend/database-index.test.ts` | ✅ Full  |
| `encryption.ts` | `tests/backend/encryption.test.ts`                                                   | ✅ Full  |

---

## Shared (`packages/shared/src/`)

| Source File        | Test File(s)                          | Coverage |
| ------------------ | ------------------------------------- | -------- |
| `types.ts`         | `tests/backend/shared-types.test.ts`  | ✅ Full  |
| `logger.ts`        | `tests/backend/logger.test.ts`        | ✅ Full  |
| `health-server.ts` | `tests/backend/health-server.test.ts` | ✅ Full  |

---

## API Routes (`apps/web/src/app/api/`)

| Route                                     | Test File(s)                                                                                          | Coverage           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ |
| `POST /api/upload`                        | `tests/api/upload.test.ts`, `tests/api/contract-validation.test.ts`, `tests/fuzz/fuzz-upload.test.ts` | ✅ Contract + Fuzz |
| `GET /api/documents`                      | `tests/api/documents.test.ts`, `tests/fuzz/documents-fuzz.test.ts`                                    | ✅                 |
| `POST /api/documents`                     | `tests/api/documents.test.ts`, `tests/fuzz/documents-fuzz.test.ts`                                    | ✅                 |
| `GET /api/documents/[id]`                 | `tests/api/documents.test.ts`, `tests/fuzz/document-id-fuzz.test.ts`                                  | ✅                 |
| `DELETE /api/documents/[id]`              | `tests/api/documents.test.ts`                                                                         | ✅                 |
| `POST /api/documents/bulk-delete`         | `tests/api/export.test.ts`                                                                            | ✅                 |
| `POST /api/documents/bulk-export`         | `tests/api/export.test.ts`                                                                            | ✅                 |
| `POST /api/documents/bulk-move`           | `tests/api/documents.test.ts`                                                                         | ✅                 |
| `POST /api/documents/bulk-tag`            | `tests/api/documents.test.ts`                                                                         | ✅                 |
| `POST /api/documents/bulk-untag`          | `tests/api/documents.test.ts`                                                                         | ✅                 |
| `GET /api/health`                         | `tests/api/health.test.ts`, `tests/api/health-endpoints.test.ts`, `tests/api/contract-api.test.ts`    | ✅ Schema          |
| `GET /api/health/live`                    | `tests/api/health-endpoints.test.ts`                                                                  | ✅                 |
| `GET /api/health/ready`                   | `tests/api/health-endpoints.test.ts`                                                                  | ✅                 |
| `POST /api/auth/register`                 | `tests/api/auth.test.ts`, `tests/fuzz/auth-register-fuzz.test.ts`                                     | ✅                 |
| `POST /api/auth/forgot-password`          | `tests/api/auth.test.ts`, `tests/fuzz/auth-forgot-password-fuzz.test.ts`                              | ✅                 |
| `POST /api/auth/reset-password`           | `tests/api/auth.test.ts`, `tests/fuzz/auth-reset-password-fuzz.test.ts`                               | ✅                 |
| `POST /api/auth/verify-email`             | `tests/api/auth.test.ts`, `tests/fuzz/auth-verify-email-fuzz.test.ts`                                 | ✅                 |
| `GET /api/tags`                           | `tests/api/tags.test.ts`, `tests/fuzz/tags-fuzz.test.ts`                                              | ✅                 |
| `POST /api/tags`                          | `tests/api/tags.test.ts`, `tests/fuzz/tags-fuzz.test.ts`                                              | ✅                 |
| `PUT /api/tags/[id]`                      | `tests/api/tags.test.ts`, `tests/fuzz/tag-id-fuzz.test.ts`                                            | ✅                 |
| `DELETE /api/tags/[id]`                   | `tests/api/tags.test.ts`, `tests/fuzz/tag-id-fuzz.test.ts`                                            | ✅                 |
| `POST /api/tags/merge`                    | `tests/api/tags.test.ts`, `tests/fuzz/tags-merge-fuzz.test.ts`                                        | ✅                 |
| `GET /api/folders`                        | `tests/api/folders.test.ts`, `tests/fuzz/folders-fuzz.test.ts`                                        | ✅                 |
| `POST /api/folders`                       | `tests/api/folders.test.ts`                                                                           | ✅                 |
| `GET /api/folders/[id]`                   | `tests/api/folders.test.ts`, `tests/fuzz/folder-id-fuzz.test.ts`                                      | ✅                 |
| `PUT /api/folders/[id]`                   | `tests/api/folders.test.ts`                                                                           | ✅                 |
| `DELETE /api/folders/[id]`                | `tests/api/folders.test.ts`                                                                           | ✅                 |
| `POST /api/folders/[id]/move`             | `tests/api/folders.test.ts`, `tests/fuzz/folder-move-empty-fuzz.test.ts`                              | ✅                 |
| `GET /api/folders/[id]/tree`              | `tests/api/folders.test.ts`                                                                           | ✅                 |
| `POST /api/folders/[id]/empty`            | `tests/api/folders.test.ts`                                                                           | ✅                 |
| `GET /api/search`                         | `tests/api/search.test.ts`, `tests/fuzz/search-fuzz.test.ts`                                          | ✅                 |
| `GET /api/search/suggest`                 | `tests/api/search.test.ts`                                                                            | ✅                 |
| `GET /api/profile`                        | `tests/api/profile.test.ts`, `tests/fuzz/profile-fuzz.test.ts`                                        | ✅                 |
| `PUT /api/profile`                        | `tests/api/profile.test.ts`                                                                           | ✅                 |
| `GET /api/share/[token]`                  | `tests/api/share.test.ts`, `tests/fuzz/share-fuzz.test.ts`                                            | ✅                 |
| `POST /api/share/[token]/export/[format]` | `tests/api/share.test.ts`                                                                             | ✅                 |
| `GET /api/export`                         | `tests/api/export.test.ts`                                                                            | ✅                 |
| `POST /api/export`                        | `tests/api/export.test.ts`                                                                            | ✅                 |
| `GET /api/export/[id]/[format]`           | `tests/api/export.test.ts`, `tests/fuzz/export-document-fuzz.test.ts`                                 | ✅                 |
| `POST /api/export/batch`                  | `tests/api/export.test.ts`, `tests/fuzz/export-batch-folder-tag-fuzz.test.ts`                         | ✅                 |
| `POST /api/export/folder`                 | `tests/api/export.test.ts`                                                                            | ✅                 |
| `POST /api/export/tag`                    | `tests/api/export.test.ts`                                                                            | ✅                 |
| `POST /api/conversion/start`              | `tests/api/conversion.test.ts`, `tests/fuzz/conversion-fuzz.test.ts`                                  | ✅                 |
| `GET /api/conversion/[id]/status`         | `tests/api/conversion.test.ts`                                                                        | ✅                 |
| `GET /api/conversion/list`                | `tests/api/conversion.test.ts`                                                                        | ✅                 |
| `GET /api/stream`                         | `tests/api/stream.test.ts`, `tests/fuzz/stream-fuzz.test.ts`                                          | ✅                 |
| `GET /api/analytics`                      | `tests/api/analytics.test.ts`                                                                         | ✅                 |
| `GET /api/bookmarks`                      | `tests/api/bookmarks.test.ts`, `tests/fuzz/bookmarks-fuzz.test.ts`                                    | ✅                 |
| `POST /api/bookmarks`                     | `tests/api/bookmarks.test.ts`                                                                         | ✅                 |
| `DELETE /api/bookmarks`                   | `tests/api/bookmarks.test.ts`                                                                         | ✅                 |
| `GET /api/users`                          | `tests/api/users.test.ts`                                                                             | ✅                 |
| `GET/POST/DELETE /api/webhooks`           | `tests/api/api-routes.spec.ts`                                                                        | ✅                 |
| `GET /api/actuator/health`                | `tests/api/actuator.test.ts`                                                                          | ✅                 |
| `GET /api/actuator/info`                  | `tests/api/actuator.test.ts`                                                                          | ✅                 |
| `GET /api/actuator/metrics`               | `tests/api/actuator.test.ts`                                                                          | ✅                 |
| `GET /api/actuator/prometheus`            | `tests/api/actuator.test.ts`                                                                          | ✅                 |

---

## Backend Core Services (`apps/web/src/core/services/`)

| Source File                   | Test File(s)                                                        | Coverage |
| ----------------------------- | ------------------------------------------------------------------- | -------- |
| `document-crud.use-cases.ts`  | `tests/backend/document-crud.test.ts`                               | ✅ Full  |
| `document-move.use-cases.ts`  | `tests/backend/document-move.test.ts`                               | ✅ Full  |
| `document-share.use-cases.ts` | `tests/backend/document-share.test.ts`                              | ✅ Full  |
| `document-tag.use-cases.ts`   | `tests/backend/document-tag-use-cases.test.ts`                      | ✅ Full  |
| `folder.use-cases.ts`         | `tests/backend/folder-use-cases.test.ts`                            | ✅ Full  |
| `tag.use-cases.ts`            | `tests/backend/tag-use-cases.test.ts`, `tests/backend/tags.test.ts` | ✅ Full  |
| `registration.use-cases.ts`   | `tests/backend/registration.test.ts`                                | ✅ Full  |
| `search.use-cases.ts`         | `tests/backend/search.test.ts`                                      | ✅ Full  |
| `profile.use-cases.ts`        | `tests/backend/profile.test.ts`                                     | ✅ Full  |
| `export.use-cases.ts`         | tests/backend/conversion.test.ts`                                   | ✅ Full  |
| `user.use-cases.ts`           | `tests/backend/user.test.ts`                                        | ✅ Full  |
| `analytics.use-cases.ts`      | `tests/backend/dashboard.test.ts`                                   | ✅ Full  |
| `dashboard.service.ts`        | `tests/backend/dashboard.test.ts`                                   | ✅ Full  |
| `conversion.use-cases.ts`     | `tests/backend/conversion.test.ts`                                  | ✅ Full  |
| `authorization.ts`            | `tests/backend/authorization.test.ts`                               | ✅ Full  |
| `services-use-cases.ts`       | `tests/backend/services-use-cases.test.ts`                          | ✅ Full  |

### Export Sub-modules

| Source File             | Test File(s)                                 | Coverage       |
| ----------------------- | -------------------------------------------- | -------------- |
| `export/metadata.ts`    | `tests/frontend/export-metadata.test.ts`     | ✅ Full        |
| `export/profiles.ts`    | `tests/frontend/export-profiles.test.ts`     | ✅ Full        |
| `export/validators.ts`  | `tests/frontend/export-validators.test.ts`   | ✅ Full        |
| `export/zip-builder.ts` | `tests/integration/zip-builder-flow.test.ts` | ✅ Integration |

---

## Repositories (`apps/web/src/core/repositories/`)

| Source File                        | Test File(s)                                   | Coverage |
| ---------------------------------- | ---------------------------------------------- | -------- |
| `document.repository.ts`           | `tests/backend/document-crud.test.ts`          | ✅       |
| `folder.repository.ts`             | `tests/backend/folder-use-cases.test.ts`       | ✅       |
| `tag.repository.ts`                | `tests/backend/tags.test.ts`                   | ✅       |
| `tag-document.repository.ts`       | `tests/backend/document-tag-use-cases.test.ts` | ✅       |
| `search.repository.ts`             | `tests/backend/search.test.ts`                 | ✅       |
| `share.repository.ts`              | `tests/backend/document-share.test.ts`         | ✅       |
| `user.repository.ts`               | `tests/backend/user.test.ts`                   | ✅       |
| `account.repository.ts`            | `tests/backend/registration.test.ts`           | ✅       |
| `conversion-job.repository.ts`     | `tests/backend/conversion.test.ts`             | ✅       |
| `bookmark.repository.ts`           | tests/backend/bookmarks\*`                     | ✅       |
| `storage.repository.ts`            | `tests/backend/storage.test.ts`                | ✅       |
| `verification-token.repository.ts` | `tests/backend/registration.test.ts`           | ✅       |
| `webhook.repository.ts`            | covered by API route tests                     | ✅       |

---

## Frontend — Validators (`apps/web/src/shared/validators/`)

| Source File   | Test File(s)                                 | Coverage   |
| ------------- | -------------------------------------------- | ---------- |
| `auth.ts`     | `tests/frontend/validators-auth.test.ts`     | ✅ Full    |
| `document.ts` | `tests/frontend/validators-document.test.ts` | ✅ Full    |
| `folder.ts`   | `tests/frontend/validators-folder.test.ts`   | ✅ Full    |
| `share.ts`    | `tests/frontend/validators-share.test.ts`    | ✅ Full    |
| `tag.ts`      | `tests/frontend/validators-tag.test.ts`      | ✅ Full    |
| `webhook.ts`  | —                                            | ❌ Missing |

---

## Frontend — Shared (`apps/web/src/shared/`)

| Source File                  | Test File(s)                               | Coverage |
| ---------------------------- | ------------------------------------------ | -------- |
| `cn.ts` (utility)            | `tests/frontend/cn.test.ts`                | ✅ Full  |
| `build-folder-tree.ts`       | `tests/frontend/build-folder-tree.test.ts` | ✅ Full  |
| `conversion-status-utils.ts` | `tests/frontend/conversion-status.test.ts` | ✅ Full  |
| `i18n.ts`                    | `tests/frontend/i18n.test.ts`              | ✅ Full  |
| `auth-guards.ts`             | `tests/frontend/auth-guards.test.ts`       | ✅ Full  |
| `metadata.ts`                | `tests/frontend/metadata.test.ts`          | ✅ Full  |

---

## Integration Tests

| Flow                              | Test File                                                                                                | Coverage |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| Full OCR → Text → Output pipeline | `tests/integration/full-pipeline-flow.test.ts`                                                           | ✅       |
| Auth + Session lifecycle          | `tests/integration/auth-session-flow.test.ts`                                                            | ✅       |
| Document CRUD end-to-end          | `tests/integration/document-crud-use-case.test.ts`, `tests/integration/document-management-flow.test.ts` | ✅       |
| Document ownership & scoping      | `tests/integration/document-ownership.test.ts`                                                           | ✅       |
| Folder + Documents relationship   | `tests/integration/folder-documents.test.ts`                                                             | ✅       |
| OCR provider failover             | `tests/integration/ocr-provider-failover.test.ts`                                                        | ✅       |
| PDF split                         | `tests/integration/pdf-split.test.ts`                                                                    | ✅       |
| Pipeline → Export flow            | `tests/integration/pipeline-export-flow.test.ts`                                                         | ✅       |
| Pipeline → Text flow              | `tests/integration/pipeline-text-flow.test.ts`                                                           | ✅       |
| Search + PostgreSQL               | `tests/integration/search-postgres.test.ts`                                                              | ✅       |
| Search + Tags flow                | `tests/integration/search-tag-flow.test.ts`                                                              | ✅       |
| Share + Export flow               | `tests/integration/share-export-flow.test.ts`, `tests/integration/share-export.test.ts`                  | ✅       |
| Tags + Documents relationship     | `tests/integration/tags-documents.test.ts`                                                               | ✅       |
| Tag use case                      | `tests/integration/tag-use-case.test.ts`                                                                 | ✅       |
| Zip builder                       | `tests/integration/zip-builder-flow.test.ts`                                                             | ✅       |

---

## E2E Tests

| Feature               | Test File                                                               | POM                             | Coverage |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------- | -------- |
| Auth flows            | `tests/e2e/auth-flows.spec.ts`                                          | `AuthPage.ts`                   | ✅       |
| Document CRUD         | `tests/e2e/document-crud.spec.ts`                                       | `DocumentsPage.ts`              | ✅       |
| Folder management     | `tests/e2e/folder-management.spec.ts`                                   | `FoldersPage.ts`                | ✅       |
| Search & tags         | `tests/e2e/search-tag.spec.ts`                                          | `SearchPage.ts`, `TagsPage.ts`  | ✅       |
| Export & share        | `tests/e2e/export-share.spec.ts`                                        | `ExportPage.ts`, `SharePage.ts` | ✅       |
| Admin flows           | `tests/e2e/admin-flows.spec.ts`                                         | `AdminPage.ts`                  | ✅       |
| Error states          | `tests/e2e/error-states.spec.ts`                                        | —                               | ✅       |
| i18n / RTL            | `tests/e2e/i18n-rtl.spec.ts`                                            | —                               | ✅       |
| Accessibility         | `tests/e2e/accessibility.spec.ts`, `tests/e2e/a11y-*.spec.ts` (6 files) | —                               | ✅       |
| Visual regression     | `tests/e2e/visual-*.spec.ts` (4 files)                                  | —                               | ✅       |
| Security              | `tests/e2e/security.spec.ts`                                            | —                               | ✅       |
| Comprehensive journey | `tests/e2e/comprehensive-journey.spec.ts`                               | —                               | ✅       |
| QA scenarios          | `tests/e2e/qa.spec.ts`, `tests/e2e/qa2.spec.ts`                         | —                               | ✅       |
| Webapp smoke          | `tests/e2e/webapp-smoke.test.ts`                                        | —                               | ✅       |

### Page Object Models

| Page Object | File                               |
| ----------- | ---------------------------------- |
| Auth        | `tests/e2e/pages/AuthPage.ts`      |
| Dashboard   | `tests/e2e/pages/DashboardPage.ts` |
| Documents   | `tests/e2e/pages/DocumentsPage.ts` |
| Files       | `tests/e2e/pages/FilesPage.ts`     |
| Folders     | `tests/e2e/pages/FoldersPage.ts`   |
| Login       | `tests/e2e/pages/LoginPage.ts`     |
| Profile     | `tests/e2e/pages/ProfilePage.ts`   |
| Search      | `tests/e2e/pages/SearchPage.ts`    |
| Share       | `tests/e2e/pages/SharePage.ts`     |
| Tags        | `tests/e2e/pages/TagsPage.ts`      |
| Admin       | `tests/e2e/pages/AdminPage.ts`     |
| Export      | `tests/e2e/pages/ExportPage.ts`    |

---

## Fuzz Tests

| Endpoint / Schema          | Test File                                         | Tests |
| -------------------------- | ------------------------------------------------- | ----- |
| Upload contract validation | `tests/fuzz/fuzz-upload.test.ts`                  | ✅    |
| Documents API              | `tests/fuzz/documents-fuzz.test.ts`               | ✅    |
| Document ID param          | `tests/fuzz/document-id-fuzz.test.ts`             | ✅    |
| Auth register              | `tests/fuzz/auth-register-fuzz.test.ts`           | ✅    |
| Auth forgot-password       | `tests/fuzz/auth-forgot-password-fuzz.test.ts`    | ✅    |
| Auth reset-password        | `tests/fuzz/auth-reset-password-fuzz.test.ts`     | ✅    |
| Auth verify-email          | `tests/fuzz/auth-verify-email-fuzz.test.ts`       | ✅    |
| Bookmarks                  | `tests/fuzz/bookmarks-fuzz.test.ts`               | ✅    |
| Conversion                 | `tests/fuzz/conversion-fuzz.test.ts`              | ✅    |
| Export document            | `tests/fuzz/export-document-fuzz.test.ts`         | ✅    |
| Export batch/folder/tag    | `tests/fuzz/export-batch-folder-tag-fuzz.test.ts` | ✅    |
| Folders                    | `tests/fuzz/folders-fuzz.test.ts`                 | ✅    |
| Folder ID param            | `tests/fuzz/folder-id-fuzz.test.ts`               | ✅    |
| Folder move (empty)        | `tests/fuzz/folder-move-empty-fuzz.test.ts`       | ✅    |
| Profile                    | `tests/fuzz/profile-fuzz.test.ts`                 | ✅    |
| Search                     | `tests/fuzz/search-fuzz.test.ts`                  | ✅    |
| Share                      | `tests/fuzz/share-fuzz.test.ts`                   | ✅    |
| Stream                     | `tests/fuzz/stream-fuzz.test.ts`                  | ✅    |
| Tag ID param               | `tests/fuzz/tag-id-fuzz.test.ts`                  | ✅    |
| Tags                       | `tests/fuzz/tags-fuzz.test.ts`                    | ✅    |
| Tags merge                 | `tests/fuzz/tags-merge-fuzz.test.ts`              | ✅    |
| Zod validation schemas     | `tests/fuzz/validation-schemas-fuzz.test.ts`      | ✅    |

---

## Security Tests

| Area                                              | Test File                                         | Coverage |
| ------------------------------------------------- | ------------------------------------------------- | -------- |
| Auth security (JWT, sessions, CSRF)               | `tests/security/auth-security.test.ts`            | ✅       |
| Upload security (file type, size, path traversal) | `tests/security/upload-security.test.ts`          | ✅       |
| IDOR / authorization                              | `tests/security/idor-authorization.test.ts`       | ✅       |
| Input validation                                  | `tests/security/input-validation.test.ts`         | ✅       |
| Rate limiting + CSRF                              | `tests/security/rate-limit-csrf.test.ts`          | ✅       |
| Rate limit IP validation                          | `tests/security/rate-limit-ip-validation.test.ts` | ✅       |
| Share security                                    | `tests/security/share-security.test.ts`           | ✅       |
| SSRF prevention                                   | `tests/security/ssrf-prevention.test.ts`          | ✅       |
| Search validation                                 | `tests/security/search-validation.test.ts`        | ✅       |
| Pagination validation                             | `tests/security/pagination-validation.test.ts`    | ✅       |
| Export validation                                 | `tests/security/export-validation.test.ts`        | ✅       |
| OCR injection prevention                          | `tests/security/ocr-injection-prevention.test.ts` | ✅       |
| Headers configuration                             | `tests/security/headers-config.test.ts`           | ✅       |

---

## Pentest (OWASP) Tests

| Category             | Test File                                     | Tests |
| -------------------- | --------------------------------------------- | ----- |
| Access control       | `tests/pentest/owasp-access-control.test.ts`  | ✅    |
| Injection            | `tests/pentest/owasp-injection.test.ts`       | ✅    |
| Crypto / Auth        | `tests/pentest/owasp-crypto-auth.test.ts`     | ✅    |
| Data validation      | `tests/pentest/owasp-data-validation.test.ts` | ✅    |
| Config audit         | `tests/pentest/owasp-config-audit.test.ts`    | ✅    |
| Account takeover     | `tests/pentest/account-takeover.test.ts`      | ✅    |
| Business logic       | `tests/pentest/business-logic.test.ts`        | ✅    |
| IDOR deep            | `tests/pentest/idor-deep.test.ts`             | ✅    |
| Info disclosure      | `tests/pentest/info-disclosure.test.ts`       | ✅    |
| Input attacks        | `tests/pentest/input-attacks.test.ts`         | ✅    |
| Privilege escalation | `tests/pentest/privilege-escalation.test.ts`  | ✅    |
| Regression (pen-001) | `tests/pentest/pen-001-regression.test.ts`    | ✅    |

---

## Edge Case Tests

| Category                | Test File                                 | Tests |
| ----------------------- | ----------------------------------------- | ----- |
| Race conditions         | `tests/edge/race-conditions.test.ts`      | ✅    |
| Timeouts & cancellation | `tests/edge/timeout-cancellation.test.ts` | ✅    |
| Boundary conditions     | `tests/edge/boundary-conditions.test.ts`  | ✅    |
| Failure recovery        | `tests/edge/failure-recovery.test.ts`     | ✅    |
| State transitions       | `tests/edge/state-transitions.test.ts`    | ✅    |

---

## Load Tests

| Scenario              | Test File                                  | Type   |
| --------------------- | ------------------------------------------ | ------ |
| Upload scenarios      | `tests/load/k6/upload-scenarios.js`        | k6     |
| Export scenarios      | `tests/load/k6/export-scenarios.js`        | k6     |
| API endpoints         | `tests/load/k6/api-endpoints.js`           | k6     |
| Search scenarios      | `tests/load/k6/search-scenarios.js`        | k6     |
| Stress patterns       | `tests/load/k6/stress-patterns.js`         | k6     |
| Helpers               | `tests/load/k6/helpers.js`                 | k6     |
| DB concurrency        | `tests/load/db-concurrency.test.ts`        | Vitest |
| Memory patterns       | `tests/load/memory-patterns.test.ts`       | Vitest |
| Pipeline throughput   | `tests/load/pipeline-throughput.test.ts`   | Vitest |
| Rate limit load       | `tests/load/rate-limit-load.test.ts`       | Vitest |
| Validation throughput | `tests/load/validation-throughput.test.ts` | Vitest |
| Zip builder load      | `tests/load/zip-builder-load.test.ts`      | Vitest |

---

## Soak / Stress Tests

| Scenario              | Test File                                  | Coverage |
| --------------------- | ------------------------------------------ | -------- |
| Memory leak detection | `tests/soak/memory-leak.test.ts`           | ✅       |
| Long-running pipeline | `tests/soak/long-running-pipeline.test.ts` | ✅       |
| Resource limits       | `tests/soak/resource-limits.test.ts`       | ✅       |
| Concurrent workers    | `tests/soak/concurrent-workers.test.ts`    | ✅       |
| Circuit breaker       | `tests/soak/circuit-breaker.test.ts`       | ✅       |

---

## Recovery Tests

| Scenario               | Test File                                       | Coverage |
| ---------------------- | ----------------------------------------------- | -------- |
| DB recovery            | `tests/recovery/database-recovery.test.ts`      | ✅       |
| Pipeline recovery      | `tests/recovery/pipeline-recovery.test.ts`      | ✅       |
| Rate limit recovery    | `tests/recovery/rate-limit-recovery.test.ts`    | ✅       |
| Share/export recovery  | `tests/recovery/share-export-recovery.test.ts`  | ✅       |
| Zip builder recovery   | `tests/recovery/zip-builder-recovery.test.ts`   | ✅       |
| Failure categorization | `tests/recovery/failure-categorization.test.ts` | ✅       |

---

## Backup Tests

| Scenario            | Test File                                  | Coverage |
| ------------------- | ------------------------------------------ | -------- |
| DB backup           | `tests/backup/database-backup.test.ts`     | ✅       |
| Storage backup      | `tests/backup/storage-backup.test.ts`      | ✅       |
| Full system restore | `tests/backup/full-system-restore.test.ts` | ✅       |

---

## Contract / OpenAPI Tests

| Test                | File                                    | Coverage |
| ------------------- | --------------------------------------- | -------- |
| API schemas (Zod)   | `tests/api/api-schemas.ts`              | ✅       |
| OpenAPI spec        | `tests/api/openapi-spec.ts`             | ✅       |
| Contract API        | `tests/api/contract-api.test.ts`        | ✅       |
| Contract validation | `tests/api/contract-validation.test.ts` | ✅       |
| Provider contract   | `tests/api/provider-contract.test.ts`   | ✅       |
| Consumer contract   | `tests/api/consumer-contract.test.ts`   | ✅       |
| Spec drift          | `tests/api/spec-drift.test.ts`          | ✅       |

---

## API `api-routes.spec.ts` Coverage

The comprehensive `tests/api/api-routes.spec.ts` covers **all** API routes:

- `GET /api/health`, `GET /api/health/live`, `GET /api/health/ready`
- `POST /api/auth/register`, `POST /api/auth/[...nextauth]`
- `GET /api/documents`, `POST /api/documents`, `GET /api/documents/[id]`
- `GET /api/folders`, `POST /api/folders`
- `GET /api/tags`, `POST /api/tags`
- `GET /api/search`, `GET /api/search/suggest`
- `GET /api/profile`, `PUT /api/profile`
- `GET /api/export`, `POST /api/export`
- `POST /api/upload`
- `GET /api/webhooks`, `POST /api/webhooks`
