# Security

## Authentication

- **NextAuth.js v5** with Credentials provider
- JWT tokens, 24h expiry
- Passwords hashed with bcryptjs
- Roles: ADMIN, STUDENT, TEACHER

## Request Security (Middleware)

Applied in `apps/web/src/middleware.ts`:

- **Rate limiting** per IP (configurable thresholds)
- **CSRF protection** via double-submit cookie pattern
- **CSP headers** applied via Next.js config
- **i18n redirect** validated before auth check

## Data Protection

- All database connections use `DATABASE_URL` with SSL where available
- File uploads stored in MinIO (private bucket, signed URLs for access)
- Soft delete preserves data integrity (no hard deletes on User, Document, Folder)
- Input validation via Zod on all API routes

## Docker Security

- Containers run as non-root users where possible
- Redis requires `AUTH` password
- MinIO uses access key / secret key pair
- Secrets managed via `.env` (never committed)

## CI/CD Security

- `secrets:scan` script runs as part of CI
- No secrets committed — `.env` patterns in `.gitignore`
- Dependencies audited regularly
