# ============================================
# Ibn Al-Azhar Docs — HuggingFace Spaces
# Single-container deployment
# ============================================

FROM node:22-slim AS builder
WORKDIR /app

# Build dependencies
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

# Install pnpm
RUN corepack enable

# Copy package files
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/pipeline/package.json packages/pipeline/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
COPY workers/ocr-worker/package.json workers/ocr-worker/package.json
COPY workers/export-worker/package.json workers/export-worker/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild

# Copy Prisma schema and generate client
COPY packages/database/prisma ./packages/database/prisma
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Copy source code
COPY packages ./packages
COPY apps ./apps
COPY workers ./workers

# Build Next.js
# Storage must resolve to "local" during the build too (page-data collection
# executes route modules which load pipeline config). The production image sets
# STORAGE_DRIVER=local again below; this keeps build + runtime consistent.
# AUTH_SECRET needs a non-empty placeholder at BUILD time because next-auth
# validates it when route modules are collected. The real value is injected at
# RUNTIME from the HuggingFace Space secret (which overrides this ENV).
ENV STORAGE_DRIVER=local
ENV STORAGE_LOCAL_DIR=/data
ENV AUTH_SECRET=build-placeholder-do-not-use
ENV NEXTAUTH_SECRET=build-placeholder-do-not-use
WORKDIR /app/apps/web
RUN NODE_ENV=production npx next build

# ============================================
# Production image
# ============================================
FROM node:22-slim

# node:22-slim already ships a `node` user with UID/GID 1000, which is exactly
# what HuggingFace Spaces requires — so we just ensure its home exists. No need
# to create a separate user (that would clash on UID/GID 1000).
RUN mkdir -p /home/node && chown node:node /home/node

# Runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    openssl \
    curl \
    wget \
    pandoc \
    # Tesseract OCR + Arabic language
    tesseract-ocr \
    tesseract-ocr-ara \
    # Python for OCR scripts
    python3 \
    python3-pip \
    python3-venv \
    # Ghostscript for searchable PDF
    ghostscript \
    ocrmypdf \
    && rm -rf /var/lib/apt/lists/*

# Python OCR dependencies
RUN python3 -m venv /opt/ocr-venv && \
    /opt/ocr-venv/bin/pip install --no-cache-dir pypdfium2 Pillow pytesseract

ENV PATH="/opt/ocr-venv/bin:$PATH"

# Install MinIO server binary (auto-detect architecture)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then MINIO_ARCH="arm64"; else MINIO_ARCH="amd64"; fi && \
    curl -fsSL "https://dl.min.io/server/minio/release/linux-${MINIO_ARCH}/minio" -o /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio

# Create data directories (persistent with HF Storage Bucket)
RUN mkdir -p /data/minio /data/uploads /data/exports /data/tmp && \
    chmod -R 777 /data

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Prisma — copy schema for runtime migrations + generate client locally.
# The generated client lives in the pnpm virtual store (node_modules/.pnpm/...),
# so copying a hard-coded ".prisma"/"@prisma" path from the builder fails.
# Instead we regenerate it here after node_modules is in place (see below).
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# bcryptjs (Next.js standalone tracing misses it in pnpm layout)
COPY --from=builder /app/apps/web/node_modules/bcryptjs ./apps/web/node_modules/bcryptjs

# Copy pipeline (raw TypeScript — no build step)
COPY --from=builder /app/packages/pipeline ./packages/pipeline
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules ./node_modules

# Regenerate the Prisma client into the local node_modules layout.
# node_modules (incl. the prisma CLI) is copied from the builder above, so
# we invoke the store binary directly to avoid any network fetch via npx.
RUN ls node_modules/.bin/prisma >/dev/null 2>&1 && \
    node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma || \
    npx prisma generate --schema=packages/database/prisma/schema.prisma

# Copy workers
COPY --from=builder /app/workers ./workers

# Copy entrypoint (works from root when deployed to HF)
COPY infrastructure/hf/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Fix permissions for Next.js cache
RUN mkdir -p /app/apps/web/.next/cache && chown -R node:node /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"
# Use local filesystem storage backed by the persistent /data volume.
# This removes the in-container MinIO dependency (single-container Spaces).
ENV STORAGE_DRIVER=local
ENV STORAGE_LOCAL_DIR=/data
# Use the Postgres-backed queue (no Redis/BullMQ in the container).
ENV QUEUE_DRIVER=pg

# HF Spaces health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7860/api/health/ready || exit 1

USER node

EXPOSE 7860

ENTRYPOINT ["/entrypoint.sh"]
