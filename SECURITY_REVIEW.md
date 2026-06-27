# SECURITY_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** Authorization, Secrets, Isolation, Vulnerabilities
> **System:** Ibn Al-Azhar Docs

## 1. Authorization & Tenant Isolation

**Strengths:**

- Prisma queries consistently apply `where: { userId }` scoping.

**Vulnerabilities Detected:**

- **Inconsistent Route Guards:** Because the Use Case layer is bypassed in 16 routes, API handlers are responsible for enforcing ownership. A missed `userId` check in an API route results in direct Insecure Direct Object Reference (IDOR).
- **Export Ownership Flaw:** `export/metadata.ts` queries Prisma directly and lacks rigorous ownership guards for child entities within a deeply nested folder.
- **Share Link Abuse:** If a user generates a share link and then loses access to the document, the link might remain active depending on how cascading deletes are configured.

## 2. Input Validation & Injection

**Vulnerabilities Detected:**

- **XSS Vector:** Frontend uses `dangerouslySetInnerHTML` without sanitization in preview templates.
- **Command Injection Risk:** `ocr-worker` executes Python scripts via `exec`/`spawn`. Ensure filename inputs and arguments are rigorously sanitized and escaped.
- **External Query Injection:** `ensureDriveFolder` in Google Drive provider does not escape `folderName`, making it susceptible to Google Drive search API query injection.

## 3. Information Disclosure

**Issues Detected:**

- **Health Checks:** The `/health` endpoint leaks raw Database error messages to unauthenticated callers.
- **Verbose Errors:** Internal Prisma/Zod errors are occasionally leaked to the client due to missing `handleRouteError` wrappers on 31 API routes.
- **User Enumeration:** The registration/login flow provides different response times or errors depending on whether an email exists.

## 4. Remediation Strategy

1. **Zero-Trust Data Access:** Move ALL database access behind Repository Interfaces. The Repository implementation MUST automatically inject the ambient `userId` into every query context to mathematically eliminate IDOR.
2. **Sanitize Inputs/Outputs:**
   - Implement DOMPurify on the frontend.
   - Use strict argument arrays for `spawn` (avoid `exec` shell execution entirely) in the OCR worker.
   - Escape strings sent to external APIs (Google Drive).
3. **Mask Errors:** Implement global error handlers that log the raw exception but return a generic, sterile message (`"Internal Server Error"`) to the client, mapped by a `correlationId`.
