---
name: security-baseline
description: Security baseline requirements for Ibn Al-Azhar Docs
---

## What I Do

Enforce security baseline across the project.

## When to Use Me

- Writing new code
- Reviewing PRs
- Setting up infrastructure
- Handling user data

## Requirements

### Secrets

- Never commit `.env` files
- Use `.env.example` for documentation
- Pre-commit hook scans for secrets
- GitHub secrets for CI/CD

### Authentication

- NextAuth.js v5 for all auth
- bcrypt cost factor ≥ 12
- Session token rotation
- Role-based access control

### Input Validation

- Zod schemas for all inputs
- File type, size, content validation
- SQL injection prevention (Prisma)
- XSS prevention (React escaping)

### Infrastructure

- Non-root Docker containers
- HTTPS via Caddy
- Security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on public endpoints
- CORS with explicit allowlist

### Data Protection

- Signed URLs for file access
- PII minimization
- Encrypted backups
- Audit logs for sensitive operations
