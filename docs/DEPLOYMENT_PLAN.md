# خطة النشر الكاملة — Ibn Al-Azhar Docs

## ملخص الـ Stack

| الخدمة                    | المنصة              | التكلفة | السبب                        |
| ------------------------- | ------------------- | ------- | ---------------------------- |
| **Frontend (Next.js 16)** | Cloudflare Workers  | $0/شهر  | Edge, 100K req/day, no phone |
| **PostgreSQL 16**         | Neon                | $0/شهر  | Serverless, 0.5GB مجاني      |
| **Redis (BullMQ)**        | Upstash             | $0/شهر  | Serverless, 500K cmds/شهر    |
| **Object Storage**        | Cloudflare R2       | $0/شهر  | 10GB مجاني, zero egress      |
| **OCR Worker**            | Hugging Face Spaces | $0/شهر  | Docker, 2 vCPU, 16GB RAM     |
| **Export Worker**         | Hugging Face Spaces | $0/شهر  | Docker, 2 vCPU, 16GB RAM     |
| **Domain**                | Cloudflare          | $0/شهر  | ibnalazhardocs.workers.dev   |

**المجموع: $0/شهر — بدون فيزا، بدون هاتف**

---

## الـ Architecture النهائية

```
┌─────────────────────────────────────────────────────────┐
│            Cloudflare Workers (Frontend)                 │
│          Next.js 16 via @opennextjs/cloudflare           │
│            ibnalazhardocs.workers.dev                    │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Neon (Postgres)    │  │   Upstash (Redis)    │
│  0.5GB, 100 CU-hrs  │  │  500K cmds/month     │
│  Serverless + Pooled │  │  Serverless + TLS    │
└──────────────────────┘  └──────────────────────┘
               │                      │
               ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare R2 (Object Storage)              │
│                    10GB, zero egress                     │
└─────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│           Hugging Face Spaces (Workers)                  │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │   OCR Worker     │    │  Export Worker   │             │
│  │  Tesseract+Python│    │  Node.js only    │             │
│  │  Docker container│    │  Docker container│             │
│  └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## الحسابات المطلوبة (ibnalazhardocs@gmail.com)

### 1. Cloudflare (Frontend + R2)

- **الرابط:** https://dash.cloudflare.com
- **الإيميل:** ibnalazhardocs@gmail.com
- **المجان:** 100K requests/day, 10GB R2, zero egress
- **المميزات:** Edge network, no phone verification, GitHub auto-deploy

### 2. Neon (PostgreSQL)

- **الرابط:** https://neon.tech
- **الإيميل:** ibnalazhardocs@gmail.com
- **المجان:** 0.5GB storage, 100 compute hours/شهر, scale-to-zero
- **المميزات:** Serverless Postgres, `directUrl` support for migrations

### 3. Upstash (Redis)

- **الرابط:** https://upstash.com
- **الإيميل:** ibnalazhardocs@gmail.com
- **المجان:** 500K commands/شهر, 256MB data, 10GB bandwidth
- **المميزات:** Serverless Redis, TLS URLs (`rediss://`), REST API

### 4. Hugging Face (Workers)

- **الرابط:** https://huggingface.co
- **الإيميل:** ibnalazhardocs@gmail.com
- **المجان:** 2 vCPU, 16GB RAM per Space, Docker support
- **الملاحظات:** بينام بعد idle, نحتاج keep-alive mechanism

### 5. Google Cloud (OAuth + Gemini)

- **الرابط:** https://console.cloud.google.com
- **الإيميل:** ibnalazhardocs@gmail.com
- **المجان:** OAuth 2.0 + Gemini API free tier
- **المطلوب:** Create OAuth Client ID + API Key

---

## متطلبات ما قبل النشر

- [ ] **Cloudflare**: Create account, verify email
- [ ] **Neon**: Create account, create project
- [ ] **Upstash**: Create account, create Redis database
- [ ] **Hugging Face**: Create account
- [ ] **Google Cloud**: Create project, enable APIs

---

## خطوات النشر

### المرحلة 1: إعداد Cloudflare Account

1. Sign up at https://dash.cloudflare.com
2. Verify email (no phone needed)
3. Note your **Account ID** (dashboard right sidebar)
4. Create R2 API token:
   - Go to R2 → Manage R2 API Tokens
   - Create token with `Object Read & Write` permissions
   - Copy Access Key ID + Secret Access Key
5. Create R2 bucket:
   - Go to R2 → Create bucket
   - Name: `ibnalazhardocs`
   - Location: Automatic

