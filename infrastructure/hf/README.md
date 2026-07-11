---
title: Ibn Al-Azhar Docs
emoji: 📚
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Arabic-first document processing platform for Azhar students
---

# Ibn Al-Azhar Docs

Arabic-first, RTL-first document processing platform for Azhar students.

**Pipeline:** PDF/Image → OCR (Tesseract) → Arabic Text Cleanup → Markdown → Export (MD/TXT/JSON/DOCX/PDF)

## Features

- Arabic OCR with Tesseract + custom text normalization
- Document management with folders, tags, and search
- Multiple export formats (Markdown, TXT, JSON, DOCX, Searchable PDF)
- Share links with expiration
- Full-text Arabic search with PostgreSQL tsvector
- Rate limiting, CSRF protection, and ownership-based authorization

## Architecture (Single Container)

| Service       | Port | Purpose                            |
| ------------- | ---- | ---------------------------------- |
| Next.js Web   | 7860 | Web app + API (externally exposed) |
| MinIO         | 9000 | Object storage (internal only)     |
| OCR Worker    | —    | Background job processor           |
| Export Worker | —    | Background job processor           |

External services (configured via environment variables):

- **Neon.tech** — PostgreSQL (free tier)
- **Upstash** — Redis (free tier)

## Required Environment Variables

Set these in **Space Settings → Variables and Secrets**:

| Variable               | Description                           | Example                                                                    |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`         | Neon PostgreSQL connection string     | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db?sslmode=require` |
| `DATABASE_URL_DIRECT`  | Same as DATABASE_URL (for migrations) | Same as above                                                              |
| `REDIS_URL`            | Upstash Redis connection string       | `rediss://:pass@xxx.upstash.io:6380`                                       |
| `AUTH_SECRET`          | JWT signing secret (64+ chars)        | Generate with `openssl rand -base64 64`                                    |
| `ADMIN_EMAIL`          | Admin account email                   | `admin@example.com`                                                        |
| `ADMIN_PASSWORD`       | Admin account password                | Strong password                                                            |
| `S3_ACCESS_KEY_ID`     | MinIO access key                      | Any random string                                                          |
| `S3_SECRET_ACCESS_KEY` | MinIO secret key                      | Any random string                                                          |
| `APP_URL`              | Your Space URL                        | `https://your-space.hf.space`                                              |

### Optional

| Variable               | Description            |
| ---------------------- | ---------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth for login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret    |

## Deployment

1. Create a new Space on HuggingFace with **Docker** SDK
2. Clone this repository to the Space
3. Set environment variables in Space Settings
4. The Space will build and deploy automatically

## Tech Stack

- **Frontend:** Next.js 16 (App Router, React Server Components)
- **Database:** PostgreSQL 16 (Neon.tech)
- **Cache/Queue:** Redis 7 (Upstash) + BullMQ
- **Storage:** MinIO (in-container)
- **OCR:** Tesseract 5 with Arabic language pack
- **Search:** PostgreSQL full-text search (tsvector)
- **Auth:** NextAuth.js (JWT + Credentials + Google OAuth)
