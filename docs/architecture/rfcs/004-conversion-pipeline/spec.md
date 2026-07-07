# Spec: Conversion Pipeline — معالجة المستندات واستخراج النص

> **الحالة (Status):** Draft
> **تاريخ الإنشاء:** 2026-05-24
> **آخر تحديث:** 2026-05-24
> **المعمارية المرجعية:** ADR-022 (محل ADR-007)
> **المرحلة:** Phase 1 (تخطيط) → Phase 2 (تنفيذ)

## 1. الملخص (Overview)

`workers/converter/` هو عامل خلفية (background worker) يستقبل مهمات تحويل المستندات عبر BullMQ، ويقوم باستخراج النص من الملفات باستخدام محرك OCR محلي (Surya)، وتخزين النتائج في PostgreSQL، وإرسال إشعارات التقدم عبر SSE.

هذا الـ Worker هو **قلب** منصة Ibn Al-Azhar Docs — المسؤول عن تحويل PDF العربي الرديء إلى نص منظم، دقيق، وجاهز للبحث والتصدير.

## 2. قصص المستخدم (User Stories)

### P1 — الأساسي (MVP في Phase 2)

| ID    | القصة                                                                               |
| ----- | ----------------------------------------------------------------------------------- |
| US-01 | كمستخدم، أريد رفع ملف PDF ليتم تحويله تلقائياً إلى نص حتى أتمكن من البحث فيه ونسخه  |
| US-02 | كمستخدم، أريد رؤية نسبة تقدم التحويل في الوقت الفعلي حتى أعرف متى سينتهي            |
| US-03 | كمستخدم، أريد أن يعمل التحويل في الخلفية حتى أتمكن من مواصلة العمل دون انتظار       |
| US-04 | كمستخدم، أريد معرفة إذا فشل التحويل مع سبب الفشل حتى أتمكن من اتخاذ الإجراء المناسب |

### P2 — ثانوي (ما بعد MVP)

| ID    | القصة                                                                               |
| ----- | ----------------------------------------------------------------------------------- |
| US-05 | كمستخدم، أريد تحويل عدة مستندات في وقت واحد حتى أوفر الوقت                          |
| US-06 | كمستخدم، أريد رؤية نسبة الثقة (confidence) لكل مستند حتى أعرف مدى دقة النص المستخرج |
| US-07 | كمستخدم، أريد إعادة تحويل مستند بمحرك مختلف إذا كانت الدقة منخفضة                   |

## 3. سيناريوهات القبول (Acceptance Criteria)

### AC-01: تحويل PDF بنجاح

```
Given أن المستخدم رفع ملف PDF صالح
When يضغط على "تحويل"
Then يُنشأ BullMQ job مع documentId
And يُرسل SSE event بنوع "conversion:started"
And يعالج الـ Worker الملف
And يُرسل SSE events بنسبة التقدم
And يُخزّن extractedText في PostgreSQL
And يُرسل SSE event بنوع "conversion:completed"
```

### AC-02: فشل التحويل

```
Given أن المستخدم رفع ملف PDF تالف أو غير قابل للقراءة
When يحاول تحويله
Then يُرسل SSE event بنوع "conversion:failed"
And يُخزّن سبب الفشل في ConversionJob.error
And لا يُغيّر Document.status
```

### AC-03: ملف بدون نص عربي

```
Given أن المستخدم رفع PDF لا يحتوي على نص عربي
When يكتمل التحويل
Then يُخزّن extractedText (فارغ أو نص غير عربي)
And يُرسل SSE مع تحذير: "لم يتم العثور على نص عربي"
And confidence < 50%
```

### AC-04: PDF ممسوح بدقة منخفضة جداً

```
Given أن المستخدم رفع PDF ممسوح بدقة <100 DPI
When يحاول تحويله
Then يُرسل SSE مع تحذير: "دقة المستند منخفضة، النتائج قد تكون غير دقيقة"
And يُكمل المعالجة مع تخفيض عتبة الثقة
```

## 4. حالات الواجهة (UI States)

