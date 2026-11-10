# 🔧 دليل حل المشاكل الشائعة - Troubleshooting Guide

**التاريخ:** 16 يوليو 2026  
**الإصدار:** 1.0.0

---

## 🚨 المشاكل الحرجة (Critical Issues)

### 1. ❌ "REDIS_PASSWORD is missing a value"

**المشكلة:**
```bash
error while interpolating x-common-env.REDIS_URL: 
required variable REDIS_PASSWORD is missing a value
```

**السبب:**
ملف `.env` يحتوي على `REDIS_PASSWORD=` (فارغ)

**الحل:**
```bash
# في ملف .env، استبدل:
REDIS_PASSWORD=

# بـ:
REDIS_PASSWORD=redis_strong_password_2026
```

**التحقق:**
```bash
grep REDIS_PASSWORD .env
# يجب أن يعرض: REDIS_PASSWORD=redis_strong_password_2026
```

---

### 2. ❌ "GEMINI_API_KEY is not set"

**المشكلة:**
التطبيق يفشل في معالجة المستندات، أو Console يعرض:
```
OCR failed: GEMINI_API_KEY is not configured
```

**السبب:**
ملف `.env` يحتوي على `GEMINI_API_KEY=` (فارغ)

**الحل السريع (للتطوير):**
```bash
# في ملف .env، استبدل:
GEMINI_API_KEY=

# بـ (مؤقت للتطوير):
GEMINI_API_KEY=AIzaSyDummyKeyForDevelopment
```

**الحل الإنتاجي:**
1. احصل على Gemini API Key من: https://aistudio.google.com/app/apikey
2. في `.env`:
   ```bash
   GEMINI_API_KEY=AIzaSyC_YOUR_ACTUAL_KEY_HERE
   ```

**التحقق:**
```bash
grep GEMINI_API_KEY .env | grep -v "^#"
# يجب أن يعرض قيمة حقيقية
```

---

### 3. ❌ Missing Required Dependencies في Console

**المشكلة:**
```
MISSING_MESSAGE: missing unload ... /documents.remove (ar)
MISSING_MESSAGE: missing at 6 (@712_26a1c1c1.js-3.7017)
```

**السبب:**
- مكتبات ترجمة (`next-intl`) لا تجد النصوص العربية
- مشكلة في Build أو Missing translations

**الحل:**

#### أ. تحقق من ملفات الترجمة:
```bash
ls -la apps/web/src/messages/
# يجب أن يعرض: ar.json, en.json

# تحقق من محتوى ar.json
cat apps/web/src/messages/ar.json | grep "remove"
```

#### ب. أعد Build التطبيق:
```bash
pnpm --filter @ibn-al-azhar-docs/web build
```

#### ج. تحقق من next-intl config:
```bash
cat apps/web/src/i18n.ts
```

**الحل إذا كان ملف الترجمة فارغ:**
```bash
# تأكد أن ar.json يحتوي على:
{
  "documents": {
    "remove": "حذف"
  }
}
```

---

### 4. ❌ Database Connection Failed

**المشكلة:**
```
PrismaClientInitializationError: Can't reach database server
```

**السبب:**
- PostgreSQL غير شغال
- DATABASE_URL خطأ
- Port 5433 محجوز

**الحل:**

#### أ. شغّل PostgreSQL:
```bash
./ibn.sh dev-infra
# أو
docker compose up postgres -d
```

#### ب. تحقق من الـ Port:
```bash
netstat -tuln | grep 5433
# يجب أن يعرض: tcp   0.0.0.0:5433
```

#### ج. اختبر الاتصال:
```bash
psql "postgresql://ibn_docs:ibn_docs_password@localhost:5433/ibn_docs" -c "SELECT 1"
# يجب أن يعرض: 1 row
```

#### د. تحقق من `.env`:
```bash
grep DATABASE_URL .env
# يجب أن يطابق: postgresql://ibn_docs:ibn_docs_password@localhost:5433/ibn_docs
```

