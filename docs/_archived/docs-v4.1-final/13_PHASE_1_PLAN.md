# Ibn Al-Azhar Docs — ابن الأزهر دوكس — خطة Phase 1 التنفيذية

> **الإصدار:** 4.0
> **التاريخ:** 2025-03-05
> **المدة:** 5 أيام (الأسبوع 1)
> **الحالة:** جاهز للتنفيذ
> **المالك:** فريق التطوير
> **التصنيف:** Phase Plan — يُحدَّث يوميًا أثناء Phase

---

## جدول المحتويات

1. [هدف Phase](#1-هدف-sprint)
2. [النطاق](#2-النطاق)
3. [خارج النطاق](#3-خارج-النطاق)
4. [قصص Phase 1](#4-قصص-sprint-1)
5. [مهام Phase 1](#5-مهام-sprint-1)
6. [معايير قبول Phase](#6-معايير-قبول-sprint)
7. [تعريف الإنجاز (Definition of Done)](#7-تعريف-الإنجاز-definition-of-done)
8. [المخاطر](#8-المخاطر)
9. [الاعتماديات](#9-الاعتماديات)
10. [المخرجات](#10-المخرجات)
11. [سيناريو العرض التقديمي (Demo Script)](#11-سيناريو-العرض-التقديمي-demo-script)

---

## 1. هدف Phase

**إقامة البنية التحتية الأساسية للمشروع** — إعداد المستودع، تطبيق Next.js 16، TypeScript، Tailwind/shadcn أساسي، دعم RTL/i18n، Docker Compose للخدمات، Prisma schema أولي، هيكل المصادقة الأساسي، App Shell أساسي، CI أساسي، و README + .env.example.

الهدف قابل للقياس: بنهاية Phase 1، يمكن لأي مطوّر استنساخ المستودع وتشغيل `docker compose up` والحصول على بيئة تطوير تعمل مع صفحات auth أساسية وواجهة RTL و App Shell قابل للتنقل.

> **ملاحظة مهمة**: Phase 1 يركّز على الأساس فقط. لا يشمل OCR كامل، رفع ملفات، لوحة إدارة، بحث، مشاركة، أو PWA offline.

### مؤشرات النجاح

| المؤشر | الهدف | طريقة القياس |
|---------|-------|-------------|
| بيئة تطوير تعمل | `docker compose up` يُشغّل كل شيء | اختبار يدوي |
| تسجيل/دخول يعمل | إنشاء حساب + تسجيل دخول + جلسة JWT | E2E يدوي |
| RTL يعمل | الواجهة بالعربية باتجاه صحيح | فحص بصري |
| CI Pipeline يعمل | lint + test + build ينجح على GitHub | فحص CI |
| اختبارات أساسية | ≥5 اختبارات وحدة تنجح | `vitest run` |
| App Shell يعمل | Sidebar + Header + صفحات فارغة | فحص بصري |

---

## 2. النطاق

### ما يشمله Phase 1

| اليوم | المحور | التفاصيل |
|-------|--------|---------|
| **اليوم 1** | إعداد المستودع + المشروع | إنشاء مستودع ibn-al-azhar-docs، Next.js 16، التبعيات، .gitignore، tsconfig، next.config، هيكل المجلدات، .env.example |
| **اليوم 2** | Docker + قاعدة البيانات | docker-compose.dev.yml (حاويات: ibn-al-azhar-docs-*)، Prisma schema أولي (DB: ibn_al_azhar_docs)، أول migration، seed script |
| **اليوم 3** | هيكل المصادقة الأساسي | NextAuth.js v5 مع JWT strategy فقط (24h، لا access/refresh)، Credentials provider، صفحات auth أساسية، middleware |
| **اليوم 4** | RTL/i18n + نظام التصميم الأساسي | next-intl، ar.json/en.json، shadcn/ui أساسي، Design Tokens أولية، Tailwind RTL |
| **اليوم 5** | App Shell + الحالة + CI | Zustand stores، Sidebar، Header، تخطيط متجاوب، GitHub Actions CI workflow، README |

### Epics المغطّاة (جزئيًا)

- **Epic 1: Foundation** — كامل
- **Epic 2: Auth** — الهيكل الأساسي فقط (تسجيل، دخول، جلسات JWT، أدوار — بدون ActivityLog أو lockout كامل)
- **Epic 3: Design System** — الأساسيات فقط (tokens، shadcn/ui تهيئة، RTL، مكوّنات أولية)

---

## 3. خارج النطاق

ما يُستبعد صراحةً من Phase 1:

| الميزة | السبب | متى |
|--------|-------|-----|
| رفع الملفات | يعتمد على File Management UI | Phase 2 |
| إدارة الملفات (مجلدات، سلة محذوفات) | يعتمد على Upload | Phase 2 |
| تحويل OCR | يعتمد على Upload + BullMQ | Phase 3 |
| تصدير (TXT/DOCX/JSON) | يعتمد على Conversion | Phase 3 |
| لوحة الإدارة | يعتمد على Auth + Data | Phase 5 |
| المشاركة | يعتمد على Conversion | Phase 4 |
| البحث | يعتمد على File Management | Phase 2 |
| PWA / Service Worker | يعتمد على Layout الكامل | Phase 5 |
| ActivityLog كامل | يعتمد على جميع الميزات | تدريجي |
| Account lockout | يعتمد على Security Epic | Phase 5-6 |

مستبعدات إضافية:
- Google OAuth provider (Credentials فقط في Phase 1)
- تطبيق كامل لكل مكوّنات shadcn/ui (فقط الأساسية)
- اختبارات E2E (فقط اختبارات وحدة أساسية بـ Vitest)
- النشر على الإنتاج (فقط بيئة التطوير)
- إعادة كلمة المرور (مؤجل)
- تأكيد البريد الإلكتروني (مؤجل)
- Dark mode (مؤجل لـ Phase 2)

---

## 4. قصص Phase 1

### S1-US-01: إعداد المشروع

**بصفتي مطوّرًا، أريد استنساخ المستودع وتشغيل المشروع بأمر واحد حتى أبدأ التطوير فورًا.**

معايير القبول:
- **Given** المستودع مستنسخ، **When** أُنفّذ `npm install`، **Then** تُثبَّت جميع التبعيات دون أخطاء
- **Given** التبعيات مُثبّتة، **When** أُنفّذ `npm run dev`، **Then** يعمل الخادم المحلي على المنفذ 3000
- **Given** الكود، **When** أُنفّذ `npm run lint`، **Then** لا توجد أخطاء linting

### S1-US-02: بيئة Docker

**بصفتي مطوّرًا، أريد تشغيل جميع الخدمات (PostgreSQL + Redis + MinIO) بـ Docker Compose حتى لا أُثبّت شيء محليًا.**

معايير القبول:
- **Given** Docker يعمل، **When** أُنفّذ `docker compose up`، **Then** تعمل PostgreSQL (5432) + Redis (6379) + MinIO (9000)
- **Given** Docker يعمل، **When** أُنفّذ `npx prisma migrate dev`، **Then** تُنشأ جميع الجداول
- **Given** Prisma schema، **When** أُنفّذ `npx prisma studio`، **Then** أرى الجداول وأستطيع تعديل البيانات

### S1-US-03: هيكل المصادقة

**بصفتي مستخدمًا جديدًا، أريد إنشاء حساب وتسجيل الدخول حتى أستخدم المنصة.**

معايير القبول:
- **Given** صفحة التسجيل، **When** أُدخل بيانات صالحة، **Then** يُنشأ حساب ويُوجَّه لصفحة الترحيب
- **Given** حساب موجود، **When** أُدخل بيانات صحيحة، **Then** أُوجَّه لصفحتي الرئيسية مع جلسة JWT فعّالة
- **Given** بيانات خاطئة، **When** أحاول الدخول، **Then** أرى رسالة خطأ دون كشف معلومات الحساب

> **ملاحظة**: المصادقة تستخدم NextAuth.js v5 مع JWT strategy فقط (مدة 24 ساعة). لا يوجد access/refresh token منفصل.

### S1-US-04: الأدوار

**بصفتي مشرفًا، أريد أن يكون لحسابي صلاحيات أعلى حتى أصل لصفحات محظورة على المستخدم العادي.**

معايير القبول:
- **Given** حساب بدور "طالب"، **When** أحاول الوصول لـ /admin، **Then** أُوجَّه لصفحة 403
- **Given** حساب بدور "مشرف"، **When** أزور /admin، **Then** أرى صفحة الإدارة

### S1-US-05: التدويل

**بصفتي مستخدمًا عربيًا، أريد واجهة بالعربية باتجاه RTL حتى أتصفح بشكل طبيعي.**

معايير القبول:
- **Given** اللغة عربية، **When** أفتح أي صفحة، **Then** يكون اتجاه الصفحة RTL مع محاذاة لليمين
- **Given** اللغة إنجليزية، **When** أبدّل اللغة، **Then** يتحول الاتجاه لـ LTR مع ترجمة جميع النصوص
- **Given** المستخدم يزور الموقع لأول مرة، **When** لغة المتصفح عربية، **Then** تُعرض الواجهة بالعربية تلقائيًا

### S1-US-06: نظام التصميم الأساسي

**بصفتي مطوّرًا، أريد Design Tokens ومكوّنات أساسية حتى أبني صفحات متناسقة بسرعة.**

معايير القبول:
- **Given** Design Tokens، **When** أستخدم token لون، **Then** يتطابق مع دليل العلامة التجارية
- **Given** مكوّن Button، **When** أستخدمه بالعربية، **Then** يكون اتجاهه صحيحًا
- **Given** مكوّن Input، **When** أستخدمه بالعربية، **Then** يكون محاذاة النص لليمين

### S1-US-07: App Shell

**بصفتي مستخدمًا، أريد تخطيطًا متسقًا مع Sidebar وHeader حتى أتنقل بين صفحات المنصة بسهولة.**

معايير القبول:
- **Given** المستخدم مسجّل الدخول، **When** يفتح أي صفحة dashboard، **Then** يرى Sidebar + Header + المحتوى
- **Given** شاشة ضيقة (<768px)، **When** يُعرض التخطيط، **Then** يتحول Sidebar لقائمة hamburger
- **Given** رابط في Sidebar، **When** يُضغط، **Then** ينتقل المستخدم للصفحة المطلوبة دون إعادة تحميل كاملة

### S1-US-08: إدارة الحالة

**بصفتي مطوّرًا، أريد Zustand stores لإدارة حالة المصادقة والواجهة حتى أتعامل مع الحالة بشكل مركزي.**

معايير القبول:
- **Given** authStore، **When** يسجّل المستخدم الدخول، **Then** تتحدث حالة المستخدم في الـ store
- **Given** uiStore، **When** يُطوى Sidebar، **Then** تتحدث حالة sidebarOpen في الـ store
- **Given** الـ store، **When** يُعاد تحميل الصفحة، **Then** تُستعاد الحالة من الـ JWT session

### S1-US-09: CI Pipeline

**بصفتي مطوّرًا، أريد CI pipeline يفحص الكود تلقائيًا حتى لا يُدمج كود معطّل.**

معايير القبول:
- **Given** pull request جديد، **When** يُرفع، **Then** يعمل lint + type-check + test + build
- **Given** فشل في CI، **When** يُحاول المطور الدمج، **Then** يُمنع الدمج

### S1-US-10: اختبارات أساسية

**بصفتي مطوّرًا، أريد اختبارات وحدة أساسية حتى أتأكد من عمل الوظائف الجوهرية.**

معايير القبول:
- **Given** اختبارات وحدة، **When** أُنفّذ `vitest run`، **Then** تنجح ≥5 اختبارات
- **Given** اختبار auth service، **When** أختبر bcrypt hashing، **Then** يعمل بشكل صحيح

---

## 5. مهام Phase 1

### اليوم 1: إعداد المستودع + المشروع (8 ساعات)

| # | المهمة | التقدير | المسؤول | ملاحظات |
|---|-------|---------|---------|---------|
| T-1.1 | إنشاء مستودع GitHub (ibn-al-azhar-docs) + branch protection | 0.5h | DevOps | main محمي، يتطلب PR + CI |
| T-1.2 | تهيئة Next.js 16 مع App Router + TypeScript | 1.5h | Full-stack | `npx create-next-app@latest` |
| T-1.3 | تثبيت التبعيات الأساسية | 1h | Full-stack | انظر قائمة التبعيات أدناه |
| T-1.4 | إعداد tsconfig.json مع path aliases | 0.5h | Full-stack | `@/components`، `@/lib`، `@/stores` |
| T-1.5 | إعداد next.config.ts | 1h | Full-stack | output: standalone، images config، bodySizeLimit: 100mb |
| T-1.6 | إنشاء هيكل المجلدات الأساسي | 1h | Full-stack | app، components، lib، stores، hooks، i18n، types |
| T-1.7 | إعداد .gitignore + .env.example | 0.5h | Full-stack | متغيرات البيئة المطلوبة |
| T-1.8 | إعداد ESLint + Prettier | 1h | Full-stack | قواعد Next.js + TypeScript + import sort |
| T-1.9 | أول commit + push | 0.5h | Full-stack | التأكد من عمل CI |

**قائمة التبعيات الأساسية**:
```bash
# Core
npm install next@latest react@latest react-dom@latest

# Auth — NextAuth.js v5 with JWT strategy ONLY (no separate access/refresh tokens)
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs

# Database
npm install prisma @prisma/client

# UI
npm install tailwindcss @tailwindcss/postcss
npx shadcn@latest init

# i18n
npm install next-intl

# State
npm install zustand immer

# Validation
npm install zod

# Dev — Vitest (NOT Jest)
npm install -D eslint prettier eslint-config-prettier
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D husky lint-staged
npm install -D typescript @types/react @types/node
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/i18n/*": ["./src/i18n/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**next.config.ts**:
```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.minio.*',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default withNextIntl(nextConfig);
```

---

### اليوم 2: Docker + قاعدة البيانات (8 ساعات)

| # | المهمة | التقدير | المسؤول | ملاحظات |
|---|-------|---------|---------|---------|
| T-2.1 | إنشاء docker-compose.dev.yml | 2h | DevOps | PostgreSQL + Redis + MinIO — حاويات: ibn-al-azhar-docs-* |
| T-2.2 | إعداد Prisma + إنشاء schema أولي | 2h | Backend | User، File، Folder — DB: ibn_al_azhar_docs |
| T-2.3 | تنفيذ أول migration | 0.5h | Backend | `npx prisma migrate dev` |
| T-2.4 | إنشاء Prisma client singleton | 0.5h | Backend | lib/prisma.ts |
| T-2.5 | إنشاء seed script | 1.5h | Backend | admin + test users |
| T-2.6 | إنشاء MinIO client singleton | 1h | Backend | lib/minio.ts — bucket: ibn-al-azhar-docs-files |
| T-2.7 | التحقق من اتصال جميع الخدمات | 0.5h | DevOps | test scripts |

**docker-compose.dev.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ibn-al-azhar-docs-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ibn_al_azhar_docs
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: ibn_al_azhar_docs
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ibn_al_azhar_docs']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ibn-al-azhar-docs-redis
    restart: unless-stopped
    command: redis-server --maxmemory 200mb --maxmemory-policy allkeys-lru
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: ibn-al-azhar-docs-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 10s
      timeout: 5s
      retries: 5

  minio-setup:
    image: minio/mc:latest
    container_name: ibn-al-azhar-docs-minio-setup
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin123;
      mc mb --ignore-existing local/ibn-al-azhar-docs-files;
      echo 'MinIO bucket created successfully';
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**Prisma Schema (مقتطف)**:
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  student
  teacher
  admin
}

enum UserStatus {
  active
  suspended
  deleted
}

model User {
  id           String     @id @default(cuid())
  name         String
  email        String     @unique
  passwordHash String?
  role         UserRole   @default(student)
  status       UserStatus @default(active)
  storageUsed  BigInt     @default(0)
  image        String?
  emailVerified DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  files        File[]
  folders      Folder[]
  conversions  Conversion[]
  activityLogs ActivityLog[]
  sharedLinks  ShareLink[]

  @@map("users")
}

model Folder {
  id        String   @id @default(cuid())
  name      String
  parentId  String?
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  parent    Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children  Folder[] @relation("FolderHierarchy")
  user      User     @relation(fields: [userId], references: [id])
  files     File[]

  @@index([userId, parentId])
  @@map("folders")
}

model File {
  id           String   @id @default(cuid())
  name         String
  originalName String
  mimeType     String
  sizeBytes    BigInt
  storageKey   String
  folderId     String?
  userId       String
  isDeleted    Boolean  @default(false)
  deletedAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  folder       Folder?  @relation(fields: [folderId], references: [id])
  user         User     @relation(fields: [userId], references: [id])
  conversions  ConversionFile[]

  @@index([userId, isDeleted])
  @@index([folderId])
  @@map("files")
}

model Conversion {
  id             String   @id @default(cuid())
  userId         String
  status         String   @default("queued")
  settings       Json?
  totalFiles     Int      @default(0)
  completedFiles Int      @default(0)
  failedFiles    Int      @default(0)
  errorMessage   String?
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User             @relation(fields: [userId], references: [id])
  conversionFiles ConversionFile[]

  @@index([userId, status])
  @@map("conversions")
}

model ConversionFile {
  id           String     @id @default(cuid())
  conversionId String
  fileId       String
  status       String     @default("pending")
  resultText   String?
  errorMessage String?
  startedAt    DateTime?
  completedAt  DateTime?

  conversion   Conversion @relation(fields: [conversionId], references: [id])
  file         File       @relation(fields: [fileId], references: [id])

  @@index([conversionId])
  @@map("conversion_files")
}

model ShareLink {
  id        String   @id @default(cuid())
  token     String   @unique  // 32 bytes = 64 hex chars
  fileId    String
  userId    String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  expiresAt DateTime?

  user      User     @relation(fields: [userId], references: [id])

  @@index([token, isActive])
  @@map("share_links")
}

model ActivityLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String?
  resourceId String?
  details   Json?
  ipAddress String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("activity_logs")
}
```

**lib/prisma.ts**:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

---

### اليوم 3: هيكل المصادقة الأساسي (8 ساعات)

| # | المهمة | التقدير | المسؤول | ملاحظات |
|---|-------|---------|---------|---------|
| T-3.1 | إعداد NextAuth.js v5 مع PrismaAdapter — JWT فقط | 2h | Backend | lib/auth.ts — لا access/refresh token |
| T-3.2 | تنفيذ Credentials provider | 1.5h | Backend | bcrypt verify |
| T-3.3 | تنفيذ JWT callbacks مع role claims | 1.5h | Backend | jwt + session callbacks |
| T-3.4 | إنشاء صفحة التسجيل | 2h | Full-stack | /ar/register + /en/register |
| T-3.5 | إنشاء صفحة الدخول | 1h | Full-stack | /ar/login + /en/login |
| T-3.6 | تنفيذ auth middleware | 1h | Backend | حماية /api/* و /(dashboard)/* |

**lib/auth.ts**:
```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',           // JWT ONLY — لا access/refresh token منفصل
    maxAge: 24 * 60 * 60,      // 24 ساعة
    updateAge: 4 * 60 * 60,    // تحديث كل 4 ساعات
  },
  jwt: {
    maxAge: 24 * 60 * 60,      // 24 ساعة
  },
  pages: {
    signIn: '/ar/login',
    error: '/ar/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'البريد الإلكتروني', type: 'email' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
        const validated = loginSchema.parse(credentials);

        const user = await prisma.user.findUnique({
          where: { email: validated.email },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status !== 'active') return null;

        const isValid = await bcrypt.compare(validated.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, name: true },
        });
        if (dbUser?.status === 'suspended') throw new Error('ACCOUNT_SUSPENDED');
        token.role = dbUser?.role;
        token.name = dbUser?.name;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
});
```

**auth middleware**:
```typescript
// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
});

export default auth((req) => {
  // 1. Apply intl middleware
  const intlResponse = intlMiddleware(req);
  if (intlResponse) return intlResponse;

  // 2. Protected routes
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
  const isDashboard = pathname.includes('/(dashboard)') || pathname.includes('/files') ||
                      pathname.includes('/folders') || pathname.includes('/conversions') ||
                      pathname.includes('/settings');
  const isAdmin = pathname.includes('/admin');

  if (!req.auth && (isDashboard || isAdmin)) {
    return NextResponse.redirect(new URL('/ar/login', req.url));
  }

  if (req.auth && isAuthPage) {
    return NextResponse.redirect(new URL('/ar/files', req.url));
  }

  if (isAdmin && req.auth?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/ar/files', req.url));
  }

  // 3. Security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api/auth).*)'],
};
```

---

### اليوم 4: RTL/i18n + نظام التصميم الأساسي (8 ساعات)

| # | المهمة | التقدير | المسؤول | ملاحظات |
|---|-------|---------|---------|---------|
| T-4.1 | إعداد next-intl (request.ts + middleware) | 1.5h | Full-stack | ربط مع auth middleware |
| T-4.2 | إنشاء ar.json + en.json (نصوص أساسية) | 1.5h | Full-stack | auth، common، navigation |
| T-4.3 | إعداد Tailwind CSS v4 مع RTL | 1h | Frontend | tailwindcss-rtl + logical properties |
| T-4.4 | تعريف Design Tokens (colors، spacing، typography) | 1.5h | Frontend | CSS custom properties |
| T-4.5 | تثبيت وتهيئة shadcn/ui | 1h | Frontend | npx shadcn@latest init |
| T-4.6 | إنشاء مكوّنات أساسية (Button، Input، Label، Card) | 1.5h | Frontend | مع دعم RTL |

**next-intl setup**:
```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../i18n/messages/${locale}.json`)).default,
    timeZone: 'Asia/Riyadh',
    now: new Date(),
  };
});
```

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

**ar.json (مقتطف)**:
```json
{
  "common": {
    "appName": "ابن الأزهر دوكس",
    "appTagline": "منصة إدارة المستندات التعليمية",
    "loading": "جاري التحميل...",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "search": "بحث",
    "upload": "رفع",
    "download": "تحميل",
    "share": "مشاركة",
    "close": "إغلاق",
    "back": "رجوع",
    "next": "التالي",
    "previous": "السابق",
    "noResults": "لا توجد نتائج",
    "confirm": "تأكيد",
    "error": "حدث خطأ",
    "success": "تم بنجاح"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب",
    "logout": "تسجيل الخروج",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "name": "الاسم الكامل",
    "role": "الدور",
    "student": "طالب",
    "teacher": "معلم",
    "admin": "مشرف",
    "loginButton": "دخول",
    "registerButton": "إنشاء الحساب",
    "noAccount": "ليس لديك حساب؟",
    "hasAccount": "لديك حساب بالفعل؟",
    "invalidCredentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "emailExists": "هذا البريد الإلكتروني مسجل بالفعل",
    "passwordTooShort": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    "passwordsMismatch": "كلمتا المرور غير متطابقتين"
  },
  "navigation": {
    "files": "ملفاتي",
    "folders": "المجلدات",
    "conversions": "التحويلات",
    "settings": "الإعدادات",
    "admin": "الإدارة",
    "shared": "المشاركات"
  }
}
```

**en.json (مقتطف)**:
```json
{
  "common": {
    "appName": "Ibn Al-Azhar Docs",
    "appTagline": "Educational Document Management Platform",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "upload": "Upload",
    "download": "Download",
    "share": "Share",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "noResults": "No results found",
    "confirm": "Confirm",
    "error": "An error occurred",
    "success": "Success"
  },
  "auth": {
    "login": "Sign In",
    "register": "Create Account",
    "logout": "Sign Out",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "name": "Full Name",
    "role": "Role",
    "student": "Student",
    "teacher": "Teacher",
    "admin": "Admin",
    "loginButton": "Sign In",
    "registerButton": "Create Account",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "invalidCredentials": "Invalid email or password",
    "emailExists": "This email is already registered",
    "passwordTooShort": "Password must be at least 8 characters",
    "passwordsMismatch": "Passwords do not match"
  },
  "navigation": {
    "files": "My Files",
    "folders": "Folders",
    "conversions": "Conversions",
    "settings": "Settings",
    "admin": "Admin",
    "shared": "Shared"
  }
}
```

**Design Tokens (CSS)**:
```css
/* src/styles/tokens.css */
:root {
  /* Colors — Brand */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Colors — Neutral */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;

  /* Colors — Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Spacing */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */

  /* Typography */
  --font-sans-ar: 'Cairo', 'Noto Sans Arabic', sans-serif;
  --font-sans-en: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Radii */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

/* RTL-specific adjustments */
[dir='rtl'] {
  --font-sans: var(--font-sans-ar);
}

[dir='ltr'] {
  --font-sans: var(--font-sans-en);
}
```

---

### اليوم 5: App Shell + الحالة + CI (8 ساعات)

| # | المهمة | التقدير | المسؤول | ملاحظات |
|---|-------|---------|---------|---------|
| T-5.1 | إنشاء authStore (Zustand) | 1.5h | Frontend | user، isAuthenticated، role |
| T-5.2 | إنشاء uiStore (Zustand) — persist: ibn-al-azhar-docs-ui-preferences | 1h | Frontend | sidebarOpen، theme، locale |
| T-5.3 | إنشاء Dashboard Layout | 2h | Frontend | Sidebar + Header + main area |
| T-5.4 | إنشاء Sidebar مع تنقل | 1.5h | Frontend | ملفات، مجلدات، تحويلات، إعدادات |
| T-5.5 | إنشاء Header مع تبديل اللغة | 1h | Frontend | عربي/إنجليزي + avatar |
| T-5.6 | تنفيذ استجابة الموبايل | 1h | Frontend | hamburger menu + overlay |
| T-5.7 | إنشاء GitHub Actions CI workflow | 1h | DevOps | lint + test + build — DB: ibn_al_azhar_docs_test |
| T-5.8 | التحقق النهائي من Phase 1 | 0.5h | Full-stack | Demo rehearsal |

**authStore (Zustand)**:
```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  image?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set(
          { user, isAuthenticated: !!user, isLoading: false },
          false,
          'auth/setUser'
        ),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'auth/setLoading'),

      logout: () =>
        set(
          { user: null, isAuthenticated: false, isLoading: false },
          false,
          'auth/logout'
        ),
    }),
    { name: 'ibn-al-azhar-docs-auth-store' }
  )
);
```

**uiStore (Zustand)**:
```typescript
// src/stores/ui-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  locale: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setLocale: (locale: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        sidebarCollapsed: false,
        locale: 'ar',
        theme: 'light',

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'ui/toggleSidebar'),

        setSidebarOpen: (open) =>
          set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),

        toggleSidebarCollapsed: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }), false, 'ui/toggleCollapse'),

        setLocale: (locale) =>
          set({ locale }, false, 'ui/setLocale'),

        setTheme: (theme) =>
          set({ theme }, false, 'ui/setTheme'),
      }),
      {
        name: 'ibn-al-azhar-docs-ui-preferences',  // NOT doced-ui-preferences
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          locale: state.locale,
          theme: state.theme,
        }),
      }
    ),
    { name: 'ibn-al-azhar-docs-ui-store' }
  )
);
```

**GitHub Actions CI**:
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ibn_al_azhar_docs_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test (Vitest)
        run: npx vitest run
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/ibn_al_azhar_docs_test

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/ibn_al_azhar_docs_test
          NEXTAUTH_SECRET: test-secret-for-ci
          NEXTAUTH_URL: http://localhost:3000
```

