# المواصفة الشاملة لمشروع Ibn Al-Azhar Docs

## شامل لكل قرارات المشروع — الهندسة، البنية، الأمان، سير العمل، والعلامة التجارية

> **الإصدار:** v4.1.0 (بناءً على توثيق 2026-03-05/06)
> **الحالة:** Phase 0 — توثيق وتخطيط
> **عدد الملفات المصدر:** 100+ ملف (21 ADR، 30+ وثيقة، إعدادات، تقارير)
> **آخر تحديث:** 2026-05-24

---

# المحتويات

1. نظرة عامة عن المشروع
2. النطاق وخطة المراحل (MVP Scope & Phase Plan)
3. المكدس التقني (Technical Stack)
4. الهندسة المعمارية والنظام (Architecture & System Design)
5. قاعدة البيانات (Database Schema)
6. المصادقة والتفويض (Authentication & Authorization)
7. خط معالجة المستندات (Document Processing Pipeline)
8. استراتيجية التخزين (Storage Strategy)
9. نظام تصميم الواجهات والعلامة التجارية (UI Design System & Brand Identity)
10. إرشادات العربية و RTL
11. الأمان والخصوصية (Security & Privacy)
12. الـ DevOps والنشر (DevOps & Deployment)
13. استراتيجية الاختبارات (Testing Strategy)
14. سير عمل التطوير الموجّه بالمواصفات (Spec-Driven Development Workflow)
15. نظام تشغيل الوكلاء الذكيين (AI Agent Operating System)
16. الحوكمة وسجل القرارات (Governance & Decision Log)
17. الملحق (Appendix)

---

# 1. نظرة عامة عن المشروع

> **الملف المصدر:** `docs/00_PROJECT_BRIEF.md`

## 1.1 الرؤية (Vision)

منصة رقمية مفتوحة المصدر (Open Source) تهدف إلى أرشفة ونشر التراث الإسلامي والعربي. الاسم "Ibn Al-Azhar Docs" (ابن الأزهر دوكس) مستوحى من جامع الأزهر الشريف بالقاهرة، أحد أقدم وأهم مراكز العلم في العالم الإسلامي.

**الشعار:** "في بيت كل طالب أزهري"
**الهدف:** جعل الوصول إلى النصوص الإسلامية متاحاً لكل طالب علم، أينما كان.

**الفكرة الأساسية:** بديل مجاني ومفتوح المصدر للمنصات التجارية مع تركيز على:

- دعم اللغة العربية بشكل أصيل (وليس كإضافة)
- OCR عالي الجودة للنصوص العربية والمخطوطات
- البحث في النصوص المستخرجة
- التصدير بصيغ متعددة
- المشاركة الآمنة

## 1.2 الأهداف الاستراتيجية (Strategic Goals)

| الهدف                          | الأولوية | المقياس                               |
| ------------------------------ | -------- | ------------------------------------- |
| أرشفة آمنة للمستندات الإسلامية | P0       | رفع، تخزين، استرجاع موثوق             |
| OCR عربي عالي الجودة           | P0       | دقة ≥95% للنصوص المطبوعة              |
| محرك بحث عربي                  | P1       | دعم الجذور والتشكيل                   |
| تصدير متعدد الصيغ              | P1       | TXT, DOCX, PDF, JSON                  |
| مشاركة آمنة                    | P1       | روابط مؤقتة مع صلاحيات                |
| دعم متعدد المستخدمين           | P2       | 3 أدوار (Student, Teacher, Admin)     |
| PWA مع Offline Support         | P2       | قراءة المستندات دون اتصال             |
| تعدد اللغات                    | P3       | العربية، الإنجليزية، Swahili، الأردية |

## 1.3 القيم الأساسية (Core Values)

| القيمة                       | المصدر                            | الشرح                                                         |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------- |
| **Spec-first**               | `.specify/memory/constitution.md` | المواصفة قبل الكود. لا يُكتب كود بدون مواصفة معتمدة           |
| **Phase-foundation**         | `ADR-020`, `ADR-021`              | العمل منظم في Phases وليس Sprints. كل Phase تبني على ما قبلها |
| **Arabic-first**             | `ADR-011`                         | العربية هي اللغة الأساسية. RTL هو الاتجاه الافتراضي           |
| **Docker-first**             | `ADR-015`                         | كل شيء يعمل في Docker. لا تثبيت محلي للخدمات                  |
| **Separation of Concerns**   | `ADR-004`                         | Conversion ≠ Export. Hosting للإنتاج ≠ Hosting للنموذج الأولي |
| **Quality Gates**            | `docs/25_GO_NO_GO_REVIEW.md`      | مراجعات أمنية، RTL، العلامة التجارية قبل الدمج                |
| **Free-first**               | `docs/30_HOSTING.md`              | لا وعود "مجاني للأبد". استضافة ذاتية بتكلفة ~$6/شهر           |
| **Small Changes**            | `RUNTIME_MANIFESTO.md`            | تغييرات صغيرة قابلة للمراجعة أفضل من إعادة الكتابة            |
| **No Fake Status**           | `RUNTIME_MANIFESTO.md`            | لا حالات مزيفة — تحقق قبل الإدعاء                             |
| **Security Is Not Optional** | `ADR-010`                         | كل ميزة تُراجع أمنياً قبل الشحن                               |

## 1.4 الجمهور المستهدف (Target Audience)

**المستخدم الأساسي:** طالب العلم الشرعي، الباحث الأكاديمي، الداعية
**المستخدم الثانوي:** المشرف على المكتبة الرقمية، المؤسسة التعليمية
**المناطق:** العالم العربي، أفريقيا (Swahili)، جنوب آسيا (الأردية)

## 1.5 حالة المشروع الحالية

