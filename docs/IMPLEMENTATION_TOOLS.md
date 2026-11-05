# Tools Hub ضيف — وثيقة التنفيذ (IMPLEMENTATION_TOOLS)

> الحالة: واجهة الضيف مكتملة (صفحات + i18n + حدود + نتائج read-only). نقطة المعالجة للضيوف (guest endpoint) لم تُربط بعد بخط المعالجة الحالي — مواصفتها في §7، والواجهة تعلن ذلك بصراحة بدل محاكاة نتائج.
> المرجع: `docs/MERGE_PLAN.md` (مبادئ arabi.tools) — مجاني/غير ربحي، عربي أولًا، Input stays in place، read-only results، تدهور رشيق.

## 1. الهدف

Hub عام للأدوات السريعة **بلا حساب** (`/tools`) بأربع أدوات:

| الأداة | المسار | الحالة |
|---|---|---|
| محول PDF إلى Word | `/tools/pdf-to-word` | واجهة ضيف جاهزة، بانتظار guest endpoint |
| التعرّف الضوئي (OCR) | `/tools/ocr` | واجهة ضيف جاهزة، بانتظار guest endpoint |
| تشكيل النصوص | `/tools/tashkeel` | خدمة خارجية (sidecar) لم تُربط — تدهور رشيق |
| التفريغ الصوتي | `/tools/transcription` | خدمة خارجية (sidecar) لم تُربط — تدهور رشيق |

قرار P3 في MERGE_PLAN: التشكيل والتفريغ يبقيان خدمات HTTP خارجية — لا Rust داخل Workers، ولا نماذج ثقيلة في الواجهة. لذا الصفحتان تعرضان بطاقة "خدمة خارجية قادمة" وتبقيان بقية الموقع عاملة بالكامل.

## 2. المبادئ (ملزمة لأي تغيير لاحق)

1. **بلا حساب**: لا تسجيل، لا بريد، لا جلسة. المسارات في قائمة `publicPagePrefixes` بالـ middleware (انظر §5).
2. **المدخلات تبقى في مكانها**: لا نسخ إلى مكتبة، لا ربط بحساب، لا كتابة في قاعدة البيانات من مسار الضيف.
3. **النتائج read-only**: عرض + بحث داخل النتيجة + نسخ + مقارنة (فلترة بالأسطر) + تنزيل TXT/JSON. لا تحرير، لا حفظ في المكتبة. تنزيل DOCX للضيوف يأتي مع الـ endpoint (موضّح في الواجهة).
4. **حدود arabi.tools**: 99MB / 1000 صفحة، طابور 4 مهام إجمالًا / 3 لكل أداة / 1 لكل IP، نتائج 30 دقيقة، حذف الملف فور انتهاء المهمة.
5. **تدهور رشيق**: تعطل أداة/خدمة خارجية لا يُسقط الموقع ولا الصفحة — رسالة واضحة وحال سليم.
6. **عربي أولًا + إنجليزي**، RTL/LTR عبر next-intl، بلا أرقام مكتوبة يدويًا في الواجهة (كل النصوص من مفاتيح i18n).

## 3. الحدود والتحقق

### 3.1 ثوابت الضيف (مصدر وحيد)

`apps/web/src/shared/tools/guest-limits.ts`:

```ts
GUEST_TOOLS_LIMITS = {
  maxFileSizeMB: 99,          // هدف 99MB
  maxPages: 1000,             // هدف 1000p
  maxConcurrentJobsTotal: 4,  // طابور إجمالي
  maxConcurrentJobsPerTool: 3,
  maxConcurrentJobsPerIp: 1,
  resultTtlMinutes: 30,       // حذف النتائج بعد 30 دقيقة
  deleteFileAfterJob: true,   // حذف الملف فور انتهاء المهمة
}
```

### 3.2 التحقق في الواجهة (client-side)

`validateGuestFile(file, pageCount?)` في نفس الملف:

- نوع: PDF/JPG/PNG فقط (`GUEST_ALLOWED_MIME_TYPES` + فحص الامتداد كاحتياط).
- حجم: 99MB — رفض فوري برسالة i18n قبل أي رفع.
- صفحات: عدّ فعلي في المتصفح عبر **pdf.js محمّل كسولًا** (`await import("pdfjs-dist")` داخل `GuestToolClient`، عامل `/pdf.worker.min.mjs` نفسه المستخدم في `visual-range-selector`) — لا يدخل الحزمة الأولية. فشل العدّ لا يمنع المستخدم؛ يُفرض الحد مجددًا **خادميًا** حتمًا (انظر §7).

### 3.3 فجوة معروفة (موثّقة، ليست خطأ صامتًا)

مسار الرفع الحالي للمستخدمين المسجلين ما يزال على `MAX_UPLOAD_SIZE_MB` (افتراضي 50MB) في `apps/web/src/shared/validators/document.ts` و50MB في `apps/web/src/state/use-file-upload.ts`. حدود الضيف (99MB/1000p) **مستقلة ومقصودة** — الـ guest endpoint المستقبلي يجب أن يفرض حدود §3.1 ولا يعيد استخدام سقف الـ 50MB. لا تُغيّر السقف العام ضمن هذه المهمة حتى لا تتأثر تجربة المستخدمين الحاليين.

## 4. i18n

- نطاق جديد `tools` في `apps/web/src/messages/ar.json` و`en.json` (هيكل متماثل تمامًا):
  - `tools.title / subtitle / noAccountBadge`
  - `tools.limits.*` (الحجم، الصفحات، الطابور، TTL)
  - `tools.principles.{title,items[]}` (4 مبادئ)
  - `tools.items.{pdf-to-word,ocr,tashkeel,transcription}.{name,tagline,cta,badge}`
  - `tools.upload.*` (اختيار، حدود، أخطاء، عدّ الصفحات)
  - `tools.guest.*` (الطابور، pendingBackend، sidecarPending، readOnlyNote)
  - `tools.result.*` (العنوان، الفراغ، البحث، نسخ، TXT/JSON/DOCX، الأحرف، انتهاء الصلاحية)
  - `tools.back / tools.open`
- `nav.tools` في اللغتين لرابط الترويسة.
- الصفحات الخادمة تستخدم `getTranslations({ locale, namespace: "tools" })`؛ المكونات العميلة `useTranslations("tools")`. لا نصوص مكتوبة يدويًا في JSX.

## 5. الملفات

### 5.1 جديدة

| الملف | الدور |
|---|---|
| `apps/web/src/shared/tools/guest-limits.ts` | ثوابت الضيف + سجل الأدوات (`GUEST_TOOLS`) + `validateGuestFile` |
| `apps/web/src/ui/tools/tool-card.tsx` | بطاقة أداة (رابط + شارة حالة مباشر/قريبًا) |
| `apps/web/src/ui/tools/read-only-result.tsx` | لوحة نتيجة read-only: بحث، نسخ، تنزيل TXT/JSON، حالة فراغ |
| `apps/web/src/ui/tools/guest-tool-client.tsx` | جسم صفحة أداة: رفع + تحقق 99MB/1000p + عدّ صفحات كسول + طابور + تدهور sidecar |
| `apps/web/src/app/[locale]/(site)/tools/page.tsx` | Hub: بطاقات الأدوات + شارات الحدود + المبادئ الأربعة |
| `apps/web/src/app/[locale]/(site)/tools/{pdf-to-word,ocr,tashkeel,transcription}/page.tsx` | صفحات الأدوات الأربع (metadata + GuestToolClient) |
| `docs/IMPLEMENTATION_TOOLS.md` | هذه الوثيقة |

### 5.2 معدّلة

| الملف | التغيير |
|---|---|
| `apps/web/src/middleware.ts` | إضافة `"/tools"` إلى `publicPagePrefixes` — بدونها تُحوَّل الضيوف إلى `/login` |
| `apps/web/src/app/sitemap.ts` | إدخالات `/tools` + الأدوات الأربع لكل لغة (ar/en) |
| `apps/web/src/ui/layout/public-header.tsx` | رابط "الأدوات/Tools" في الترويسة العامة (اكتشاف الضيف) |
| `apps/web/src/messages/{ar,en}.json` | نطاق `tools` + `nav.tools` |

## 6. سلوك الواجهة اليوم (بلا endpoint)

