---
name: ibn-security-review
description: Use this skill when reviewing auth, sessions, uploads, file storage, sharing links, API routes, permissions, secrets, env vars, and deployment.
---

# Ibn Al-Azhar Docs Security Review Skill

Review security and privacy for a document-processing app.

## Critical checks

1. No secrets committed.
2. Upload size limits.
3. File type validation.
4. Private object storage by default.
5. Signed URLs or controlled download routes.
6. Secure share token design.
7. Rate limits for sensitive routes.
8. Auth/session model is clear.
9. Soft delete retention is documented.
10. Logs do not expose private document content.

## Output

Return:
- Security status
- High-risk issues
- Required fixes
- Follow-up ADRs