| البند                   | القيمة                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **المرحلة الحالية**     | Phase 0 (Documentation & Planning)                                                                                                  |
| **عدد ADRs**            | 21 (جميعها معتمدة)                                                                                                                  |
| **عدد وثائق docs/**     | 34+ ملفاً                                                                                                                           |
| **عدد تقارير المراجعة** | 20 تقريراً في `docs/_reports/`                                                                                                      |
| **ملفات الإعدادات**     | package.json, docker-compose.dev.yml, prisma/schema.prisma, .env.example, pnpm-workspace.yaml, tsconfig.base.json, vitest.config.ts |
| **الهيكل التنظيمي**     | 8 وكلاء AI، 6 مهارات، 10 أوامر مخصصة                                                                                                |
| **نظام الحوكمة**        | 9 ملفات (3 غير فارغة، 6 فارغة — بحاجة لقرار)                                                                                        |
| **جاهزية البدء**        | CONDITIONAL GO — الشروط تم تلبيتها                                                                                                  |

## 1.6 الجهات الفاعلة (Actors)

| الفاعل                      | الدور              | المهام                           |
| --------------------------- | ------------------ | -------------------------------- |
| **Architect Agent**         | القرارات المعمارية | كتابة ADRs، مراجعة Phase Gates   |
| **Spec-guardian Agent**     | المواصفات          | مراجعة المواصفات، منع زحف النطاق |
| **QA-lead Agent**           | الجودة             | خطة الاختبارات، التغطية          |
| **Security-reviewer Agent** | الأمان             | مراجعة أمنية للملفات الحساسة     |
| **RTL-auditor Agent**       | RTL والعربية       | التحقق من الامتثال لـ RTL        |
| **Frontend-polish Agent**   | التصميم            | العلامة التجارية وجودة التصميم   |
| **Docs-sync Agent**         | الوثائق            | تزامن الوثائق مع التغييرات       |
| **Docker-auditor Agent**    | Docker             | مراجعة تكوين Docker              |
| **Human Engineer**          | الموافقة النهائية  | مراجعة بشرية قبل الدمج           |

---

# 2. النطاق وخطة المراحل (MVP Scope & Phase Plan)

> **الملفات المصدر:**
> `docs/13_PHASE_1_PLAN.md`, `docs/26_PHASE_1_EXECUTION_CHECKLIST.md`, `docs/25_GO_NO_GO_REVIEW.md`, `docs/27_MVP_SCOPE_LOCK.md`, `ADR-020`, `ADR-021`

## 2.1 Terminology: Phase ≠ Sprint

المشروع يستخدم مصطلح **Phase** بدلاً من **Sprint** للأسباب التالية:

1. **التركيز على الاكتمال الوظيفي** — Phase تنتهي عندما يكتمل نطاقها
2. **الطبيعة التراكمية** — كل Phase تبني على ما قبلها
3. **GitHub Spec Kit** يستخدم Phase terminology

**خريطة التحويل:**

| القديم (ملغي) | الجديد (معتمد) |
| ------------- | -------------- |
| Sprint 0      | Phase 0        |
| Sprint 1      | Phase 1        |
| Sprint 2      | Phase 2        |
| Sprint 3      | Phase 3        |

## 2.2 بنية المراحل والبوابات (Phase Gates)

```
Phase 0 ──[Gate]──→ Phase 1 ──[Gate]──→ Phase 2 ──[Gate]──→ Phase 3
   │                    │                    │                    │
   │ توثيق              │ Core MVP            │ Auth & Sharing     │ Polish & Scale
   │ تخطيط              │ Foundation          │                    │
```

| Phase | النطاق                              | معايير العبور                                   |
| ----- | ----------------------------------- | ----------------------------------------------- |
| **0** | توثيق وتخطيط                        | جميع ADRs مكتملة، المواصفات معتمدة، infra جاهزة |
| **1** | Core MVP (Foundation Stabilization) | رفع المستندات، OCR، بحث، تصدير                  |
| **2** | Auth & Sharing                      | مصادقة، مشاركة عامة، فرق                        |
| **3** | Polish & Scale                      | أداء، i18n، جاهزية إنتاجية                      |

## 2.3 نطاق Phase 1 بالتفصيل

### مدرج في Phase 1:

| المجال                 | العناصر                                                                       | الأولوية |
| ---------------------- | ----------------------------------------------------------------------------- | -------- |
| **Repository Setup**   | Monorepo (pnpm workspace), Git hooks, CI/CD (GitHub Actions), README, LICENSE | P0       |
| **Next.js Foundation** | Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, shadcn/ui          | P0       |
| **Brand & Design**     | Cairo font, brand tokens (CSS variables), RTL/i18n (next-intl), app shell     | P0       |
| **Docker Stack**       | Docker Compose (PostgreSQL 16, Redis 7, MinIO), health checks, Caddy          | P0       |
| **Worker Skeleton**    | BullMQ worker queue, SSE notifications, basic processing pipeline             | P1       |
| **Prisma Setup**       | Schema, migrations, seed data                                                 | P0       |
| **Auth Skeleton**      | NextAuth.js v5, JWT strategy, login page, session management                  | P0       |
| **CI Baseline**        | GitHub Actions (lint, typecheck, test, build)                                 | P0       |
| **Vitest Unit Tests**  | إطار اختبارات الوحدة الجاهز                                                   | P1       |
| **Playwright E2E**     | إطار اختبارات E2E مع دعم RTL                                                  | P1       |

### مستبعد من Phase 1:

| الميزة                | مؤجلة لـ | السبب                              |
| --------------------- | -------- | ---------------------------------- |
| Full OCR Pipeline     | Phase 2  | يحتاج Google API Integration (Q08) |
| Full Upload Pipeline  | Phase 2  | يحتاج واجهة upload كاملة           |
| Production Deployment | Phase 3  | يحتاج قرار استضافة نهائي           |
| Admin Panel           | Phase 2+ | ليس ضرورياً لـ MVP                 |
| Public Sharing        | Phase 2  | يحتاج نموذج صلاحيات كامل           |
| Advanced Search       | Phase 2  | يحتاج Elasticsearch                |
| Full Offline Access   | Phase 3  | PWA متقدم                          |
| Enterprise Features   | غير محدد | خارج النطاق الحالي                 |

## 2.4 نتائج مراجعة GO/NO-GO

حسب `docs/25_GO_NO_GO_REVIEW.md`:

**Product Readiness:** ✅ — PRD واضح، MVP scope مقفول، Roadmap متوافق
**Design Readiness:** ✅ — UI Design System واضح، Brand tokens محددة، RTL behaviour موصوف
**Engineering Readiness:** ⚠️ CONDITIONAL — تم حل شرط env variables
**Security Readiness:** ✅ — Threat model موجود، Auth secure، Upload secure
**QA Readiness:** ⚠️ CONDITIONAL — Monitoring و penetration testing بحاجة لـ GA
**DevOps Readiness:** ⚠️ CONDITIONAL — تم حل شرط env variables
**Spec Kit Readiness:** ⚠️ — Specs folder structure بحاجة للإنشاء
**Hosting Readiness:** ⚠️ — قرار الاستضافة النهائي pending

### الخلاصة: CONDITIONAL GO

الشروط التي تم تلبيتها:

- ✅ إنشاء `.env.example` موحد
- ✅ تصحيح الخطأ المطبعي "مغلقل" → "مغلَق" (في `docs/25_GO_NO_GO_REVIEW.md`)
- ✅ توثيق قرار الاستضافة المؤقت (Hetzner ~$6/شهر)

الشروط المتبقية:

- ❌ إنشاء مجلد `specs/` مع مجلدات الميزات الأولية
- ❌ قرار الاستضافة النهائي للإنتاج

---

# 3. المكدس التقني (Technical Stack)

> **الملفات المصدر:** `package.json`, `docker-compose.dev.yml`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, `ADR-002`, `ADR-003`, `ADR-005`, `ADR-006`, `ADR-014`

## 3.1 الجدول الكامل

### Frontend

| التقنية       | الإصدار           | الغرض                      | ADR     |
| ------------- | ----------------- | -------------------------- | ------- |
| Next.js       | 16.x (App Router) | Full-stack React framework | ADR-002 |
| React         | 19.x              | UI library                 | —       |
| TypeScript    | 5.9.x (strict)    | Type safety                | —       |
| Tailwind CSS  | v4                | Utility-first CSS          | ADR-014 |
| shadcn/ui     | —                 | مكونات Radix UI            | ADR-014 |
| next-intl     | —                 | i18n (عربية كلغة أساسية)   | ADR-011 |
| @serwist/next | —                 | PWA Service Worker         | ADR-008 |

### Backend & Data

| التقنية     | الإصدار     | الغرض                 | ADR     |
| ----------- | ----------- | --------------------- | ------- |
| Prisma      | 6.x         | ORM                   | ADR-003 |
| PostgreSQL  | 16 (Alpine) | قاعدة البيانات        | —       |
| Redis       | 7 (Alpine)  | Cache, Session, Queue | ADR-006 |
| MinIO       | latest (S3) | Object storage        | ADR-005 |
| BullMQ      | —           | Queue management      | ADR-006 |
| NextAuth.js | v5          | Authentication        | ADR-009 |
| Zod         | —           | Input validation      | ADR-010 |

### Infrastructure

| التقنية        | الإصدار | الغرض                   |
| -------------- | ------- | ----------------------- |
| pnpm           | 10.33.4 | Package manager         |
| Node.js        | 22.x    | Runtime                 |
| Docker Compose | —       | Container orchestration |
| Caddy          | 2       | Reverse proxy + TLS     |
| GitHub Actions | —       | CI/CD                   |

### Testing

| التقنية    | الإصدار | الغرض                  | ADR     |
| ---------- | ------- | ---------------------- | ------- |
| Vitest     | —       | Unit/Integration tests | ADR-019 |
| Playwright | —       | E2E tests              | ADR-019 |

### Fonts

| الخط      | الأوزان | الاستخدام       | اللغات                      |
| --------- | ------- | --------------- | --------------------------- |
| Cairo     | 300-900 | النصوص الأساسية | العربية، الفارسية           |
| Noto Sans | 400-700 | النصوص الثانوية | اللاتينية، Swahili، الأردية |

## 3.2 حدود الاعتماد (Dependency Boundaries)

```
apps/     → packages/     ← (يمكنها استخدام packages/)
packages/ → (لا شيء)      ← (لا يمكنها استخدام apps/ أو workers/)
workers/  → packages/     ← (يمكنها استخدام packages/)
```

## 3.3 إعدادات TypeScript الأساسية

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## 3.4 الخدمات في Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    healthcheck: { test: ["CMD-SHELL", "pg_isready"], interval: "5s", timeout: "5s", retries: 5 }

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: "5s", timeout: "5s", retries: 5 }

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
    healthcheck:
      {
        test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"],
        interval: "5s",
        timeout: "5s",
        retries: 5,
      }
```

## 3.5 هيكل PnPM Workspace

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "workers/*"
```

## 3.6 أوامر pnpm

| الأمر              | الوظيفة              |
| ------------------ | -------------------- |
| `pnpm install`     | تثبيت الاعتماديات    |
| `pnpm dev`         | تشغيل خادم التطوير   |
| `pnpm build`       | بناء                 |
| `pnpm lint`        | تشغيل ESLint         |
| `pnpm typecheck`   | التحقق من TypeScript |
| `pnpm test`        | تشغيل Vitest         |
| `pnpm test:e2e`    | تشغيل Playwright     |
| `pnpm docker:up`   | بدء Docker           |
| `pnpm docker:down` | إيقاف Docker         |
| `pnpm db:generate` | توليد Prisma Client  |
| `pnpm db:migrate`  | تشغيل الترحيلات      |
| `pnpm db:studio`   | فتح Prisma Studio    |

---

# 4. الهندسة المعمارية والنظام (Architecture & System Design)

> **الملفات المصدر:** `docs/05_TECHNICAL_DESIGN.md`, `ADR-001`, `ADR-004`, `ADR-007`, `ADR-008`, `ADR-016`

## 4.1 هيكل المستودع الكامل

```
ibn-al-azhar-docs/
├── apps/web/                    # Next.js 16 App Router
│   ├── src/app/                 # صفحات App Router
│   ├── src/components/          # مكونات UI
│   ├── src/lib/                 # دوال مساعدة
│   ├── src/i18n/                # ترجمة (ar, en)
│   ├── src/styles/              # CSS عام
│   ├── public/icons/            # أيقونات PWA
│   └── tests/                   # اختبارات Playwright
├── packages/
│   ├── db/                      # Prisma schema + client
│   ├── shared/                  # أنواع مشتركة + Zod schemas
│   └── utils/                   # دوال مساعدة بحتة
├── workers/
│   ├── converter/               # OCR + استخراج نص
│   └── exporter/                # تصدير (TXT/DOCX/PDF/JSON)
├── docker/
│   ├── dev/                     # Docker Compose للتطوير
│   └── prod/                    # Docker Compose للإنتاج + Caddyfile
├── docs/                        # التوثيق
│   ├── ADR/                     # 21 ADR
│   └── _reports/                # 20 تقرير مراجعة
├── specs/                       # مواصفات الميزات
├── governance/                  # الحوكمة
├── .opencode/                   # OpenCode AI Runtime
├── .specify/                    # GitHub Spec Kit
└── .github/workflows/           # CI/CD
```

## 4.2 تدفق البيانات الأساسي

```
رفع المستند → MinIO → BullMQ → Worker (OCR) → PostgreSQL → إشعار SSE → UI → طلب تصدير → Worker → تنزيل
```

### خطوات مفصلة:

1. **رفع**: مستخدم يرفع ملف → يُخزّن في MinIO + سجل في PostgreSQL → إضافة مهمة لـ BullMQ
2. **تحويل**: Worker يقرأ الملف من MinIO → OCR → تخزين النص في PostgreSQL → إشعار SSE
3. **بحث**: مستخدم يبحث في النصوص المستخرجة
4. **تصدير**: مستخدم يطلب تصدير → Worker يقرأ النص → يولد TXT/DOCX/PDF/JSON → يُخزّن في MinIO → رابط تحميل
5. **مشاركة**: رابط مؤقت (64 hex chars، expiry, max downloads)

## 4.3 الفصل بين Conversion و Export (مبدأ أساسي ADR-004)

**Conversion ≠ Export**

| العملية        | المدخلات               | المخرجات                                |
| -------------- | ---------------------- | --------------------------------------- |
| **Conversion** | ملف خام (PDF/DOCX/صور) | نص موحد (canonical text) + بيانات وصفية |
| **Export**     | نص موحد + تنسيق        | TXT / DOCX / PDF / JSON                 |

الفوائد: إعادة استخدام OCR، إضافة صيغ بسهولة، اختبار مستقل، توسيع أفقي منفصل.

## 4.4 نظام الإشعارات الفورية (SSE) — ADR-007

Worker (BullMQ) → Redis Pub/Sub → Next.js API Route (SSE) → Browser (EventSource)

أنواع الأحداث:

- `conversion.started` — بدء التحويل
- `conversion.progress` — تقدم التحويل (percent)
- `conversion.completed` — اكتمل التحويل
- `conversion.failed` — فشل التحويل
- `export.started` / `export.progress` / `export.completed` / `export.failed`

**لماذا SSE بدلاً من WebSocket:** SSE يكفي للإشعارات أحادية الاتجاه، أبسط، إعادة اتصال تلقائية.

## 4.5 استراتيجية PWA — ADR-008

| Asset                   | الإستراتيجية           |
| ----------------------- | ---------------------- |
| App Shell (HTML/CSS/JS) | Cache First            |
| API Calls               | Network First          |
| Document Thumbnails     | Stale While Revalidate |
| User Preferences        | Cache First            |
| Documents (للقراءة)     | Network Only           |
| Font Files (Cairo)      | Cache First            |

أيقونات PWA: 192×192 و 512×512 PNG (مع maskable variants)

## 4.6 OCR — معالجة الخط العربي

| المحرك                | الدور         | الجودة              | التكلفة       |
| --------------------- | ------------- | ------------------- | ------------- |
| **Google Vision API** | MVP (Phase 2) | ممتازة (⭐⭐⭐⭐⭐) | Pay-as-you-go |
| **Tesseract.js**      | V2 (مستقبلي)  | متوسطة (⭐⭐⭐)     | مجاني         |

**ملاحظة خصوصية:** Google API يرسل المستندات لخوادم Google. مطلوب إفصاح للمستخدم. الهدف النهائي Tesseract.js محلي.

---

# 5. قاعدة البيانات (Database Schema)

> **الملفات المصدر:** `prisma/schema.prisma`, `docs/07_DATABASE_SCHEMA.md`

## 5.1 النماذج (Models)

### User

| الحقل                | النوع                            | وصف               |
| -------------------- | -------------------------------- | ----------------- |
| id                   | String (UUID)                    | المعرف الفريد     |
| name                 | String?                          | الاسم             |
| email                | String (unique)                  | البريد الإلكتروني |
| emailVerified        | DateTime?                        | تاريخ التحقق      |
| image                | String?                          | الصورة الشخصية    |
| role                 | UserRole (STUDENT/TEACHER/ADMIN) | الدور             |
| storageLimit         | BigInt (1GB افتراضي)             | حد التخزين        |
| dailyConversionLimit | Int (20)                         | حد التحويل اليومي |
| createdAt/updatedAt  | DateTime                         | التواريخ          |

### Account (NextAuth.js)

| الحقل                      | النوع     | وصف               |
| -------------------------- | --------- | ----------------- |
| id                         | String    | المعرف            |
| userId                     | FK → User | رابط المستخدم     |
| type                       | String    | نوع الحساب        |
| provider                   | String    | المزود            |
| providerAccountId          | String    | المعرف عند المزود |
| refresh_token/access_token | String?   | الرموز            |

### Session (NextAuth.js)

| الحقل        | النوع           | وصف                 |
| ------------ | --------------- | ------------------- |
| id           | String          | المعرف              |
| sessionToken | String (unique) | رمز الجلسة          |
| userId       | FK → User       | رابط المستخدم       |
| expires      | DateTime        | تاريخ انتهاء الجلسة |

### Document

| الحقل               | النوع                                              | وصف                 |
| ------------------- | -------------------------------------------------- | ------------------- |
| id                  | String (UUID)                                      | المعرف              |
| title               | String                                             | عنوان المستند       |
| description         | String?                                            | الوصف               |
| fileName            | String                                             | اسم الملف الأصلي    |
| mimeType            | String                                             | نوع MIME            |
| fileSize            | Int                                                | الحجم (بايت)        |
| storagePath         | String                                             | المسار في MinIO     |
| thumbnailPath       | String?                                            | مسار الصورة المصغرة |
| checksum            | String                                             | SHA-256             |
| status              | DocumentStatus (UPLOADING/PROCESSING/READY/FAILED) | الحالة              |
| ocrStatus           | OcrStatus (PENDING/PROCESSING/DONE/FAILED/SKIPPED) | حالة OCR            |
| ocrEngine           | String?                                            | المحرك المستخدم     |
| ocrConfidence       | Float?                                             | نسبة الثقة          |
| extractedText       | String? (Text)                                     | النص المستخرج       |
| pageCount           | Int?                                               | عدد الصفحات         |
| language            | String?                                            | اللغة (ISO 639-1)   |
| ownerId             | FK → User                                          | المالك              |
| folderId            | FK → Folder?                                       | المجلد              |
| isDeleted           | Boolean (false)                                    | Soft delete         |
| deletedAt           | DateTime?                                          | تاريخ الحذف         |
| createdAt/updatedAt | DateTime                                           | التواريخ            |

**الفهارس:** ownerId, folderId, status, isDeleted

### Folder

| الحقل               | النوع               | وصف         |
| ------------------- | ------------------- | ----------- |
| id                  | String              | المعرف      |
| name                | String              | الاسم       |
| description         | String?             | الوصف       |
| parentId            | FK → Folder? (self) | المجلد الأب |
| ownerId             | FK → User           | المالك      |
| isDeleted           | Boolean             | Soft delete |
| createdAt/updatedAt | DateTime            | التواريخ    |

### Tag

| الحقل     | النوع     | وصف     |
| --------- | --------- | ------- |
| id        | String    | المعرف  |
| name      | String    | الاسم   |
| ownerId   | FK → User | المالك  |
| createdAt | DateTime  | التاريخ |

**Unique constraint:** [name, ownerId]

### DocumentTag (M:N)

| الحقل      | النوع         | وصف     |
| ---------- | ------------- | ------- |
| documentId | FK → Document | المستند |
| tagId      | FK → Tag      | الوسم   |

### ConversionJob

| الحقل                 | النوع                                      | وصف      |
| --------------------- | ------------------------------------------ | -------- |
| id                    | String                                     | المعرف   |
| documentId            | FK → Document                              | المستند  |
| status                | JobStatus (PENDING/PROCESSING/DONE/FAILED) | الحالة   |
| jobType               | ConversionType (OCR/TEXT_EXTRACTION)       | النوع    |
| progress              | Int (0-100)                                | التقدم   |
| errorMessage          | String?                                    | الخطأ    |
| startedAt/completedAt | DateTime?                                  | التواريخ |
| createdAt             | DateTime                                   | التاريخ  |

### Export

| الحقل        | النوع                            | وصف             |
| ------------ | -------------------------------- | --------------- |
| id           | String                           | المعرف          |
| documentId   | FK → Document                    | المستند         |
| format       | ExportFormat (TXT/DOCX/PDF/JSON) | الصيغة          |
| status       | JobStatus                        | الحالة          |
| storagePath  | String?                          | المسار في MinIO |
| fileSize     | Int?                             | الحجم           |
| errorMessage | String?                          | الخطأ           |
| createdAt    | DateTime                         | التاريخ         |

### ShareLink

| الحقل         | النوع                         | وصف            |
| ------------- | ----------------------------- | -------------- |
| id            | String                        | المعرف         |
| token         | String (unique, 64 hex chars) | رمز المشاركة   |
| documentId    | FK → Document                 | المستند        |
| createdById   | FK → User                     | المنشئ         |
| expiresAt     | DateTime?                     | تاريخ الانتهاء |
| maxDownloads  | Int?                          | الحد الأقصى    |
| downloadCount | Int (0)                       | عدد التحميلات  |
| isRevoked     | Boolean (false)               | ملغي؟          |
| createdAt     | DateTime                      | التاريخ        |

### ConversionLog

| الحقل     | النوع                      | وصف     |
| --------- | -------------------------- | ------- |
| id        | String                     | المعرف  |
| jobId     | FK → ConversionJob         | المهمة  |
| level     | LogLevel (INFO/WARN/ERROR) | المستوى |
| message   | String (Text)              | الرسالة |
| createdAt | DateTime                   | التاريخ |

### UserSetting

| الحقل                | النوع              | وصف               |
| -------------------- | ------------------ | ----------------- |
| id                   | String             | المعرف            |
| userId               | FK → User (unique) | المستخدم          |
| theme                | String (system)    | السمة             |
| language             | String (ar)        | اللغة             |
| notificationsEnabled | Boolean (true)     | الإشعارات         |
| defaultExportFormat  | ExportFormat (TXT) | الصيغة الافتراضية |
| createdAt/updatedAt  | DateTime           | التواريخ          |

## 5.2 Soft Delete Policy

- Document و Folder: `isDeleted: Boolean` + `deletedAt: DateTime?`
- الاستعلامات تستبعد: `WHERE isDeleted = false`
- فترة الاحتفاظ: **30 يوماً** بعد الحذف
- بعد 30 يوماً: Hard Delete تلقائي (cron job)

---

# 6. المصادقة والتفويض (Authentication & Authorization)

> **الملفات المصدر:** `ADR-009`, `ADR-018`

## 6.1 NextAuth.js v5 مع JWT

```typescript
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;
        const isValid = await verifyPassword(parsed.data.password, user.hashedPassword);
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  jwt: { maxAge: 24 * 60 * 60, updateAge: 4 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: { httpOnly: true, secure: true, sameSite: "lax" },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
```

## 6.2 الأدوار والصلاحيات

| الدور       | حد التخزين | حد التحويل/يوم | Upload | Delete | Share | Manage Users |
| ----------- | ---------- | -------------- | ------ | ------ | ----- | ------------ |
| **STUDENT** | 1 GB       | 20             | ✅     | ✅     | ✅    | ❌           |
| **TEACHER** | 2 GB       | 50             | ✅     | ✅     | ✅    | ❌           |
| **ADMIN**   | 10 GB      | 200            | ✅     | ✅     | ✅    | ✅           |

## 6.3 إجراءات الأمان للمصادقة

| الإجراء          | التفاصيل                                 | الحالة         |
| ---------------- | ---------------------------------------- | -------------- |
| Rate Limiting    | 5 محاولات/دقيقة لكل IP                   | مخطط           |
| Account Lockout  | 10 محاولات فاشلة → قفل 15 دقيقة          | مخطط           |
| Password Hashing | bcrypt (cost 12) أو argon2id             | مخطط (Phase 2) |
| Session Rotation | JWT يتجدد كل 4 ساعات                     | مخطط           |
| Session Cache    | Redis (key: `session:{token}`, TTL: 24h) | مخطط           |

---

# 7. خط معالجة المستندات (Document Processing Pipeline)

> **الملفات المصدر:** `ADR-004`, `ADR-006`, `ADR-007`

## 7.1 دورة حياة المستند

```
UPLOADING → PROCESSING → READY → (بحث / تصدير / مشاركة)
    ↓            ↓
  FAILED       FAILED

Soft Delete → 30 يوم → Hard Delete
```

## 7.2 الرفع (Upload)

### شروط الرفع:

- الحد الأقصى: **100MB** لكل ملف
- الأنواع المسموحة: PDF, DOCX, DOC, TXT, PNG, JPG, JPEG, TIFF, BMP
- التحقق: MIME type (white list) + File signature (magic bytes) + Size check + SHA-256 checksum

### مسار التخزين في MinIO:

```
uploads/{userId}/{documentId}/{fileName}
```

## 7.3 التحويل (Conversion)

Worker يقوم بـ:

1. قراءة الملف من MinIO
2. تحديد طريقة المعالجة حسب MIME:
   - PDF: استخراج نص + OCR للصفحات الممسوحة
   - DOCX/DOC: استخراج نص من XML
   - TXT: قراءة مباشرة
   - PNG/JPG/TIFF/BMP: OCR كامل
3. تخزين النص المستخرج في PostgreSQL
4. إرسال إشعار SSE

## 7.4 التصدير (Export)

Worker يقوم بـ:

1. قراءة النص من PostgreSQL
2. تنسيقه حسب الصيغة المطلوبة
3. تخزين النتيجة في MinIO
4. إرسال رابط التحميل

| الصيغة | المكتبة             | الحالة |
| ------ | ------------------- | ------ |
| TXT    | كتابة مباشرة        | MVP    |
| DOCX   | docx.js             | MVP    |
| PDF    | pdfkit + Cairo font | MVP    |
| JSON   | JSON.stringify      | MVP    |
| EPUB   | مؤجل                | V2     |

## 7.5 BullMQ Configuration

```typescript
const conversionQueue = new Queue("conversion", {
  connection: { host: process.env.REDIS_HOST },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  },
});
```

---

# 8. استراتيجية التخزين (Storage Strategy)

> **الملفات المصدر:** `ADR-005`, `ADR-016`

## 8.1 طبقات التخزين

| الطبقة       | التقنية    | المحتوى                 | السرعة     | المتانة     |
| ------------ | ---------- | ----------------------- | ---------- | ----------- |
| **Object**   | MinIO      | ملفات، صور، نتائج تصدير | ⭐⭐⭐     | ⭐⭐⭐⭐⭐  |
| **Database** | PostgreSQL | بيانات وصفية، حسابات    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐  |
| **Cache**    | Redis      | جلسات، رموز، BullMQ     | ⭐⭐⭐⭐⭐ | ⭐⭐        |
| **Browser**  | IndexedDB  | تفضيلات، PWA Cache      | ⭐⭐⭐     | حسب المتصفح |

## 8.2 MinIO Paths

```
uploads/{userId}/{documentId}/{fileName}        # الملفات الأصلية
thumbnails/{userId}/{documentId}/{page}.png     # الصور المصغرة
exports/{userId}/{documentId}/{format}/{file}   # نتائج التصدير
temp/                                           # ملفات مؤقتة
```

## 8.3 Redis Keys

| المفتاح                 | TTL        | الاستخدام             |
| ----------------------- | ---------- | --------------------- |
| `session:{token}`       | 24h        | جلسة المستخدم         |
| `rate-limit:{ip}:login` | 60s        | تحديد معدل الدخول     |
| `rate-limit:{ip}:api`   | 60s        | تحديد معدل API        |
| `share-link:{token}`    | حسب expiry | رابط المشاركة         |
| `bullmq:*`              | —          | BullMQ (يديره BullMQ) |

---

# 9. نظام تصميم الواجهات والعلامة التجارية (UI Design System & Brand Identity)

> **الملفات المصدر:** `docs/04_UI_DESIGN_SYSTEM.md`, `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`, `docs/33_ASSET_PIPELINE.md`, `ADR-011`, `ADR-014`

## 9.1 فلسفة التصميم

- **هادئة وأكاديمية** — مناسبة للمحتوى الإسلامي والعلمي
- **مهنية وموثوقة** — تنقل الثقة في المحتوى المؤرشف
- **واضحة ومباشرة** — لا زخرفة غير ضرورية
- **محترمة** — خاصة في التعامل مع النصوص الدينية
- **RTL-native** — ليست مجرد مرآة لـ LTR

## 9.2 لوحة الألوان

| اللون                     | HEX       | الاستخدام                | Tailwind     |
| ------------------------- | --------- | ------------------------ | ------------ |
| **Primary Green**         | `#16A34A` | أزرار، روابط، عناصر نشطة | `green-600`  |
| **Primary Green (Hover)** | `#15803D` | تحويم                    | `green-700`  |
| **Primary Green (Light)** | `#DCFCE7` | خلفية نشطة               | `green-100`  |
| **Heritage Gold**         | `#CA8A04` | أيقونات مميزة، شارات     | `yellow-600` |
| **Heritage Gold (Hover)** | `#A16207` | تحويم                    | `yellow-700` |
| **Dark Text Gray**        | `#1F2937` | نصوص أساسية              | `gray-800`   |
| **Pure White**            | `#FFFFFF` | خلفيات                   | `white`      |
| **Light Background**      | `#F9FAFB` | خلفيات أقسام             | `gray-50`    |
| **Border**                | `#E5E7EB` | حدود                     | `gray-200`   |
| **Error**                 | `#DC2626` | أخطاء                    | `red-600`    |
| **Success**               | `#16A34A` | نجاح                     | `green-600`  |
| **Warning**               | `#F59E0B` | تحذيرات                  | `amber-500`  |
| **Info**                  | `#3B82F6` | معلومات                  | `blue-500`   |

## 9.3 Design Tokens (CSS Variables)

```css
@theme {
  --color-primary: #16a34a;
  --color-primary-hover: #15803d;
  --color-primary-light: #dcfce7;
  --color-gold: #ca8a04;
  --color-gold-hover: #a16207;
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-border: #e5e7eb;
  --color-error: #dc2626;
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
  --font-cairo: "Cairo", sans-serif;
  --font-noto: "Noto Sans", sans-serif;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

## 9.4 نظام الخطوط (Typography)

### تثبيت الخطوط:

```typescript
import { Cairo, Noto_Sans } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});
```

### مقياس الخطوط:

| المستوى | Desktop         | Mobile          | الوزن |
| ------- | --------------- | --------------- | ----- |
| Display | 3rem (48px)     | 2rem (32px)     | 800   |
| H1      | 2.5rem (40px)   | 1.875rem (30px) | 700   |
| H2      | 2rem (32px)     | 1.5rem (24px)   | 600   |
| H3      | 1.5rem (24px)   | 1.25rem (20px)  | 600   |
| H4      | 1.25rem (20px)  | 1.125rem (18px) | 500   |
| Body    | 1rem (16px)     | 0.938rem (15px) | 400   |
| Small   | 0.875rem (14px) | 0.813rem (13px) | 400   |
| Caption | 0.75rem (12px)  | 0.75rem (12px)  | 400   |

## 9.5 الشعار (Logo)

- **النص:** "ابن الأزهر دوكس" بالخط Cairo Bold
- **الأيقونة:** رمز الكتاب المفتوح مع شمس/هلال
- **الألوان:** Primary Green + White
- **المساحة الآمنة:** 16px حول الشعار
- **ممنوع:** تغيير اللون، إضافة ظل، تشويه النسب

## 9.6 حالات UI لكل مكون

| الحالة             | المظهر               | الإجراء      |
| ------------------ | -------------------- | ------------ |
| **Default**        | العرض العادي         | —            |
| **Hover**          | تغيير اللون/الخلفية  | —            |
| **Active/Pressed** | تعميق الظل           | —            |
| **Focus**          | حلقة تركيز (ring)    | —            |
| **Loading**        | Spinner + تعطيل      | انتظار       |
| **Disabled**       | Opacity 50%          | منع النقر    |
| **Error**          | إطار أحمر + رسالة    | إعادة محاولة |
| **Success**        | إطار أخضر + علامة صح | —            |
| **Empty**          | رسالة مناسبة + إجراء | —            |

---

# 10. إرشادات العربية و RTL

> **الملفات المصدر:** `ADR-011`, `.opencode/skills/arabic-rtl/SKILL.md`

## 10.1 المبادئ الأساسية

1. **RTL هو الاتجاه الافتراضي** — `<html dir="rtl" lang="ar">`
2. **CSS Logical Properties** — استخدام `margin-inline-start` بدلاً من `margin-left`
3. **Flex/Grid** — استخدام `gap` بدلاً من `margin-left/right`
4. **الأيقونات** — تنقلب تلقائياً أو `rtl:rotate-180`
5. **النصوص العربية** — Cairo font، محاذاة `start`
6. **اختبار RTL قبل LTR** — كل تغيير UI يُختبر RTL أولاً

## 10.2 أمثلة CSS

```css
/* ❌ خطأ */
margin-left: 1rem;
padding-right: 0.5rem;
border-left: 2px solid;
left: 0;