| الحالة      | المظهر                                     | المدة المتوقعة              |
| ----------- | ------------------------------------------ | --------------------------- |
| **Idle**    | زر "تحويل" نشط                             | —                           |
| **Loading** | شريط تقدم + نسبة مئوية + "جاري التحويل..." | 10-60 ثانية (حسب حجم الملف) |
| **Error**   | رسالة خطأ حمراء + زر "إعادة المحاولة"      | —                           |
| **Success** | رسالة نجاح خضراء + زر "عرض النص" / "تصدير" | —                           |
| **Empty**   | (ينطبق على حالة عدم وجود نص عربي)          | —                           |
| **Queued**  | "في قائمة الانتظار" + موقعك في queue       | متغير                       |

## 5. الوظائف الأساسية (Functional Requirements)

### FR-001: استقبال مهمة BullMQ

- يستمع العامل لـ `conversion-queue` في BullMQ
- كل Job يحتوي على `{ documentId: string }`
- الـ Job ID هو نفسه documentId (idempotency)
- **TTL:** 30 دقيقة
- **Max retries:** 3 (exponential backoff: 5s, 30s, 120s)

### FR-002: جلب الملف من MinIO

- يستخدم `documentId` لاستعلام مسار الملف من PostgreSQL (`Document.filePath`)
- يجلب الملف من MinIO عبر `minio.getObject(bucket, filePath)`
- يدعم: PDF فقط (Phase 2)، JPG/PNG (Phase 3)

### FR-003: استخراج الصور من PDF

- يستخدم `pdf2image` لتحويل صفحات PDF إلى صور PNG
- **Resolution:** 300 DPI (قابل للتعديل عبر `CONVERTER_DPI`)
- **Format:** PNG (بدون فقدان)
- **حد أقصى:** 100 صفحة لكل مستند (قابل للتعديل عبر `CONVERTER_MAX_PAGES`)
- يتخطى الصفحات الفارغة (blank page detection)

### FR-004: تحليل التخطيط والتعرف على النص (Surya)

- يُحمّل نموذج Surya مرة واحدة عند بدء العامل (model warm-up)
- لكل صورة: `surya.ocr(image, lang=["ar"])`
- Surya يُرجع: النص + الموقع (bbox) + ثقة (confidence) لكل عنصر
- **خط الأساس:** Arabic فقط (يمكن إضافة `en`, `fr` لاحقاً)
- **RTL:** Surya يدعم RTL أصلاً — لا معالجة إضافية مطلوبة على مستوى OCR

### FR-005: المعالجة اللاحقة (Post-processing)

```
1. arabic-reshaper ← يعيد تشكيل الحروف العربية (إذا لزم الأمر)
2. bidi-algorithm ← يضمن ترتيب RTL صحيح للنص النهائي
3. إزالة الأسطر الفارغة المتكررة
4. توحيد المسافات البيضاء
5. إعادة بناء الفقرات بناءً على مواقع bbox
```

### FR-006: تخزين النتائج

- يُحدّث `Document.extractedText` في PostgreSQL
- يُحدّث `Document.status` إلى `completed`
- يُسجّل `ConversionJob` مع `confidence`, `duration`, `pageCount`, `modelVersion`
- يُحدّث `Document.updatedAt`

### FR-007: إشعارات SSE

- يُرسل أحداث SSE عبر Redis Pub/Sub (يتلقاها خادم Next.js API)
- **الأحداث:**
  | الحدث | الحمولة | التوقيت |
  |-------|---------|---------|
  | `conversion:started` | `{ documentId, totalPages }` | بداية المعالجة |
  | `conversion:progress` | `{ documentId, currentPage, totalPages }` | بعد كل صفحة |
  | `conversion:completed` | `{ documentId, confidence, duration }` | عند النجاح |
  | `conversion:failed` | `{ documentId, error }` | عند الفشل |

### FR-008: إلغاء التحويل

- يمكن للمستخدم إلغاء تحويل قيد التشغيل عبر API `POST /api/documents/:id/cancel`
- العامل يتحقق من إشارة الإلغاء قبل كل صفحة
- الـ Job المُلغى يُسجّل كـ `cancelled` ولا يُخزّن أي نتائج

## 6. الحالات الحدودية (Edge Cases)

