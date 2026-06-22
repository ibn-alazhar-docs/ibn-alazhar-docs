# PENETRATION_TEST_REPORT.md — Phase 3F

## Executive Summary

| Metric                   | Value |
| ------------------------ | ----- |
| Attack Categories        | 6     |
| Total Attack Attempts    | 52    |
| Successful Attacks       | 4     |
| Failed Attacks (Blocked) | 45    |
| Informational            | 3     |

| Severity      | Count |
| ------------- | ----- |
| P0 (Critical) | 0     |
| P1 (High)     | 1     |
| P2 (Medium)   | 3     |

## Final Verdict: **CONDITIONAL GO**

One P1 vulnerability requires immediate remediation before production deployment.
Three P2 findings should be addressed in the next sprint.

---

## Successful Attacks (Vulnerabilities Found)

### VULN-PEN-001: Account Takeover via Deleted User Reactivation (P1 — HIGH)

**CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N — 8.1**

**Location:** `apps/web/src/app/api/auth/register/route.ts:26-40`

**Attack:** When a user's account is soft-deleted, anyone who knows (or guesses) their email can re-register with that email. The register endpoint reactivates the deleted account, sets a new password, and grants the attacker full access to:

- All of the victim's documents
- All of the victim's folders
- All of the victim's tags
- All of the victim's share links
- The victim's conversion job history

**Exploitation steps (verified in tests):**

1. Victim's account is soft-deleted (`deletedAt` set)
2. Attacker registers with victim's email
3. Register route finds `existingUser.deletedAt !== null`
4. Route reactivates account with attacker's password
5. Attacker inherits all victim data via same `userId`

**Impact:** Complete account takeover. Attacker gains persistent access to all victim data.

**Fix:** Do NOT allow re-registration of deleted user emails. Either:

- Hard-delete users instead of soft-delete, OR
- Require email verification before reactivation, OR
- Block registration with deleted user emails entirely

**Test:** `account-takeover.test.ts` — 3 tests confirm the attack chain (documents, share links, tags/folders all inherited)

---

### VULN-PEN-002: Public Cache-Control on Private Resources (P2 — MEDIUM)

**CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N — 3.1**

**Location:** `apps/web/src/app/api/folders/[id]/route.ts:18`

```typescript
{ headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } }
```

**Attack:** A user's private folder data is served with `public` cache headers. A shared CDN or proxy cache could serve user A's folder metadata to user B for up to 30 seconds.

**Fix:** Change to `Cache-Control: private, no-store` or remove entirely.

**Test:** `info-disclosure.test.ts` — confirmed the header is `public`

---

### VULN-PEN-003: Error Message Information Disclosure (P2 — MEDIUM)

**Locations:**

- `apps/web/src/app/api/folders/[id]/empty/route.ts:34` — `details: errMessage`
- `apps/web/src/app/api/export/route.ts:30` — `details: parsed.error.issues`

**Attack:** Internal error messages and Zod validation details are returned to the client. This reveals:

- Prisma error class names and query details
- Internal model names and field structures
- Database operation types

**Fix:** Remove `details` fields from error responses. Log internally only.

**Test:** `info-disclosure.test.ts` — confirmed Prisma and Zod internals leak

---

### VULN-PEN-004: User Enumeration via Registration (P2 — MEDIUM)

**Location:** `apps/web/src/app/api/auth/register/route.ts:44`

**Attack:** Registration returns `409 EMAIL_EXISTS` if the email is taken, vs `201 CREATED` for new emails. An attacker can enumerate valid email addresses by attempting registration.

**Fix:** Return a generic `200` response regardless: "If this email is not registered, you will receive a confirmation email."

**Test:** `info-disclosure.test.ts` — confirmed different status codes

---

## Failed Attacks (Defenses Verified)

### IDOR / Authorization (all BLOCKED)

| Attack                          | Result                           |
| ------------------------------- | -------------------------------- |
| Read victim's document by ID    | BLOCKED — userId scope           |
| Update victim's document        | BLOCKED — userId scope           |
| Delete victim's document        | BLOCKED — userId scope           |
| List victim's documents         | BLOCKED — userId scope           |
| Enumerate document IDs          | BLOCKED — userId scope           |
| Move doc to victim's folder     | BLOCKED — folder ownership check |
| Use victim's tag                | BLOCKED — tag userId scope       |
| Read victim's share links       | BLOCKED — userId scope           |
| Access victim's conversion jobs | BLOCKED — userId scope           |
| Restore victim's deleted doc    | BLOCKED — userId scope           |

