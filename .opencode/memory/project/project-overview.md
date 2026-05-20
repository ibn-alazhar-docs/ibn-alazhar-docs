# Memory: Project Overview

> **File:** `memory/project/project-overview.md`
> **Purpose:** Persistent project identity and goals.

---

## Project Identity

- **Name:** Ibn Al-Azhar Docs — ابن الأزهر دوكس
- **Repository:** `ibn-al-azhar-docs`
- **License:** MIT
- **Type:** Progressive Web App (PWA) for educational document management and OCR conversion
- **Tagline:** في بيت كل طالب أزهري
- **Brand Promise:** محتوى تعليمي يليق بتفوق طالب الثانوية الأزهرية

## Problem

Educational institutions in the Arab world lack integrated Arabic-capable document management tools. Teachers and researchers deal with scanned PDFs and document images daily. Existing tools are English-only, inadequate for Arabic, expensive, or unreliable on mobile.

## Solution

A PWA that converts scanned documents to editable text via OCR, with export to multiple formats (TXT, DOCX, JSON). Arabic-first, RTL-first, Docker-first local development. Built with Next.js 16, shadcn/ui, Tailwind CSS v4, Cairo font, next-intl, Zustand, NextAuth.js v5, PostgreSQL, Prisma, MinIO, BullMQ, Redis, Caddy.

## Target Users

1. Students & Researchers — 5-20 files/month
2. Teachers — 20-100 files/month
3. Technical Supervisors — Admin dashboard users

## Key Constraints

- Arabic is default language
- RTL is default direction
- Docker Compose is local dev environment
- Phase-gated development
- Docs-first workflow
- No secrets in files
- Conversion ≠ Export (separate steps)
- Free-first, not free-forever

## Success Metrics

| Metric | Target |
|--------|--------|
| Registered users (month 1) | 50 |
| Conversion success rate | > 90% |
| Avg conversion time (10 pages) | < 60 seconds |
| Lighthouse Performance | > 90 |
| PWA install rate | > 30% |

## Last Updated

2026-05-20
