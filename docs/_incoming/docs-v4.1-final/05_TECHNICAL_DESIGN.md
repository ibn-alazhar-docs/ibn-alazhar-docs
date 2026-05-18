# ابن الأزهر دوكس — التصميم التقني

> **Ibn Al-Azhar Docs — Technical Design Document**
> الإصدار: 4.0.0 | آخر تحديث: 2025-03-06
> التصنيف: مرجع تنفيذي — يُستخدم مباشرة من قِبل المهندسين للبناء

---

## جدول المحتويات

1. [نظرة عامة على النظام](#1-نظرة-عامة-على-النظام)
2. [هندسة الواجهة الأمامية](#2-هندسة-الواجهة-الأمامية)
3. [هندسة الواجهة الخلفية](#3-هندسة-الواجهة-الخلفية)
4. [هندسة PWA](#4-هندسة-pwa)
5. [هندسة المصادقة](#5-هندسة-المصادقة)
6. [هندسة معالجة الملفات](#6-هندسة-معالجة-الملفات)
7. [هندسة OCR](#7-هندسة-ocr)
8. [هندسة التصدير](#8-هندسة-التصدير)
9. [هندسة البحث](#9-هندسة-البحث)
10. [هندسة التخزين](#10-هندسة-التخزين)
11. [هندسة المهام والعمال](#11-هندسة-المهام-والعمال)
12. [المراقبة والملاحظة](#12-المراقبة-والملاحظة)
13. [المقايضات التقنية](#13-المقايضات-التقنية)
14. [القيود التقنية](#14-القيود-التقنية)
15. [الافتراضات](#15-الافتراضات)
16. [أنماط الأعطال](#16-أنماط-الأعطال)
17. [استراتيجية التوسع](#17-استراتيجية-التوسع)

---

## 1. نظرة عامة على النظام

### 1.1 الوصف العام

**Ibn Al-Azhar Docs — ابن الأزهر دوكس** هو منصة PWA لإدارة المستندات التعليمية وتحويلها. تتيح المنصة للطلاب والمعلمين رفع ملفات PDF والصور، وتحويلها عبر OCR إلى نصوص قابلة للتحرير (Conversion)، ثم تصديرها بصيغ متعددة (Export: TXT, DOCX, JSON). يعتمد النظام على معمارية متعددة الطبقات مع معالجة غير متزامنة عبر BullMQ Workers.

> **ملاحظة مهمة**: التحويل (Conversion) واستخراج النص (Export) عمليتان منفصلتان:
> - **Conversion** = استخراج النص عبر OCR فقط (لا يأخذ معامل "format")
> - **Export** = توليد ملف بصيغة محددة من نتيجة التحويل (يأخذ conversionId + format)

### 1.2 مخطط البنية

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                            │
│  React 19 + shadcn/ui + Tailwind CSS v4 + Zustand + next-intl      │
│  SSE Client + Service Worker (PWA)                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Caddy (Reverse Proxy)                       │
│  SSL Termination │ Rate Limiting │ Compression │ Static Files       │
└──────────┬──────────────────────────────────────┬───────────────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────────┐       ┌──────────────────────────────────┐
│   Next.js App (:3000)    │       │   BullMQ Workers (N containers)  │
│   App Router + API Routes│       │   PDF Splitting │ OCR │ Export   │
│   SSR + SSE Endpoints    │       │   Redis PubSub → SSE Bridge      │
│   NextAuth.js v5 (JWT)   │       └──────────┬───────────────────────┘
└──────┬───────────────────┘                  │
       │                                      │
       ├──────────────┬───────────────────────┤
       ▼              ▼                       ▼
┌────────────┐ ┌────────────┐          ┌────────────┐
│ PostgreSQL │ │   MinIO    │          │   Redis    │
│   (Data)   │ │  (Files)   │          │ Queues +   │
│            │ │            │          │ Cache +    │
│            │ │            │          │ PubSub +   │
│            │ │            │          │ Sessions   │
└────────────┘ └────────────┘          └────────────┘
```

### 1.3 تدفق البيانات الأساسي

```
Upload:    Browser → POST /api/files/upload → MinIO (store) → PostgreSQL (metadata via Prisma)
Convert:   Browser → POST /api/conversions → BullMQ (add job) → Worker (OCR extraction)
           → MinIO (results) → PostgreSQL (update) → Redis PubSub → SSE (notify client)
Export:    Browser → POST /api/exports → Worker (format generation from conversion result)
           → MinIO (write) → Browser (download via presigned URL)
Auth:      Browser → NextAuth.js v5 (JWT strategy) → HttpOnly Cookie → Browser
```

### 1.4 المكونات الرئيسية

| المكوّن | التقنية | الدور |
|---------|---------|-------|
| Frontend | Next.js 16 App Router + React 19 | واجهة المستخدم + SSR |
| UI Library | shadcn/ui + Tailwind CSS v4 | مكوّنات واجهة موحدة |
| State Management | Zustand | إدارة حالة العميل |
| i18n | next-intl | التدويل (عربي/إنجليزي) |
| Backend API | Next.js API Routes (App Router) | نقاط النهاية RESTful |
| Auth | NextAuth.js v5 (JWT strategy) | المصادقة والتفويض |
| Database | PostgreSQL 16 | تخزين البيانات العلائقية |
| ORM | Prisma | التعامل مع قاعدة البيانات |
| Object Storage | MinIO | تخزين الملفات |
| Queue | BullMQ + Redis | معالجة المهام غير المتزامنة |
| PDF Processing | pdfjs-dist | تقسيم وقراءة PDF |
| OCR | Google Drive API | التعرف البصري على الحروف |
| Reverse Proxy | Caddy | SSL، ضغط، حماية |
| Real-time | SSE (Server-Sent Events) | إشعارات فورية للعميل |
| PWA | @serwist/next (spike needed) | العمل دون اتصال |
| QA / Testing | Vitest | اختبارات الوحدة والتكامل |

---

## 2. هندسة الواجهة الأمامية

### 2.1 Next.js 16 App Router

يستخدم المشروع **App Router** كنمط توجيه أساسي. يتيح هذا النمط استخدام **Server Components** و **Client Components** بشكل انتقائي لتحسين الأداء.

#### 2.1.1 هيكل المجلدات

```
src/
├── app/
│   ├── [locale]/                    # next-intl dynamic segment
│   │   ├── layout.tsx               # Root layout (Server Component)
│   │   ├── page.tsx                 # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   │   ├── files/page.tsx
│   │   │   ├── folders/page.tsx
│   │   │   ├── conversions/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── admin/
│   │   │   ├── users/page.tsx
│   │   │   └── stats/page.tsx
│   │   └── share/[token]/page.tsx
│   ├── api/                         # API Routes
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── files/
│   │   ├── folders/
│   │   ├── conversions/
│   │   ├── exports/
│   │   ├── share/
│   │   ├── admin/
│   │   └── search/
│   └── manifest.ts                  # PWA manifest
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── auth/
│   ├── files/
│   ├── conversions/
│   ├── exports/
│   └── shared/
├── lib/
│   ├── api.ts                       # API client
│   ├── auth.ts                      # NextAuth config
│   ├── prisma.ts                    # Prisma client singleton
│   ├── minio.ts                     # MinIO client
│   ├── redis.ts                     # Redis client
│   └── utils.ts
├── stores/                          # Zustand stores
│   ├── auth-store.ts
│   ├── files-store.ts
│   ├── conversions-store.ts
│   ├── exports-store.ts
│   └── ui-store.ts
├── hooks/
├── i18n/                            # next-intl messages
│   ├── ar.json
│   └── en.json
└── types/
```

#### 2.1.2 Server Components مقابل Client Components

| المكوّن | النوع | السبب |
|---------|-------|-------|
| Layout العام | Server | لا يحتاج حالة، يُرسل HTML ثابت |
| صفحات الملفات/التحويلات | Server (مع أجزاء Client) | جلب بيانات أولي من الخادم |
| نماذج الرفع | Client | تفاعل مع FormData، تقدم الرفع |
| لوحة التحويلات المباشرة | Client | SSE connection، تحديثات فورية |
| Sidebar/Navigation | Client | حالة تفاعلية (طي/فتح) |
| الجداول والفلاتر | Client | فرز، تصفية، ترقيم صفحات |

**قاعدة التصنيف**: المكوّن Server Component ما لم يحتاج إلى: `useState`, `useEffect`, مُستمع أحداث، أو API متصفح (مثل `EventSource`).

### 2.2 إدارة الحالة — Zustand

يُستخدم Zustand لإدارة حالة العميل بطريقة مركزية وخفيفة. كل Store يتبع نمطًا موحدًا:

```typescript
// stores/conversions-store.ts
interface ConversionsState {
  conversions: Conversion[];
  activeConversion: Conversion | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConversions: () => Promise<void>;
  startConversion: (params: CreateConversionDto) => Promise<void>;
  subscribeToUpdates: (conversionId: string) => () => void; // returns unsubscribe
  cancelConversion: (id: string) => Promise<void>;
}

export const useConversionsStore = create<ConversionsState>()(
  devtools(
    immer((set, get) => ({
      conversions: [],
      activeConversion: null,
      isLoading: false,
      error: null,

      fetchConversions: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.conversions.list();
          set({ conversions: data, isLoading: false });
        } catch (err) {
          set({ error: normalizeError(err), isLoading: false });
        }
      },

      subscribeToUpdates: (conversionId: string) => {
        const eventSource = new EventSource(
          `/api/conversions/${conversionId}/events`,
          { withCredentials: true }
        );

        eventSource.addEventListener('progress', (e) => {
          const data = JSON.parse(e.data);
          set(immerState => {
            const conv = immerState.conversions.find(c => c.id === conversionId);
            if (conv) Object.assign(conv, data);
          });
        });

        eventSource.addEventListener('complete', () => {
          eventSource.close();
        });

        return () => eventSource.close();
      },
    }))
  )
);
```

#### 2.2.1 Stores المطلوبة

| Store | الحالة الأساسية | الوظيفة |
|-------|----------------|---------|
| `useAuthStore` | user, isAuthenticated, isLoading | إدارة جلسة المستخدم |
| `useFilesStore` | files, currentFolder, filters, selectedFiles | عرض وإدارة الملفات |
| `useConversionsStore` | conversions, activeConversion, progress | متابعة التحويلات |
| `useExportsStore` | exports[], activeExports | متابعة التصديرات |
| `useUIStore` | sidebarOpen, theme, locale, toasts | حالة الواجهة العامة |
| `useUploadStore` | uploads[], progress per file | حالة الرفع المتعدد |

### 2.3 التدويل — next-intl

يتم استخدام `next-intl` لدعم العربية (RTL) والإنجليزية (LTR):

- **الآلية**: `[locale]` segment ديناميكي في App Router
- **ملفات الرسائل**: `src/i18n/ar.json` و `src/i18n/en.json`
- **الكشف التلقائي**: `Accept-Language` header → redirect إلى `/ar` أو `/en`
- **التبديل**: زر في الـheader يُغيّر الـlocale ويعيد التوجيه
- **التنسيق**: التواريخ والأرقام تُعرض حسب الـlocale عبر `Intl` APIs

```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../i18n/${locale}.json`)).default,
  timeZone: 'Asia/Riyadh',
  now: new Date(),
}));
```

### 2.4 اتصال SSE من العميل

يستخدم العميل `EventSource` API للاستماع لتحديثات التحويلات:

```typescript
// hooks/use-sse.ts
export function useSSE(url: string | null) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    if (!url) return;

    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener('open', () => setStatus('connected'));
    source.addEventListener('error', () => setStatus('error'));

    // Custom event handlers registered externally
    return () => {
      source.close();
      setStatus('connecting');
    };
  }, [url]);

  return status;
}
```

**آلية إعادة الاتصال**: المتصفح يُعيد الاتصال تلقائيًا عند انقطاع SSE. الـserver يرسل `Last-Event-ID` لاستئناف من آخر حدث.

---

## 3. هندسة الواجهة الخلفية

### 3.1 Next.js API Routes

تتبع جميع نقاط النهاية نمط App Router:

```typescript
// app/api/files/upload/route.ts
export async function POST(request: Request): Promise<Response> {
  // 1. Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول' } },
      { status: 401 }
    );
  }

  // 2. Parse & validate input
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'الملف مطلوب' } },
      { status: 400 }
    );
  }

  // 3. Business logic
  const result = await uploadFileService(session.user.id, file);

  // 4. Audit
  await logActivity(session.user.id, 'FILE_UPLOAD', result.id, 'File');

  // 5. Response
  return NextResponse.json(result, { status: 201 });
}
```

### 3.2 Middleware

يعمل Next.js Middleware كطبقة اعتراض قبل الوصول إلى API Routes:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 2. CORS (API routes only)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigins);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // 3. Locale redirect
  const locale = request.cookies.get('NEXT_LOCALE')?.value || detectLocale(request);
  if (!request.nextUrl.pathname.startsWith(`/${locale}`)) {
    return NextResponse.redirect(new URL(`/${locale}${request.nextUrl.pathname}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)'],
};
```

### 3.3 التحقق من البيانات — Zod

يتم التحقق من جميع المدخلات باستخدام Zod schemas:

```typescript
// lib/validators/files.ts
import { z } from 'zod';

export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 100 * 1024 * 1024, 'حجم الملف يتجاوز 100 ميجابايت')
    .refine(
      f => ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(f.type),
      'نوع الملف غير مدعوم'
    ),
  folderId: z.string().cuid().optional(),
});

// التحويل = استخراج OCR فقط (بدون format)
export const createConversionSchema = z.object({
  fileIds: z.array(z.string().cuid()).min(1).max(50),
  settings: z.object({
    ocrEngine: z.enum(['google-drive']).default('google-drive'),
    language: z.enum(['ar', 'en', 'auto']).default('auto'),
    dpi: z.number().min(150).max(600).default(300),
  }).default({}),
});

// التصدير = توليد ملف بصيغة محددة من نتيجة التحويل
export const createExportSchema = z.object({
  conversionId: z.string().cuid(),
  format: z.enum(['txt', 'docx', 'json']),
});
```

**نمط موحد**: كل API Route تستخدم schema مُعرّف مسبقًا. في حالة فشل التحقق، يُعاد خطأ `VALIDATION_ERROR` مع تفاصيل الحقول.

### 3.4 معالجة الأخطاء

#### 3.4.1 تنسيق الخطأ الموحد

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
}
```

#### 3.4.2 رموز الأخطاء

| الرمز | HTTP Status | المعنى |
|-------|------------|--------|
| `VALIDATION_ERROR` | 400 | بيانات إدخال غير صالحة |
| `UNAUTHORIZED` | 401 | غير مُصادَق عليه |
| `FORBIDDEN` | 403 | غير مُخوَّل |
| `NOT_FOUND` | 404 | المورد غير موجود |
| `FILE_TOO_LARGE` | 413 | الملف أكبر من الحد |
| `UNSUPPORTED_FILE_TYPE` | 415 | نوع ملف غير مدعوم |
| `EMAIL_EXISTS` | 409 | البريد الإلكتروني مسجل مسبقًا |
| `RATE_LIMITED` | 429 | تجاوز حد الطلبات |
| `OCR_FAILED` | 502 | فشل خدمة OCR |
| `EXPORT_FAILED` | 502 | فشل في توليد التصدير |
| `INTERNAL_ERROR` | 500 | خطأ داخلي في الخادم |

#### 3.4.3 ErrorHandler المركزي

```typescript
// lib/error-handler.ts
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'بيانات إدخال غير صالحة',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  logger.error({ err: error }, 'Unhandled error');
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'خطأ داخلي في الخادم' } },
    { status: 500 }
  );
}
```

### 3.5 نمط Service Layer

يتم فصل منطق الأعمال عن API Routes عبر Service Layer:

```typescript
// services/conversion.service.ts
export class ConversionService {
  constructor(
    private prisma: PrismaClient,
    private queue: Queue,
    private minio: MinioClient,
  ) {}

  async createConversion(userId: string, dto: CreateConversionDto): Promise<Conversion> {
    // 1. Validate files exist and belong to user
    const files = await this.validateFiles(userId, dto.fileIds);

    // 2. Check storage quota
    await this.checkQuota(userId);

    // 3. Create conversion record (NO format — conversion is OCR extraction only)
    const conversion = await this.prisma.conversion.create({
      data: {
        userId,
        status: 'queued',
        settings: dto.settings,
        totalFiles: files.length,
        completedFiles: 0,
        failedFiles: 0,
      },
    });

    // 4. Add job to BullMQ (no format in job payload)
    await this.queue.add('conversion', {
      conversionId: conversion.id,
      fileIds: dto.fileIds,
      settings: dto.settings,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return conversion;
  }
}

// services/export.service.ts
export class ExportService {
  constructor(
    private prisma: PrismaClient,
    private queue: Queue,
    private minio: MinioClient,
  ) {}

  async createExport(userId: string, dto: CreateExportDto): Promise<Export> {
    // 1. Validate conversion exists, belongs to user, and is completed
    const conversion = await this.validateConversion(userId, dto.conversionId);

    // 2. Check if export already exists for this conversion + format
    const existing = await this.prisma.export.findUnique({
      where: {
        conversionId_format: {
          conversionId: dto.conversionId,
          format: dto.format,
        },
      },
    });
    if (existing) return existing;

    // 3. Create export record
    const exportRecord = await this.prisma.export.create({
      data: {
        conversionId: dto.conversionId,
        fileId: conversion.files[0].fileId, // primary file
        format: dto.format,
        status: 'pending',
      },
    });

    // 4. Add job to BullMQ
    await this.queue.add('export', {
      exportId: exportRecord.id,
      conversionId: dto.conversionId,
      format: dto.format,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    return exportRecord;
  }
}
```

---

## 4. هندسة PWA

### 4.1 Service Worker — @serwist/next

> **ملاحظة**: النظام المقترح هو `@serwist/next` كحزمة PWA الافتراضية. يجب إجراء spike تقني للتأكد من التوافق مع Next.js 16 قبل الاعتماد النهائي.

يستخدم المشروع `@serwist/next` لإدارة Service Worker بدلًا من كتابته يدويًا:

```typescript
// next.config.ts
import withSerwist from '@serwist/next';

export default withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})(nextConfig);
```

#### 4.1.1 استراتيجيات التخزين المؤقت حسب نوع المورد

| نوع المورد | الاستراتيجية | التفاصيل |
|-----------|-------------|---------|
| HTML (App Shell) | Cache First | يُخزن مسبقًا عند التثبيت، يُحدّث في الخلفية |
| CSS/JS (Static Assets) | Cache First + Versioned | أسماء ملفات تتضمن hash، تُخزن مدى الحياة |
| API (GET) | Network First | يُحاول الشبكة أولًا، يتراجع للـcache عند الفشل |
| API (POST/PUT/DELETE) | Network Only | لا يُخزن، يتطلب اتصالًا |
| الصور | Stale While Revalidate | يُعرض من الـcache فورًا، يُحدّث في الخلفية |
| الخطوط | Cache First | تُخزن مدى الحياة، نادرًا ما تتغير |
| SSE Endpoints | Network Only | لا معنى للتخزين المؤقت للأحداث المباشرة |

#### 4.1.2 إعداد Serwist

```typescript
// app/sw.ts
import type { PrecacheEntry } from '@serwist/precaching';
import { installSerwist } from '@serwist/sw';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from '@serwist/strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

installSerwist({
  precacheEntries: self.__WB_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\/_next\/static\//,
      handler: new CacheFirst({ cacheName: 'static-assets' }),
    },
    {
      urlPattern: /^https?:\/\/.*\/api\//,
      handler: new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 }),
      method: 'GET',
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: new StaleWhileRevalidate({ cacheName: 'images' }),
    },
    {
      urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
      handler: new CacheFirst({ cacheName: 'fonts' }),
    },
  ],
});
```

#### 4.1.3 صفحة Offline

عند عدم وجود اتصال وعدم توفر نسخة مخزنة، يُعرض صفحة `/offline` المُخزنة مسبقًا:

```javascript
// Network First fallback
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }

    return new Response('Offline', { status: 503 });
  }
}
```

### 4.2 Web App Manifest

```json
{
  "name": "Ibn Al-Azhar Docs — إدارة المستندات التعليمية",
  "short_name": "Ibn Al-Azhar Docs",
  "description": "منصة لإدارة المستندات التعليمية وتحويلها",
  "start_url": "/ar",
  "display": "standalone",
  "orientation": "any",
  "dir": "rtl",
  "lang": "ar",
  "theme_color": "#1e40af",
  "background_color": "#f8fafc",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["education", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

### 4.3 تدفق التثبيت

```
1. المستخدم يزور الموقع لأول مرة
   ↓
2. المتصفح يكتشف manifest + SW → يُظهر prompt التثبيت
   ↓
3. المستخدم يوافق → يُضاف كتطبيق مستقل
   ↓
4. في المرة التالية: يفتح كتطبيق standalone
   ↓
5. التطبيق يعمل مع/بدون اتصال
```

**Custom install prompt**: إذا رُفض الـprompt التلقائي، يُظهر التطبيق banner مخصص مع تعليمات التثبيت اليدوي.

### 4.4 حل تعارضات Offline

عند العمل دون اتصال ثم العودة:

| العملية | السلوك |
|---------|--------|
| رفع ملف | يُخزن محليًا في IndexedDB، يُرفع عند العودة (Background Sync) |
| حذف ملف | يُسجّل محليًا، يُنفذ عند العودة |
| تعديل بيانات | يُرفض مع رسالة "يتطلب اتصال" |
| تحويل | يُرفض — يتطلب اتصال بالخادم |
| تصفح الملفات | يُعرض من الـcache المحلي |

---

## 5. هندسة المصادقة

### 5.1 NextAuth.js v5 — JWT Strategy

> **ملاحظة مهمة**: في MVP لا نستخدم access_token/refresh_token منفصل. نستخدم NextAuth.js v5 مع JWT strategy فقط. الـJWT يُخزن في HttpOnly Secure SameSite=Lax cookie باسم `next-auth.session-token`.

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 ساعة
    updateAge: 4 * 60 * 60, // تحديث كل 4 ساعات
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 ساعة — يطابق session.maxAge
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      },
    },
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
        if (user.status !== 'active') throw new Error('ACCOUNT_NOT_ACTIVE');

        const isValid = await bcrypt.compare(validated.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      // Refresh user data on session update (every 4 hours via updateAge)
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
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
```

### 5.2 JWT Session Flow (NO Refresh Token)

```
تسجيل الدخول:
  Client → POST /api/auth/callback/credentials
  → NextAuth يتحقق → يُنشئ JWT (24h maxAge)
  → يُخزن في HttpOnly cookie: "next-auth.session-token"
  → Client يحصل على session

تجديد الجلسة (Built-in NextAuth mechanism):
  Client → GET /api/auth/session (تلقائي كل 4 ساعات عبر updateAge)
  → NextAuth يتحقق من JWT → يحدّث البيانات من DB → يُجدد JWT ضمنيًا
  → لا توجد نقطة نهاية مخصصة للتجديد

انتهاء الصلاحية:
  JWT ينتهي بعد 24 ساعة (maxAge) → Client يُعاد توجيهه لصفحة تسجيل الدخول
```

**ملاحظة مهمة**: لا نستخدم Refresh Token منفصل في MVP. JWT مدته 24 ساعة، ويُجدد ضمنيًا عند تحديث الجلسة عبر NextAuth's built-in `GET /api/auth/session`. لا توجد نقطة نهاية `POST /api/auth/refresh` مخصصة.

### 5.3 HttpOnly Cookies

| Cookie | الغرض | الخصائص |
|--------|--------|---------|
| `next-auth.session-token` | JWT payload (24h maxAge) | HttpOnly, Secure, SameSite=Lax, Path=/ |
| `next-auth.csrf-token` | حماية CSRF | HttpOnly, Secure, SameSite=Lax |
| `next-auth.callback-url` | URL العودة | HttpOnly, Secure, SameSite=Lax |

### 5.4 حماية CSRF

يعتمد NextAuth.js v5 على **Double Submit Cookie** pattern:
- يُرسل الـserver csrf token كـcookie ويتوقعه في body الـPOST request
- لا حاجة لتعطيل CSRF protection لأن جميع طلبات التعديل تمر عبر API Routes التي تتحقق من origin

### 5.5 Role-Based Access Control (RBAC)

```typescript
// lib/auth-guards.ts
type Role = 'student' | 'teacher' | 'admin';

const ROLE_HIERARCHY: Record<Role, Role[]> = {
  admin: ['admin', 'teacher', 'student'],
  teacher: ['teacher', 'student'],
  student: ['student'],
};

export function requireRole(session: Session, requiredRole: Role): void {
  if (!session?.user) throw new AppError('UNAUTHORIZED', 401);

  const userRole = session.user.role as Role;
  if (!ROLE_HIERARCHY[userRole]?.includes(requiredRole)) {
    throw new AppError('FORBIDDEN', 403);
  }
}

// Usage in API Route:
export async function GET(request: Request) {
  const session = await auth();
  requireRole(session, 'teacher'); // فقط المعلمون والمديرون
  // ...
}
```

#### 5.5.1 مصفوفة الصلاحيات

| العملية | student | teacher | admin |
|---------|---------|---------|-------|
| رفع ملفات | ✅ | ✅ | ✅ |
| تحويل ملفات (OCR) | ✅ | ✅ | ✅ |
| تصدير ملفات | ✅ | ✅ | ✅ |
| مشاركة ملفات | ✅ | ✅ | ✅ |
| إدارة مجلدات | ✅ (خاصة) | ✅ (خاصة) | ✅ (كلها) |
| عرض كل الملفات | ❌ | ❌ | ✅ |
| إدارة المستخدمين | ❌ | ❌ | ✅ |
| عرض الإحصائيات | ❌ | ❌ | ✅ |
| عرض سجل النشاط | ❌ | ❌ | ✅ |

### 5.6 إدارة الجلسة

- **الحد الأقصى للجلسات**: 5 جلسات متزامنة لكل مستخدم
- **التسجيل الخروج**: يُبطل الـJWT cookie وجميع sessions المرتبطة
- **تعليق الحساب**: عند تعليق حساب، تُبطل جميع الجلسات فورًا عبر JWT callback
- **تغيير كلمة المرور**: تُبطل جميع الجلسات الأخرى

---

## 6. هندسة معالجة الملفات

### 6.1 تدفق الرفع

```
Browser
  │
  ├─1. اختيار ملف (PDF/صورة)
  │
  ├─2. POST /api/files/upload (multipart/form-data)
  │     │
  │     ├─ التحقق من Auth
  │     ├─ التحقق من النوع (PDF, PNG, JPEG, WEBP)
  │     ├─ التحقق من الحجم (≤ 100MB)
  │     ├─ التحقق من الحصة التخزينية
  │     │
  │     ├─3. رفع إلى MinIO
  │     │     bucket: "ibn-al-azhar-docs-files"
  │     │     key: users/{userId}/{year}/{month}/{uuid}.{ext}
  │     │
  │     ├─4. إنشاء سجل في PostgreSQL (via Prisma)
  │     │     status: "ready"
  │     │     storageKey: "users/{userId}/..."
  │     │
  │     └─5. استجابة 201 مع بيانات الملف
  │
  └─6. تحديث Zustand store
```

### 6.2 تخزين MinIO

#### 6.2.1 تنظيم الملفات

```
ibn-al-azhar-docs-files/                ← Bucket رئيسي
  users/
    {userId}/
      uploads/
        2025/
          03/
            {uuid}.pdf                 ← ملفات مرفوعة
            {uuid}.png
      conversions/
        2025/
          03/
            {conversionId}/
              {fileId}_page_{n}.png    ← صفحات مقسمة
              {fileId}.txt             ← نتيجة OCR (نص مستخرج)
      exports/
        2025/
          03/
            {exportId}/
              result.docx              ← ملفات التصدير
              result.txt
              result.json
  temp/
    ocr/
      {jobId}/
        {uuid}.pdf                    ← ملفات مؤقتة للـOCR
```

#### 6.2.2 Presigned URLs

تُستخدم Presigned URLs لتحميل الملفات مباشرة من MinIO دون المرور عبر Next.js:

```typescript
// lib/minio.ts
export async function getDownloadUrl(storageKey: string): Promise<string> {
  return minioClient.presignedGetObject(
    'ibn-al-azhar-docs-files',
    storageKey,
    60 * 5, // صالح لمدة 5 دقائق
    {
      'response-content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }
  );
}
```

**أمان**: Presigned URL صالح لمدة 5 دقائق فقط، ويُطلبه العميل مباشرة من MinIO (عبر Caddy).

### 6.3 التحقق من الملفات

```typescript
// lib/file-validation.ts
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_STORAGE_QUOTA = {
  student: 500 * 1024 * 1024,  // 500MB
  teacher: 2 * 1024 * 1024 * 1024, // 2GB
  admin: 10 * 1024 * 1024 * 1024,  // 10GB
};

export function validateFile(file: File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'UNSUPPORTED_FILE_TYPE' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }
  return { valid: true };
}
```

### 6.4 حصة التخزين

يتم تتبع الاستخدام عبر حقل `storageUsed` في نموذج User:

```typescript
// بعد كل رفع ناجح:
await prisma.user.update({
  where: { id: userId },
  data: { storageUsed: { increment: file.sizeBytes } },
});

// بعد كل حذف:
await prisma.user.update({
  where: { id: userId },
  data: { storageUsed: { decrement: file.sizeBytes } },
});
```

**تحذير**: `storageUsed` يُحدّث بشكل متزامن (ليس عبر Worker) لضمان الدقة.

---

## 7. هندسة OCR

### 7.1 تدفق Google Drive API

```
Worker
  │
  ├─1. استخراج صفحة PDF كصورة PNG (pdfjs-dist)
  │     resolution: 300 DPI (default)
  │
  ├─2. رفع الصورة إلى Google Drive
  │     API: drive.files.create
  │     mimeType: image/png
  │     folder: temp OCR folder
  │
  ├─3. تصدير النص من Google Drive
  │     API: drive.files.export
  │     mimeType: text/plain
  │     → يحتوي على نص OCR
  │
  ├─4. حذف الملف المؤقت من Google Drive
  │     API: drive.files.delete
  │
  ├─5. تنظيف النص (Text Cleaning)
  │     → إزالة أحرف التحكم
  │     → تطبيع المسافات
  │     → تصحيح اتجاه RTL
  │
  └─6. إعادة النص المنظف
```

### 7.2 منطق إعادة المحاولة (Retry Logic)

```typescript
// lib/ocr-retry.ts
interface RetryConfig {
  maxAttempts: number;     // 5
  baseDelay: number;       // 1000ms
  backoffMultiplier: number; // 1.5
  maxDelay: number;        // 30000ms
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 1000,
    backoffMultiplier: 1.5,
    maxDelay: 30000,
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryable(error)) throw error;
      if (attempt === config.maxAttempts) throw error;

      // Exponential backoff + UUID jitter
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      const jitter = parseInt(randomUUID().slice(0, 8), 16) % 1000; // 0-999ms jitter
      const totalDelay = delay + jitter;

      logger.warn({ attempt, delay: totalDelay, error: lastError.message }, 'Retrying OCR');

      await sleep(totalDelay);
    }
  }

  throw lastError!;
}

function isRetryable(error: unknown): boolean {
  // Google API rate limit (403), server error (500/503), network timeout
  if (error instanceof GoogleApiError) {
    return [403, 500, 503].includes(error.code) || error.code === 429;
  }
  if (error instanceof NetworkError) return true;
  return false;
}
```

### 7.3 تنظيف النص (Text Cleaning)

```typescript
// lib/text-cleaner.ts
export function cleanOcrText(rawText: string): string {
  return rawText
    // 1. إزالة أحرف التحكم (ما عدا السطور الجديدة والتبويب)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 2. تطبيع المسافات (تحويل المسافات المتعددة إلى واحدة)
    .replace(/[^\S\n\t]{2,}/g, ' ')
    // 3. إزالة الأسطر الفارغة المتتالية (أكثر من سطرين)
    .replace(/\n{3,}/g, '\n\n')
    // 4. تصحيح اتجاه النص العربي (إضافة LRE/RLE marks إذا لزم)
    .replace(/([\u0600-\u06FF][\u0600-\u06FF\s.,;:!?()\-]*)/g, '\u202B$1\u202C')
    // 5. إزالة BOM
    .replace(/^\uFEFF/, '')
    // 6. تقليم المسافات البادئة والخلفية لكل سطر
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}
```

### 7.4 التحكم في التزامن (Concurrency Control)

```typescript
// workers/ocr-worker.ts
const OCR_CONCURRENCY = parseInt(process.env.OCR_CONCURRENCY || '3', 10);
const GOOGLE_API_QPS = 10; // حد Google API: 10 طلبات/ثانية

// Semaphores
const driveApiLimiter = new RateLimiter({
  tokensPerInterval: GOOGLE_API_QPS,
  interval: 'second',
});

const worker = new Worker('conversion', async (job) => {
  // ... معالجة التحويل
  for (const page of pages) {
    await driveApiLimiter.removeTokens(1); // انتظر حتى يتوفر token
    const text = await withRetry(() => ocrPage(page));
    // ...
  }
}, {
  concurrency: OCR_CONCURRENCY,
  connection: redis,
});
```

### 7.5 اعتبارات الخصوصية

| الاعتبار | الإجراء |
|---------|---------|
| بيانات المستخدمين التعليمية | تُرفع إلى Google Drive بشكل مؤقت فقط |
| مدة التخزين في Google Drive | تُحذف فورًا بعد استخراج النص |
| مجلد Google Drive مؤقت | يُستخدم folder مخصص للملفات المؤقتة |
| الوصول | Service Account فقط، لا وصول بشري |
| التشفير | الملفات تُرفع عبر HTTPS وتُحذف فور الانتهاء |

---

## 8. هندسة التصدير

> **ملاحظة مهمة**: التصدير (Export) منفصل عن التحويل (Conversion). التحويل يستخرج النص فقط عبر OCR، بينما التصدير يولّد ملفًا بصيغة محددة من نتيجة التحويل.

### 8.1 تدفق التصدير

```
1. المستخدم يطلب تصدير نتيجة تحويل بصيغة محددة
   POST /api/exports { conversionId, format: "docx" }
   ↓
2. النظام يتحقق من اكتمال التحويل
   ↓
3. يقرأ النص المستخرج من MinIO
   ↓
4. يولّد الملف بالصيغة المطلوبة:
   - txt: كتابة النص مباشرة
   - docx: توليد ملف DOCX باستخدام docx library
   - json: هيكلة النص كـJSON مع metadata
   ↓
5. يرفع الملف المُصدَّر إلى MinIO
   bucket: ibn-al-azhar-docs-files
   key: exports/{exportId}/result.{ext}
   ↓
6. يُحدّث سجل Export في قاعدة البيانات
   ↓
7. يُعيد رابط تحميل presigned URL
```

### 8.2 أنواع التصدير

| الصيغة | الوصف | المكتبة |
|--------|-------|---------|
| `txt` | نص عادي UTF-8 | fs |
| `docx` | مستند Word | `docx` npm package |
| `json` | JSON مهيكل مع metadata | JSON.stringify |

### 8.3 مثال توليد DOCX

```typescript
// workers/export-worker.ts
import { Document, Packer, Paragraph, TextRun } from 'docx';

async function generateDocx(ocrText: string, metadata: ConversionMetadata): Promise<Buffer> {
  const paragraphs = ocrText.split('\n').map(line =>
    new Paragraph({
      children: [new TextRun({ text: line, font: 'Arial', size: 24 })],
      bidirectional: /[\u0600-\u06FF]/.test(line), // RTL for Arabic
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        bidi: true, // RTL default
      },
      children: paragraphs,
    }],
  });

  return await Packer.toBuffer(doc);
}
```

---

## 9. هندسة البحث

### 9.1 البحث في الملفات (MVP)

في MVP، يتم البحث عبر `ILIKE` في اسم الملف:

```typescript
// services/search.service.ts
async function searchFiles(userId: string, query: string, options: SearchOptions) {
  return prisma.file.findMany({
    where: {
      ownerId: userId,
      deletedAt: null,
      name: { contains: query, mode: 'insensitive' },
    },
    take: options.limit,
    skip: options.cursor ? 1 : 0,
    cursor: options.cursor ? { id: options.cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}
```

### 9.2 البحث المستقبلي (V2)

في V2، سيتم استخدام PostgreSQL Full-Text Search مع `tsvector`:

```sql
-- إضافة عمود البحث
ALTER TABLE files ADD COLUMN search_vector tsvector;
CREATE INDEX files_search_vector_idx ON files USING GIN(search_vector);

-- تحديث البحث
UPDATE files SET search_vector =
  setweight(to_tsvector('arabic', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('arabic', coalesce(ocr_text, '')), 'B');
```

---

## 10. هندسة التخزين

### 10.1 MinIO Configuration

| الإعداد | القيمة |
|---------|--------|
| Bucket | `ibn-al-azhar-docs-files` |
| Region | `us-east-1` (MinIO default) |
| Versioning | غير مُفعّل في MVP |
| Lifecycle | تنظيف الملفات المؤقتة بعد 7 أيام |
| Encryption | SSE-S3 في MVP |
| Access | عبر Presigned URLs فقط |

### 10.2 Docker Container

```yaml
# docker-compose.yml
minio:
  image: minio/minio:latest
  container_name: ibn-al-azhar-docs-minio
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
```

### 10.3 سياسة الوصول

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": ["nextjs-app"] },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": ["arn:aws:s3:::ibn-al-azhar-docs-files/*"]
    }
  ]
}
```

---

## 11. هندسة المهام والعمال

### 11.1 BullMQ Queues

| الطابور | الوظيفة | Concurrency |
|---------|---------|-------------|
| `conversion` | استخراج النص عبر OCR | 3 (default) |
| `export` | توليد ملفات بصيغة محددة | 5 (default) |
| `cleanup` | تنظيف الملفات المؤقتة والمنتهية | 1 |

### 11.2 Docker Workers

```yaml
# docker-compose.yml
worker-conversion:
  build: .
  container_name: ibn-al-azhar-docs-worker-conversion
  command: bun run workers/conversion-worker.ts
  environment:
    REDIS_URL: ${REDIS_URL}
    MINIO_ENDPOINT: ${MINIO_ENDPOINT}
    GOOGLE_APPLICATION_CREDENTIALS: /app/credentials.json
  volumes:
    - ./credentials.json:/app/credentials.json

worker-export:
  build: .
  container_name: ibn-al-azhar-docs-worker-export
  command: bun run workers/export-worker.ts
  environment:
    REDIS_URL: ${REDIS_URL}
    MINIO_ENDPOINT: ${MINIO_ENDPOINT}

worker-cleanup:
  build: .
  container_name: ibn-al-azhar-docs-worker-cleanup
  command: bun run workers/cleanup-worker.ts
  environment:
    REDIS_URL: ${REDIS_URL}
    MINIO_ENDPOINT: ${MINIO_ENDPOINT}
```

### 11.3 تدفق المهام

```
Conversion Job:
  1. جلب تفاصيل التحويل من DB
  2. لكل ملف:
     a. تقسيم PDF إلى صفحات (pdfjs-dist)
     b. استخراج النص من كل صفحة (Google Drive API)
     c. تنظيف النص
     d. حفظ النتيجة في MinIO
     e. تحديث حالة ConversionFile
  3. تحديث حالة Conversion النهائية
  4. إرسال إشعار SSE

Export Job:
  1. جلب تفاصيل التحويل والنص المستخرج
  2. توليد الملف بالصيغة المطلوبة
  3. رفع الملف إلى MinIO
  4. تحديث سجل Export
  5. إرسال إشعار SSE
```

---

## 12. المراقبة والملاحظة

### 12.1 التسجيل (Logging)

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

### 12.2 المقاييس (Metrics)

| المقياس | النوع | الوصف |
|---------|------|-------|
| `conversion_duration_seconds` | Histogram | مدة التحويل |
| `export_duration_seconds` | Histogram | مدة التصدير |
| `ocr_api_calls_total` | Counter | عدد طلبات Google Drive API |
| `file_upload_size_bytes` | Histogram | حجم الملفات المرفوعة |
| `active_conversions` | Gauge | التحويلات النشطة |
| `active_exports` | Gauge | التصديرات النشطة |
| `minio_storage_used_bytes` | Gauge | مساحة التخزين المستخدمة |

### 12.3 Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    minio: await checkMinIO(),
  };

  const isHealthy = Object.values(checks).every(c => c === 'connected');

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
```

---

## 13. المقايضات التقنية

| القرار | الخيار المُختار | البديل | السبب |
|--------|----------------|--------|-------|
| Auth | NextAuth.js v5 JWT | Custom JWT + Refresh | توفير وقت التنفيذ، أمان مُختبر، لا حاجة لrefresh token في MVP |
| PWA | @serwist/next | Workbox مباشر | تكامل أفضل مع Next.js، تكوين أقل |
| Reverse Proxy | Caddy | Nginx | إدارة SSL تلقائية، تكوين أبسط |
| Search | ILIKE (MVP) | Elasticsearch | بساطة MVP، لا حاجة لمحرك بحث كامل |
| Queue | BullMQ + Redis | RabbitMQ | تكامل أفضل مع Node.js، Redis مُستخدم بالفعل |
| ORM | Prisma | TypeORM | TypeScript-first، migrations آمنة |
| Testing | Vitest | Jest | أسرع، تكامل أفضل مع Vite/bun |
| Storage | MinIO | AWS S3 | تشغيل محلي، لا تكلفة، توافق S3 |

---

## 14. القيود التقنية

| القيد | القيمة | السبب |
|-------|--------|-------|
| حجم الملف الأقصى | 100MB | حد عملي للـOCR عبر Google Drive API |
| عدد الملفات في التحويل | 50 | منع تجاوز الحصة |
| مدة التحويل | 30 دقيقة max | حد BullMQ job |
| Google API QPS | 10 طلبات/ثانية | حد Google Drive API |
| SSE Connections | 3 لكل مستخدم | منع استهلاك الموارد |
| JWT maxAge | 24 ساعة | أمان معقولة لـMVP |
| JWT updateAge | 4 ساعات | تجديد ضمني بدون interrupt |

---

## 15. الافتراضات

1. **Google Drive API** متاح ومستقر، مع حصة كافية للاستخدام المتوقع
2. **MinIO** يُشغّل محليًا في Docker مع تخزين كافٍ
3. **Redis** يُستخدم للطوابير والـcache والـpub/sub
4. **المستخدمون** يستخدمون متصفحات حديثة تدعم SSE وService Worker
5. **الشبكة** بين المكونات سريعة (Docker network)
6. **PWA spike**: يجب إجراء spike تقني لـ @serwist/next مع Next.js 16 قبل الاعتماد النهائي

---

## 16. أنماط الأعطال

| العطل | التأثير | التعافي |
|-------|---------|---------|
| Google Drive API unavailable | فشل OCR | إعادة محاولة تلقائية (5 محاولات)، ثم فشل مع إشعار |
| MinIO unavailable | فشل رفع/تحميل الملفات | إعادة محاولة BullMQ، صفحة خطأ |
| Redis unavailable | فشل الطوابير وSSE | إعادة اتصال تلقائية، fallback للقراءة من DB |
| PostgreSQL unavailable | فشل كامل | Health check → 503، Caddy يُعيد المحاولة |
| Worker crash | مهام عالقة | BullMQ stale jobs → إعادة جدولة تلقائية |
| JWT expired | فشل الطلبات | Client يُعاد توجيهه لصفحة تسجيل الدخول |

---

## 17. استراتيجية التوسع

### 17.1 التوسع الرأسي (MVP)

```
Next.js App:     1 container (sufficient for MVP)
Workers:         2-3 containers (conversion + export + cleanup)
PostgreSQL:      1 instance
Redis:           1 instance
MinIO:           1 instance
```

### 17.2 التوسع الأفقي (V2+)

```
Next.js App:     N containers (behind Caddy load balancer)
Workers:         N containers per queue (scale by demand)
PostgreSQL:      Read replicas + connection pooling (PgBouncer)
Redis:           Redis Cluster for HA
MinIO:           Distributed mode (4+ nodes)
```

### 17.3 مؤشرات التوسع

| المؤشر | العتبة | الإجراء |
|--------|--------|---------|
| CPU > 80% لمدة 5 دقائق | Next.js | زيادة replicas |
| Queue depth > 100 | Conversion Worker | زيادة worker concurrency |
| MinIO storage > 80% | Storage | إضافة disks/nodes |
| PostgreSQL connections > 80% | Database | إضافة PgBouncer + read replicas |

---

## تحديثات V4.1 — العلامة التجارية وDocker-First وSpec Kit

> **الإصدار:** 4.1.0  
> **آخر تحديث:** 2026-03-05  
> **الملخص:** يحدّث هذا القسم المستند التقني ليعكس تغييرات V4.1 في العلامة التجارية، وفلسفة Docker-First، وسير عمل Spec Kit، وسير عمل Impeccable Design، وخط أنابيب الأصول، وخيارات الاستضافة، وقرارات العمارة الجديدة (ADRs).

### V4.1.1 تكامل العلامة التجارية (Brand Integration)

تم تحديد الهوية البصرية الرسمية للمنصة في V4.1 كالتالي:

| العنصر | القيمة V4.1 | ملاحظات |
|--------|-------------|---------|
| **اللون الأساسي (Primary)** | `#16A34A` (Green-600) | اللون الرسمي — **ليس** `#10B981` (Emerald) ولا أي درجة Emerald أخرى |
| **لون التراث (Heritage Accent)** | `#CA8A04` (Yellow-700) | لون ثانوي يُستخدم للعناصر التراثية والعلامات المميزة |
| **الخط العربي الأساسي** | **Cairo** | الخط الرسمي — **ليس** Inter ولا IBM Plex Sans Arabic |
| **الخط اللاتيني** | Inter | للنصوص الإنجليزية والأكواد |

> **تحذير مهم**: استخدام `#10B981` أو أي لون من عائلة Emerald كلون أساسي يُعتبر خطأً في العلامة التجارية. كذلك استخدام IBM Plex Sans Arabic كخط عربي أساسي لم يعد معتمداً.

**التطبيق التقني:**

```css
/* tailwind.config.ts — V4.1 */
:root {
  --color-primary: #16A34A;       /* Green-600 — اللون الأساسي الرسمي */
  --color-heritage: #CA8A04;      /* Yellow-700 — لون التراث */
  --font-arabic: 'Cairo', sans-serif;
  --font-latin: 'Inter', sans-serif;
}
```

```json
// PWA manifest — V4.1
{
  "theme_color": "#16A34A",
  "background_color": "#f8fafc"
}
```

### V4.1.2 Docker-First

اعتباراً من V4.1، جميع الخدمات تعمل داخل حاويات Docker في التطوير والإنتاج:

- **التطوير**: Docker Compose مع `compose.yaml` + `compose.dev.yaml`
- **الإنتاج**: نشر حاويات مع Caddy كوكيل عكسي (reverse proxy)
- **فصل Worker**: ملف `Dockerfile.worker` مستقل لعمال BullMQ
- **Caddy محلياً**: حاوية اختيارية في التطوير لتكافؤ البيئات
- **Mailpit**: حاوية اختيارية لاختبار البريد الإلكتروني

أنظر `10_DEVOPS_DEPLOYMENT.md` — قسم تحديثات V4.1 للتفاصيل الكاملة.

### V4.1.3 سير عمل Spec Kit

تم اعتماد نموذج **التطوير المبني على المواصفات (Spec-Driven Development)** في V4.1:

- **لا كتابة كود قبل المواصفة**: كل ميزة تبدأ بمواصفة (spec) تُراجع وتُعتمد
- **مصطلح المراحل (Phases)** بدلاً من Sprint: يُستخدم مصطلح "Phase" للتخطيط بدلاً من "Sprint"
- **المرجع**: أنظر `31_SPEC_KIT_WORKFLOW.md` لسير العمل الكامل

**دورة حياة الميزة:**

```
مواصفة (Spec) → مراجعة → اعتماد → تنفيذ → اختبار → نشر
     ↑                                              |
     └────────── تغذية راجعة ◄─────────────────────┘
```

### V4.1.4 سير عمل Impeccable Design

تم اعتماد سير عمل **Impeccable Design** في V4.1 لضمان جودة واجهة المستخدم:

1. **توليد واجهة مدعوم بالذكاء الاصطناعي**: استخدام أدوات AI لتوليد مسودات أولية للواجهة
2. **مراجعة جودة Impeccable**: مراجعة بشرية دقيقة لكل عنصر واجهة وفق معايير Impeccable
3. **المرجع**: أنظر `32_IMPECCABLE_DESIGN_WORKFLOW.md` لسير العمل الكامل ومعايير الجودة

### V4.1.5 خط أنابيب الأصول (Asset Pipeline)

تم اعتماد خط أنابيب مُهيكل لإدارة الأصول المرئية في V4.1:

- **الشعار (Logo)**: إصدارات متعددة (SVG، PNG بأحجام مختلفة، maskable)
- **الأيقونات**: مجموعة أيقونات موحدة بأساليب محددة
- **الخطوط**: Cairo (عربي) + Inter (لاتيني) مع استراتيجية تحميل محسّنة
- **المرجع**: أنظر `33_ASSET_PIPELINE.md` للتنسيقات والأحجام المطلوبة

### V4.1.6 خيارات الاستضافة

تم إجراء تحليل شامل لخيارات الاستضافة في V4.1 بمبدأ **المجاني أولاً (Free-First)**:

- تحليل مقارن لمزودي الاستضافة مع التركيز على الطبقات المجانية
- تقييم VPS مقابل Platform-as-a-Service مقابل الحاويات المدارة
- **المرجع**: أنظر `30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` للتحليل الكامل

### V4.1.7 قرارات العمارة الجديدة (ADRs)

تم تسجيل قرارات العمارة التالية في V4.1:

| ADR | العنوان | الملخص |
|-----|---------|--------|
| **ADR-018** | خيارات الاستضافة | تحليل شامل لخيارات الاستضافة بمبدأ free-first |
| **ADR-019** | Docker-First | اعتماد Docker كأساس لجميع البيئات مع اصطلاحات ملفات Compose الجديدة |
| **ADR-020** | Spec Kit Workflow | اعتماد التطوير المبني على المواصفات مع مصطلح Phase بدلاً من Sprint |
| **ADR-021** | Impeccable Design | اعتماد سير عمل Impeccable Design لضمان جودة الواجهة |
