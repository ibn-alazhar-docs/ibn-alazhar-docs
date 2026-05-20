# Ibn Al-Azhar Docs — ابن الأزهر دوكس — العمليات والنشر | DevOps & Deployment

> **التصنيف:** داخلي — فريق DevOps والبنية التحتية  
> **الإصدار:** 1.0.0  
> **آخر تحديث:** 2025-03-05  
> **المرجع الأمني:** أنظر `08_SECURITY_PRIVACY.md` لسياسات الأسرار والأمان، `09_QA_TEST_PLAN.md` لمعايير الإصدار

---

## جدول المحتويات

1. [إعداد بيئة التطوير المحلية](#1-إعداد-بيئة-التطوير-المحلية)
2. [Docker Compose](#2-docker-compose)
3. [المتغيرات البيئية (Environment Variables)](#3-المتغيرات-البيئية-environment-variables)
4. [إدارة الأسرار (Secrets Management)](#4-إدارة-الأسرار-secrets-management)
5. [بيئة Staging](#5-بيئة-staging)
6. [بيئة الإنتاج (Production Environment)](#6-بيئة-الإنتاج-production-environment)
7. [خط أنابيب CI/CD](#7-خط-أنابيب-cicd)
8. [ترحيلات قاعدة البيانات (Database Migrations)](#8-ترحيلات-قاعدة-البيانات-database-migrations)
9. [النسخ الاحتياطية (Backups)](#9-النسخ-الاحتياطية-backups)
10. [خطة الاستعادة (Restore Plan)](#10-خطة-الاستعادة-restore-plan)
11. [SSL والنطاق](#11-ssl-والنطاق)
12. [المراقبة (Monitoring)](#12-المراقبة-monitoring)
13. [التسجيل (Logging)](#13-التسجيل-logging)
14. [الإبلاغ عن الأخطاء (Error Reporting)](#14-الإبلاغ-عن-الأخطاء-error-reporting)
15. [استراتيجية التراجع (Rollback Strategy)](#15-استراتيجية-التراجع-rollback-strategy)
16. [فحوصات الصحة (Health Checks)](#16-فحوصات-الصحة-health-checks)
17. [قائمة مراجعة النشر (Deployment Checklist)](#17-قائمة-مراجعة-النشر-deployment-checklist)

---

## 1. إعداد بيئة التطوير المحلية

### 1.1 المتطلبات الأساسية

| المتطلب | الإصدار الأدنى | طريقة التثبيت |
|---------|---------------|-------------|
| **Node.js** | 20.x LTS | `nvm install 20` أو `fnm install 20` |
| **pnpm** | 9.x | `corepack enable && corepack prepare pnpm@latest --activate` |
| **Docker** | 24.x+ | [docker.com/get-docker](https://docker.com/get-docker) |
| **Docker Compose** | v2.20+ | مضمّن مع Docker Desktop |
| **Git** | 2.40+ | مدير حزم النظام |
| **VS Code** (اختياري) | أحدث | مع امتدادات موصى بها |

#### امتدادات VS Code الموصى بها

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens"
  ]
}
```

### 1.2 خطوات الإعداد التفصيلية

```bash
# 1. استنساخ المستودع
git clone https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs.git
cd ibn-al-azhar-docs

# 2. تثبيت التبعيات
pnpm install

# 3. نسخ ملف المتغيرات البيئية
cp .env.example .env

# 4. تحرير المتغيرات البيئية (أدخل قيمك المحلية)
# أهم المتغيرات لتعديلها:
#   AUTH_SECRET — توليد قيمة جديدة
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — من Google Cloud Console
$EDITOR .env

# 5. تشغيل الخدمات (PostgreSQL, Redis, MinIO)
docker compose up -d db redis minio minio-init

# 6. تطبيق ترحيلات قاعدة البيانات
pnpm prisma migrate dev

# 7. بذر قاعدة البيانات ببيانات اختبارية
pnpm prisma db seed

# 8. تشغيل خادم التطوير
pnpm dev
```

### 1.3 إعداد Docker Compose للتطوير

```yaml
# docker-compose.yml (التطوير)
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
    volumes:
      - .:/app                    # Live reload
      - /app/node_modules         # لا تستبدل node_modules
      - /app/.next                # لا تستبدل .next cache
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    command: pnpm dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ibn_al_azhar_docs
      POSTGRES_USER: ibn_al_azhar_docs
      POSTGRES_PASSWORD: ibn_al_azhar_docs_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ibn_al_azhar_docs"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"    # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/ibn-al-azhar-docs-files;
      echo 'MinIO bucket initialized';
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 1.4 مشاكل شائعة وحلولها

| المشكلة | السبب | الحل |
|---------|-------|------|
| `ECONNREFUSED` على المنفذ 5432 | PostgreSQL لم يبدأ بعد | `docker compose up -d db` ثم انتظر healthcheck |
| `Prisma Client not generated` | بعد تغيير الـ schema | `pnpm prisma generate` |
| `MinIO bucket not found` | الحاوية لم تُنشأ | `docker compose up minio-init` |
| `Port 3000 already in use` | عملية أخرى تستخدم المنفذ | `lsof -i :3000` ثم `kill <PID>` |
| `NODE_ENV not set` | مفقود في .env | أضف `NODE_ENV=development` |
| `Google OAuth error` | redirect URI خاطئ | أضف `http://localhost:3000/api/auth/callback/google` في Google Console |
| `Migration failed` | تعارض في قاعدة البيانات | `pnpm prisma migrate reset` (⚠️ يحذف البيانات) |
| Docker volumes مليئة | بيانات قديمة | `docker compose down -v` (⚠️ يحذف جميع البيانات) |

---

## 2. Docker Compose

### 2.1 هيكل الخدمات — بيئة التطوير

```
┌─────────────────────────────────────────────────────┐
│                   Docker Network                     │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐  │
│  │  app     │  │  db     │  │  redis  │  │ minio │  │
│  │ :3000   │  │ :5432   │  │ :6379   │  │ :9000 │  │
│  │ Next.js │  │ Postgres│  │  Redis  │  │ MinIO │  │
│  └─────────┘  └─────────┘  └─────────┘  └───────┘  │
│                                     ┌──────────────┐│
│                                     │  minio-init  ││
│                                     │ (one-shot)   ││
│                                     └──────────────┘│
└─────────────────────────────────────────────────────┘
```

### 2.2 هيكل الخدمات — بيئة الإنتاج

```
                    ┌──────────────┐
                    │    Caddy     │
                    │   :443/:80   │
                    │  (Reverse    │
                    │   Proxy +    │
                    │    SSL)      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──┐  ┌─────▼─────┐  ┌──▼────────┐
       │  app    │  │  worker-1 │  │  worker-2 │
       │ :3000   │  │  (BullMQ) │  │  (BullMQ) │
       │ Next.js │  │           │  │           │
       └────┬────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │
     ┌──────┼──────────────┼──────────────┤
     │      │              │              │
┌────▼───┐ ┌▼────────┐ ┌──▼──────┐ ┌───▼──────┐
│  db    │ │  redis  │ │  minio  │ │minio-init│
│ :5432  │ │ :6379   │ │ :9000   │ │(one-shot)│
│Postgres│ │  Redis  │ │  MinIO  │ └──────────┘
└────────┘ └─────────┘ └─────────┘
```

### 2.3 ملف Docker Compose للإنتاج

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      app:
        condition: service_healthy
    networks:
      - ibn-al-azhar-docs-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    networks:
      - ibn-al-azhar-docs-network

  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      WORKER_MODE: "true"
    command: ["node", "dist/worker.js"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    networks:
      - ibn-al-azhar-docs-network

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-ibn_al_azhar_docs}
      POSTGRES_USER: ${POSTGRES_USER:-ibn_al_azhar_docs}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ibn_al_azhar_docs}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - ibn-al-azhar-docs-network
    # لا يتم تعريض المنفذ في الإنتاج (وصول داخلي فقط)

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - ibn-al-azhar-docs-network

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_SERVER_ENCRYPTION: "on"
      MINIO_SERVER_ENCRYPTION_TYPE: "SSE-S3"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - ibn-al-azhar-docs-network

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD};
      mc mb --ignore-existing local/ibn-al-azhar-docs-files;
      echo 'MinIO bucket initialized';
      "
    networks:
      - ibn-al-azhar-docs-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  caddy_data:
    driver: local
  caddy_config:
    driver: local

networks:
  ibn-al-azhar-docs-network:
    driver: bridge
```

### 2.4 Dockerfile متعدد المراحل

```dockerfile
# Dockerfile

# ── المرحلة 1: التبعيات ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ── المرحلة 2: البناء ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ── المرحلة 3: التطوير ──
FROM node:20-alpine AS development
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
CMD ["pnpm", "dev"]

# ── المرحلة 4: الإنتاج ──
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# إنشاء مستخدم غير جذر
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# نسخ الملفات اللازمة فقط
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ملكية الملفات
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2.5 إعداد Caddy (Caddyfile)

```
# Caddyfile — بيئة الإنتاج
{$DOMAIN} {
    reverse_proxy app:3000

    # ضغط الاستجابات
    encode gzip zstd

    # Security headers
    header {
        # HSTS — سنة واحدة مع preload
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

        # منع clickjacking
        X-Frame-Options "DENY"

        # منع MIME sniffing
        X-Content-Type-Options "nosniff"

        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"

        # Permissions policy
        Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"

        # CSP — أنظر 08_SECURITY_PRIVACY.md
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://storage.ibn-al-azhar-docs.app; font-src 'self'; connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; block-all-mixed-content"

        # حذف رأس الخادم
        -Server
    }

    # Rate limiting على مستوى Caddy
    rate_limit {
        zone app_zone {
            key    {remote_host}
            events 100
            window 1m
        }
    }

    # سجلات الوصول
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 10
        }
        format json
    }
}
```

---

## 3. المتغيرات البيئية (Environment Variables)

### 3.1 ملف .env.example كامل

```bash
# ═══════════════════════════════════════════════════
# Ibn Al-Azhar Docs — ابن الأزهر دوكس — Environment Variables
# أنظر 08_SECURITY_PRIVACY.md لسياسات الأسرار
# ═══════════════════════════════════════════════════

# ── عام ──
NODE_ENV=development                          # development | staging | production
NEXTAUTH_URL=http://localhost:3000             # URL الأساسي للتطبيق
APP_VERSION=0.1.0                             # إصدار التطبيق (يُحدّث تلقائياً في CI)

# ─ـ المصادقة (NextAuth.js v5) ──
AUTH_SECRET=                                   # مفتاق توقيع JWT — استخدم: openssl rand -hex 32
AUTH_SESSION_MAX_AGE=86400                      # JWT Session: 24 ساعة (بالثواني)
# AUTH_REFRESH_MAX_AGE غير مطلوب — NextAuth.js v5 يستخدم JWT فقط بدون refresh token منفصل
BCRYPT_COST_FACTOR=12                          # bcrypt cost factor (10-14)

# ─ـ Google OAuth ──
GOOGLE_CLIENT_ID=                              # من Google Cloud Console
GOOGLE_CLIENT_SECRET=                          # من Google Cloud Console — سري!

# ─ـ قاعدة البيانات (PostgreSQL) ──
DATABASE_URL=postgresql://ibn_al_azhar_docs:ibn_al_azhar_docs_dev_password@localhost:5432/ibn_al_azhar_docs
POSTGRES_DB=ibn_al_azhar_docs
POSTGRES_USER=ibn_al_azhar_docs
POSTGRES_PASSWORD=ibn_al_azhar_docs_dev_password           # استخدم كلمة مرور قوية في الإنتاج!

# ── Redis ──
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                                # فارغ في التطوير، مطلوب في الإنتاج
REDIS_URL=redis://localhost:6379               # رابط كامل (يتجاهل REDIS_PASSWORD إذا وُجد)

# ── MinIO ──
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin                 # استخدم كلمة مرور قوية في الإنتاج!
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin                    # استخدم مفتاح قوي في الإنتاج!
MINIO_BUCKET=ibn-al-azhar-docs-files
MINIO_USE_SSL=false                            # true في الإنتاج

# ── حدود الملفات ──
MAX_FILE_SIZE_BYTES=104857600                  # 100 MB
MAX_UPLOADS_PER_DAY_STUDENT=20
MAX_UPLOADS_PER_DAY_TEACHER=50
MAX_CONVERSIONS_PER_DAY_STUDENT=5
MAX_CONVERSIONS_PER_DAY_TEACHER=20
MAX_STORAGE_MB_STUDENT=1024
MAX_STORAGE_MB_TEACHER=2048
MAX_SHARE_LINKS_STUDENT=10
MAX_SHARE_LINKS_TEACHER=25

# ── OCR (Google Drive API) ──
GOOGLE_DRIVE_API_KEY=                          # مفتاح Google Drive API
OCR_TEMP_FILE_TTL_MS=300000                    # 5 دقائق — مدة بقاء الملف في Google

# ── Rate Limiting ──
RATE_LIMIT_AUTH_MAX=5                          # طلبات تسجيل الدخول
RATE_LIMIT_AUTH_WINDOW_MS=900000               # 15 دقيقة
RATE_LIMIT_UPLOAD_MAX=10                       # طلبات الرفع
RATE_LIMIT_UPLOAD_WINDOW_MS=3600000            # ساعة
RATE_LIMIT_API_MAX=100                         # طلبات API العامة
RATE_LIMIT_API_WINDOW_MS=60000                 # دقيقة

# ── Domain / SSL ──
DOMAIN=localhost                               # نطاق التطبيق (لـ Caddy + Let's Encrypt)
SSL_EMAIL=                                     # بريد لتنبيهات Let's Encrypt

# ── المراقبة (Post-MVP) ──
# SENTRY_DSN=                                 # Sentry DSN (إذا فُعّل)
# SENTRY_TRACES_SAMPLE_RATE=0.1               # نسبة أخذ العينات
```

### 3.2 متغيرات حسب البيئة

| المتغير | التطوير | Staging | الإنتاج |
|---------|---------|---------|---------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://staging.ibn-al-azhar-docs.app` | `https://ibn-al-azhar-docs.app` |
| `AUTH_SECRET` | (عشوائي محلي) | (عشوائي فريد) | (عشوائي فريد + دوران) |
| `DATABASE_URL` | `...@localhost:5432/ibn_al_azhar_docs` | `...@db:5432/ibn_al_azhar_docs_staging` | `...@db:5432/ibn_al_azhar_docs_prod` |
| `POSTGRES_PASSWORD` | `ibn_al_azhar_docs_dev_password` | (قوي) | (قوي جداً + دوران) |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | (قوي) | (قوي جداً + دوران) |
| `MINIO_USE_SSL` | `false` | `true` | `true` |
| `BCRYPT_COST_FACTOR` | `10` (أسرع) | `12` | `12` |
| `DOMAIN` | `localhost` | `staging.ibn-al-azhar-docs.app` | `ibn-al-azhar-docs.app` |

---

## 4. إدارة الأسرار (Secrets Management)

### 4.1 مقارنة المقاربات

| البيئة | الطريقة | الإيجابيات | السلبيات |
|--------|---------|-----------|---------|
| **التطوير** | `.env` file | بسيط، سريع | يحتاج انضباط (gitignore) |
| **Staging** | Docker secrets | آمن، مركزي | تعقيد أكبر |
| **الإنتاج** | مدير أسرار (Vault/Infisical) | آمن جداً، دوران تلقائي | تكلفة، تعقيد |
| **CI/CD** | GitHub Actions Secrets | مدمج، سهل | محدود بـ GitHub |

### 4.2 أفضل الممارسات

```
🚫 محظور:
  - commit ملف .env إلى Git
  - مشاركة أسرار عبر قنوات غير مشفرة
  - استخدام نفس السر عبر بيئات مختلفة
  - كتابة أسرار في Dockerfile أو docker-compose.yml (باستثناء القيم الافتراضية للتطوير)

✅ مطلوب:
  - .gitignore يحتوي: .env, .env.local, .env.*.local
  - .env.example مع قيم وهمية فقط
  - CI check: git-secrets أو truffleHog في كل PR
  - تدقيق دوري: مراجعة أسرار البيئة الإنتاج كل 90 يوماً
```

### 4.3 إعداد Docker Secrets (الإنتاج)

```bash
# إنشاء أسرار Docker
echo "your-strong-auth-secret" | docker secret create auth_secret -
echo "your-strong-db-password" | docker secret create db_password -
echo "your-strong-minio-secret" | docker secret create minio_secret -
echo "your-google-client-secret" | docker secret create google_client_secret -
```

```yaml
# استخدام Docker Secrets في docker-compose.prod.yml
services:
  app:
    secrets:
      - auth_secret
      - db_password
      - google_client_secret
    environment:
      AUTH_SECRET_FILE: /run/secrets/auth_secret
      DATABASE_URL: postgresql://ibn_al_azhar_docs:${DB_PASSWORD}@db:5432/ibn_al_azhar_docs

secrets:
  auth_secret:
    external: true
  db_password:
    external: true
  google_client_secret:
    external: true
```

### 4.4 سياسة دوران الأسرار

أنظر `08_SECURITY_PRIVACY.md` — قسم إدارة الأسرار للجدول الكامل.

| الخطوة | الإجراء |
|--------|---------|
| 1 | إنشاء سر جديد في مدير الأسرار |
| 2 | تحديث المتغير في البيئة |
| 3 | إعادة تشغيل الخدمات المتأثرة (`docker compose restart app worker`) |
| 4 | التحقق من عمل التطبيق |
| 5 | إبطال السر القديم |
| 6 | تسجيل عملية الدوران في audit log |

---

## 5. بيئة Staging

### 5.1 الإعداد

بيئة Staging هي نسخة طبق الأصل من بيئة الإنتاج مع بيانات اختبارية.

```bash
# على خادم Staging
git clone https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs.git /opt/ibn-al-azhar-docs-staging
cd /opt/ibn-al-azhar-docs-staging

# إعداد المتغيرات البيئية
cp .env.example .env
# تعديل .env لبيئة staging

# تشغيل الخدمات
docker compose -f docker-compose.prod.yml up -d

# تطبيق الترحيلات
docker compose exec app npx prisma migrate deploy

# بذر البيانات الاختبارية
docker compose exec app node prisma/seed-staging.js
```

### 5.2 الفروقات عن الإنتاج

| الجانب | Staging | الإنتاج |
|--------|---------|---------|
| النطاق | `staging.ibn-al-azhar-docs.app` | `ibn-al-azhar-docs.app` |
| البيانات | اختبارية (seed) | حقيقية |
| النسخ الاحتياطية | أسبوعية | يومية |
| المراقبة | أساسية | شاملة |
| SSL | Let's Encrypt (staging) | Let's Encrypt (production) |
| replicas | 1 worker | 2 workers |
| الموارد | أقل (VPS صغير) | كاملة |

### 5.3 إدارة بيانات Staging

- إعادة تعيين البيانات أسبوعياً: `pnpm prisma migrate reset && pnpm prisma db seed`
- لا يتم استخدام بيانات إنتاج حقيقية في Staging
- إذا لزم الأمر نسخ بيانات إنتاج (مع إخفاء PII): استخدام script مخصص لـ anonymization

---

## 6. بيئة الإنتاج (Production Environment)

### 6.1 متطلبات VPS

| المورد | الحد الأدنى | الموصى به |
|--------|------------|-----------|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **التخزين** | 40 GB SSD | 100 GB SSD |
| **الشبكة** | 100 Mbps | 1 Gbps |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **Docker** | 24.x+ | أحدث stable |

### 6.2 إعداد نظام التشغيل

```bash
#!/bin/bash
# setup-server.sh — إعداد خادم الإنتاج

# 1. تحديث النظام
apt update && apt upgrade -y

# 2. إنشاء مستخدم للتطبيق
adduser --disabled-password --gecos "" ibn-al-azhar-docs
usermod -aG docker ibn-al-azhar-docs

# 3. إعداد الجدار الناري
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# 4. تثبيت Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 5. إعداد fail2ban
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 6. إعداد المزامنة التلقائية للأمان
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 7. إعداد swap (إذا كان RAM أقل من 8GB)
if [ $(free -m | awk '/^Mem:/{print $2}') -lt 8000 ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p
fi

# 8. إنشاء مجلد التطبيق
mkdir -p /opt/ibn-al-azhar-docs
chown ibn-al-azhar-docs:ibn-al-azhar-docs /opt/ibn-al-azhar-docs

echo "✅ Server setup complete"
```

### 6.3 إعداد النطاق (Domain Setup)

```bash
# 1. توجيه DNS
#    A Record: ibn-al-azhar-docs.app → IP الخادم
#    A Record: www.ibn-al-azhar-docs.app → IP الخادم (اختياري)

# 2. التحقق من DNS
dig ibn-al-azhar-docs.app +short

# 3. إعداد المتغيرات البيئية
cd /opt/ibn-al-azhar-docs
cp .env.example .env
# تحرير .env بقيم الإنتاج
nano .env

# 4. تشغيل الخدمات
docker compose -f docker-compose.prod.yml up -d

# 5. التحقق من SSL (Caddy يحصل عليه تلقائياً)
curl -I https://ibn-al-azhar-docs.app
```

### 6.4 إعدادات أمان الخادم الإضافية

```bash
# /etc/sysctl.d/99-security.conf
# حماية من هجمات الشبكة
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.icmp_echo_ignore_broadcasts=1
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.default.send_redirects=0

# تطبيق
sysctl -p /etc/sysctl.d/99-security.conf
```

---

## 7. خط أنابيب CI/CD

### 7.1 مخطط التدفق

```
Push / PR
    │
    ▼
[1] Lint ─── فشل؟ ──► ❌ Block PR
    │
    ▼
[2] Type Check ─── فشل؟ ──► ❌ Block PR
    │
    ▼
[3] Unit Tests ─── فشل؟ ──► ❌ Block PR
    │
    ▼
[4] Integration Tests ─── فشل؟ ──► ❌ Block PR
    │
    ▼
[5] Security Scan (npm audit + Trivy) ─── ثغرة حرجة؟ ──► ❌ Block PR
    │
    ▼
[6] Build Docker Image ─── فشل؟ ──► ❌ Block
    │
    ▼
[7] E2E Tests (on staging) ─── فشل؟ ──► ❌ Block
    │
    ▼
[8] Deploy to Staging ─── يدوي approval
    │
    ▼
[9] Deploy to Production ─── يدوي approval
    │
    ▼
[10] Smoke Tests + Health Check
    │
    ▼
✅ Done
```

### 7.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

jobs:
  # ── المرحلة 1: Lint + Type Check ──
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: ESLint
        run: pnpm lint

      - name: Type Check
        run: pnpm typecheck

  # ── المرحلة 2: Unit Tests ──
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Unit Tests
        run: pnpm test:unit --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ── المرحلة 3: Integration Tests ──
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: ibn_al_azhar_docs_test
          POSTGRES_USER: ibn_al_azhar_docs
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate

      - name: Run Migrations
        env:
          DATABASE_URL: postgresql://ibn_al_azhar_docs:test_password@localhost:5432/ibn_al_azhar_docs_test
        run: pnpm prisma migrate deploy

      - name: Integration Tests
        env:
          DATABASE_URL: postgresql://ibn_al_azhar_docs:test_password@localhost:5432/ibn_al_azhar_docs_test
          TEST_DATABASE_URL: postgresql://ibn_al_azhar_docs:test_password@localhost:5432/ibn_al_azhar_docs_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          AUTH_SECRET: test-auth-secret-for-ci
        run: pnpm test:integration

  # ── المرحلة 4: Security Scan ──
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: npm audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Trivy Filesystem Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          severity: "HIGH,CRITICAL"
          exit-code: "1"

  # ── المرحلة 5: Build ──
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, security-scan]
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── المرحلة 6: E2E Tests ──
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E Tests
        run: pnpm test:e2e
        env:
          E2E_BASE_URL: https://staging.ibn-al-azhar-docs.app

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: |
            playwright-report/
            test-results/

  # ── المرحلة 7: Deploy ──
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ibn-al-azhar-docs
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/ibn-al-azhar-docs-staging
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            docker compose exec app npx prisma migrate deploy

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ibn-al-azhar-docs
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/ibn-al-azhar-docs
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --no-build
            docker compose exec app npx prisma migrate deploy
            # Smoke test
            sleep 10
            curl -f http://localhost:3000/api/health || exit 1
```

---

## 8. ترحيلات قاعدة البيانات (Database Migrations)

### 8.1 أوامر Prisma Migrate الشائعة

```bash
# إنشاء ترحيلة جديدة (بعد تعديل schema.prisma)
pnpm prisma migrate dev --name describe_the_change

# تطبيق الترحيلات في بيئة التطوير
pnpm prisma migrate dev

# تطبيق الترحيلات في بيئة الإنتاج (بدون إنشاء ترحيلة جديدة)
pnpm prisma migrate deploy

# حالة الترحيلات
pnpm prisma migrate status

# التراجع (reset — ⚠️ يحذف جميع البيانات)
pnpm prisma migrate reset

# إنشاء Prisma Client
pnpm prisma generate
```

### 8.2 استراتيجية الترحيل بدون توقف (Zero-Downtime Migrations)

#### القواعد الأساسية

| القاعدة | الشرح | مثال |
|---------|-------|------|
| **إضافة أعمدة كقابلة للقيم الفارغة** | لا تتطلب ملء القيم في الصفوف الموجودة | `addColumn nullable` |
| **إضافة أعمدة بقيم افتراضية** | الصفوف الموجودة تأخذ القيمة الافتراضية | `addColumn default=false` |
| **لا تحذف أعمدة فوراً** | احذف في ترحيلتين منفصلتين | المرحلة 1: توقف عن القراءة. المرحلة 2: احذف |
| **لا تعيد تسمية أعمدة** | أنشئ عموداً جديداً + انسخ البيانات + احذف القديم | عملية من 3 خطوات |
| **لا تغيّر نوع عمود بشكل متكسر** | أنشئ عموداً جديداً + انسخ + احذف | عملية من 3 خطوات |

#### نمط الترحيل المتدرج

```
الإصدار N (قيد التشغيل حالياً)
    │
    ▼
[الترحيلة 1] إضافة عمود جديد (nullable أو default)
    ← يعمل مع الإصدار N والإصدار N+1
    │
    ▼
[نشر الإصدار N+1] — يقرأ ويكتب العمود الجديد
    │
    ▼
[الترحيلة 2] حذف العمود القديم (بعد التأكد من عدم استخدامه)
    ← يعمل مع الإصدار N+1 فقط
```

### 8.3 خطة التراجع (Rollback Plan)

| السيناريو | الإجراء |
|-----------|---------|
| ترحيلة فشلت قبل التطبيق | لا إجراء مطلوب — قاعدة البيانات لم تتغير |
| ترحيلة فشلت أثناء التطبيق | Prisma يضع علامة `failed` — حل يدوي أو `prisma migrate reset` (dev only) |
| ترحيلة نجحت لكن التطبيق لا يعمل | تراجع الكود (rollback deployment) — قاعدة البيانات تبقى بالنسخة الجديدة |
| ترحيلة أنشأت أعمدة غير متوافقة | إنشاء ترحيلة عكسية يدوياً (inverse migration) |

```sql
-- مثال: ترحيلة عكسية لعمود مُضاف
-- في ملف: prisma/migrations/20250305_rollback_add_column/migration.sql
ALTER TABLE "Document" DROP COLUMN IF EXISTS "newColumn";
```

---

## 9. النسخ الاحتياطية (Backups)

### 9.1 استراتيجية النسخ الاحتياطي لـ PostgreSQL

#### النسخ التلقائي عبر Cron

```bash
#!/bin/bash
# /opt/ibn-al-azhar-docs/scripts/backup-postgres.sh
set -euo pipefail

BACKUP_DIR="/opt/ibn-al-azhar-docs/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# إنشاء نسخة احتياطية
docker compose exec -T db pg_dump \
  -U ibn_al_azhar_docs \
  -F custom \
  --compress=9 \
  ibn_al_azhar_docs > "${BACKUP_DIR}/ibn_al_azhar_docs_${TIMESTAMP}.dump"

# التحقق من صحة النسخة
if [ $? -eq 0 ]; then
  echo "[$(date)] Backup created: ibn_al_azhar_docs_${TIMESTAMP}.dump"

  # حذف النسخ القديمة (أكثر من RETENTION_DAYS)
  find "$BACKUP_DIR" -name "ibn_al_azhar_docs_*.dump" -mtime +$RETENTION_DAYS -delete
  echo "[$(date)] Old backups cleaned (older than ${RETENTION_DAYS} days)"
else
  echo "[$(date)] ERROR: Backup failed!" >&2
  exit 1
fi
```

```bash
# إعداد Cron — يومياً الساعة 3 صباحاً
crontab -e
# أضف:
0 3 * * * /opt/ibn-al-azhar-docs/scripts/backup-postgres.sh >> /opt/ibn-al-azhar-docs/logs/backup.log 2>&1
```

### 9.2 استراتيجية النسخ الاحتياطي لـ MinIO

```bash
#!/bin/bash
# /opt/ibn-al-azhar-docs/scripts/backup-minio.sh
set -euo pipefail

BACKUP_DIR="/opt/ibn-al-azhar-docs/backups/minio"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

# نسخ حاوية MinIO بالكامل باستخدام mc mirror
docker compose exec -T minio mc mirror \
  --overwrite \
  --remove \
  local/ibn-al-azhar-docs-files \
  /backup/ibn-al-azhar-docs-files-"${TIMESTAMP}"

# ضغط النسخة
tar -czf "${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz" \
  -C /backup \
  "ibn-al-azhar-docs-files-${TIMESTAMP}"

# حذف النسخ القديمة
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] MinIO backup completed: minio_${TIMESTAMP}.tar.gz"
```

### 9.3 جدول النسخ الاحتياطية

| المكون | التكرار | مدة الاحتفاظ | طريقة التخزين | الحجم التقريبي |
|--------|---------|-------------|-------------|---------------|
| PostgreSQL | يومياً (3 صباحاً) | 30 يوماً | `/opt/ibn-al-azhar-docs/backups/postgres/` | ~50 MB |
| MinIO | أسبوعياً (الأحد 4 صباحاً) | 14 يوماً | `/opt/ibn-al-azhar-docs/backups/minio/` | متغير |
| Redis | لا يُنسخ احتياطياً | — | appendonly + maxmemory | — |
| Caddy config | عند التغيير | بلا حد | Git repository | < 1 MB |

### 9.4 اختبار الاستعادة

| التكرار | الإجراء |
|---------|---------|
| شهرياً | استعادة نسخة PostgreSQL احتياطية على خادم اختبار |
| ربع سنوياً | استعادة كاملة لجميع المكونات (DR test) |
| بعد كل إصدار رئيسي | التحقق من توافق النسخ مع الإصدار الجديد |

---

## 10. خطة الاستعادة (Restore Plan)

### 10.1 استعادة PostgreSQL

```bash
#!/bin/bash
# restore-postgres.sh — استعادة قاعدة البيانات من نسخة احتياطية
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-postgres.sh <backup-file>}"

echo "⚠️  WARNING: This will replace the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# 1. إيقاف التطبيق (لمنع الاتصالات أثناء الاستعادة)
docker compose stop app worker

# 2. إنشاء نسخة احتياطية من الحالة الحالية (للأمان)
echo "Creating safety backup of current state..."
docker compose exec -T db pg_dump -U ibn_al_azhar_docs -F custom ibn_al_azhar_docs \
  > "/opt/ibn-al-azhar-docs/backups/postgres/pre_restore_$(date +%Y%m%d_%H%M%S).dump"

# 3. استعادة النسخة
echo "Restoring from backup..."
docker compose exec -T db pg_restore \
  -U ibn_al_azhar_docs \
  -d ibn_al_azhar_docs \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  < "$BACKUP_FILE"

# 4. التحقق
echo "Verifying restore..."
docker compose exec -T db psql -U ibn_al_azhar_docs -d ibn_al_azhar_docs -c "SELECT COUNT(*) FROM \"User\";"

# 5. إعادة تشغيل التطبيق
docker compose start app worker

echo "✅ Database restore completed"
```

### 10.2 استعادة MinIO

```bash
#!/bin/bash
# restore-minio.sh — استعادة ملفات MinIO من نسخة احتياطية
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-minio.sh <backup-file>}"

echo "⚠️  WARNING: This will replace current MinIO data!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  exit 0
fi

# 1. فك ضغط النسخة
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# 2. استعادة الملفات
docker compose exec -T minio mc mirror \
  --overwrite \
  --remove \
  "${TEMP_DIR}/ibn-al-azhar-docs-files-*" \
  local/ibn-al-azhar-docs-files

# 3. تنظيف
rm -rf "$TEMP_DIR"

echo "✅ MinIO restore completed"
```

### 10.3 استعادة كاملة (Disaster Recovery)

```bash
#!/bin/bash
# full-restore.sh — استعادة كاملة بعد كارثة
set -euo pipefail

POSTGRES_BACKUP="${1:?Usage: full-restore.sh <postgres-backup> <minio-backup>}"
MINIO_BACKUP="${2:?}"

echo "🚨 FULL DISASTER RECOVERY"
echo "PostgreSQL: $POSTGRES_BACKUP"
echo "MinIO: $MINIO_BACKUP"
read -p "This is a FULL restore. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  exit 0
fi

# 1. إيقاف جميع الخدمات
docker compose down

# 2. تشغيل الخدمات الأساسية فقط
docker compose up -d db redis minio
sleep 10

# 3. استعادة PostgreSQL
bash /opt/ibn-al-azhar-docs/scripts/restore-postgres.sh "$POSTGRES_BACKUP"

# 4. استعادة MinIO
bash /opt/ibn-al-azhar-docs/scripts/restore-minio.sh "$MINIO_BACKUP"

# 5. تطبيق أي ترحيلات معلقة
docker compose run --rm app npx prisma migrate deploy

# 6. تشغيل جميع الخدمات
docker compose up -d

# 7. فحص الصحة
sleep 15
curl -f http://localhost:3000/api/health || echo "❌ Health check failed!"

echo "✅ Full restore completed"
```

### 10.4 أوقات الاستعادة المستهدفة (RTO/RPO)

| المقياس | الهدف | الشرح |
|---------|-------|-------|
| **RPO** (Recovery Point Objective) | 24 ساعة | أقصى فقد بيانات مقبول |
| **RTO** (Recovery Time Objective) | 2 ساعة | أقصى مدة لتعافي الخدمة |
| **PostgreSQL RPO** | < 24 ساعة | نسخ يومية |
| **MinIO RPO** | < 7 أيام | نسخ أسبوعية |
| **Redis RPO** | 0 (acceptable loss) | بيانات مؤقتة |

---

## 11. SSL والنطاق

### 11.1 إعداد Caddy + Let's Encrypt

Caddy يحصل تلقائياً على شهادات SSL من Let's Encrypt ويجدهدها. لا حاجة لإعداد يدوي.

```caddyfile
# Caddyfile — الإنتاج
ibn-al-azhar-docs.app {
    # Caddy يحصل على شهادة تلقائياً
    # ويجدهدها قبل انتهائها بـ 30 يوماً

    reverse_proxy app:3000
    encode gzip zstd

    # ... (security headers أنظر القسم 2.5)
}

www.ibn-al-azhar-docs.app {
    redir https://ibn-al-azhar-docs.app{uri} permanent
}
```

### 11.2 تكوين DNS المطلوب

| النوع | الاسم | القيمة | الأولوية |
|-------|-------|--------|---------|
| A | `@` | `IP الخادم` | عالية |
| A | `www` | `IP الخادم` | متوسطة |
| AAAA | `@` | `IPv6 الخادم` (إن وُجد) | متوسطة |
| CAA | `@` | `0 issue "letsencrypt.org"` | عالية |

### 11.3 تجديد الشهادات

| الجانب | التفاصيل |
|--------|---------|
| **التجديد التلقائي** | Caddy يجدد قبل 30 يوماً من الانتهاء |
| **مدة الشهادة** | 90 يوماً (Let's Encrypt) |
| **طريقة التحدي** | HTTP-01 (افتراضي) أو TLS-ALPN-01 |
| **المراقبة** | فحص تاريخ انتهاء الشهادة أسبوعياً |
| **النسخ الاحتياطي** | شهادات Caddy في `caddy_data` volume |

### 11.4 استكشاف أخطاء SSL

```bash
# فحص حالة الشهادة
curl -vI https://ibn-al-azhar-docs.app 2>&1 | rg "expire\|SSL\|certificate"

# فحص تفاصيل الشهادة
echo | openssl s_client -connect ibn-al-azhar-docs.app:443 2>/dev/null | openssl x509 -noout -dates -subject

# إعادة الحصول على الشهادة (إذا فشل التجديد)
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# سجلات Caddy
docker compose logs caddy --tail=50
```

---

## 12. المراقبة (Monitoring)

### 12.1 مراقبة وقت التشغيل (Uptime Monitoring)

| الأداة | التردد | التنبيه | التكلفة |
|--------|--------|---------|---------|
| **UptimeRobot** (MVP) | كل 5 دقائق | بريد إلكتروني + webhook | مجاني (50 monitor) |
| **Post-MVP** | كل دقيقة | Slack + SMS | مدفوع |

#### إعداد UptimeRobot

- Monitor 1: `https://ibn-al-azhar-docs.app/api/health` — HTTP(s) monitoring
- Monitor 2: `https://ibn-al-azhar-docs.app` — Keyword monitoring (بحث عن "مستند")
- Alert contacts: بريد إلكتروني الفريق + Slack webhook

### 12.2 مراقبة التطبيق (Application Monitoring)

```typescript
// src/lib/monitoring/metrics.ts
// مقاييس مخصصة يتم جمعها عبر middleware

export const appMetrics = {
  // مقاييس الطلبات
  requestCount: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),

  requestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),

  // مقاييس الأعمال
  fileUploads: new Counter({
    name: 'file_uploads_total',
    help: 'Total number of file uploads',
    labelNames: ['file_type', 'user_role'],
  }),

  conversions: new Counter({
    name: 'conversions_total',
    help: 'Total number of document conversions',
    labelNames: ['source_type', 'target_type', 'status'],
  }),

  conversionDuration: new Histogram({
    name: 'conversion_duration_seconds',
    help: 'Document conversion duration',
    labelNames: ['source_type', 'target_type'],
    buckets: [5, 15, 30, 60, 120, 300],
  }),

  // مقاييس الأمان
  authAttempts: new Counter({
    name: 'auth_attempts_total',
    help: 'Authentication attempts',
    labelNames: ['type', 'status'],
  }),

  rateLimitHits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Rate limit violations',
    labelNames: ['endpoint', 'ip_range'],
  }),
};
```

### 12.3 مقاييس المراقبة الرئيسية

| المقياس | الهدف | تنبيه عند |
|---------|-------|----------|
| Uptime | ≥ 99.5% | < 99% |
| API p95 latency | < 1s | > 2s |
| Error rate (5xx) | < 0.5% | > 2% |
| Active users (daily) | growing | انخفاض > 20% |
| Queue depth | < 100 jobs | > 500 jobs |
| Failed jobs | < 1% | > 5% |
| Database connections | < 50 | > 80 |
| Redis memory | < 200 MB | > 240 MB |
| MinIO disk usage | < 70% | > 85% |
| SSL certificate expiry | > 30 days | < 14 days |

---

## 13. التسجيل (Logging)

### 13.1 pino — التسجيل المهيكل

```typescript
// src/lib/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
    }),
  },
  // في الإنتاج: تنسيق JSON مدمج
  // في التطوير: تنسيق مقروء
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' } }
    : undefined,
});

export default logger;
```

### 13.2 مستويات التسجيل

| المستوى | الاستخدام | مثال |
|---------|----------|------|
| `fatal` | خطأ قاتل يوقف التطبيق | فشل الاتصال بقاعدة البيانات عند البدء |
| `error` | خطأ يؤثر على وظيفة | فشل تحويل ملف، خطأ في API |
| `warn` | تحذير يستحق الانتباه | تجاوز rate limit، محاولة وصول مرفوضة |
| `info` | معلومات تشغيلية عادية | تسجيل دخول، رفع ملف، تحويل ناجح |
| `debug` | معلومات تفصيلية للتطوير | محتوى request body، متغيرات الحالة |
| `trace` | تتبع تفصيلي جداً | استدعاءات الدوال، استعلامات Prisma |

### 13.3 تنسيق السجل في الإنتاج

```json
{
  "level": "info",
  "time": 1709654400000,
  "pid": 12345,
  "hostname": "app-container-1",
  "requestId": "req_abc123",
  "msg": "File upload completed",
  "userId": "usr_456",
  "fileId": "doc_789",
  "fileSize": 2048000,
  "mimeType": "application/pdf",
  "duration_ms": 1250
}
```

### 13.4 تخزين السجلات وتحليلها

| البيئة | التخزين | التحليل | مدة الاحتفاظ |
|--------|---------|---------|-------------|
| التطوير | stdout (terminal) | عيني | — |
| Staging | ملفات محلية + stdout | يدوي | 7 أيام |
| الإنتاج | ملفات مُدارة (rotated) | Post-MVP: Grafana/Loki | 30 يوماً |

#### Log Rotation في الإنتاج

```yaml
# docker-compose.prod.yml — إعداد log rotation
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
        tag: "ibn-al-azhar-docs"

  worker:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
        tag: "ibn-al-azhar-docs-worker"
```

### 13.5 ما لا يتم تسجيله

أنظر `08_SECURITY_PRIVACY.md` — قسم سياسة التسجيل للقائمة الكاملة.

- ❌ كلمات المرور
- ❌ JWT tokens كاملة
- ❌ محتوى الملفات
- ❌ نتائج OCR
- ❌ أرقام بطاقات الائتمان
- ❌ تفاصيل PII غير مشفرة

---

## 14. الإبلاغ عن الأخطاء (Error Reporting)

### 14.1 أخطاء العميل (Client-Side Errors)

```typescript
// src/lib/error-reporting.ts
// MVP: إرسال أخطاء العميل إلى API endpoint خاص

export function reportClientError(error: Error, context?: Record<string, unknown>) {
  // لا نرسل PII
  const sanitizedContext = sanitizeLog(context || {});

  fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context: sanitizedContext,
    }),
  }).catch(() => {
    // فشل صامت — لا نريد أن يتسبب إبلاغ الخطأ في خطأ آخر
  });
}

// التقاط أخطاء غير معالجة
window.addEventListener('error', (event) => {
  reportClientError(event.error, { type: 'unhandled_error' });
});

window.addEventListener('unhandledrejection', (event) => {
  reportClientError(new Error(event.reason), { type: 'unhandled_promise' });
});
```

### 14.2 أخطاء الخادم (Server-Side Errors)

```typescript
// src/middleware/error-handler.ts
import logger from '@/lib/logger';

export function errorHandler(error: Error, req: Request): Response {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  if (error instanceof AppError) {
    // أخطاء التطبيق المتوقعة
    logger.warn({
      requestId,
      err: error,
      msg: error.message,
      code: error.code,
    });

    return Response.json(
      { error: error.code, message: error.clientMessage },
      { status: error.statusCode }
    );
  }

  // أخطاء غير متوقعة
  logger.error({
    requestId,
    err: error,
    msg: 'Unexpected error',
    url: req.url,
    method: req.method,
  });

  // Post-MVP: إرسال إلى Sentry
  // Sentry.captureException(error, { extra: { requestId } });

  return Response.json(
    { error: 'internal_error', message: 'حدث خطأ غير متوقع', requestId },
    { status: 500 }
  );
}
```

### 14.3 Sentry — Post-MVP

```typescript
// إعداد Sentry (مستقبلي)
// import * as Sentry from '@sentry/nextjs';

// Sentry.init({
//   dsn: process.env.SENTRY_DSN,
//   environment: process.env.NODE_ENV,
//   tracesSampleRate: 0.1,
//   replaysSessionSampleRate: 0,
//   replaysOnErrorSampleRate: 1.0,
//   beforeSend(event) {
//     // إزالة PII قبل الإرسال
//     delete event.request?.cookies;
//     return event;
//   },
// });
```

### 14.4 تصنيف الأخطاء

| التصنيف | الشرح | مثال | الاستجابة |
|---------|-------|------|----------|
| **Expected** | خطأ متوقع من المستخدم | كلمة مرور خاطئة، ملف كبير جداً | JSON error + رسالة واضحة |
| **Operational** | خطأ تشغيلي معروف | فشل Google API، نفاد مساحة القرص | Retry + إشعار |
| **Unexpected** | خطأ برمجي غير متوقع | TypeError، ReferenceError | Log + إشعار فوري |
| **Fatal** | خطأ يوقف النظام | فشل الاتصال بـ DB | Restart + إشعار طوارئ |

---

## 15. استراتيجية التراجع (Rollback Strategy)

### 15.1 متى نتراجع

| الشرط | الإجراء |
|--------|---------|
| فشل health check بعد النشر لمدة 5 دقائق | تراجع تلقائي |
| ارتفاع معدل الأخطاء (5xx) فوق 10% | تراجع فوري |
| اكتشاف ثغرة أمنية حرجة في الإصدار الجديد | تراجع فوري |
| فشل وظيفة حرجة (تسجيل الدخول، رفع الملفات) | تراجع فوري |
| أداء متدهور بشكل كبير (p95 > 5s) | تراجع خلال 15 دقيقة |
| مشكلة في واجهة المستخدم لا تمنع الاستخدام | إصلاح سريع أو تراجع خلال ساعة |

### 15.2 كيفية التراجع

```bash
#!/bin/bash
# rollback.sh — تراجع إلى الإصدار السابق
set -euo pipefail

PREVIOUS_VERSION="${1:?Usage: rollback.sh <previous-image-tag>}"

echo "🔄 Rolling back to version: $PREVIOUS_VERSION"

# 1. تحديد الصورة السابقة
cd /opt/ibn-al-azhar-docs

# 2. تحديث tag الصورة
export IMAGE_TAG="$PREVIOUS_VERSION"

# 3. إعادة تشغيل الخدمات بالإصدار السابق
docker compose -f docker-compose.prod.yml up -d --no-build

# 4. انتظار بدء التشغيل
sleep 15

# 5. فحص الصحة
HEALTH=$(curl -sf http://localhost:3000/api/health | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
  echo "❌ Health check failed after rollback!"
  exit 1
fi

echo "✅ Rollback completed to version: $PREVIOUS_VERSION"
```

### 15.3 اتساق البيانات أثناء التراجع

| السيناريو | المخاطرة | الإجراء |
|-----------|---------|---------|
| تراجع بدون ترحيلات قاعدة بيانات | منخفضة | لا إجراء — DB متوافقة |
| تراجع بعد إضافة أعمدة nullable | منخفضة | الإصدار القديم يتجاهل الأعمدة الجديدة |
| تراجع بعد حذف أعمدة | عالية | ⚠️ يجب إنشاء ترحيلة عكسية أولاً |
| تراجع بعد تغيير نوع عمود | عالية | ⚠️ يجب إنشاء ترحيلة عكسية أولاً |

> **قاعدة:** لا يتم التراجع عن ترحيلات قاعدة البيانات أثناء التراجع عن الكود. يجب أن تكون الترحيلات متوافقة مع الإصدارين (forward and backward compatible).

---

## 16. فحوصات الصحة (Health Checks)

### 16.1 نقطة نهاية فحص الصحة (Health Endpoint)

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { minioClient } from '@/lib/minio';

export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};
  let overallStatus = 'ok';

  // 1. فحص قاعدة البيانات
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency_ms: Date.now() - start };
  } catch {
    checks.database = { status: 'error' };
    overallStatus = 'degraded';
  }

  // 2. فحص Redis
  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'ok', latency_ms: Date.now() - start };
  } catch {
    checks.redis = { status: 'error' };
    overallStatus = 'degraded';
  }

  // 3. فحص MinIO
  try {
    const start = Date.now();
    await minioClient.bucketExists('ibn-al-azhar-docs-files');
    checks.minio = { status: 'ok', latency_ms: Date.now() - start };
  } catch {
    checks.minio = { status: 'error' };
    overallStatus = 'degraded';
  }

  const statusCode = overallStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      version: process.env.APP_VERSION || 'unknown',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
```

### 16.2 Docker Health Checks

```yaml
# في docker-compose.prod.yml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ibn_al_azhar_docs"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 16.3 عتبات التنبيه

| المقياس | التحذير | الحرج | الإجراء |
|---------|---------|-------|---------|
| Health check فاشل | 1 فشل متتالي | 3 إخفاقات متتالية | إعادة تشغيل الحاوية |
| CPU usage | > 70% | > 90% | تحقيق + توسيع |
| Memory usage | > 75% | > 90% | تحقيق + إعادة تشغيل |
| Disk usage | > 70% | > 85% | تنظيف + توسيع |
| Database connections | > 60 | > 80 | تحقيق + connection pooling |
| Redis memory | > 200 MB | > 240 MB | تحقيق + تنظيف |
| Queue depth | > 100 | > 500 | توسيع workers |
| 5xx error rate | > 1% | > 5% | تراجع محتمل |

---

## 17. قائمة مراجعة النشر (Deployment Checklist)

### 17.1 قبل النشر (Pre-Deployment)

| # | العنصر | الحالة |
|---|--------|--------|
| 1 | جميع اختبارات CI تنجح (lint, type check, unit, integration) | ☐ |
| 2 | اختبارات الأمان تجتاز (npm audit, Trivy) | ☐ |
| 3 | اختبارات E2E تنجح على Staging | ☐ |
| 4 | مراجعة الكود مكتملة وموافق عليها | ☐ |
| 5 | ترحيلات قاعدة البيانات مُختبرة وجاهزة | ☐ |
| 6 | Changelog مُحدّث | ☐ |
| 7 | المتغيرات البيئية الجديدة موثقة ومُعدة في جميع البيئات | ☐ |
| 8 | نسخة احتياطية حديثة من الإنتاج متوفرة | ☐ |
| 9 | خطة التراجع مُعدة ومُختبرة | ☐ |
| 10 | إشعار المستخدمين (إن لزم) مُعد | ☐ |
| 11 | مستندات API مُحدّثة (إن لزم) | ☐ |
| 12 | Feature flags مُعدة (إن لزم) | ☐ |

### 17.2 أثناء النشر (During Deployment)

| # | العنصر | الإجراء |
|---|--------|---------|
| 1 | إيقاف تنبيهات المراقبة مؤقتاً | تجنب تنبيهات كاذبة أثناء النشر |
| 2 | تطبيق ترحيلات قاعدة البيانات | `prisma migrate deploy` |
| 3 | سحب الصور الجديدة | `docker compose pull` |
| 4 | إعادة تشغيل الخدمات | `docker compose up -d` |
| 5 | مراقبة السجلات | `docker compose logs -f --tail=50` |
| 6 | فحص الصحة | `curl https://ibn-al-azhar-docs.app/api/health` |
| 7 | Smoke tests يدوية | تسجيل دخول، رفع ملف، تحويل |
| 8 | مراقبة معدل الأخطاء | 5 دقائق على الأقل |

### 17.3 بعد النشر (Post-Deployment)

| # | العنصر | الحالة |
|---|--------|--------|
| 1 | Health check يُرجع `ok` | ☐ |
| 2 | معدل الأخطاء (5xx) < 1% | ☐ |
| 3 | API response time ضمن الأهداف | ☐ |
| 4 | Smoke tests تنجح | ☐ |
| 5 | لا أخطاء في سجلات العامل (worker) | ☐ |
| 6 | ترحيلات قاعدة البيانات طُبقت بنجاح | ☐ |
| 7 | إعادة تفعيل تنبيهات المراقبة | ☐ |
| 8 | تحديث tag الإصدار | ☐ |
| 9 | إشعار الفريق بنجاح النشر | ☐ |
| 10 | مراقبة مكثفة لمدة ساعتين | ☐ |

### 17.4 في حالة الفشل

```
فشل النشر
    │
    ▼
[1] تحديد نوع الفشل
    ├── فشل في الترحيلات → لا تتراجع، حل يدوي
    ├── فشل في التطبيق → تنفيذ rollback.sh
    └── فشل جزئي → تحقيق + قرار
    │
    ▼
[2] تنفيذ التراجع (إن لزم)
    │   └─ bash rollback.sh <previous-version>
    │
    ▼
[3] إشعار الفريق
    │   └─ Slack #deployments + إيميل
    │
    ▼
[4] تحقيق ما بعد الحادث
        └─ خلال 24 ساعة
```

---

> **المراجع المتقاطعة:**
> - سياسات الأسرار والأمان: `08_SECURITY_PRIVACY.md`
> - خطة الاختبار ومعايير الإصدار: `09_QA_TEST_PLAN.md`
> - معمارية النظام: `05_TECHNICAL_DESIGN.md`
> - مواصفات API: `06_API_SPEC.md`
> - مخطط قاعدة البيانات: `07_DATABASE_SCHEMA.md`

---

## تحديثات V4.1 — Docker-First

> **الإصدار:** 4.1.0  
> **آخر تحديث:** 2026-03-05  
> **الملخص:** يحدّث هذا القسم مستند العمليات والنشر ليعكس فلسفة Docker-First المعتمدة في V4.1، بما في ذلك اصطلاحات تسمية ملفات Docker Compose الجديدة، وفصل حاوية Worker، وتوحيد المتغيرات البيئية.

### V4.1.1 فلسفة Docker-First

ابتداءً من V4.1، تعتمد المنصة فلسفة **Docker-First**: جميع خدمات التطوير والإنتاج تعمل داخل حاويات Docker. لا يُشغّل أي خدمة مباشرة على الجهاز المضيف (no bare-metal). هذا يضمن:

- **تكافؤ البيئات**: بيئة التطوير مطابقة قدر الإمكان لبيئة الإنتاج
- **إعادة إنتاجية**: أي مطور يحصل على نفس السلوك عبر `docker compose up`
- **عزل التبعيات**: لا تتعارض إصدارات Node.js أو PostgreSQL مع باقي النظام
- **نشر مُوحّد**: نفس الحاويات تُنشر في Staging والإنتاج

### V4.1.2 اصطلاح تسمية ملفات Docker Compose (محدّث)

تم تحديث اصطلاح التسمية من `docker-compose.yml` / `docker-compose.prod.yml` إلى الصيغة الجديدة المتوافقة مع Docker Compose V2:

| الملف | الغرض | ملاحظات |
|-------|-------|---------|
| `compose.yaml` | الإعدادات الأساسية (Base) | الخدمات المشتركة بين جميع البيئات |
| `compose.dev.yaml` | تجاوزات التطوير (Development overrides) | Live reload, منافذ مكشوفة، أدوات تصحيح |
| `compose.prod.example.yaml` | قالب الإنتاج (Production template) | يُنسخ ويُعدّل لكل بيئة إنتاج |

**الاستخدام:**

```bash
# التطوير (يستخدم compose.yaml + compose.dev.yaml تلقائياً)
docker compose up -d

# الإنتاج
docker compose -f compose.yaml -f compose.prod.example.yaml up -d
```

> **ملاحظة**: Docker Compose V2 يقرأ تلقائياً `compose.yaml` و `compose.dev.yaml` عند تشغيل `docker compose up` بدون علم `-f`.

### V4.1.3 فصل حاوية Worker — Dockerfile.worker

تم فصل حاوية Worker في ملف Dockerfile مستقل `Dockerfile.worker` بدلاً من استخدام نفس `Dockerfile` مع `target: production`. هذا يتيح:

- بناء مستقل أسرع لحاوية Worker دون تضمين أصول Next.js الأمامية
- تحكم أدق في الموارد والتبعيات
- دورة حياة نشر مستقلة عن حاوية الويب

```dockerfile
# Dockerfile.worker
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build:worker

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules ./node_modules
RUN chown -R worker:nodejs /app
USER worker
CMD ["node", "dist/worker.js"]
```

### V4.1.4 Caddy لتكافؤ التطوير والإنتاج

يُوصى بإضافة حاوية Caddy اختيارية في بيئة التطوير لتحقيق التكافؤ مع بيئة الإنتاج:

```yaml
# compose.dev.yaml — إضافة اختيارية
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "3000:3000"
    volumes:
      - ./Caddyfile.dev:/etc/caddy/Caddyfile:ro
    depends_on:
      - web
```

**الفوائد:**
- اختبار تهيئة Caddy محلياً قبل النشر
- محاكاة رؤوس الأمان والضغط
- اختبار SSL محلي (بشهادات ذاتية)

### V4.1.5 Mailpit — اختبار البريد الإلكتروني

حاوية اختيارية لاختبار رسائل البريد الإلكتروني في التطوير:

```yaml
# compose.dev.yaml — إضافة اختيارية
services:
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"   # واجهة الويب
      - "1025:1025"   # SMTP
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "true"
      MP_SMTP_AUTH_ALLOW_INSECURE: "true"
```

**الاستخدام**: يُشغّل مع `docker compose up`، وتُرسل رسائل التطوير إلى `mailpit:1025`، وتُعرض في `http://localhost:8025`.

### V4.1.6 أوامر Docker Compose المحدّثة

```bash
# تشغيل جميع الخدمات
docker compose up -d

# متابعة السجلات
docker compose logs -f

# إيقاف الخدمات
docker compose down

# إيقاف الخدمات وحذف الحجوم (⚠️ يحذف جميع البيانات)
docker compose down -v

# تطبيق ترحيلات قاعدة البيانات
docker compose exec web pnpm prisma migrate dev

# فتح Prisma Studio
docker compose exec web pnpm prisma studio

# تشغيل Worker في وضع التطوير
docker compose exec worker pnpm worker:dev
```

> **ملاحظة**: اسم الخدمة `app` أصبح `web` في اصطلاحات V4.1 لتمييزها عن حاوية `worker`.

### V4.1.7 المتغيرات البيئية الموحّدة

تم توحيد المتغيرات البيئية في V4.1 بالتنسيق التالي (أنظر `30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` للتفاصيل الكاملة):

```bash
# ═══════════════════════════════════════════════════
# Ibn Al-Azhar Docs — V4.1 Unified Environment Variables
# ═══════════════════════════════════════════════════

APP_NAME="Ibn Al-Azhar Docs"
APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://..."
REDIS_URL="redis://redis:6379"
S3_ENDPOINT="http://minio:9000"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_BUCKET="ibn-al-azhar-docs"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
MAX_UPLOAD_SIZE_MB=100
SHARE_TOKEN_BYTES=32
OCR_PROVIDER="google-drive"
```

> **التحولات الرئيسية من V4.0:**
> - `MINIO_*` أصبحت `S3_*` (توافق أوسع مع أي مزود S3)
> - `AUTH_SECRET` أصبح `NEXTAUTH_SECRET` (يتوافق مع اصطلاح NextAuth.js v5)
> - إضافة `APP_NAME` و `APP_URL` كمتغيرات موحّدة
> - `MAX_FILE_SIZE_BYTES` أصبح `MAX_UPLOAD_SIZE_MB` (أكثر وضوحاً)
