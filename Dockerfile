# syntax=docker/dockerfile:1.4

# =============================================================================
# Ibn Al-Azhar Docs — Unified Multi-Stage Dockerfile
# Targets: web | ocr-worker | export-worker | hf-space
# =============================================================================

# -----------------------------------------------------------------------------
# Builder: installs deps, generates Prisma, builds Next.js
# -----------------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/pipeline/package.json packages/pipeline/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY workers/ocr-worker/package.json workers/ocr-worker/package.json
COPY workers/export-worker/package.json workers/export-worker/package.json
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate && pnpm install --frozen-lockfile --child-concurrency 1 && pnpm rebuild

# Generate Prisma Client
COPY packages/database ./packages/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Copy source code
COPY packages ./packages
COPY apps ./apps
COPY workers ./workers

# Build Next.js web app (standalone output)
WORKDIR /app/apps/web
ARG SENTRY_RELEASE=""
ENV SENTRY_RELEASE=$SENTRY_RELEASE
# Build-time env: .env.example provides dummy values for build-time validation.
# Runtime env (DATABASE_URL, REDIS_URL, AUTH_SECRET, etc.) comes from the entrypoint.
COPY .env.example /app/apps/web/.env.production
RUN NODE_OPTIONS="--max-old-space-size=4096" NODE_ENV=production npx next build

# -----------------------------------------------------------------------------
# Base runner: minimal runtime deps for all targets
# -----------------------------------------------------------------------------
FROM node:22-slim AS base-runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz-subset0 \
    fontconfig \
    python3 \
    python3-venv \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    curl \
    openssl \
    pandoc \
    && rm -rf /var/lib/apt/lists/*

# المحرّك الوحيد الذي يطبّق bidi داخل السطر هو Pango/HarfBuzz (قياسًا: pdfmake يطبع
# الكلمات العربية بترتيبها المنطقي معكوسة). venv منفصل لأن تصدير PDF يحدث في
# export-runner وweb حيث لا يوجد venv التعرف الضوئي.
# PyMuPDF لازمٌ هنا مع WeasyPrint لا في venv التعرف وحده: `WEASYPRINT_PYTHON` أدناه
# هو المفسّر الذي تراه `getWeasyprintPython()`، وبه يعمل سكربتان يستوردان fitz —
# generate-searchable-pdf.py (طبقة النصّ فوق صورة الصفحة) وpage-geometry.py (قياس
# ورقة الأصل وهوامشه). بغيره يخرجان SystemExit(3) في كل صورةٍ ترث base-runner
# (ocr-runner وexport-runner وweb): لا PDF قابل للبحث، ولا هندسةَ فتُصدَّر A4/٢سم
# بدل ورقة الأصل. hf-space يُثبّتهما معًا في /opt/ocr-venv لنفس السبب.
RUN python3 -m venv /opt/pdf-venv && \
    /opt/pdf-venv/bin/pip install --no-cache-dir "weasyprint==70.0" PyMuPDF

ENV WEASYPRINT_PYTHON=/opt/pdf-venv/bin/python

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built artifacts and source needed by workers
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/pipeline ./packages/pipeline
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/workers ./workers

# bcryptjs is required by auth but Next.js standalone tracing misses it in pnpm layout
COPY --from=builder /app/apps/web/node_modules/bcryptjs ./apps/web/node_modules/bcryptjs

USER nextjs

# -----------------------------------------------------------------------------
# Target: web — Next.js standalone server
# -----------------------------------------------------------------------------
FROM base-runner AS web

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set correct permissions for Next.js cache
USER root
RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app/apps/web/.next
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/ready || exit 1

CMD ["node", "apps/web/server.js"]

# -----------------------------------------------------------------------------
# Target: ocr-runner — OCR worker with Tesseract + Python deps
# -----------------------------------------------------------------------------
FROM base-runner AS ocr-runner

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ara \
    ocrmypdf \
    ghostscript \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/ocr-venv && \
    /opt/ocr-venv/bin/pip install --no-cache-dir pypdfium2 Pillow pytesseract opencv-python-headless numpy

ENV PATH="/opt/ocr-venv/bin:$PATH"

USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD kill -0 1 2>/dev/null || exit 1

CMD ["node", "--import", "tsx", "workers/ocr-worker/src/index.ts"]

# -----------------------------------------------------------------------------
# Target: export-runner — Export worker
# -----------------------------------------------------------------------------
FROM base-runner AS export-runner

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD kill -0 1 2>/dev/null || exit 1

CMD ["node", "--import", "tsx", "workers/export-worker/src/index.ts"]

# -----------------------------------------------------------------------------
# Target: hf-space — Self-contained image for Hugging Face Spaces (FREE)
# Bundles PostgreSQL, Redis, web, ocr-worker, export-worker.
# Storage defaults to local filesystem on /data; MinIO is optional (STORAGE_DRIVER=s3).
# All data persists on /data (HF persistent volume)
# -----------------------------------------------------------------------------
FROM node:22-slim AS hf-space
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    LANG=C.UTF-8 \
    STORAGE_DRIVER=local \
    STORAGE_LOCAL_DIR=/data \
    OCR_PROVIDER=tesseract \
    OCR_CLOUD_ENABLED=false \
    DEBIAN_FRONTEND=noninteractive

# Single RUN layer for ALL system dependencies to minimize layers
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Database & Cache
    postgresql postgresql-contrib redis-server \
    # Process manager
    supervisor \
    # Python & build tools
    python3 python3-pip python3-venv make g++ \
    # Runtime libs for canvas/PDF
    libcairo2 libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 fontconfig \
    libjpeg62-turbo libgif7 librsvg2-2 \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    # OCR & document processing
    tesseract-ocr tesseract-ocr-ara ocrmypdf ghostscript poppler-utils pandoc \
    # Utilities
    curl wget openssl \
    # MinIO is NOT embedded anymore (2026-11-07): dl.min.io binary downloads now
    # return HTTP 410 (archived) and the prod topology runs MinIO as its own
    # compose service; the app image default is STORAGE_DRIVER=local.
    # Install Prisma CLI
    && npm install -g prisma@6.5.0 \
    # Create Python venv for OCR + text-PDF rendering (WeasyPrint)
    && python3 -m venv /opt/ocr-venv \
    && /opt/ocr-venv/bin/pip install --no-cache-dir pypdfium2 Pillow pytesseract opencv-python-headless numpy PyMuPDF "weasyprint==70.0" \
    # Cleanup to reduce layer size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && npm cache clean --force

ENV PATH="/opt/ocr-venv/bin:$PATH"
ENV WEASYPRINT_PYTHON=/opt/ocr-venv/bin/python

# Copy built artifacts in optimized order (smallest to largest)
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/packages/pipeline ./packages/pipeline
COPY --from=builder /app/apps/web/src/messages ./apps/web/src/messages
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/.next/standalone ./
# Remove .env.production from standalone output — the entrypoint handles all runtime env
RUN rm -f .env.production apps/web/.env.production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules/bcryptjs ./apps/web/node_modules/bcryptjs

# Deployment orchestration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Persistent data lives on the HF persistent volume (/data)
ENV PGDATA=/data/pgdata \
    REDIS_DATA=/data/redis \
    MINIO_DATA=/data/minio \
    APP_DATA=/data/app

EXPOSE 7860
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -fsS http://localhost:7860/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]