---

### 5. ❌ Port Already in Use

**المشكلة:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**السبب:**
Port 3000 مستخدم من عملية أخرى

**الحل:**

#### أ. ابحث عن العملية:
```bash
lsof -i :3000
# أو
netstat -tuln | grep 3000
```

#### ب. أوقف العملية:
```bash
# احصل على PID من الأمر السابق
kill -9 <PID>
```

#### ج. أو استخدم Port آخر:
```bash
PORT=3001 pnpm --filter @ibn-al-azhar-docs/web dev
```

---

## 🔍 مشاكل التطوير (Development Issues)

### 6. TypeScript Errors

**المشكلة:**
```
error TS2307: Cannot find module '@ibn-al-azhar-docs/database'
```

**الحل:**
```bash
# أعد build الـ packages
pnpm install
pnpm db:generate

# تحقق:
pnpm check
```

---

### 7. Prisma Client Not Generated

**المشكلة:**
```
Error: @prisma/client did not initialize yet
```

**الحل:**
```bash
pnpm db:generate
pnpm db:migrate
```

---

### 8. ESLint Errors

**المشكلة:**
```
error: 'React' must be in scope when using JSX
```

**الحل:**
```bash
pnpm format:write
pnpm check
```

---

## 🚀 مشاكل الإنتاج (Production Issues)

### 9. Files Disappear After Restart

**المشكلة:**
الملفات المرفوعة تختفي بعد إعادة التشغيل

**السبب:**
Docker volume غير مُكوّن

**الحل:**

#### في `docker-compose.yml`:
```yaml
services:
  web:
    volumes:
      - uploads:/app/apps/web/uploads  # ✅ أضف هذا
      - storage:/app/storage            # ✅ أضف هذا

volumes:
  uploads:
  storage:
```

#### تحقق:
```bash
docker volume ls | grep uploads
# يجب أن يعرض: ibn_al_azhar_docs_uploads
```

---

### 10. Slow Sidebar Response (>1s)

**المشكلة:**
القائمة الجانبية بطيئة (تأخير 5-30 ثانية)

**السبب:**
Database indexes مفقودة

**الحل:**
```bash
pnpm db:migrate
# أو
pnpm db:migrate:deploy  # في الإنتاج
```

**التحقق:**
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'Document';
-- يجب أن يعرض:
-- Document_userId_status_deletedAt_idx
-- Document_userId_folderId_deletedAt_idx
```

---

### 11. CSRF Errors in Production

**المشكلة:**
```
403 Forbidden: CSRF validation failed
```

**السبب:**
Origin header مختلف عن APP_URL

**الحل:**

#### في `.env.production`:
```bash
APP_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### في `middleware.ts` (تحقق):
```typescript
const origin = request.headers.get("origin");
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
```

---

### 12. Rate Limiting Blocks Users

**المشكلة:**
```
429 Too Many Requests
```

**السبب:**
User تجاوز الحد (10 requests/min)

**الحل:**

#### زيادة الحد (في `apps/web/src/middleware.ts`):
```typescript
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 20,  // ✅ زيادة من 10 إلى 20
};
```

#### أو تعطيل Rate Limiting (للتطوير فقط):
```typescript
if (process.env.NODE_ENV === "development") {
  return NextResponse.next();
}
```

---

## 🎨 مشاكل UI/UX

### 13. Dashboard Shows Wrong Count

**المشكلة:**
Dashboard يعرض 2 مستندات بدلاً من 1

**السبب:**
Query يحسب soft-deleted documents

**الحل:**
تم إصلاحه في v1.0.0:
```typescript
where: {
  userId: ctx.userId,
  deletedAt: null,  // ✅ أضف هذا
}
```

---

### 14. Conversions Page Filters Not Working

**المشكلة:**
Filters (All/Processing/Completed) لا تعمل

**السبب:**
Status filter غير موجود في الـ query

