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
RUN npm install -g pnpm && pnpm install --frozen-lockfile && pnpm rebuild

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
RUN NODE_ENV=production npx next build

# -----------------------------------------------------------------------------
# Base runner: minimal runtime deps for all targets
# -----------------------------------------------------------------------------
FROM node:22-slim AS base-runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    curl \
    openssl \
    pandoc \
    && rm -rf /var/lib/apt/lists/*

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
    /opt/ocr-venv/bin/pip install --no-cache-dir pypdfium2 Pillow pytesseract

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
# Bundles PostgreSQL, Redis, MinIO, web, ocr-worker, export-worker
# All data persists on /data (HF persistent volume)
# -----------------------------------------------------------------------------
FROM node:22-slim AS hf-space
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV LANG=C.UTF-8

# System deps: DB, cache, object storage, process manager, OCR/export tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql postgresql-contrib \
    redis-server \
    supervisor \
    python3 python3-pip python3-venv \
    make g++ \
    libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    tesseract-ocr tesseract-ocr-ara ocrmypdf ghostscript poppler-utils \
    pandoc curl wget openssl \
    && rm -rf /var/lib/apt/lists/*

# MinIO server + client (S3-compatible object storage, bundled)
RUN wget -q -O /usr/local/bin/minio https://dl.min.io/server/minio/release/linux-amd64/minio \
    && chmod +x /usr/local/bin/minio \
    && wget -q -O /usr/local/bin/mc https://dl.min.io/client/mc/release/linux-amd64/mc \
    && chmod +x /usr/local/bin/mc

# Prisma CLI for migrate deploy at startup
RUN npm install -g prisma@6.5.0

# Python venv for OCR helpers
RUN python3 -m venv /opt/ocr-venv \
    && /opt/ocr-venv/bin/pip install --no-cache-dir pypdfium2 Pillow pytesseract
ENV PATH="/opt/ocr-venv/bin:$PATH"

# Copy built web (standalone) + sources needed by workers/pipeline/database
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/pipeline ./packages/pipeline
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/node_modules ./node_modules

# bcryptjs is required by auth but Next.js standalone tracing misses it in pnpm layout
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