### Privilege Escalation (all BLOCKED)

| Attack                              | Result                                     |
| ----------------------------------- | ------------------------------------------ |
| Student accessing admin endpoints   | BLOCKED — requireRole("ADMIN")             |
| Student listing all users           | BLOCKED — userId scope                     |
| Self-role-change                    | BLOCKED — explicit check                   |
| Self-deletion via admin endpoint    | BLOCKED — explicit check                   |
| Mass assignment via document update | BLOCKED — Zod schema strips unknown fields |
| Mass assignment via folder creation | BLOCKED — Zod schema strips unknown fields |
| Invalid role enum injection         | BLOCKED — Zod enum validation              |

### Share Link Attacks (all BLOCKED)

| Attack                    | Result                      |
| ------------------------- | --------------------------- |
| Token guessing (random)   | BLOCKED — 256-bit entropy   |
| Common token patterns     | BLOCKED                     |
| Partial token match       | BLOCKED                     |
| Access expired shares     | DETECTED                    |
| Access deleted doc shares | DETECTED                    |
| Duplicate share creation  | BLOCKED — unique constraint |

### Business Logic Attacks (all BLOCKED)

| Attack                             | Result                       |
| ---------------------------------- | ---------------------------- |
| Duplicate share links              | BLOCKED — unique constraint  |
| Duplicate tag assignments          | BLOCKED — unique constraint  |
| Circular folder reference          | BLOCKED — cycle detection    |
| Move folder into descendant        | BLOCKED — ancestor traversal |
| Max folder depth bypass            | BLOCKED — depth check        |
| Bulk move with mixed-ownership IDs | BLOCKED — SOME_NOT_FOUND     |
| Share for non-COMPLETED doc        | DETECTED                     |
| Rapid create-delete-create         | SAFE — unique IDs            |
| Tag name collision across users    | SAFE — per-user isolation    |

### Input Attacks (all SAFE)

| Attack                                       | Result                                       |
| -------------------------------------------- | -------------------------------------------- |
| Stored XSS in document title (4 payloads)    | STORED safely — React auto-escapes on render |
| SQL injection in document title (3 payloads) | STORED safely — Prisma parameterizes         |
| RTL override in title                        | STORED safely                                |
| Zero-width characters                        | STORED safely                                |
| Tag name uniqueness bypass                   | BLOCKED — unique constraint                  |

---

## Test Inventory

| #   | Test File                      | Attacks                                             | Tests  | Status       |
| --- | ------------------------------ | --------------------------------------------------- | ------ | ------------ |
| 1   | `account-takeover.test.ts`     | Account takeover, user enum, role escalation        | 5      | PASS         |
| 2   | `info-disclosure.test.ts`      | Cache poisoning, error leaks, user enum             | 7      | PASS         |
| 3   | `privilege-escalation.test.ts` | Role escalation, mass assignment, admin abuse       | 10     | PASS         |
| 4   | `idor-deep.test.ts`            | Cross-user document/folder/tag/share/job access     | 9      | PASS         |
| 5   | `business-logic.test.ts`       | Circular refs, depth bypass, bulk abuse, duplicates | 12     | PASS         |
| 6   | `input-attacks.test.ts`        | Stored XSS, SQLi, Unicode abuse, tag collision      | 9      | PASS         |
|     | **Total**                      |                                                     | **52** | **ALL PASS** |

---

## Recommendations

### Immediate (before production)

1. **Fix VULN-PEN-001** — Block re-registration of deleted user emails or require email verification
2. **Fix VULN-PEN-002** — Change folder GET cache header to `private, no-store`
3. **Fix VULN-PEN-003** — Remove `details` from error responses

### Next Sprint

4. **Fix VULN-PEN-004** — Generic registration response to prevent user enumeration
5. Add `test:pentest` to CI pipeline

### Defense-in-Depth (already working)

- All IDOR attacks blocked by consistent `userId` scoping ✓
- All privilege escalation blocked by `requireRole` + Zod validation ✓
- All SQL injection blocked by Prisma parameterized queries ✓
- All XSS safely handled by React auto-escaping ✓
- All share token attacks blocked by 256-bit entropy ✓
- All business logic attacks blocked by constraints and validation ✓
