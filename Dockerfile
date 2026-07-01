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

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/pipeline/package.json packages/pipeline/package.json
COPY packages/database/package.json packages/database/package.json
COPY workers/ocr-worker/package.json workers/ocr-worker/package.json
COPY workers/export-worker/package.json workers/export-worker/package.json
RUN corepack enable && pnpm install --frozen-lockfile && pnpm rebuild

COPY packages/database ./packages/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

COPY packages ./packages
COPY apps ./apps
COPY workers ./workers

WORKDIR /app/apps/web
ARG SENTRY_RELEASE=""
ENV SENTRY_RELEASE=$SENTRY_RELEASE
RUN NODE_ENV=production npx next build

FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    openssl \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/database ./packages/database

# bcryptjs is required by auth but Next.js standalone tracing misses it in pnpm layout
COPY --from=builder /app/apps/web/node_modules/bcryptjs ./apps/web/node_modules/bcryptjs

# Set correct permissions for Next.js cache
RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app/apps/web/.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/ready || exit 1

CMD ["node", "apps/web/server.js"]