### المرحلة 2: إعداد Neon Database

1. Sign up at https://neon.tech
2. Create project (PostgreSQL 16)
3. Copy **pooled** connection string → `DATABASE_URL`
4. Copy **direct** connection string → `DATABASE_URL_DIRECT`
5. Run migrations:
   ```bash
   DATABASE_URL="your-direct-url" npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
   ```

### المرحلة 3: إعداد Upstash Redis

1. Sign up at https://upstash.com
2. Create Redis database
3. Copy the `rediss://` URL → `REDIS_URL`
4. Test connection:
   ```bash
   REDIS_URL="your-url" node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL, { tls: {} }); r.ping().then(console.log)"
   ```

### المرحلة 4: إعداد Google Cloud

1. Go to https://console.cloud.google.com
2. Create new project: `ibnalazhardocs`
3. Enable APIs:
   - Google Drive API
   - Gemini API (generativelanguage.googleapis.com)
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `https://ibnalazhardocs.workers.dev/api/auth/callback/google`
5. Create API Key for Gemini
6. Copy credentials to `.env.production`

### المرحلة 5: بناء ونشر Frontend (Cloudflare Workers)

1. Connect GitHub repo to Cloudflare:
   - Go to Workers & Pages → Create
   - Connect to Git → Select repo
   - Build settings:
     - Build command: `pnpm install --frozen-lockfile && pnpm run build:cloudflare`
     - Build output directory: `.open-next`
2. Add environment variables in Cloudflare dashboard
3. Deploy!

**أو عبر CLI:**

```bash
# Login to Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put DATABASE_URL_DIRECT
npx wrangler secret put REDIS_URL
npx wrangler secret put S3_ENDPOINT
npx wrangler secret put S3_ACCESS_KEY_ID
npx wrangler secret put S3_SECRET_ACCESS_KEY
npx wrangler secret put AUTH_SECRET
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GEMINI_API_KEY

# Deploy
pnpm run deploy
```

### المرحلة 6: نشر Workers (HF Spaces)

1. إنشاء HF Space:
   - Go to https://huggingface.co/new-space
   - SDK: Docker
   - Hardware: Free (2 vCPU, 16GB RAM)
   - Name: `ibnalazhardocs-workers`
2. Push Dockerfile:
   ```bash
   git remote add hf https://huggingface.co/spaces/ibnalazhardocs/ibnalazhardocs-workers
   git push hf main
   ```
3. Set environment variables in Space Settings → Variables and Secrets
4. Test health endpoint

### المرحلة 7: الاختبار النهائي

1. رفع مستند PDF
2. التأكد من OCR processing
3. التأكد من export (md, txt, json, docx)
4. التأكد من Google Drive integration
5. اختبار كل الـ error cases

---

## ملفات الإعداد المطلوبة

### `open-next.config.ts` (root)

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

### `wrangler.jsonc` (root)

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "ibnalazhardocs",
  "compatibility_date": "2026-06-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS",
  },
}
```

### `package.json` scripts (root)

```json
{
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

---

## ملاحظات مهمة

### Cloudflare Workers Limitations

- **3 MiB compressed** per Worker (free tier) — may need paid plan for large apps
- **10ms CPU time** per request on free tier — most pages use 2-5ms
- **No Node.js middleware** — must use Edge middleware (`middleware.ts`)
- **100K requests/day** — generous for most apps
- **No built-in databases** — must use external (Neon, Upstash)

### HF Spaces Limitations

- **بينام بعد 15 دقيقة idle** — نحتاج keep-alive mechanism
- **Port 7860** — مفتوح بـ default
- **Storage** — مش persistent (الـ files بتتمسح)

### Neon Limitations

- **0.5GB storage** — قليل, ممكن نحتاج upgrade
- **100 compute hours/شهر** — كافي لـ small app
- **Scale to zero** — بينام بعد idle, بس بيقعد fast

### Upstash Limitations

- **500K commands/شهر** — ممكن يعدي مع BullMQ
- **256MB data** — كافي للـ queue state

---

## Plan B: Oracle Cloud (لو اتحصلنا على فيزا)

لو اتحصلنا على فيزا في المستقبل، نقدر نستخدم Oracle Cloud Free Tier:

- **4 OCPU ARM + 24GB RAM** مجاناً للأبد
- **200GB block storage** + **20GB object storage**
- **10TB bandwidth/شهر**
- تشغّل كل حاجة بـ Docker Compose

ده الـ option الأقوى لو متاح.
