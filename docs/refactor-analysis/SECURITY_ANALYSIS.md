# SECURITY_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Authentication, authorization, input validation, secrets, OWASP Top 10
> **System:** Ibn Al-Azhar Docs

---

## 1. Authentication

### 1.1 Implementation

| Aspect           | Implementation                     | Assessment           |
| ---------------- | ---------------------------------- | -------------------- |
| Provider         | NextAuth.js v5                     | ✅ Industry standard |
| Strategy         | JWT (24h expiry)                   | ✅ Stateless         |
| Credentials      | Email + bcryptjs                   | ✅                   |
| OAuth            | Google (with Drive scope)          | ✅                   |
| Session Storage  | Cookie (`next-auth.session-token`) | ✅                   |
| Password Hashing | bcryptjs (12 rounds)               | ✅                   |

### 1.2 Auth Issues

| Issue                          | Severity | Location            | Description                              |
| ------------------------------ | -------- | ------------------- | ---------------------------------------- |
| Dev-only secret fallback       | MEDIUM   | `auth.ts:33-37`     | Falls back to hardcoded secret in dev    |
| No rate limiting on auth       | LOW      | `middleware.ts`     | Rate limit applies to all API routes     |
| No account lockout             | LOW      | `auth.ts:authorize` | No brute-force protection                |
| JWT not rotated on role change | MEDIUM   | `auth.ts:110-128`   | Role changes require `trigger: "update"` |

---

## 2. Authorization

### 2.1 Role-Based Access

| Role    | Access             | Implementation               |
| ------- | ------------------ | ---------------------------- |
| ADMIN   | All resources      | `isAdmin(session)` check     |
| STUDENT | Own resources only | `ownedWhere()` query scoping |
| TEACHER | Own resources only | Same as STUDENT              |

### 2.2 Authorization Issues

| Issue                                 | Severity | Location           | Description                            |
| ------------------------------------- | -------- | ------------------ | -------------------------------------- |
| `ownedWhere` not applied consistently | HIGH     | Multiple use-cases | Some queries don't scope by userId     |
| Admin bypass not always checked       | MEDIUM   | `users/route.ts`   | Manual `isAdmin` check in each handler |
| No middleware-level auth              | MEDIUM   | `middleware.ts`    | Auth checked per-route, not globally   |
| Share link has no ownership check     | LOW      | `share/[token]`    | Public endpoint, by design             |

---

## 3. Input Validation

### 3.1 Zod Schemas

| Schema                  | Location                 | Fields                       | Assessment |
| ----------------------- | ------------------------ | ---------------------------- | ---------- |
| `createFolderSchema`    | `validators/folder.ts`   | name, parentId, color, icon  | ✅         |
| `renameFolderSchema`    | `validators/folder.ts`   | name                         | ✅         |
| `moveFolderSchema`      | `validators/folder.ts`   | parentId                     | ✅         |
| `documentUpdateSchema`  | `validators/document.ts` | title, description, folderId | ✅         |
| `createTagSchema`       | `validators/tag.ts`      | name, color                  | ✅         |
| `updateTagSchema`       | `validators/tag.ts`      | name, color                  | ✅         |
| `bulkTagSchema`         | `validators/tag.ts`      | documentIds, tagId           | ✅         |
| `singleExportSchema`    | `export/validators.ts`   | documentId, format, profile  | ✅         |
| `adminUserUpdateSchema` | `validators/auth.ts`     | userId, role                 | ✅         |

### 3.2 Validation Issues

| Issue                            | Severity | Location        | Description                         |
| -------------------------------- | -------- | --------------- | ----------------------------------- |
| Not all routes validate input    | MEDIUM   | `/api/upload`   | Inline validation instead of Zod    |
| `search.use-cases.ts` builds SQL | HIGH     | Line 70-102     | SQL injection risk in dynamic query |
| No file content validation       | LOW      | `/api/upload`   | MIME type checked, not content      |
| No max array length on bulk ops  | LOW      | `bulkTagSchema` | Has max 50, good                    |

---

## 4. Security Headers

### 4.1 Middleware Headers (`middleware.ts:153-169`)

| Header                  | Value                           | Assessment |
| ----------------------- | ------------------------------- | ---------- |
| Content-Security-Policy | Restrictive                     | ✅         |
| X-Content-Type-Options  | nosniff                         | ✅         |
| X-Frame-Options         | DENY                            | ✅         |
| Referrer-Policy         | strict-origin-when-cross-origin | ✅         |

### 4.2 Missing Headers

| Header                    | Recommendation                    |
| ------------------------- | --------------------------------- |
| Strict-Transport-Security | Add for production                |
| Permissions-Policy        | Restrict camera, microphone, etc. |
| X-XSS-Protection          | Legacy but still useful           |

---

## 5. CSRF Protection

Implemented in `middleware.ts:50-99`:

- Checks `Origin` header against `APP_URL`
- Falls back to `Referer` header
- Rejects requests with session cookie but no origin/referer

**Assessment:** Good implementation.

---

## 6. Rate Limiting

Implemented in `middleware.ts:102-117`:

- Applied to all API routes
- Returns `Retry-After` header

**Assessment:** Basic but functional. No per-user or per-endpoint limits.

---

## 7. Secrets Management

| Secret                 | Location | Risk |
| ---------------------- | -------- | ---- |
| `DATABASE_URL`         | `.env`   | ✅   |
| `AUTH_SECRET`          | `.env`   | ✅   |
| `GOOGLE_CLIENT_SECRET` | `.env`   | ✅   |
| `GOOGLE_PRIVATE_KEY`   | `.env`   | ✅   |
| `GEMINI_API_KEY`       | `.env`   | ✅   |
| `MINIO_SECRET_KEY`     | `.env`   | ✅   |
| `REDIS_PASSWORD`       | `.env`   | ✅   |

**Issues:**

- No secrets rotation mechanism
- `.env` committed to git (should be in `.gitignore`)
- No vault integration (HashiCorp, AWS Secrets Manager)

---

## 8. OWASP Top 10 Assessment

| #   | Risk                      | Status | Notes                                    |
| --- | ------------------------- | ------ | ---------------------------------------- |
| A01 | Broken Access Control     | ⚠️     | `ownedWhere` not consistently applied    |
| A02 | Cryptographic Failures    | ✅     | bcrypt, HTTPS in production              |
| A03 | Injection                 | ⚠️     | SQL injection risk in search             |
| A04 | Insecure Design           | ✅     | Clean architecture attempted             |
| A05 | Security Misconfiguration | ⚠️     | Dev secret fallback                      |
| A06 | Vulnerable Components     | ✅     | Dependencies managed                     |
| A07 | Auth Failures             | ✅     | NextAuth.js, JWT                         |
| A08 | Data Integrity            | ✅     | Prisma, transactions                     |
| A09 | Logging Failures          | ⚠️     | Basic logging, no audit                  |
| A10 | SSRF                      | ✅     | No external URL fetching from user input |

---

## 9. Recommendations

| #   | Priority | Recommendation                                 |
| --- | -------- | ---------------------------------------------- |
| 1   | P0       | Fix SQL injection risk in search.use-cases.ts  |
| 2   | P0       | Apply `ownedWhere` consistently to all queries |
| 3   | P1       | Add HSTS and Permissions-Policy headers        |
| 4   | P1       | Remove dev secret fallback in production       |
| 5   | P1       | Add per-user rate limiting                     |
| 6   | P2       | Add account lockout after failed attempts      |
| 7   | P2       | Implement secrets rotation                     |
| 8   | P3       | Add security audit logging                     |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