- رفع ملف صالح → يعرض اسمه وحجمه وعدد صفحاته (PDF) وزر بدء.
- ضغط بدء → رسالة صريحة أن نقطة معالجة الضيوف قيد الربط، بلا حساب مطلوب أبدًا، وبلا نتيجة وهمية أو شريط تقدم مزيف.
- أدوات sidecar (`tashkeel`, `transcription`) → بطاقة تدهور رشيق، بلا نموذج رفع.
- `ReadOnlyResult` بحال `text=null` → حالة فراغ صحيحة. عند وصول الـ endpoint تُمرَّر النتيجة الحقيقية فقط؛ البحث/النسخ/التنزيل فيها حقيقية وتعمل محليًا (Blob + clipboard).

## 7. مواصفة الـ guest endpoint المستقبلي (غير منفّذة بعد)

```
POST /api/tools/guest/jobs        (multipart: file + tool)
  - بلا withAuth؛ يُقيَّم بـ IP فقط (rate-limit: 1 نشطة/IP، 3/أداة، 4 إجمالًا)
  - تحقق خادمي: نوع (PDF/JPG/PNG)، حجم ≤ 99MB، صفحات ≤ 1000 (عدّ خادمي إلزامي)
  - CSRF: نفس سياسة middleware الحالية (Origin/Referer) — بلا استثناء
  - معالجة عبر pipeline الحالي دون إنشاء Document/مكتبة
  - حذف الملف فور انتهاء المهمة؛ النتيجة تُخزَّن 30 دقيقة ثم تُحذف (cron/queue TTL)
  - استجابة: { jobId, status } ثم نتيجة read-only { text, format } قابلة للتنزيل TXT/JSON/DOCX
GET  /api/tools/guest/jobs/[id]   (استطلاع/نتائج، نفس حدود IP)
DELETE /api/tools/guest/jobs/[id] (حذف فوري من المستخدم قبل TTL)
```

قاعدة أمان: أي endpoint ضيف جديد يجب أن يمر بفحص "ماذا لو تسربت المفاتيح/الملفات؟" — لا معرفات مستخدم، لا إعادة استخدام مسارات `/api/upload` أو `/api/conversion/*` (كلاهما `withAuth` اليوم).

## 8. التحقق المنجز (2026-11-05)

- `tsc -p apps/web/tsconfig.json --noEmit` → نظيف (exit 0). إصلاح واحد أثناء التحقق: `PDFDocumentProxy.destroy` غير موجود في الأنواع → cast بنفس نمط `visual-range-selector.tsx`.
- `eslint` (مع `--rulesdir infrastructure/eslint/rules`) على كل الملفات الجديدة/المعدّلة → نظيف (exit 0).
- `next build` → نجح (exit 0)؛ مسارات `/[locale]/tools` والأدوات الأربع موجودة في مخرجات البناء.
- دخان تشغيلي (`next start` + curl، بلا جلسة): `GET /ar/tools` → 200، `GET /en/tools/ocr` → 200، `GET /en/tools/tashkeel` → 200 — لا تحويل إلى `/login` (middleware يعمل)، وعناوين "أدوات الضيوف"/"Guest Tools" تظهر باللغتين.
- سلامة `messages/{ar,en}.json`: JSON صالح، مفاتيح `tools.items` الأربعة متطابقة بين اللغتين، و`nav.tools` موجود.

## 9. متابعات مرتبة

1. **P1**: تنفيذ guest endpoint (§7) وربط `GuestToolClient` به (إرسال + استطلاع + تمرير النتيجة الحقيقية إلى `ReadOnlyResult`).
2. **P1**: تنزيل DOCX للضيوف عبر pipeline الحالي (لا توليد يدوي — pandoc/OMML حسب قرار MERGE_PLAN).
3. **P3**: ربط sidecar التشكيل/التفريغ (HTTP خارجي) ثم رفع حالة الأداتين إلى `available` في `GUEST_TOOLS`.
4. **QA**: Playwright بالعربية والإنجليزية (1280/390) لصفحات `/tools`، واختبار حدود: ملف 100MB مرفوض، PDF بأكثر من 1000 صفحة مرفوض، نتيجة تنتهي بعد 30 دقيقة.