| الحالة                      | السلوك                                        |
| --------------------------- | --------------------------------------------- |
| PDF فارغ (0 صفحات)          | خطأ فوري: "الملف لا يحتوي على صفحات"          |
| PDF محمي بكلمة مرور         | خطأ: "الملف محمي، أزل الحماية أولاً"          |
| PDF >100 صفحة               | معالجة أول 100 صفحة فقط + تحذير               |
| صورة بدون نص عربي           | تحويل ناجح مع نص فارغ + تحذير confidence <50% |
| Worker يتعطل أثناء المعالجة | BullMQ retry + استئناف من آخر صفحة مكتملة     |
| MinIO غير متاح              | retry 3 مرات، ثم فشل مع "خطأ في التخزين"      |
| Surya model فشل في التحميل  | فشل فوري + تسجيل خطأ الـ model                |
| ملف تالف (corrupted PDF)    | خطأ: "الملف تالف أو غير قابل للقراءة"         |

## 7. مخطط قاعدة البيانات (Schema Reference)

### Document model (موجود)

```prisma
model Document {
  id            String   @id @default(cuid())
  filePath      String
  status        DocumentStatus @default(PENDING)
  extractedText String?
  confidence    Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  //
  conversionLog ConversionJob[]
}

enum DocumentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

### ConversionJob model (جديد — يُضاف إلى prisma/schema.prisma)

```prisma
model ConversionJob {
  id           String   @id @default(cuid())
  documentId   String
  document     Document @relation(fields: [documentId], references: [id])
  status       ConversionStatus @default(QUEUED)
  totalPages   Int?
  pagesDone    Int      @default(0)
  confidence   Float?
  durationMs   Int?
  modelVersion String?
  error        String?
  createdAt    DateTime @default(now())
  completedAt  DateTime?
}

enum ConversionStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

## 8. واجهة API (API Contract)

### بدء التحويل

```
POST /api/documents/:id/convert
Response: 202 { jobId, status: "queued" }
```

### حالة التحويل

```
GET /api/documents/:id/convert/status
Response: 200 { jobId, status, progress, confidence, error }
```

### إلغاء التحويل

```
POST /api/documents/:id/convert/cancel
Response: 200 { status: "cancelled" }
```

### أحداث SSE

```
GET /api/documents/:id/convert/events
Response: text/event-stream
```

## 9. الأمان (Security)

- **FR-009:** تحقق من ملكية المستند (owner) قبل بدء التحويل
- **FR-010:** حد أقصى للتحويلات المتزامنة: 5 لكل مستخدم (قابل للتعديل)
- **FR-011:** تعقيم النص المستخرج قبل التخزين (NoSQL injection, XSS)
- **FR-012:** لا يُخزّن الملف الأصلي في الـ Worker — يُقرأ من MinIO ويُغلق
- **FR-013:** وقت انتهاء (timeout) للـ Job: 30 دقيقة كحد أقصى

## 10. اختبارات (Test Plan)

### وحدة (Vitest)

- [ ] `pipeline/step1-preprocess.test.ts` — تحويل PDF → صور، اكتشاف الصفحات الفارغة
- [ ] `pipeline/step2-layout.test.ts` — (يتطلب Surya model — استخدم mock)
- [ ] `pipeline/step3-ocr.test.ts` — (يتطلب Surya model — استخدم mock)
- [ ] `pipeline/step4-postprocess.test.ts` — arabic-reshaper، RTL، تنظيف النص
- [ ] `pipeline/orchestrator.test.ts` — تنسيق الخطوات، إلغاء، retry
- [ ] `minio.test.ts` — جلب الملفات من MinIO
- [ ] `sse.test.ts` — إرسال أحداث SSE عبر Redis Pub/Sub

### تكامل (Integration)

- [ ] Worker + BullMQ: استقبال Job، معالجته، إرسال الإشعار
- [ ] Worker + MinIO: جلب الملف، معالجة، تخزين النتيجة
- [ ] Worker + PostgreSQL: تحديث Document و ConversionJob
- [ ] Worker + Redis Pub/Sub: إرسال أحداث SSE
- [ ] دورة كاملة: رفع → تحويل → ظهور النص في الواجهة

### E2E (Playwright)

- [ ] رفع PDF → تحويل → عرض النص المستخرج
- [ ] رفع PDF تالف → رسالة خطأ مناسبة
- [ ] إلغاء التحويل → توقف المعالجة
- [ ] التحويل المتزامن لعدة مستندات

## 11. خارج النطاق (Out of Scope — Phase 2+)