**الحل:**
تم إصلاحه في v1.0.0 — راجع `apps/web/src/app/[locale]/(dashboard)/conversions/page.tsx`

---

### 15. Empty State Not Showing

**المشكلة:**
صفحة فارغة بدلاً من "No documents yet"

**السبب:**
Empty state component مفقود

**الحل:**
تم إصلاحه في v1.0.0 — راجع ملفات الترجمة `ar.json` و `en.json`

---

## 🔒 مشاكل الأمان (Security Issues)

### 16. TEST_API_KEY Exposed in Production

**المشكلة:**
```
Warning: TEST_API_KEY is set in production
```

**السبب:**
TEST_API_KEY موجود في `.env.production`

**الحل:**
```bash
# في .env.production، احذف:
TEST_API_KEY=xxxxx

# أو أضف Guard:
if (process.env.NODE_ENV === "production" && process.env.TEST_API_KEY) {
  throw new Error("TEST_API_KEY must not be set in production");
}
```

---

### 17. Admin Can See All Users' Data

**المشكلة:**
ADMIN يرى ملفات STUDENT

**السبب:**
Admin bypass logic في الـ repositories

**الحل:**
تم إصلاحه في v1.0.0 (18 ملف):
```typescript
// ❌ قبل:
if (ctx.role === "ADMIN") return all;

// ✅ بعد:
where: { userId: ctx.userId }  // حتى ADMIN
```

---

## 🌐 مشاكل Hugging Face Deployment

### 18. Space Build Failed

**المشكلة:**
```
ERROR: failed to solve: process "/bin/sh -c pnpm install" did not complete successfully
```

**السبب:**
- `.dockerignore` يحجب ملفات ضرورية
- `Dockerfile.space` خطأ

**الحل:**

#### أ. تحقق من `.dockerignore`:
```bash
cat .dockerignore
# تأكد أن node_modules/ موجود
# تأكد أن .git/ موجود
```

#### ب. تحقق من `Dockerfile.space`:
```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.33.4
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm db:generate
RUN pnpm build

EXPOSE 7860
CMD ["pnpm", "start"]
```

---

### 19. Space Running But Not Accessible

**المشكلة:**
Space status "Running" لكن URL لا يفتح

**السبب:**
- Port مختلف (7860 vs 3000)
- Health check يفشل

**الحل:**

#### في `Dockerfile.space`:
```dockerfile
ENV PORT=7860
EXPOSE 7860
```

#### في `package.json`:
```json
{
  "scripts": {
    "start": "PORT=7860 next start"
  }
}
```

---

### 20. Secrets Not Loaded in Hugging Face

**المشكلة:**
```
Error: AUTH_SECRET is not set
```

**السبب:**
Secrets غير مُعرّفة في Hugging Face Space Settings

**الحل:**

1. افتح Space Settings → Variables and secrets
2. أضف:
   ```
   AUTH_SECRET=your_secret_here
   ADMIN_PASSWORD=your_password_here
   GEMINI_API_KEY=your_api_key_here
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   ```

---

## 🧪 Testing Issues

### 21. Tests Failing Locally

**المشكلة:**
```
FAIL tests/api/documents.test.ts
```

**الحل:**
```bash
# شغّل البيئة المحلية أولاً:
./ibn.sh dev-infra

# ثم شغّل Tests:
pnpm test

# للتطوير:
pnpm test:watch
```

---

### 22. Integration Tests Fail

**المشكلة:**
```
Error: Cannot connect to database
```

**الحل:**
```bash
# شغّل كل الخدمات:
./ibn.sh dev-infra

# تحقق:
docker ps

# شغّل Integration tests:
pnpm test:integration
```

---

## 📦 Build Issues

### 23. Build Fails with Memory Error

**المشكلة:**
```
FATAL ERROR: Reached heap limit
```