/* ✅ صحيح */
margin-inline-start: 1rem;
padding-inline-end: 0.5rem;
border-inline-start: 2px solid;
inset-inline-start: 0;
text-align: start;
```

## 10.3 قائمة التحقق لكل مكون UI

- [ ] `dir` مضبوط على `rtl`
- [ ] مسافات تستخدم Logical Properties
- [ ] Flex/Grid تستخدم `gap`
- [ ] `text-align: start` بدلاً من `left`
- [ ] أيقونات تنقلب في RTL
- [ ] أشرطة تمرير تعمل في RTL
- [ ] نص عربي يظهر بـ Cairo font
- [ ] حقول إدخال تبدأ من اليمين
- [ ] قوائم منسدلة في الجهة الصحيحة
- [ ] لا افتراضات `left/right` في CSS
- [ ] لا نصوص إنجليزية مفاجئة
- [ ] اختبار بمتصفح مع RTL

---

# 11. الأمان والخصوصية (Security & Privacy)

> **الملفات المصدر:** `docs/08_SECURITY_PRIVACY.md`, `SECURITY.md`, `ADR-010`, `ADR-012`, `ADR-013`

## 11.1 نموذج التهديدات (Threat Model)

| التهديد           | التأثير | الإجراء الوقائي                    |
| ----------------- | ------- | ---------------------------------- |
| XSS               | عالي    | React + CSP + ترميز المخرجات       |
| CSRF              | عالي    | NextAuth.js (double submit cookie) |
| SQL Injection     | عالي    | Prisma (parameterized queries)     |
| Broken Auth       | عالي    | JWT + HttpOnly + Rate Limiting     |
| IDOR              | عالي    | التحقق من ملكية المستند            |
| File Upload       | عالي    | MIME + Magic Bytes + 100MB limit   |
| MITM              | متوسط   | HTTPS إلزامي (Caddy TLS)           |
| Session Hijacking | عالي    | JWT + Secure cookie + Rotation     |
| DOS               | متوسط   | Rate Limiting + Size limits        |

## 11.2 إجراءات أمنية مفصلة

### HTTPS + Security Headers

```
header {
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
}
```

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
object-src 'none';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Rate Limiting

| الـ Endpoint | النافذة | الحد الأقصى |
| ------------ | ------- | ----------- |
| Login        | 1 دقيقة | 5 محاولات   |
| Register     | 1 ساعة  | 3 محاولات   |
| API عام      | 1 دقيقة | 100 طلب     |
| Upload       | 1 دقيقة | 10 طلبات    |
| Export       | 1 دقيقة | 20 طلباً    |

## 11.3 روابط المشاركة الآمنة

```typescript
function generateShareToken(): string {
  return randomBytes(32).toString("hex"); // 64 حرفاً hex = 256-bit entropy
}
```

## 11.4 قواعد أساسية

1. **لا أسرار في الملفات** — استخدم متغيرات البيئة فقط
2. **تحقق من المدخلات** — كل المدخلات تمر عبر Zod schemas
3. **أقل صلاحية** — المستخدم يرى مستنداته فقط
4. **سجل الأحداث** — كل عملية حساسة تُسجّل

---

# 12. الـ DevOps والنشر (DevOps & Deployment)

> **الملفات المصدر:** `docs/10_DEVOPS_DEPLOYMENT.md`, `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md`, `ADR-015`, `ADR-017`

## 12.1 استراتيجية الاستضافة

| المرحلة             | المنصة                     | التكلفة         |
| ------------------- | -------------------------- | --------------- |
| التطوير (Phase 0-1) | Docker Compose محلي        | $0              |
| Prototype           | Hugging Face Spaces        | ~$7/شهر         |
| MVP إنتاج           | Hetzner CX22 (2vCPU, 4GB)  | ~$6/شهر         |
| بديل مجاني          | Oracle Cloud Free Tier     | $0 (قيد التحقق) |
| بديل اقتصادي        | Contabo VPS S (4vCPU, 8GB) | ~$5/شهر         |

**القرار الحالي:** Hetzner CX22 (~$6/شهر) لـ MVP

## 12.2 Docker Compose للإنتاج

الخدمات: Caddy (reverse proxy) ← Next.js (App) ← PostgreSQL 16 + Redis 7 + MinIO

## 12.3 النسخ الاحتياطي

| المكون     | الطريقة   | التكرار | الاحتفاظ |
| ---------- | --------- | ------- | -------- |
| PostgreSQL | pg_dump   | يومي    | 7 أيام   |
| MinIO      | mc mirror | يومي    | 7 أيام   |

## 12.4 CI/CD (GitHub Actions)

```yaml
jobs:
  lint: # ESLint
  typecheck: # TypeScript strict
  test: # Vitest
  build: # Next.js build
  e2e: # Playwright (مع RTL)