| الميزة                                | السبب                           | المرحلة المتوقعة |
| ------------------------------------- | ------------------------------- | ---------------- |
| دعم Arabic-Nougat                     | يتطلب GPU غير متوفر             | Phase 3+         |
| المصحح الخارق للرموز القرآنية         | يحتاج بيانات تدريب إضافية       | Phase 2+         |
| دعم المخطوطات اليدوية                 | Surya لا يدعمها جيداً           | Phase 3+         |
| Fine-tuning على كتب التراث            | يحتاج GPU + بيانات مصنفة        | Phase 3+         |
| تحويل متعدد اللغات (عربي+إنجليزي)     | توسيع النطاق                    | Phase 3+         |
| التعرف على الجداول (Table extraction) | Surya يدعمه جزئياً، يحتاج تحسين | Phase 2+         |
| التعرف على handwriting                | خارج نطاق Surya                 | غير مقرر         |

## 12. مؤشرات الأداء (Success Metrics)

| المقياس                        | الهدف (Target) | طريقة القياس                    |
| ------------------------------ | -------------- | ------------------------------- |
| دقة OCR (Character Error Rate) | ≤5% (≥95%)     | اختبار على 100 مستند عربي متنوع |
| وقت التحويل لـ 10 صفحات        | <60 ثانية      | توقيت الإنتاج (profiling)       |
| نسبة نجاح التحويل              | >95%           | ConversionJob.completed / total |
| توفر الـ Worker                | >99.5%         | Uptime monitor                  |
| وقت استجابة SSE                | <2 ثانية       | قياس زمن الحدث الأول            |
| رضا المستخدم (NPS)             | >40            | استبيان داخلي                   |

## 13. التبعيات (Dependencies)

### وقت التشغيل (Runtime)

- `surya-ocr` — OCR engine (Python package، يُثبّت في Dockerfile عبر pip)
- `pdf2image` + `poppler-utils` — تحويل PDF إلى صور
- `arabic-reshaper` + `python-bidi` — معالجة RTL
- `Pillow` — معالجة الصور (تغيير الحجم، تحسين التباين)
- `sharp` (Node.js) — معالجة الصور الخفيفة (اختياري)

### البنية التحتية (Infrastructure)

- BullMQ + Redis — قائمة المهام
- MinIO — تخزين الملفات
- PostgreSQL — تخزين النتائج
- Redis Pub/Sub — إشعارات SSE

## 14. متغيرات البيئة (Environment Variables)

| المتغير                    | القيمة الافتراضية | الشرح                          |
| -------------------------- | ----------------- | ------------------------------ |
| `CONVERTER_DPI`            | `300`             | دقة تحويل PDF إلى صور          |
| `CONVERTER_MAX_PAGES`      | `100`             | الحد الأقصى لعدد الصفحات       |
| `CONVERTER_MAX_CONCURRENT` | `5`               | التحويلات المتزامنة لكل مستخدم |
| `CONVERTER_JOB_TIMEOUT_MS` | `1800000`         | مهلة الـ Job (30 دقيقة)        |
| `SURYA_MODEL_DIR`          | `/models/surya`   | مسار تحميل نماذج Surya         |
| `SURYA_LANG`               | `["ar"]`          | اللغات المدعومة                |

## 15. هيكل الملفات (File Structure)

```
workers/converter/
├── package.json
├── tsconfig.json
├── Dockerfile                # python + node.js multi-stage
├── src/
│   ├── index.ts              # Entry point: listen to BullMQ
│   ├── pipeline/
│   │   ├── orchestrator.ts   # Pipeline orchestration
│   │   ├── step1-preprocess.ts
│   │   ├── step2-layout.ts
│   │   ├── step3-ocr.ts
│   │   └── step4-postprocess.ts
│   ├── services/
│   │   ├── minio.ts
│   │   ├── sse.ts
│   │   └── db.ts
│   ├── types.ts
│   └── config.ts
└── tests/
    └── pipeline.test.ts
```

## 16. تاريخ التغييرات (Changelog)

| التاريخ    | التغيير                                                                | المؤلف   |
| ---------- | ---------------------------------------------------------------------- | -------- |
| 2026-05-24 | إعادة كتابة كاملة — استبدال Google Drive API بـ Surya المحلي + ADR-022 | AI Agent |
| 2026-05-21 | تحديث طفيف (إشارة لـ ADR-004)                                          | —        |
| 2025-05-18 | إنشاء أولي (Google Drive API + Tesseract)                              | —        |
