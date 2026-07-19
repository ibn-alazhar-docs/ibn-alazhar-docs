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

---

## HuggingFace Space Deployment (Sync Workflow)

> **⚠️ أهم خطوة أمنية — تدوير الرمز المسرّب (Token Rotation)**
> سبق أن وُضع رمز HuggingFace داخل رابط الـ remote `old-hf`. تم تنظيف
> الرابط محليًا (أصبح بلا رمز)، لكن **الرمز القديم لا يزال صالحًا على خوادم
> HF ويجب إبطاله فورًا بواسطتك فقط**:
>
> 1. اذهب إلى https://huggingface.co/settings/tokens
> 2. احذف/ألغِ الرمز القديم المسرّب.
> 3. أنشئ رمزًا جديدًا (صلاحية قراءة/كتابة على الـ Space) إن كنت بحاجة للرفع.
>
> **لا يقوم هذا السكربت بأي تدوير للرمز** (لا تتوفر له صلاحية API على HF)،
> ولا يكتب أو يضمّن أي سرّ/رمز في أي ملف أو رابط.

### English — Security first

A HuggingFace token was previously embedded in the `old-hf` remote URL. The
local URL is now sanitized (token-free), **but the leaked token is still valid
on HF and MUST be rotated by you** at https://huggingface.co/settings/tokens
(revoke the old token, create a new read/write token if needed). This script
cannot rotate it and never embeds any secret.

### How sync works

HF Spaces build from a **Dockerfile at the repo root**. Our HF-specific files
live under `infrastructure/hf/`. The sync script:

1. Exports a **clean tree of the current commit only** via `git archive`
   (untracked + `.gitignore`d files like `.env` are never included → secrets
   can never leak).
2. Copies `infrastructure/hf/Dockerfile` → root `Dockerfile` and
   `infrastructure/hf/entrypoint.sh` → root `entrypoint.sh`.
   (The project `.dockerignore` ignores `infrastructure/`, so the entrypoint
   must sit at root or the build would silently fail.)
3. Pushes that tree to the `old-hf` remote `main` with `--force-with-lease`
   (so a concurrent push is never blindly overwritten).

### Authenticate safely (one-time, manual)

```bash
# Option A (recommended)
huggingface-cli login

# Option B (git credential helper)
git credential approve <<EOF
protocol=https
host=huggingface.co
username=your-hf-username
password=<YOUR_NEW_READ_WRITE_TOKEN>
EOF
```

Replace `<YOUR_NEW_READ_WRITE_TOKEN>` with the **new** token created **after**
rotating the old leaked one. Never paste a token into the script or a remote
URL.

### Deploy

```bash
# Dry run (prepares the tree, prints it, pushes nothing)
./scripts/sync-hf-space.sh

# Actual deploy (after you have authenticated)
./scripts/sync-hf-space.sh --push
```

Secrets are provided to the running Space exclusively via **Space Settings →
Variables and Secrets** — never committed to the repo.

### Verification checklist

- [ ] Old leaked HF token revoked at huggingface.co/settings/tokens
- [ ] `old-hf` remote URL is token-free (`git remote get-url old-hf`)
- [ ] No `.env` / credential file is tracked or shipped
- [ ] Authenticated via `huggingface-cli login` or credential helper
- [ ] Space rebuilds successfully after `--push`