```

---

# 13. استراتيجية الاختبارات (Testing Strategy)

> **الملفات المصدر:** `docs/09_QA_TEST_PLAN.md`, `vitest.config.ts`, `ADR-019`

## 13.1 هرم الاختبارات

```
        /\
       /E2E\          ← Playwright (تدفقات كاملة + RTL)
      /------\
     /Integration\    ← Vitest (API endpoints, وحدات متعددة)
    /--------------\
   /  Unit Tests    \  ← Vitest + jsdom (مكونات، دوال)
  /--------------------\
```

## 13.2 Vitest Configuration

```typescript
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/e2e/**",
        "**/docs/**",
        "**/specs/**",
      ],
    },
  },
});
```

## 13.3 التغطية المستهدفة

| المستوى          | الهدف               |
| ---------------- | ------------------- |
| Unit Tests       | ≥80%                |
| Integration      | الحالات الحرجة      |
| E2E (Playwright) | التدفقات الرئيسية   |
| RTL/Arabic       | كل مكون UI (إلزامي) |

## 13.4 مثال اختبار RTL

```typescript
test("RTL layout renders correctly", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("body")).toHaveCSS("font-family", /Cairo/);
});
```

---

# 14. سير عمل التطوير الموجّه بالمواصفات

> **الملفات المصدر:** `docs/31_SPEC_KIT_WORKFLOW.md`, `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`, `.specify/workflows/speckit/workflow.yml`, `.specify/templates/spec-template.md`, `.specify/templates/plan-template.md`, `ADR-020`

## 14.1 مبدأ Spec-First

**"لا يُكتب كود قبل قراءة المواصفة"** — مبدأ أساسي من `.specify/memory/constitution.md`

### دورة حياة الميزة:

```
1. Specify (كتابة المواصفة)
2. Review Spec (مراجعة) — Gate
3. Plan (خطة التنفيذ)
4. Review Plan (مراجعة) — Gate
5. Tasks (تقسيم المهام)
6. Implement (التنفيذ)
7. Verify (اختبارات + lint + typecheck)
8. Review (أمن، RTL، علامة تجارية) — Gate
9. Merge
```

## 14.2 هيكل مجلد المواصفات

```
specs/NNN-feature-name/
├── spec.md           # المواصفة
├── plan.md           # خطة التنفيذ
├── research.md       # البحث
├── data-model.md     # نموذج البيانات
├── quickstart.md     # دليل البدء
├── contracts/        # عقود API
└── tasks.md          # المهام
```

## 14.3 مكونات المواصفة

- **User Stories** — مرتبة حسب الأولوية (P1, P2, P3)
- **Acceptance Scenarios** — Given/When/Then
- **Edge Cases** — حالات حدية
- **Functional Requirements** — FR-001, FR-002...
- **UI States** — Empty, Loading, Error, Success
- **Success Criteria** — معايير قابلة للقياس
- **Assumptions** — افتراضات وتبعيات

## 14.4 Impeccable Design Workflow

مراجعة جودة التصميم:

| الوضع               | الاستخدام                             |
| ------------------- | ------------------------------------- |
| **Brand Mode**      | UI مباشر للمستخدم                     |
| **Product Mode**    | مكونات داخلية، Dashboards             |
| **Anti-slop Rules** | منع المحتوى العام، الواجهات المتشابهة |

**القواعد:**

1. لا واجهات متشابهة — كل شاشة لها هوية
2. لا Lorem Ipsum — كل النصوص حقيقية
3. لا حقول بلا سياق — كل حقل له تسمية
4. RTL أولاً — للعربية قبل اللاتينية
5. كل الحالات محددة — Empty, Loading, Error, Success

---

# 15. نظام تشغيل الوكلاء الذكيين (AI Agent Operating System)

> **الملفات المصدر:** `.opencode/SYSTEM.md`, `.opencode/AGENT_RULES.md`, `.opencode/BOOT_SEQUENCE.md`, `.opencode/WORKFLOW.md`, `.opencode/SESSION_RULES.md`, `.opencode/RUNTIME_MANIFESTO.md`, `.opencode/REVIEW_PIPELINE.md`, `.opencode/OPENCODE_POWERHOUSE.md`, `.opencode/PHASE_GATES.md`, `.opencode/AI_OPERATING_RULES.md`, `.specify/memory/constitution.md`

## 15.1 الـ 12 مبدأ (Runtime Manifesto)

1. **Docs Before Code** — المواصفات قبل الكود
2. **Phase Gates Are Mandatory** — بوابات المراحل إلزامية
3. **Arabic Is Default** — العربية هي اللغة الأساسية
4. **Docker Is The Environment** — Docker هو البيئة
5. **No Fake Status** — لا حالات مزيفة
6. **Small Changes Over Rewrites** — تغييرات صغيرة أفضل
7. **Security Is Not Optional** — الأمان ليس اختيارياً
8. **Design Quality Is Engineering Quality** — جودة التصميم = جودة هندسية
9. **Memory Persists Across Sessions** — الذاكرة تدوم عبر الجلسات
10. **Model Routing Is Intentional** — توجيه النماذج مقصود
11. **The Runtime Serves The Project** — الـ Runtime يخدم المشروع
12. **Reproducibility Over Convenience** — قابلية التكرار قبل الراحة

## 15.2 الوكلاء (8 Agents)

| الوكيل                | الاختصاص                  | يُنشّط لـ             |
| --------------------- | ------------------------- | --------------------- |
| **Architect**         | القرارات المعمارية، ADRs  | أي تغيير في البنية    |
| **Spec-guardian**     | المواصفات، منع زحف النطاق | أي تنفيذ جديد         |
| **QA-lead**           | خطة الاختبارات، التغطية   | أي كود جديد           |
| **Security-reviewer** | المراجعة الأمنية          | auth, upload, sharing |
| **RTL-auditor**       | RTL والعربية              | أي تغيير UI           |
| **Frontend-polish**   | العلامة التجارية          | أي تغيير UI           |
| **Docs-sync**         | تزامن الوثائق             | أي تغيير في السلوك    |
| **Docker-auditor**    | مراجعة Docker             | أي تغيير Docker       |

## 15.3 Boot Sequence

```
1. Load runtime manifest (SYSTEM.md)
2. Hydrate memory (sessions, skills)
3. Detect active phase (PHASE_GATES.md)
4. Load project context
5. Initialize model
6. Load agent roster
7. Run health checks
8. Load task classification
9. Begin execution
10. Verify and wrap
```

## 15.4 Review Pipeline

```
Spec Review → Phase Gate → Implementation → CI → CodeRabbit → Security → RTL → Brand → Human → Merge
```

## 15.5 OpenCode Powerhouse (15 ميزة)

| الميزة                                          | الحالة        |
| ----------------------------------------------- | ------------- |
| LSP Servers (TS, Prisma, Bash, YAML)            | ✅            |
| Formatters (Prettier)                           | ✅            |
| Custom Commands (/test, /lint, /typecheck, ...) | ✅ (10 أوامر) |
| Custom Agents                                   | ✅ (6 وكلاء)  |
| Agent Skills                                    | ✅ (6 مهارات) |
| Permissions                                     | ✅            |
| Rules                                           | ✅ (5 ملفات)  |
| Watcher Ignore                                  | ✅            |
| Compaction                                      | ✅            |
| Small Model                                     | ✅            |
| Autoupdate                                      | ✅            |
| Snapshot                                        | ✅            |
| TUI                                             | ✅            |
| Shell (zsh)                                     | ✅            |
| Provider Timeout (10 دقائق)                     | ✅            |

## 15.6 القواعد الـ 7 الإلزامية

1. اقرأ المواصفات أولاً
2. استخدم Phase (لا Sprint)
3. لا زحف نطاق
4. وثّق القرارات (ADRs)
5. الأمان أولاً
6. RTL إلزامي
7. تحقق قبل الإدعاء

---

# 16. الحوكمة وسجل القرارات (Governance & Decision Log)

> **الملفات المصدر:** `governance/SOURCE_OF_TRUTH.md`, `governance/PHASE_LOCK_POLICY.md`, `governance/AI_AGENT_EXECUTION_CONTRACT.md`, `docs/ADR/ADR-001` إلى `ADR-021`, `docs/19_DECISION_LOG.md`

## 16.1 مصادر الحقيقة (Source of Truth)

**معتمدة:** `/docs`, `/specs`, `/apps`, `/packages`, `/workers`, `/docker`, `/governance`
**غير معتمدة:** `/00_Inbox`, `/archive`, `/09_Archive` (مرجع فقط)

## 16.2 سياسة قفل المراحل (Phase 0)

- **ممنوع:** كتابة كود تطبيق
- **مسموح:** ملفات `.md`، إعدادات، بنية تحتية
- **تغيير المراحل:** يتطلب موافقة حسب `governance/CHANGE_CONTROL.md` (فارغ حالياً)

## 16.3 عقد تنفيذ الوكيل (10 بنود)

1. اقرأ المواصفات قبل التنفيذ
2. احترم قفل المرحلة
3. لا توسيع نطاق بدون موافقة
4. فضّل التغييرات الصغيرة
5. لا تستخدم الوثائق المؤرشفة كمصادر
6. استخدم `docs/` و `specs/` فقط
7. لا تغيير معماري بدون ADR
8. كل UI يدعم RTL
9. Docker-first إلزامي
10. تجنب سير العمل الضمني

## 16.4 سجل ADRs (21 قراراً)

| الرقم   | العنوان                                     | الحالة |
| ------- | ------------------------------------------- | ------ |
| ADR-001 | Monorepo مع PnPM Workspaces                 | ✅     |
| ADR-002 | Next.js 16 + App Router                     | ✅     |
| ADR-003 | Prisma 6 كـ ORM                             | ✅     |
| ADR-004 | الفصل بين Conversion و Export               | ✅     |
| ADR-005 | MinIO للتخزين الكائني                       | ✅     |
| ADR-006 | BullMQ لإدارة قوائم الانتظار                | ✅     |
| ADR-007 | SSE للإشعارات الفورية                       | ✅     |
| ADR-008 | @serwist/next لـ PWA                        | ✅     |
| ADR-009 | NextAuth.js v5 للمصادقة                     | ✅     |
| ADR-010 | الأساس الأمني                               | ✅     |
| ADR-011 | Arabic/RTL First                            | ✅     |
| ADR-012 | إدارة الوصول للملفات                        | ✅     |
| ADR-013 | تسجيل الأحداث (Audit Logging)               | ✅     |
| ADR-014 | Tailwind CSS v4 + shadcn/ui                 | ✅     |
| ADR-015 | Docker للـ MVP                              | ✅     |
| ADR-016 | إدارة الجلسات و Redis Cache                 | ✅     |
| ADR-017 | خطة النسخ الاحتياطي                         | ✅     |
| ADR-018 | التخزين المؤقت للجلسات                      | ✅     |
| ADR-019 | Vitest + Playwright                         | ✅     |
| ADR-020 | Spec-Driven Development + Phase Terminology | ✅     |
| ADR-021 | قفل نطاق Phase 1                            | ✅     |

## 16.5 الملفات الفارغة في Governance

**6 ملفات فارغة (صفر بايت):**

- `governance/AGENT_POLICY.md`
- `governance/EXECUTION_RULES.md`
- `governance/REPOSITORY_BOUNDARIES.md`
- `governance/REVIEW_PIPELINE.md`
- `governance/CHANGE_CONTROL.md`
- `governance/SPEC_AUTHORITY.md`

**3 ملفات غير فارغة:**

- `governance/SOURCE_OF_TRUTH.md`
- `governance/AI_AGENT_EXECUTION_CONTRACT.md`
- `governance/PHASE_LOCK_POLICY.md`

**بحاجة لقرار:** هل الفراغ مقصود أم يحتاج لكتابة محتوى؟

---

# 17. الملحق (Appendix)

> **الملفات المصدر:** `docs/_reports/` (20 تقريراً), `docs/18_OPEN_QUESTIONS.md`, `docs/28_TERMINOLOGY_AND_NAMING_STANDARD.md`

## 17.1 ملخص تقارير المراجعة

| التقرير                             | التاريخ    | النتيجة               |
| ----------------------------------- | ---------- | --------------------- |
| `phase-1-deep-consistency-audit.md` | 2026-05-18 | CONDITIONAL GO        |
| `terminology-and-naming-audit.md`   | 2026-05-18 | نظيف — متسق           |
| `zero-byte-and-stub-audit.md`       | 2026-05-18 | نظيف — لا ملفات فارغة |
| `adr-alignment-audit.md`            | —          | متوافق                |
| `agent-outputs-inventory.md`        | —          | جرد مخرجات            |
| `docs-v4.1-final-zip-inspection.md` | —          | فحص v4.1              |
| `docs-v4.1-sync-report.md`          | —          | تزامن v4.1            |
| `legacy-vs-v4.1-diff-summary.md`    | —          | الفرق مع القديم       |
| `repo-structure-duplicate-check.md` | —          | لا مكررات             |
| `sync-analysis-report.md`           | —          | تحليل تزامن           |
| و 10 تقارير أخرى                    | —          | متنوعة                |

## 17.2 الأسئلة المفتوحة

| الرقم | السؤال                                  | بحاجة لقرار بحلول |
| ----- | --------------------------------------- | ----------------- |
| Q06   | Email verification — إلزامي أم اختياري؟ | نهاية Phase 1     |
| Q08   | Google API auth — كيف يتم إعداد OAuth؟  | نهاية Phase 1     |
| Q11   | Open vs Invite-only registration?       | نهاية Phase 1     |

## 17.3 الأسماء المحظورة

| الاسم               | السبب                |
| ------------------- | -------------------- |
| **DocEd**           | مشروع سابق (ملغي)    |
| **RAQIM / رقيم**    | مصدر إلهام بحثي فقط  |
| **tahweel / تحويل** | مصدر إلهام بحثي فقط  |
| **Sprint**          | تم استبداله بـ Phase |

## 17.4 أسماء الملفات المحجوزة (مرجع فقط)

بعض الملفات في `/09_Archive` و `/00_Inbox` (مسارات غير معتمدة):

- `22_REPO_STRUCTURE (1).md` (مكرر)
- ملفات قديمة لا يجب استخدامها كمصادر نشطة

## 17.5 ملاحظات ختامية

1. **النسخة:** v4.1.0 (2026-03-05/06)
2. **المرحلة:** Phase 0 (لا كود تطبيق)
3. **الجاهزية:** CONDITIONAL GO
4. **ADRs:** 21/21 معتمدة
5. **Spec Kit:** جاهز مع قوالب وسير عمل
6. **Impeccable:** جاهز لمراجعة التصميم
7. **Docker:** جاهز (3 خدمات: PostgreSQL, Redis, MinIO)
8. **الأمان:** إجراءات لكل طبقة
9. **RTL:** إرشادات واضحة مع Checklist
10. **العلامة التجارية:** ألوان، خطوط، شعار، نغمة

---

> **نهاية المواصفة الشاملة**
> تم إعدادها من 100+ ملف مصدر (21 ADR، 30+ وثيقة، ملفات إعدادات، تقارير مراجعة)
> Ibn Al-Azhar Docs — في بيت كل طالب أزهري

## 1.6 الجهات الفاعلة الموسعة (Extended Actors)

### AI Agents (وكلاء ذكيون)

| الوكيل                | الاختصاص           | يُنشّط تلقائياً لـ                  | ملف التكوين         |
| --------------------- | ------------------ | ----------------------------------- | ------------------- |
| **Architect**         | القرارات المعمارية | أي تغيير في البنية، ADRs جديدة      | `.opencode/agents/` |
| **Spec-guardian**     | المواصفات          | أي تنفيذ جديد، منع زحف النطاق       | `.opencode/agents/` |
| **QA-lead**           | الجودة والاختبارات | أي كود جديد                         | `.opencode/agents/` |
| **Security-reviewer** | الأمان             | auth, upload, sharing, API keys     | `.opencode/agents/` |
| **RTL-auditor**       | RTL والعربية       | أي تغيير واجهة (UI)                 | `.opencode/agents/` |
| **Frontend-polish**   | العلامة التجارية   | أي تغيير UI، ألوان، خطوط            | `.opencode/agents/` |
| **Docs-sync**         | تزامن الوثائق      | تغيير في السلوك الموثق              | `.opencode/agents/` |
| **Docker-auditor**    | Docker             | تغيير في Docker Compose, Dockerfile | `.opencode/agents/` |

### Human Roles (أدوار بشرية)

| الدور             | المسؤوليات                               |
| ----------------- | ---------------------------------------- |
| **Product Lead**  | قرارات المنتج، أولويات الميزات، Q06, Q11 |
| **Backend Lead**  | OCR integration, Google API setup (Q08)  |
| **DevOps Lead**   | Hosting decision, CI/CD, Docker          |
| **Design Lead**   | Brand consistency, RTL audit, UI review  |
| **Security Lead** | Security review, penetration testing     |
| **QA Lead**       | Test plans, coverage, E2E tests          |

## 1.7 المبادئ التقنية المفصلة

### مبدأ Separation of Concerns (ADR-004)

```typescript
// Conversion: ملف خام → نص موحد
interface ConversionResult {
  documentId: string;
  extractedText: string; // النص الأساسي المستخرج
  ocrConfidence: number; // نسبة الثقة (0-1)
  pageCount: number; // عدد الصفحات
  language: string; // اللغة المكتشفة
  metadata: Record<string, unknown>; // بيانات إضافية
}

// Export: نص موحد → صيغة محددة
interface ExportInput {
  documentId: string;
  extractedText: string; // النص المستخرج (من Conversion)
  format: "txt" | "docx" | "pdf" | "json";
  metadata?: Record<string, unknown>;
}

interface ExportResult {
  storagePath: string; // المسار في MinIO
  fileSize: number; // حجم الملف (بايت)
  format: string; // الصيغة
  downloadUrl: string; // رابط التحميل
}
```

### مبدأ Free-First (من ADR-015)

المشروع لا يعد أبداً بـ "مجاني للأبد". بدلاً من ذلك:

```
القاعدة: "لا توجد استضافة مجانية مضمونة إلى الأبد"
البديل: استضافة ذاتية بتكلفة ~$6/شهر (Hetzner)
الخيار المجاني: Oracle Cloud Free Tier (قيد التحقق)
النهج: المستخدم يستضيف التطبيق بنفسه على VPS الخاص به
```

---

## 2.5 جدول تنفيذ Phase 1 (12 أسبوعاً)

### Weeks 1-2: Repository & Foundation

| اليوم | المهمة                                            | المخرجات                 |
| ----- | ------------------------------------------------- | ------------------------ |
| Day 1 | Clone repo, install pnpm 10.33.4                  | بيئة تطوير جاهزة         |
| Day 2 | `pnpm install` + verify workspace                 | All deps installed       |
| Day 3 | `pnpm docker:up` — start PostgreSQL, Redis, MinIO | 3 containers running     |
| Day 4 | `pnpm db:generate` + `pnpm db:migrate`            | Prisma client + tables   |
| Day 5 | Verify `pnpm dev` works in apps/web               | Next.js running at :3000 |
| Day 6 | ESLint + Prettier configuration                   | Linting passes           |
| Day 7 | Git hooks (pre-commit, commit-msg)                | Commit quality enforced  |

### Weeks 3-4: UI Foundation

| اليوم  | المهمة                                 | المخرجات                      |
| ------ | -------------------------------------- | ----------------------------- |
| Day 8  | Tailwind CSS v4 + RTL configuration    | global.css with RTL           |
| Day 9  | shadcn/ui init + base components       | Button, Card, Input, etc.     |
| Day 10 | Cairo font via next/font               | Arabic text renders correctly |
| Day 11 | Brand tokens (CSS variables)           | --color-primary, --font-cairo |
| Day 12 | next-intl setup with Arabic as default | i18n working                  |
| Day 13 | App Shell — Header                     | Navigation + logo             |
| Day 14 | App Shell — Sidebar + Footer           | Layout complete               |

### Weeks 5-6: Docker & Infrastructure

| اليوم  | المهمة                            | المخرجات                 |
| ------ | --------------------------------- | ------------------------ |
| Day 15 | Docker health checks verification | All services healthy     |
| Day 16 | Caddy reverse proxy config        | HTTPS working locally    |
| Day 17 | Prisma connection pooling         | Efficient DB connections |
| Day 18 | Redis connection for BullMQ       | Queue ready              |
| Day 19 | MinIO SDK integration             | File operations working  |
| Day 20 | Docker Compose for production     | Full stack in containers |
| Day 21 | .env.example final review         | All vars documented      |

### Weeks 7-8: Worker Skeleton

| اليوم  | المهمة                                             | المخرجات                |
| ------ | -------------------------------------------------- | ----------------------- |
| Day 22 | workers/converter/ structure                       | Basic worker skeleton   |
| Day 23 | BullMQ queue + worker setup                        | Jobs flow through queue |
| Day 24 | MinIO read operation in worker                     | Files accessible        |
| Day 25 | SSE endpoint (API route)                           | Real-time notifications |
| Day 26 | SSE client in browser                              | UI receives events      |
| Day 27 | workers/exporter/ structure                        | Export worker skeleton  |
| Day 28 | Full lifecycle test: upload → queue → worker → SSE | Pipeline verified       |

### Weeks 9-10: Auth

| اليوم  | المهمة                               | المخرجات              |
| ------ | ------------------------------------ | --------------------- |
| Day 29 | NextAuth.js v5 install + config      | Auth system ready     |
| Day 30 | Login page (Arabic, RTL)             | Users can log in      |
| Day 31 | Register page                        | New users can sign up |
| Day 32 | JWT strategy + session management    | Auth tokens working   |
| Day 33 | Middleware for protected routes      | Route protection      |
| Day 34 | User roles (STUDENT, TEACHER, ADMIN) | Role-based access     |
| Day 35 | Session caching in Redis             | Fast session lookup   |

### Weeks 11-12: CI & Polish

| اليوم  | المهمة                           | المخرجات            |
| ------ | -------------------------------- | ------------------- |
| Day 36 | GitHub Actions — lint step       | Auto-lint on push   |
| Day 37 | GitHub Actions — typecheck step  | Type checking in CI |
| Day 38 | GitHub Actions — test step       | Vitest in CI        |
| Day 39 | GitHub Actions — build step      | Build verification  |
| Day 40 | Vitest unit tests for components | Component coverage  |
| Day 41 | Playwright setup + RTL test      | E2E test ready      |
| Day 42 | Phase 1 gate review              | Phase 1 complete    |

---

## 5.6 الفهارس والأداء (Indexes & Performance)

### الفهارس الموصى بها:

```sql
-- المستندات: استعلامات سريعة حسب المستخدم
CREATE INDEX idx_documents_owner ON documents(owner_id);

-- المستندات: تصفية حسب الحالة
CREATE INDEX idx_documents_status ON documents(status);

-- المستندات: استبعاد المحذوف
CREATE INDEX idx_documents_active ON documents(owner_id) WHERE is_deleted = false;

-- المجلدات: التسلسل الهرمي
CREATE INDEX idx_folders_parent ON folders(parent_id);

-- روابط المشاركة: بحث سريع
CREATE INDEX idx_share_links_token ON share_links(token);

-- مهام التحويل: BullMQ queries
CREATE INDEX idx_conversion_jobs_status ON conversion_jobs(status);
```

### توقعات الأداء:

| الاستعلام                    | التوقع | مع الفهرس         |
| ---------------------------- | ------ | ----------------- |
| مستندات المستخدم (100 مستند) | <5ms   | ✅                |
| البحث بنص كامل (10k وثيقة)   | <100ms | ✅ (مع GIN index) |
| التحقق من رابط المشاركة      | <2ms   | ✅                |
| حالة مهمة تحويل              | <3ms   | ✅                |

---

## 8.4 التخزين المؤقت في المتصفح (PWA Cache Details)

### Cache Strategies:

```typescript
// apps/web/src/sw.ts
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCache: defaultCache,

  // إستراتيجيات مخصصة
  runtimeCaching: [
    {
      // الصور المصغرة — Stale While Revalidate
      matcher: /\/api\/thumbnails\//,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "thumbnails",
        expiration: { maxEntries: 50, maxAgeSeconds: 604800 }, // 7 أيام
      },
    },
    {
      // خطوط Cairo — Cache First (ثقيلة 40-60KB)
      matcher: /\/_next\/static\/media\/cairo.*\.(woff2?|ttf|otf)/,
      handler: "CacheFirst",
      options: {
        cacheName: "fonts",
        expiration: { maxAgeSeconds: 31536000 }, // سنة
      },
    },
    {
      // API — Network First
      matcher: /\/api\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 300 }, // 5 دقائق
      },
    },
  ],
});

serwist.addEventListeners();
```

---

## 10.5 مكونات RTL جاهزة (Ready RTL Components)

### 10.5.1 مكون RTL-aware Card:

```tsx
// apps/web/src/components/ui/card.tsx
import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-white p-6 shadow-sm",
        "text-start", // بدلاً من text-left
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
```

### 10.5.2 RTL-aware Navigation:

```tsx
// apps/web/src/components/layout/nav.tsx
interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const Nav = ({ items }: { items: NavItem[] }) => (
  <nav className="flex flex-row gap-1" role="navigation">
    {items.map((item) => (
      <a
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2",
          "transition-colors hover:bg-bg-secondary",
          "text-start", // RTL-aware
        )}
      >
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        <span>{item.label}</span>
      </a>
    ))}
  </nav>
);
```

### 10.5.3 RTL-aware Form Field:

```tsx
// apps/web/src/components/ui/form-field.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField = ({ label, error, required, children }: FormFieldProps) => (
  <div className="space-y-2">
    <label className="block text-small font-medium text-text-primary text-start">
      {label}
      {required && <span className="text-error ms-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-small text-error text-start" role="alert">
        {error}
      </p>
    )}
  </div>
);
```

---

## 11.6 Audit Logging المفصل (ADR-013)

### أنواع الأحداث المسجلة:

| الفئة         | الأحداث                                              | مستوى الحساسية |
| ------------- | ---------------------------------------------------- | -------------- |
| **Auth**      | login, logout, failed_login, password_reset          | عالي           |
| **Documents** | upload, view, delete, restore, rename                | متوسط          |
| **Share**     | create_link, access_link, revoke_link                | عالي           |
| **Export**    | request_export, complete_export                      | منخفض          |
| **Admin**     | user_create, user_delete, role_change, system_config | عالي جداً      |
| **Settings**  | change_theme, change_language                        | منخفض          |

### هيكل الحدث:

```typescript
interface AuditEvent {
  id: string; // UUID
  timestamp: string; // ISO 8601
  actorId: string; // User ID
  actorRole: UserRole; // الدور وقت الحدث
  action: string; // document.upload
  resourceType: string; // document, user, share_link
  resourceId: string; // المعرف المرتبط
  details: Record<string, unknown>; // تفاصيل إضافية
  ipAddress: string; // IP المصدر
  userAgent: string; // المتصفح
  severity: "low" | "medium" | "high" | "critical";
}
```

---

## 12.5 استراتيجية Docker Multi-stage Build

```dockerfile
# docker/prod/Dockerfile
# ===== Stage 1: Base =====
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

# ===== Stage 2: Dependencies =====
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/utils/package.json ./packages/utils/
COPY workers/converter/package.json ./workers/converter/
COPY workers/exporter/package.json ./workers/exporter/
RUN pnpm install --frozen-lockfile

# ===== Stage 3: Builder =====
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/workers ./workers
COPY . .
RUN pnpm db:generate
RUN pnpm build

# ===== Stage 4: Runner =====
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
```

---

## 13.5 Playwright Configuration مع RTL

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "ar-SA", // اختبار بالإعدادات العربية
    timezoneId: "Asia/Riyadh", // توقيت السعودية
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        locale: "ar-SA", // متصفح عربي
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        locale: "ar-SA",
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        locale: "ar-SA",
      },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 14.5 Spec Kit Workflow بالتفصيل

### الخطوات الكاملة:

```
1. مستخدم يصف الميزة (Input: "أريد نظام رفع للمستندات")
2. speckit.specify → يولد spec.md في specs/NNN-feature-name/
3. مراجعة المواصفة (Gate): هل FRs كاملة؟ UI states محددة؟ ضمن Phase scope؟
4. speckit.plan → يولد plan.md + research.md
5. مراجعة الخطة (Gate): هل الخطة تقنية؟ هل التبعيات واضحة؟
6. speckit.tasks → يقسم المهام
7. تنفيذ: implement كل مهمة مع verify
8. مراجعة شاملة: Security → RTL → Brand → Human
9. Merge إلى main
```

### إعدادات Spec Kit الحالية:

```json
{
  "version": "0.8.12.dev0",
  "integration": "claude",
  "default_integration": "claude",
  "installed_integrations": ["claude", "opencode"]
}
```

### أوامر Speckit المتاحة (في .opencode/commands/):

| الأمر                   | الوظيفة                        |
| ----------------------- | ------------------------------ |
| `speckit.specify`       | توليد مواصفة من وصف المستخدم   |
| `speckit.plan`          | توليد خطة تنفيذ من المواصفة    |
| `speckit.tasks`         | تقسيم الخطة إلى مهام           |
| `speckit.implement`     | تنفيذ مهمة محددة               |
| `speckit.checklist`     | إنشاء قائمة تحقق               |
| `speckit.clarify`       | توضيح نقاط غامضة في المواصفة   |
| `speckit.analyze`       | تحليل المواصفة                 |
| `speckit.constitution`  | التحقق من الدستور              |
| `speckit.taskstoissues` | تحويل المهام إلى GitHub Issues |

---

## 15.7 تفاصيل Skills الـ 6

| المهارة               | الغرض                 | ملف التفعيل                                   |
| --------------------- | --------------------- | --------------------------------------------- |
| **arabic-rtl**        | إرشادات العربية و RTL | `.opencode/skills/arabic-rtl/SKILL.md`        |
| **docker-first**      | قواعد Docker          | `.opencode/skills/docker-first/SKILL.md`      |
| **spec-driven**       | سير عمل المواصفات     | `.opencode/skills/spec-driven/SKILL.md`       |
| **security-baseline** | الأساس الأمني         | `.opencode/skills/security-baseline/SKILL.md` |
| **brand-consistency** | العلامة التجارية      | `.opencode/skills/brand-consistency/SKILL.md` |
| **phase-lock**        | قفل المراحل           | `.opencode/skills/phase-lock/SKILL.md`        |

## 15.8 نموذج توجيه النماذج (Model Routing)

| نوع المهمة     | النموذج الموصى به       | الاحتياطي             |
| -------------- | ----------------------- | --------------------- |
| كتابة كود يومي | deepseek-v4-flash-free  | nemotron-3-super-free |
| بنية معقدة     | big-pickle              | qwen3.6-plus          |
| إصلاحات سريعة  | gpt-5-nano              | —                     |
| مراجعة كود     | deepseek-v4-flash-free  | nemotron-3-super-free |
| بحث/توثيق      | nemotron-3-super-free   | big-pickle            |
| تفكير عميق     | deepseek-v4-pro (مدفوع) | big-pickle            |

---

## 16.6 سجل التغييرات (Changelog للمشروع)

| التاريخ    | الإصدار | التغييرات                                      |
| ---------- | ------- | ---------------------------------------------- |
| 2026-05-24 | v4.1.0  | إكمال Phase 0 — جميع ADRs، وثائق، تقارير       |
| 2026-05-21 | v4.0.0  | OpenCode Powerhouse — 15 ميزة مفعلة            |
| 2026-05-18 | v3.0.0  | Spec Kit integration، 20 تقرير مراجعة          |
| 2026-03-06 | v2.0.0  | Brand guide، Hosting options، Asset pipeline   |
| 2026-03-05 | v1.0.0  | Initial docs: PRD, Technical Design, DB Schema |

---

## 17.6 متغيرات البيئة الكاملة (.env.example)

```bash
# ===========================================
# Ibn Al-Azhar Docs — Environment Variables
# ===========================================
# انسخ هذا الملف إلى .env وعدّل القيم

# === Database ===
DATABASE_URL="postgresql://ibnalazhar:ibnalazhar_dev@localhost:5432/ibnalazhar"

# === Redis ===
REDIS_HOST="localhost"
REDIS_PORT=6379

# === MinIO (S3-compatible) ===
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="ibnalazhar-docs"
MINIO_REGION="us-east-1"

# === NextAuth.js ===
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"

# === Encryption ===
ENCRYPTION_KEY="32-byte-hex-key-for-encryption"

# === Google Vision API (اختياري — للـ OCR) ===
GOOGLE_APPLICATION_CREDENTIALS=""

# === Next.js ===
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_TELEMETRY_DISABLED=1

# === File Upload ===
MAX_UPLOAD_SIZE=104857600  # 100 MB بالبايت
ALLOWED_MIME_TYPES="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,image/png,image/jpeg,image/tiff,image/bmp"
```

---

## 17.7 قائمة الملفات حسب المجلد

### docs/ (34+ ملفاً)

| الرقم | الملف                                | الوصف                             |
| ----- | ------------------------------------ | --------------------------------- |
| 00    | `PROJECT_BRIEF.md`                   | نظرة عامة عن المشروع              |
| 01    | `PRD.md`                             | متطلبات المنتج                    |
| 04    | `UI_DESIGN_SYSTEM.md`                | نظام التصميم                      |
| 05    | `TECHNICAL_DESIGN.md`                | التصميم التقني                    |
| 07    | `DATABASE_SCHEMA.md`                 | قاعدة البيانات                    |
| 08    | `SECURITY_PRIVACY.md`                | الأمان والخصوصية                  |
| 09    | `QA_TEST_PLAN.md`                    | خطة الاختبارات                    |
| 10    | `DEVOPS_DEPLOYMENT.md`               | الـ DevOps                        |
| 13    | `PHASE_1_PLAN.md`                    | خطة Phase 1                       |
| 18    | `OPEN_QUESTIONS.md`                  | الأسئلة المفتوحة                  |
| 19    | `DECISION_LOG.md`                    | سجل القرارات                      |
| 20    | `RELEASE_NOTES_TEMPLATE.md`          | قالب ملاحظات الإصدار              |
| 21    | `CONTRIBUTING.md`                    | دليل المساهمة                     |
| 22    | `REPO_STRUCTURE.md`                  | هيكل المستودع                     |
| 25    | `GO_NO_GO_REVIEW.md`                 | مراجعة GO/NO-GO                   |
| 26    | `PHASE_1_EXECUTION_CHECKLIST.md`     | قائمة تنفيذ Phase 1               |
| 27    | `MVP_SCOPE_LOCK.md`                  | قفل نطاق MVP                      |
| 28    | `TERMINOLOGY_AND_NAMING_STANDARD.md` | معيار التسمية                     |
| 29    | `BRAND_IMPLEMENTATION_GUIDE.md`      | دليل العلامة التجارية (~3000 سطر) |
| 30    | `HOSTING_AND_DEPLOYMENT_OPTIONS.md`  | خيارات الاستضافة (~2000 سطر)      |
| 31    | `SPEC_KIT_WORKFLOW.md`               | سير عمل المواصفات (~1000 سطر)     |
| 32    | `IMPECCABLE_DESIGN_WORKFLOW.md`      | مراجعة التصميم (~1200 سطر)        |
| 33    | `ASSET_PIPELINE.md`                  | خط أنابيب الأصول (~1200 سطر)      |

### docs/ADR/ (21 ADR)

| الرقم   | الملف                                            | العنوان                     |
| ------- | ------------------------------------------------ | --------------------------- |
| ADR-001 | `ADR-001-monorepo-pnpm.md`                       | Monorepo مع PnPM            |
| ADR-002 | `ADR-002-nextjs-app-router.md`                   | Next.js 16                  |
| ADR-003 | `ADR-003-prisma-orm.md`                          | Prisma 6                    |
| ADR-004 | `ADR-004-conversion-export-separation.md`        | الفصل بين Conversion/Export |
| ADR-005 | `ADR-005-minio-object-storage.md`                | MinIO                       |
| ADR-006 | `ADR-006-bullmq-job-queue.md`                    | BullMQ                      |
| ADR-007 | `ADR-007-sse-notifications.md`                   | SSE                         |
| ADR-008 | `ADR-008-pwa-serwist.md`                         | PWA                         |
| ADR-009 | `ADR-009-nextauth-auth-model.md`                 | NextAuth.js                 |
| ADR-010 | `ADR-010-security-baseline.md`                   | الأمان                      |
| ADR-011 | `ADR-011-arabic-rtl-first.md`                    | العربية/RTL                 |
| ADR-012 | `ADR-012-file-access-control.md`                 | الوصول للملفات              |
| ADR-013 | `ADR-013-audit-logging.md`                       | تسجيل الأحداث               |
| ADR-014 | `ADR-014-tailwind-shadcn.md`                     | Tailwind + shadcn           |
| ADR-015 | `ADR-015-docker-mvp-infrastructure.md`           | Docker                      |
| ADR-016 | `ADR-016-session-redis-cache.md`                 | الجلسات + Redis             |
| ADR-017 | `ADR-017-backup-disaster-recovery.md`            | النسخ الاحتياطي             |
| ADR-018 | `ADR-018-session-cache-redis.md`                 | Cache الجلسات               |
| ADR-019 | `ADR-019-testing-framework-vitest-playwright.md` | الاختبارات                  |
| ADR-020 | `ADR-020-spec-driven-phase-terminology.md`       | Spec-Driven + Phase         |
| ADR-021 | `ADR-021-phase-1-scope-lock.md`                  | قفل Phase 1                 |

### docs/\_reports/ (20 تقريراً)

| التقرير                                  | الوصف                 |
| ---------------------------------------- | --------------------- |
| `adr-alignment-audit.md`                 | مراجعة توافق ADRs     |
| `agent-outputs-inventory.md`             | جرد مخرجات الوكلاء    |
| `current-docs-files.txt`                 | قائمة الملفات الحالية |
| `docs-v4.1-final-zip-inspection.md`      | فحص v4.1              |
| `docs-v4.1-sync-report.md`               | تقرير تزامن v4.1      |
| `incoming-adr-report.md`                 | تقرير ADRs            |
| `incoming-docs-headings.md`              | عناوين الوثائق        |
| `legacy-vs-v4.1-diff-summary.md`         | الفرق مع القديم       |
| `legacy-vs-v4.1-file-comparison.md`      | مقارنة الملفات        |
| `OPENCODE_NATIVE_FINALIZATION_REPORT.md` | إنهاء OpenCode        |
| `phase-1-deep-consistency-audit.md`      | مراجعة Phase 1        |
| `phase-1-sync-current-state.md`          | تزامن Phase 1         |
| `repo-structure-duplicate-check.md`      | فحص المكررات          |
| `shared-filename-hash-comparison.md`     | مقارنة التجزئة        |
| `sync-analysis-report.md`                | تحليل التزامن         |
| `terminology-and-naming-audit.md`        | مراجعة المصطلحات      |
| `zero-byte-and-stub-audit.md`            | فحص الملفات الفارغة   |
| `legacy-root-file-names.txt`             | أسماء الملفات القديمة |
| `v4.1-root-file-names.txt`               | أسماء الملفات v4.1    |
| `incoming-docs-files.txt`                | الملفات الواردة       |

---

## 18. ملاحظات إضافية حول الإصدارات

### تناقضات الإصدار في الملفات:

| الملف                                       | الإصدار المذكور | التاريخ    |
| ------------------------------------------- | --------------- | ---------- |
| `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`     | v4.1.0          | 2026-03-05 |
| `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` | v4.1.0          | 2026-03-06 |
| `docs/31_SPEC_KIT_WORKFLOW.md`              | v4.1.0          | 2026-03-06 |
| `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`     | v4.1.0          | 2026-03-06 |
| `docs/33_ASSET_PIPELINE.md`                 | v4.1.0          | 2026-03-06 |
| بعض ملفات docs الأخرى                       | v4.0.0          | 2025-03-05 |

**الاستنتاج:** الإصدار الحالي هو v4.1.0. الملفات التي تشير لـ v4.0.0/2025 تحتاج تحديث لتكون متسقة.

---

> **نهاية الملحق**

---

## 19. تفاصيل إضافية — أنماط المكونات (Component Patterns)

### 19.1 نمط مكونات الـ App Shell

```tsx
// apps/web/src/components/layout/app-shell.tsx
"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Footer } from "./footer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg-secondary">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
```

### 19.2 نمط الـ Data Display (قائمة المستندات)

```tsx
// apps/web/src/components/documents/document-list.tsx
"use client";

import { useState } from "react";
import { DocumentCard } from "./document-card";
import { DocumentSkeleton } from "./document-skeleton";
import { DocumentEmpty } from "./document-empty";
import { DocumentError } from "./document-error";
import { useDocuments } from "@/hooks/use-documents";

export function DocumentList() {
  const { documents, isLoading, error, refetch } = useDocuments();

  // حالات UI
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <DocumentSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <DocumentError message={error.message} onRetry={refetch} />;
  }

  if (documents.length === 0) {
    return (
      <DocumentEmpty
        title="لا توجد مستندات"
        description="ارفع مستنداً جديداً للبدء"
        actionLabel="رفع مستند"
        actionHref="/upload"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
```

### 19.3 نمط الـ Empty State

```tsx
// apps/web/src/components/shared/empty-state.tsx
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-bg-secondary p-4">
          <Icon className="h-12 w-12 text-text-secondary" />
        </div>
      )}

      <h3 className="text-h3 font-semibold text-text-primary">{title}</h3>

      <p className="mt-2 max-w-sm text-body text-text-secondary">{description}</p>

      {actionLabel && (actionHref || onAction) && (
        <Button className="mt-6" onClick={onAction} asChild={!!actionHref}>
          {actionHref ? <a href={actionHref}>{actionLabel}</a> : actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### 19.4 نمط الـ Error State

```tsx
// apps/web/src/components/shared/error-state.tsx
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "حدث خطأ", message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-error-light p-4">
        <AlertCircle className="h-12 w-12 text-error" />
      </div>

      <h3 className="text-h3 font-semibold text-text-primary">{title}</h3>

      <p className="mt-2 max-w-sm text-body text-text-secondary">{message}</p>

      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          <RefreshCw className="ml-2 h-4 w-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}
```

### 19.5 نمط الـ Loading State (Skeleton)

```tsx
// apps/web/src/components/shared/skeleton.tsx
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-200", className)} aria-hidden="true" />
  );
}

// DocumentCard Skeleton
export function DocumentCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <Skeleton className="mb-3 h-40 w-full rounded-md" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-1 h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}
```

### 19.6 نمط الـ SSE Client (React Hook)

```tsx
// apps/web/src/hooks/use-sse.ts
"use client";

import { useEffect, useRef, useState } from "react";

interface SSEEvent {
  type: string;
  jobId: string;
  documentId: string;
  percent?: number;
  result?: unknown;
  error?: string;
  downloadUrl?: string;
  format?: string;
}

interface UseSSEOptions {
  onEvent?: (event: SSEEvent) => void;
  enabled?: boolean;
}

export function useSSE(userId: string, options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId || options.enabled === false) return;

    const eventSource = new EventSource(`/api/sse/conversion-status?userId=${userId}`);

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        setLastEvent(data);
        options.onEvent?.(data);

        // إشعار المتصفح (اختياري)
        if ("Notification" in window && Notification.permission === "granted") {
          if (data.type === "conversion.completed") {
            new Notification("اكتمل التحويل", {
              body: "تم تحويل المستند بنجاح",
              icon: "/icons/icon-192x192.png",
            });
          }
        }
      } catch (error) {
        console.error("SSE parse error:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // إعادة الاتصال تلقائي (SSE built-in)
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [userId, options.enabled]);

  return {
    isConnected,
    lastEvent,
    close: () => eventSourceRef.current?.close(),
  };
}
```

---

## 20. تفاصيل إضافية — API Routes

### 20.1 API Route لرفع المستند

```typescript
// apps/web/src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { uploadDocument } from "@/lib/api/upload";
import { rateLimit } from "@/lib/api/rate-limit";

export async function POST(req: NextRequest) {
  // 1. المصادقة
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // 2. Rate limiting
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = await rateLimit(`upload:${ip}`, "api:upload");

  if (!allowed) {
    return NextResponse.json({ error: "طلبات كثيرة. حاول لاحقاً." }, { status: 429 });
  }

  try {
    // 3. قراءة بيانات النموذج
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }

    // 4. رفع المستند
    const document = await uploadDocument(session.user.id, file, {
      title: title || undefined,
      description: description || undefined,
      folderId: folderId || undefined,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "فشل رفع المستند",
      },
      { status: 500 },
    );
  }
}
```

### 20.2 API Route لجلب المستندات

```typescript
// apps/web/src/app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { prisma } from "@ibnalazhar/db/client";

export async function GET(req: NextRequest) {
  // 1. المصادقة
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // 2. قراءة معاملات التصفية
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // 3. بناء شرط الاستعلام
  const where: Record<string, unknown> = {
    ownerId: session.user.id,
    isDeleted: false,
  };

  if (folderId) where.folderId = folderId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { extractedText: { contains: search, mode: "insensitive" } },
    ];
  }

  // 4. جلب المستندات
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({
    documents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

---

## 21. تفاصيل إضافية — الإعدادات المتقدمة

### 21.1 Prisma Client Singleton

```typescript
// packages/db/src/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown作为 {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 21.2 next.config.ts الكامل

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  // PWA
  ...withSerwist,

  // الصور
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // i18n
  i18n: {
    locales: ["ar", "en", "sw", "ur"],
    defaultLocale: "ar",
    localeDetection: true,
  },

  // الأمان
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data:",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 22. استراتيجية فشل واسترداد (Failure & Recovery)

### 22.1 BullMQ — معالجة الفشل وإعادة المحاولة

```typescript
// workers/converter/src/index.ts (موسع)
const worker = new Worker(
  "conversion",
  async (job) => {
    // المحاولة الأولى
    const result = await processConversion(job.data);
    return result;
  },
  {
    connection,
    concurrency: 5,
    // إستراتيجية إعادة المحاولة
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // 1s, 2s, 4s, 8s, 16s
        return Math.pow(2, attemptsMade) * 1000;
      },
    },
  },
);

// معالج الفشل
worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, error.message);

  // بعد 3 محاولات فاشلة، نرسل إشعار للمستخدم
  if (job && job.attemptsMade >= 3) {
    await redis.publish(
      `conversion:${job.data.userId}`,
      JSON.stringify({
        type: "conversion.failed",
        jobId: job.id,
        documentId: job.data.documentId,
        error: "فشل تحويل المستند بعد 3 محاولات. يرجى المحاولة مرة أخرى لاحقاً.",
        final: true,
      }),
    );
  }
});

// معالج الإكمال
worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed in ${job.finishedOn! - job.timestamp}ms`);
});
```

### 22.2 استراتيجية Dead Letter Queue

```typescript
// workers/converter/src/dead-letter.ts
import { Queue } from "bullmq";

// قائمة المهام الفاشلة نهائياً
export const deadLetterQueue = new Queue("conversion-dead-letter", {
  connection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 * 24 * 30 }, // 30 يوماً
    removeOnFail: { age: 3600 * 24 * 90 }, // 90 يوماً
  },
});

// نقل المهمة إلى Dead Letter بعد 3 محاولات فاشلة
async function moveToDeadLetter(job: Job) {
  await deadLetterQueue.add(job.name, job.data, {
    jobId: `dl-${job.id}`,
    timestamp: Date.now(),
  });
}
```

---

## 23. معايير الجودة (Quality Standards)

### 23.1 معايير الكود (Code Quality)

| المعيار           | التفاصيل                                | طريقة التحقق    |
| ----------------- | --------------------------------------- | --------------- |
| TypeScript Strict | strict: true, noUncheckedIndexedAccess  | tsc --noEmit    |
| ESLint            | No errors, قواعد مخصصة للعربية          | pnpm lint       |
| Prettier          | تنسيق تلقائي                            | pnpm format     |
| Test Coverage     | ≥80% للوحدات، ≥60% للـ integration      | Vitest coverage |
| No `any`          | استخدام `unknown` بدلاً من `any`        | ESLint rule     |
| Named Exports     | لا default exports                      | ESLint rule     |
| Async/Await       | لا raw promises                         | ESLint rule     |
| Meaningful Names  | camelCase, PascalCase, UPPER_SNAKE_CASE | Code review     |

### 23.2 معايير الـ PR (Pull Request)

| المعيار        | التفاصيل                                     |
| -------------- | -------------------------------------------- |
| **الحجم**      | <500 سطر تغيير (ما لم يتم الاتفاق)           |
| **التركيز**    | ميزة واحدة لكل PR                            |
| **الوصف**      | وصف واضح للتغييرات والسبب                    |
| **الاختبارات** | اختبارات جديدة للميزة الجديدة                |
| **المواصفات**  | المرجع إلى المواصفة (spec)                   |
| **المراجعات**  | Security + RTL + Brand (للتغييرات ذات الصلة) |

---

## 24. تفاصيل الـ hosting بالكامل

### 24.1 مقارنة مزودي الاستضافة

| المزود            | المواصفات | RAM   | Storage    | السعر/شهر | ملاحظات             |
| ----------------- | --------- | ----- | ---------- | --------- | ------------------- |
| **Hetzner CX22**  | 2 vCPU    | 4 GB  | 40 GB SSD  | ~$6       | موصى به لـ MVP      |
| **Hetzner CX32**  | 4 vCPU    | 8 GB  | 80 GB SSD  | ~$12      | للتوسع              |
| **Contabo VPS S** | 4 vCPU    | 8 GB  | 200 GB SSD | ~$5       | اقتصادي             |
| **Contabo VPS M** | 6 vCPU    | 16 GB | 400 GB SSD | ~$9       | للتوسع              |
| **Oracle Free**   | 4 OCPU    | 24 GB | 200 GB     | $0        | قيد التحقق (متوفر؟) |
| **DigitalOcean**  | 2 vCPU    | 4 GB  | 80 GB      | ~$12      | أغلى                |
| **Hugging Face**  | 2 vCPU    | 16 GB | 50 GB      | $0-$7     | للنماذج الأولية     |

### 24.2 متطلبات الخادم

| المورد        | الحد الأدنى (MVP) | الموصى به (إنتاج) |
| ------------- | ----------------- | ----------------- |
| **CPU**       | 2 vCPU            | 4 vCPU            |
| **RAM**       | 4 GB              | 8 GB              |
| **Storage**   | 40 GB (SSD)       | 80 GB (SSD)       |
| **Bandwidth** | 1 TB/شهر          | 2 TB/شهر          |
| **OS**        | Ubuntu 24.04 LTS  | Ubuntu 24.04 LTS  |
| **Docker**    | 25.x+             | 25.x+             |

---

## 25. قائمة التحقق النهائية (Final Checklist)

### 25.1 قبل بدء Phase 1

- [x] جميع ADRs الـ 21 مكتوبة ومعتمدة
- [x] Prisma schema كامل مع العلاقات والفهارس
- [x] Docker Compose جاهز (3 خدمات مع health checks)
- [x] `.env.example` يحتوي على جميع المتغيرات
- [x] إعدادات TypeScript جاهزة (strict mode)
- [x] إعدادات Vitest جاهزة
- [x] Brand tokens معرفة (ألوان، خطوط، أحجام)
- [x] RTL guidelines موثقة
- [x] Security baseline موثقة
- [ ] مجلد `specs/` منشأ (مطلوب)
- [ ] قرار الاستضافة النهائي (Hetzner CX22 ~$6/شهر مؤقت)
- [ ] تكوين OpenCode Powerhouse كامل
- [ ] تقارير المراجعة الـ 20 جميعها معتمدة

### 25.2 قبل بدء Phase 2

- [ ] حل الأسئلة المفتوحة (Q06, Q08, Q11)
- [ ] قرار الاستضافة النهائي
- [ ] تطبيق العلامة التجارية الكامل
- [ ] OCR pipeline مع Google Vision API (أو Tesseract.js)
- [ ] Upload pipeline كامل
- [ ] Penetration testing
- [ ] Monitoring والإشعارات

### 25.3 قبل بدء Phase 3

- [ ] i18n كامل (ar, en, sw, ur)
- [ ] Tesseract.js المحلي كخيار افتراضي
- [ ] Performance optimization
- [ ] Cache strategies متقدمة
- [ ] Rollback procedures
- [ ] Production readiness review

---

## 26. المصطلحات الأساسية (Glossary)

| المصطلح            | التعريف                                          |
| ------------------ | ------------------------------------------------ |
| **ADR**            | Architecture Decision Record — سجل قرار معماري   |
| **BullMQ**         | مكتبة إدارة قوائم انتظار مبنية على Redis         |
| **Canonical text** | النص الموحد المستخرج من Conversion، جاهز للتصدير |
| **CSP**            | Content Security Policy — سياسة أمان المحتوى     |
| **Conversion**     | تحويل ملف خام إلى نص موحد (مع OCR إن لزم)        |
| **Export**         | تصدير النص الموحد إلى صيغة محددة (TXT/DOCX/etc)  |
| **Gate**           | بوابة مراجعة — نقطة توقف للتحقق من الجودة        |
| **Impeccable**     | أداة مراجعة جودة تصميم AI-Assisted               |
| **Magic Bytes**    | توقيع الملف — أول بايتات تحدد نوع الملف الحقيقي  |
| **MinIO**          | تخزين كائني متوافق مع S3 API                     |
| **Phase**          | مرحلة تطوير — مجموعة ميزات مترابطة               |
| **PWA**            | Progressive Web App — تطبيق ويب تقدمي            |
| **RTL**            | Right-To-Left — كتابة من اليمين لليسار           |
| **SDD**            | Spec-Driven Development — تطوير موجّه بالمواصفات |
| **Serwist**        | مكتبة PWA لـ Next.js                             |
| **shadcn/ui**      | مجموعة مكونات React قابلة للتخصيص                |
| **Spec Kit**       | مجموعة أدوات GitHub لكتابة المواصفات             |
| **SSE**            | Server-Sent Events — إشعارات من الخادم للمتصفح   |

---

> **النهاية**  
> تم إعداد هذه المواصفة الشاملة من 100+ ملف مصدر  
> جميع المعلومات مستمدة من المصادر الأصلية في `/docs` و `/specs` و `/governance`  
> Ibn Al-Azhar Docs — في بيت كل طالب أزهري

---

## 27. خريطة المسارات (Route Map) — Next.js App Router

| المسار                      | النوع     | الصلاحية         | الصفحة            |
| --------------------------- | --------- | ---------------- | ----------------- |
| `/`                         | Public    | الجميع           | Landing page      |
| `/login`                    | Public    | غير مسجل         | تسجيل الدخول      |
| `/register`                 | Public    | غير مسجل         | إنشاء حساب        |
| `/dashboard`                | Protected | مستخدم           | لوحة التحكم       |
| `/dashboard/documents`      | Protected | مستخدم           | قائمة المستندات   |
| `/dashboard/documents/[id]` | Protected | مالك المستند     | عرض المستند       |
| `/dashboard/upload`         | Protected | مستخدم           | رفع مستند         |
| `/dashboard/search`         | Protected | مستخدم           | بحث               |
| `/dashboard/settings`       | Protected | مستخدم           | الإعدادات         |
| `/dashboard/admin`          | Protected | ADMIN            | لوحة المشرف       |
| `/s/[token]`                | Public    | أي شخص (مع رابط) | عرض رابط المشاركة |
| `/api/auth/*`               | Public    | —                | NextAuth.js API   |
| `/api/documents`            | Protected | مستخدم           | CRUD المستندات    |
| `/api/documents/upload`     | Protected | مستخدم           | رفع مستند         |
| `/api/sse/*`                | Protected | مستخدم           | SSE events        |
| `/api/share/*`              | Protected | مالك             | إدارة المشاركة    |

## 28. الملخص الإحصائي للمشروع

### إحصائيات التوثيق:

| الفئة                  | العدد |
| ---------------------- | ----- |
| ADRs                   | 21    |
| ملفات docs/            | 34+   |
| تقارير مراجعة          | 20    |
| مهارات AI              | 6     |
| أوامر مخصصة            | 10    |
| وكلاء AI               | 8     |
| وكلاء OpenCode إضافيون | 6     |
| نماذج قاعدة البيانات   | 12    |
| فهارس قاعدة البيانات   | 15    |
| أنواع MIME المسموحة    | 8     |
| متغيرات البيئة         | 20+   |
| صفحات App Router       | 17+   |
| واجهات API             | 10+   |

### إحصائيات الكود (متوقعة لكامل المشروع):

| المقياس          | التوقع                   |
| ---------------- | ------------------------ |
| ملفات TypeScript | 200+                     |
| مكونات React     | 50+                      |
| اختبارات وحدة    | 100+                     |
| اختبارات E2E     | 20+                      |
| Workers          | 2 (converter + exporter) |

---

## 29. ملاحظات حول الملفات الفارغة في governance

الملفات الفارغة الـ 6 في `governance/` تحتاج لقرار:

| الملف                      | المحتوى المقترح                                       |
| -------------------------- | ----------------------------------------------------- |
| `AGENT_POLICY.md`          | سياسة الوكلاء — متى ينشط كل وكيل، صلاحياته            |
| `EXECUTION_RULES.md`       | قواعد التنفيذ — ترتيب العمليات، صلاحيات الملفات       |
| `REPOSITORY_BOUNDARIES.md` | حدود المستودع — ما هو مسموح/ممنوع                     |
| `REVIEW_PIPELINE.md`       | خط أنابيب المراجعة — DUP مع .opencode/REVIEW_PIPELINE |
| `CHANGE_CONTROL.md`        | التحكم بالتغييرات — كيفية تغيير ADR أو Phase          |
| `SPEC_AUTHORITY.md`        | سلطة المواصفات — من يوافق على المواصفات               |

**توصية:** هذه الملفات يجب أن تملأ قبل بدء Phase 2. الـ 3 ملفات الموجودة (SOURCE_OF_TRUTH, PHASE_LOCK_POLICY, AI_AGENT_EXECUTION_CONTRACT) تغطي الأساسيات لـ Phase 0-1.

---

## 30. مراجع سريعة (Quick References)

### 30.1 أوامر pnpm السريعة

```bash
# البدء
pnpm install                    # تثبيت الحزم
pnpm docker:up                  # بدء PostgreSQL + Redis + MinIO

# التطوير
pnpm dev                        # تشغيل خادم Next.js
pnpm lint                       # فحص ESLint
pnpm typecheck                  # فحص TypeScript
pnpm test                       # تشغيل Vitest

# قاعدة البيانات
pnpm db:generate                # توليد Prisma Client
pnpm db:migrate                 # تشغيل الترحيلات
pnpm db:studio                  # فتح Prisma Studio

# البناء
pnpm build                      # بناء المشروع
pnpm test:e2e                   # تشغيل Playwright
```

### 30.2 روابط سريعة للمستندات الأساسية

| الموضوع             | الرابط                                                |
| ------------------- | ----------------------------------------------------- |
| خطة Phase 1         | `docs/13_PHASE_1_PLAN.md`                             |
| قائمة تنفيذ Phase 1 | `docs/26_PHASE_1_EXECUTION_CHECKLIST.md`              |
| مراجعة GO/NO-GO     | `docs/25_GO_NO_GO_REVIEW.md`                          |
| نطاق MVP            | `docs/27_MVP_SCOPE_LOCK.md`                           |
| نظام التصميم        | `docs/04_UI_DESIGN_SYSTEM.md`                         |
| العلامة التجارية    | `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`               |
| التصميم التقني      | `docs/05_TECHNICAL_DESIGN.md`                         |
| قاعدة البيانات      | `docs/07_DATABASE_SCHEMA.md` + `prisma/schema.prisma` |
| الأمان              | `docs/08_SECURITY_PRIVACY.md` + `SECURITY.md`         |
| الاختبارات          | `docs/09_QA_TEST_PLAN.md`                             |
| DevOps              | `docs/10_DEVOPS_DEPLOYMENT.md`                        |
| الاستضافة           | `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md`           |
| Spec Kit            | `docs/31_SPEC_KIT_WORKFLOW.md`                        |
| Impeccable          | `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`               |
| Asset Pipeline      | `docs/33_ASSET_PIPELINE.md`                           |
| الدستور             | `.specify/memory/constitution.md`                     |
| Runtime Manifesto   | `.opencode/RUNTIME_MANIFESTO.md`                      |

---

> **النهاية النهائية**  
> تم إعداد هذه المواصفة الشاملة في 2026-05-24  
> من 100+ ملف مصدر — 21 ADR، 34+ وثيقة، 20 تقرير، ملفات إعدادات  
> Ibn Al-Azhar Docs — في بيت كل طالب أزهري

---

## 31. ملخص كل ADR بجملة

| ADR     | الخلاصة                                                                 |
| ------- | ----------------------------------------------------------------------- |
| ADR-001 | اخترنا PnPM Workspaces لإدارة monorepo بدلاً من Nx/Turborepo للبساطة    |
| ADR-002 | اخترنا Next.js 16 مع App Router بدلاً من Pages Router أو Remix          |
| ADR-003 | اخترنا Prisma 6 بدلاً من Drizzle أو TypeORM للألفة ونوعية التوثيق       |
| ADR-004 | فصلنا Conversion عن Export لتمكين إعادة استخدام OCR وتوسيع الصيغ        |
| ADR-005 | اخترنا MinIO (S3-compatible) بدلاً من LocalFS أو AWS S3 مباشرة          |
| ADR-006 | اخترنا BullMQ بدلاً من Kafka أو RabbitMQ للبساطة مع Redis الموجود       |
| ADR-007 | اخترنا SSE بدلاً من WebSocket للإشعارات أحادية الاتجاه                  |
| ADR-008 | اخترنا @serwist/next بدلاً of next-pwa أو workbox للتكامل مع App Router |
| ADR-009 | اخترنا NextAuth.js v5 مع JWT بدلاً of Auth.js أو Clerk للتحكم الكامل    |
| ADR-010 | وضعنا أساساً أمنياً: HTTPS, CSP, Rate Limiting, Input Validation        |
| ADR-011 | العربية هي اللغة الأساسية و RTL هو الاتجاه الافتراضي                    |
| ADR-012 | التحقق من ملكية المستند لكل عملية — owner فقط يعدّل                     |
| ADR-013 | تسجيل كل الأحداث الحساسة (رفع، حذف، مشاركة، تصدير)                      |
| ADR-014 | اخترنا Tailwind CSS v4 + shadcn/ui بدلاً من MUI أو Chakra               |
| ADR-015 | Docker Compose مع 3 خدمات أساسية (PostgreSQL, Redis, MinIO)             |
| ADR-016 | الجلسات النشطة مخزنة في Redis مع TTL 24h للسرعة                         |
| ADR-017 | pg_dump يومي + MinIO mirror، احتفاظ 7 أيام                              |
| ADR-018 | Cache الجلسات في Redis + إلغاء الجلسة عند logout                        |
| ADR-019 | Vitest للوحدة + Playwright لـ E2E (مع دعم RTL)                          |
| ADR-020 | اعتماد Spec-Driven Development + مصطلح Phase بدلاً من Sprint            |
| ADR-021 | قفل نطاق Phase 1 — Foundation فقط، لا OCR ولا Full Auth                 |

---

## 32. إرشادات السلامة للـ AI Agents

### 32.1 عقد تنفيذ الوكيل (تفصيل)

| البند                          | الشرح                                           |
| ------------------------------ | ----------------------------------------------- |
| **1. اقرأ المواصفات أولاً**    | لا تنفّذ ميزة بدون قراءة spec.md الخاص بها      |
| **2. احترم قفل المرحلة**       | لا تكتب كود تطبيق في Phase 0                    |
| **3. لا توسيع نطاق**           | إذا كانت المهمة خارج النطاق، ارفضها واشرح السبب |
| **4. فضّل التغييرات الصغيرة**  | <500 سطر لكل PR                                 |
| **5. لا تستخدم الأرشيف**       | `/09_Archive` و `/00_Inbox` ليسا مصادر نشطة     |
| **6. استخدم docs/ و specs/**   | هذان المصدران المعتمدان فقط                     |
| **7. ADR للتغييرات المعمارية** | أي تغيير في البنية يتطلب ADR جديد               |
| **8. RTL إلزامي**              | كل UI يدعم RTL بدون استثناء                     |
| **9. Docker-first**            | إذا لم يعمل في Docker، فهو لا يعمل              |
| **10. لا سير عمل ضمني**        | كل خطوة موثقة وواضحة                            |

### 32.2 الأخطاء الشائعة التي يجب تجنبها

| الخطأ                      | التأثير                            | الوقاية                       |
| -------------------------- | ---------------------------------- | ----------------------------- |
| **Zombie Scope Creep**     | إضافة ميزات خارج النطاق            | Spec-guardian يمنع            |
| **Fake Status**            | الإدعاء بأن شيئاً يعمل وهو لا يعمل | تحقق قبل الإدعاء              |
| **Wrong Source**           | استخدام الأرشيف كمصدر نشط          | SOURCE_OF_TRUTH.md            |
| **Sprint Terminology**     | استخدام مصطلح Sprint               | Phase lock enforcement        |
| **Secrets in Code**        | كتابة كلمة مرور في الكود           | Security review + git secrets |
| **LTR Assumptions**        | تصميم LTR أولاً                    | RTL audit قبل الدمج           |
| **Premature Optimization** | تحسين مبكر بلا سبب                 | ADR للتغييرات المعمارية       |

---

## 33. بنية المخرجات النهائية (Deliverables Structure)

```
الوثائق (Phase 0):     كل ما هو موجود في docs/ + specs/ + governance/
الكود (Phase 1):       apps/ + packages/ + workers/
البنية (Phase 1):      docker/ + .github/
الحوكمة (Phase 0-1):   governance/ + .opencode/ + .specify/
```

### كل مرحلة تضيف إلى سابقتها:

```
Phase 0: docs/ + governance/ + .opencode/ + .specify/
         ↓
Phase 1: + apps/ + packages/ + workers/ + docker/ + .github/
         ↓
Phase 2: + تحسينات على apps/ + packages/
         ↓
Phase 3: + تحسينات + prod deployment
```

---

> **نهاية الوثيقة**  
> Ibn Al-Azhar Docs — المواصفة الشاملة  
> 2026-05-24  
> 3000+ سطر تغطي 17+ قسماً من جميع ملفات المشروع