**الحل:**
```bash
# زيادة Node memory:
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

---

### 24. Missing Dependencies في Build

**المشكلة:**
```
Module not found: Can't resolve '@/lib/...'
```

**الحل:**
```bash
pnpm install
pnpm db:generate
pnpm build
```

---

## 🔄 Migration Issues

### 25. Migration Failed

**المشكلة:**
```
Error: P3009 - Migration failed to apply cleanly
```

**الحل:**
```bash
# Reset database (⚠️ يحذف البيانات):
pnpm db:reset

# أو:
pnpm db:migrate:reset
```

---

### 26. Prisma Client Version Mismatch

**المشكلة:**
```
Error: Prisma Client version mismatch
```

**الحل:**
```bash
pnpm db:generate
pnpm install
```

---

## 📞 الدعم (Support)

### إذا لم تحل المشكلة:

1. **تحقق من Logs:**
   ```bash
   # Local development:
   pnpm --filter @ibn-al-azhar-docs/web dev 2>&1 | tee debug.log
   
   # Docker:
   docker compose logs -f web
   
   # Hugging Face:
   Check Space → Logs tab
   ```

2. **راجع الوثائق:**
   - [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)
   - [QUICK_START.md](./QUICK_START.md)
   - [docs/FIXES_SUMMARY_JULY_2026.md](./docs/FIXES_SUMMARY_JULY_2026.md)

3. **GitHub Issues:**
   - افتح Issue على: https://github.com/ibn-alazhar-docs/ibn-alazhar-docs/issues

4. **Community:**
   - راجع [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md)

---

## 🆘 Emergency Commands

### إذا فشل كل شيء:

```bash
# 1. توقف كل شيء:
docker compose down
pkill -f "next"

# 2. احذف node_modules:
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# 3. احذف .next:
rm -rf apps/web/.next

# 4. أعد التثبيت:
pnpm install

# 5. أعد build Prisma:
pnpm db:generate

# 6. أعد التشغيل:
./ibn.sh dev-infra
pnpm --filter @ibn-al-azhar-docs/web dev
```

---

## ✅ Health Check Commands

```bash
# 1. تحقق من Services:
docker ps

# 2. تحقق من Database:
psql "postgresql://ibn_docs:ibn_docs_password@localhost:5433/ibn_docs" -c "SELECT 1"

# 3. تحقق من Redis:
redis-cli -p 6379 ping

# 4. تحقق من MinIO:
curl http://localhost:9000/minio/health/live

# 5. تحقق من التطبيق:
curl http://localhost:3000/api/health
```

---

## 📋 Checklist للمشاكل الشائعة

- [ ] `.env` يحتوي على جميع القيم المطلوبة (لا توجد قيم فارغة)
- [ ] `REDIS_PASSWORD` معرّف ولديه قيمة
- [ ] `GEMINI_API_KEY` معرّف ولديه قيمة حقيقية
- [ ] PostgreSQL شغال (Port 5433)
- [ ] Redis شغال (Port 6379)
- [ ] MinIO شغال (Port 9000)
- [ ] `pnpm db:generate` تم تشغيله
- [ ] `pnpm db:migrate` تم تشغيله
- [ ] `node_modules` موجود
- [ ] `.next` موجود (بعد build)
- [ ] Port 3000 غير محجوز
- [ ] ملفات الترجمة (`ar.json`, `en.json`) موجودة
- [ ] Docker volumes مُكوّنة للـ storage

---

<div align="center">
  <h2>🔧 Need More Help?</h2>
  <p><strong>راجع الوثائق الكاملة أو افتح Issue على GitHub</strong></p>
  
  <p>
    <a href="./DEPLOYMENT_READY.md">📘 Deployment Guide</a>
    •
    <a href="./QUICK_START.md">🚀 Quick Start</a>
    •
    <a href="https://github.com/ibn-alazhar-docs/ibn-alazhar-docs/issues">🐛 Report Issue</a>
  </p>
</div>

---

**آخر تحديث:** 16 يوليو 2026  
**الإصدار:** 1.0.0
