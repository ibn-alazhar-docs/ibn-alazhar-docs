# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: security@ibn-al-azhar.local

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive a response within 48 hours.

## Security Measures

This project implements:

- ✅ CSRF Protection (Origin/Referer validation)
- ✅ Rate Limiting (10 req/min per IP)
- ✅ Input Validation (Zod schemas)
- ✅ SQL Injection Prevention (Prisma ORM)
- ✅ XSS Protection (Content Security Policy)
- ✅ Authentication (NextAuth.js + bcrypt)
- ✅ Session Management (JWT with httpOnly cookies)
- ✅ Role-Based Access Control
- ✅ Secure Headers (HSTS, X-Frame-Options)

## Recent Security Updates

See [docs/SECURITY_FIXES_2025.md](../docs/SECURITY_FIXES_2025.md) for details on July 2026 security fixes.