---

## تحديثات V4.1 على خطة المرحلة 1

> **الإصدار:** 4.1 | **تاريخ التحديث:** 2025-03-05
> **الغرض:** توثيق التحديثات والإضافات التي طرأت على خطة المرحلة 1 في إصدار V4.1

### الهدف المحدّث للمرحلة 1

Build the technical and design foundation for Ibn Al-Azhar Docs using Docker-first, Spec-Driven Development, and brand-aligned UI foundations.

### مخرجات المرحلة 1 المحدّثة

- Repo initialized as ibn-al-azhar-docs
- Docker Compose dev stack (web, worker, PostgreSQL, Redis, MinIO, Caddy candidate)
- Next.js app bootstrapped with TypeScript strict
- Tailwind/shadcn base with Cairo font and brand color tokens (#16A34A primary, #CA8A04 accent)
- RTL/i18n foundation with Arabic as default
- App shell skeleton (Sidebar + Header + responsive)
- Auth skeleton (NextAuth.js v5, JWT strategy, 24h maxAge)
- Prisma initialized with PostgreSQL
- Worker skeleton (separate Dockerfile.worker)
- Caddy config draft
- Spec Kit workflow docs and specs/ folder structure
- Impeccable design workflow docs
- CI baseline (GitHub Actions: lint + test + build)
- Brand Implementation Guide foundation
- Asset Pipeline foundation
- .env.example with unified variables
- README with Docker-first quickstart
- First feature specs created: auth-foundation, app-shell-rtl

### خارج النطاق المحدّث

- Full OCR pipeline
- Full upload pipeline
- Production deployment
- Public sharing
- Admin panel
- Advanced search
- Full offline PWA
- Dark mode

### سيناريو العرض التقديمي (Demo Script)

1. Start Docker Compose: `docker compose up -d`
2. Open app at `http://localhost:3000`
3. Verify Arabic RTL shell renders correctly
4. Verify brand colors (#16A34A primary green, #CA8A04 accent gold) applied
5. Verify Cairo font loaded and rendering Arabic text
6. Verify DB connection: `docker compose exec web pnpm prisma studio`
7. Verify Redis connection: `docker compose exec redis redis-cli ping`
8. Verify MinIO connection: Open `http://localhost:9001`
9. Verify auth skeleton route: Register → Login → Dashboard
10. Verify worker starts: `docker compose logs worker`
11. Verify CI passes: Push to branch → check GitHub Actions
12. Verify Spec Kit structure: `ls specs/001-auth-foundation/`

---

### ملخص المهام والإجمالي

| اليوم | المهام | الساعات |
|-------|--------|---------|
| اليوم 1 | T-1.1 إلى T-1.9 | 8 ساعات |
| اليوم 2 | T-2.1 إلى T-2.7 | 8 ساعات |
| اليوم 3 | T-3.1 إلى T-3.6 | 8 ساعات |
| اليوم 4 | T-4.1 إلى T-4.6 | 8 ساعات |
| اليوم 5 | T-5.1 إلى T-5.8 | 8 ساعات |
| **الإجمالي** | **28 مهمة** | **40 ساعة** |

---

## 6. معايير قبول Phase

### معايير قبول Phase ككل

| # | المعيار | طريقة التحقق |
|---|--------|-------------|
| 1 | `docker compose up` يُشغّل PostgreSQL + Redis + MinIO بنجاح (حاويات: ibn-al-azhar-docs-*) | اختبار يدوي |
| 2 | `npm run dev` يُشغّل الخادم المحلي دون أخطاء | اختبار يدوي |
| 3 | يمكن إنشاء حساب جديد عبر صفحة التسجيل | E2E يدوي |
| 4 | يمكن تسجيل الدخول بالبيانات الصحيحة مع جلسة JWT (24h) | E2E يدوي |
| 5 | الجلسة تُحفظ عبر صفحات التطبيق (JWT strategy فقط) | فحص cookie + session |
| 6 | الواجهة بالعربية باتجاه RTL | فحص بصري |
| 7 | تبديل اللغة يُغيّر RTL/LTR | اختبار يدوي |
| 8 | Dashboard layout يعرض Sidebar + Header + Content | فحص بصري |
| 9 | CI pipeline ينجح على GitHub (lint + test + build) | فحص CI |
| 10 | `vitest run` يُنفّذ ≥5 اختبارات بنجاح | اختبار يدوي |

---

## 7. تعريف الإنجاز (Definition of Done)

كل مهمة في Phase 1 تُعتبر "منجزة" فقط عندما تتحقق **جميع** البنود التالية:

### للكود

- [ ] الكود يتبع قواعد ESLint + Prettier (لا تحذيرات)
- [ ] TypeScript type-check ينجح (لا أخطاء `any` بدون مبرر)
- [ ] الكود مُوثّق بتعليقات JSDoc للدوال العامة
- [ ] لا console.log في الكود (استبدال بـ logger إن لزم)
- [ ] المتغيرات البيئية مُوثّقة في .env.example

### للاختبار

- [ ] اختبارات وحدة للوظائف الأساسية بـ Vitest (≥80% تغطية للكود الجديد)
- [ ] جميع الاختبارات تنجح: `vitest run`
- [ ] اختبار يدوي على Chrome + Firefox

### للتكامل

- [ ] `docker compose up` يعمل دون أخطاء
- [ ] `npm run build` ينجح
- [ ] `npm run lint` لا يُرجع أخطاء
- [ ] CI pipeline ينجح على PR

### للتوثيق

- [ ] README يوضح كيفية التشغيل المحلي
- [ ] أي قرار تقني مُبرّر في تعليق أو وثيقة
- [ ] API Routes موثّقة بـ JSDoc comments

### للمراجعة

- [ ] Pull Request تم مراجعته من مطوّر آخر
- [ ] تم دمج الكود في فرع main عبر PR (لا push مباشر)

---

## 8. المخاطر

| # | المخاطرة | الاحتمالية | التأثير | التخفيف |
|---|---------|-----------|--------|---------|
| 1 | NextAuth.js v5 beta API changes | عالي | متوسط | تتبع changelog + اختبار عند التحديث |
| 2 | Next.js 16 compatibility مع بعض المكتبات | متوسط | عالي | fallback لـ Next.js 15 إذا لزم |
| 3 | Docker networking issues | متوسط | متوسط | Docker network مُعرّف + اختبار |
| 4 | shadcn/ui RTL مشاكل | عالي | متوسط | فحص مبكر + تخصيص CSS |
| 5 | next-intl + NextAuth.js middleware تعارض | متوسط | عالي | اختبار تكامل مبكر |

---

## 9. الاعتماديات

| الاعتمادية | الحالة | ملاحظات |
|-----------|--------|---------|
| مستودع GitHub (ibn-al-azhar-docs) | يجب إنشاءه | يوم 1 |
| Docker + Docker Compose | يجب تثبيته محليًا | يوم 1 |
| Node.js 20+ | يجب تثبيته محليًا | يوم 1 |
| Google Cloud Project (لـ OCR) | **غير مطلوب في Phase 1** | Phase 3 |
| Domain + SSL | **غير مطلوب في Phase 1** | Phase 5-6 |

---

## 10. المخرجات

بنهاية Phase 1، يجب أن تكون المخرجات التالية جاهزة:

| # | المخرج | الوصف |
|---|--------|-------|
| 1 | مستودع GitHub (ibn-al-azhar-docs) | كود يعمل مع CI |
| 2 | تطبيق Next.js 16 يعمل | مع TypeScript + Tailwind + shadcn/ui |
| 3 | Docker Compose | PostgreSQL + Redis + MinIO — حاويات: ibn-al-azhar-docs-* |
| 4 | Prisma Schema أولي | DB: ibn_al_azhar_docs — مع migration و seed |
| 5 | نظام مصادقة أساسي | NextAuth.js v5 JWT (24h) + صفحات auth |
| 6 | دعم RTL/i18n | ar.json + en.json + next-intl |
| 7 | App Shell | Sidebar + Header + صفحات فارغة |
| 8 | Zustand stores | authStore + uiStore (persist: ibn-al-azhar-docs-ui-preferences) |
| 9 | CI Pipeline | GitHub Actions (lint + Vitest + build) — CI DB: ibn_al_azhar_docs_test |
| 10 | README + .env.example | تعليمات التشغيل المحلي |

---

## 11. سيناريو العرض التقديمي (Demo Script)

### المشهد 1: إعداد المشروع (2 دقائق)

1. استنساخ المستودع: `git clone https://github.com/org/ibn-al-azhar-docs.git`
2. تثبيت التبعيات: `npm install`
3. نسخ متغيرات البيئة: `cp .env.example .env`
4. تشغيل Docker: `docker compose up -d`
5. تشغيل Prisma: `npx prisma migrate dev && npx prisma db seed`
6. تشغيل التطبيق: `npm run dev`

### المشهد 2: المصادقة (3 دقائق)

1. فتح الصفحة الرئيسية — توجيه لصفحة الدخول بالعربية
2. إنشاء حساب جديد عبر صفحة التسجيل
3. تأكيد تسجيل الدخول والوصول لـ Dashboard
4. تسجيل الخروج
5. تسجيل الدخول بحساب المدير (seed)
6. الوصول لصفحة /admin — نجاح
7. تسجيل الدخول بحساب طالب — محاولة /admin → 403

### المشهد 3: RTL/i18n (2 دقائق)

1. الواجهة بالعربية — اتجاه RTL صحيح
2. تبديل اللغة للإنجليزية — اتجاه LTR صحيح
3. جميع النصوص مترجمة (appName = "ابن الأزهر دوكس" / "Ibn Al-Azhar Docs")

### المشهد 4: App Shell (2 دقائق)

1. عرض Sidebar + Header + محتوى
2. التنقل بين الصفحات (ملفات، مجلدات، إعدادات)
3. تصغير المتصفح — hamburger menu يظهر
4. فتح/إغلاق Sidebar

### المشهد 5: CI (1 دقيقة)

1. فتح GitHub Actions على المتصفح
2. عرض آخر تشغيل ناجح: lint + Vitest + build
3. عرض نتائج اختبارات Vitest (≥5 اختبارات)

---

> **ملاحظة**: هذه خطة Phase 1 تركز على الأساس فقط. الميزات الكاملة (رفع، تحويل OCR، تصدير، إدارة ملفات، مشاركة، بحث، لوحة إدارة، PWA) ستُنفّذ في Phases لاحقة حسب الخطة التنفيذية.
