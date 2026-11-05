# تقرير التحقق الكامل — Ibn Al-Azhar Docs

- **التاريخ:** 2026-11-05 (بتوقيت EET، UTC+02:00)
- **المسار:** `/home/abed/Data/03_Professional/Projects/Ibn_Al_Azhar_Docs`
- **الفرع:** `fix/pipeline-runtime-fixes` — HEAD `4f92f6f`
- **البيئة:** Node `v22.22.3`، pnpm `10.33.4` (مطابق لـ `engines` في package.json)
- **حالة الشجرة:** ⚠️ شجرة عمل متسخة (dirty) — 61 ملفًا متعقّبًا معدّلًا (+1556/−1442) + ملفات جديدة غير متعقّبة (102 سطرًا في `git status`). النتائج أدناه تعكس الشجرة الحالية، لا HEAD النظيف.
- **نطاق المهمة:** `pnpm lint` + `pnpm typecheck` + `vitest run --project=unit` + `pnpm build` إن أمكن. **لم يتم نشر أو دفع.**

---

## 1) النتائج الإجمالية

| الفحص | الأمر | النتيجة | وقت التشغيل |
|---|---|---|---|
| Lint | `pnpm lint` | ✅ **ناجح** (exit 0، صفر تحذيرات — `--max-warnings 0`) | 2026-11-05T03:58:44+02:00 |
| Typecheck | `pnpm typecheck` | ✅ **ناجح** (exit 0) — 5 مشاريع: `apps/web`، `packages/pipeline`، `workers/ocr-worker`، `workers/export-worker`، `packages/database` | 2026-11-05T03:59:17+02:00 |
| Unit tests | `vitest run --project=unit` | ❌ **فاشل** (exit 1) — **39 فشل / 1239 ناجح / 2 متخطّى من 1280**؛ ملفات: 15 فاشل / 42 ناجح من 57 | 96.13s (بدء 04:01:50) |
| Build (الجذر) | `pnpm build` | ⚠️ **غير موجود** — exit 254: `Command "build" not found` (لا يوجد سكربت `build` في package.json الجذري) | 2026-11-05T04:04:05+02:00 |
| Build الفعلي | `pnpm build:hf-check` (= `next build --webpack` مع `cpus:1` + standalone) | ✅ **ناجح** (exit 0) — `Compiled successfully in 2.6min`، توليد 135/135 صفحة ثابتة، اكتمل `Collecting build traces` وعُرض جدول المسارات، ورسالة `✅ HF build check passed` | 04:12:27 ← 04:24:28 (~12 دقيقة) |

ملاحظة عن البناء: المحاولة الأولى قُتلت بمهلة أداة التشغيل (420 ثانية) أثناء مرحلة `Collecting build traces` — ليست فشلًا في الكود. أُعيد التشغيل في الخلفية واكتمل بنجاح كامل (exit 0).

---

## 2) تفصيل فشل اختبارات الوحدات (39)

### أ) `tests/backend/queue-infrastructure.test.ts` — 12 فشلًا (الأكبر)
- **السبب:** `Error: connect ECONNREFUSED 127.0.0.1:6379` — لا يوجد Redis يعمل محليًا (تم التحقق: المنفذ 6379 مغلق). الاختبارات تفترض Redis حيًا.
- يشمل: `recordFailedJob` / `getFailedJobs` / `cleanupFailedJob` (DLQ)، و`getJobStatus` / `getQueueMetrics` / `getAllQueueMetrics` / `getStuckJobs` (metrics) — كلها تُرجع قيَمًا فارغة (`{waiting: 0, active: 0}` بدل `{waiting: 2, active: 1}`، و`null` بدل `{stage, progress}`).
- فشل إضافي واحد من نوع آخر في الملف نفسه: `TypeError: Cannot read properties of undefined (reading 'catch')` في `packages/pipeline/src/queue/dlq.ts:26` (`dlqHandler` غير معرّف عند استدعاء `.catch`).
- **التصنيف:** بيئي (Redis) + خلل صغير في DLQ. ليس مؤشرًا على كسر كود الواجهات.

### ب) تنظيف النص العربي والامتحانات — 11 فشلًا
- `tests/backend/text-exam-cleaning.test.ts` — 8 فشلًا
- `tests/backend/text-document-detection.test.ts` — 2 فشلًا (`expected 'general' to be 'exam'`)
- `tests/backend/text.test.ts` — 1 فشل (`(1) هذا عنوان فرعي` لم يُكتشف كعنوان `## (1)`)
- **السبب الجوهري:** الكود يُطبّع الحروف (يزيل الهمزات: `(أ)` ← `(ا)`، `الأول` ← `الاول`) ويحوّل `......` إلى `…`، بينما الاختبارات تتوقع الحفاظ على الرموز الأصلية (`(أ) نعم`، `## الفصل الأول`، `......`). يبدو أن تغييرًا في `packages/pipeline/src/text/clean/*` (التوحيد Unicode) تعارض مع توقعات الحفاظ على أنماط الامتحان — **قرار مطلوب: إما تعديل التنظيف ليحفظ رموز الخيارات، أو تحديث الاختبارات**. هذا فشل سلوكي حقيقي وليس بيئيًا.

### ج) نطاق صلاحيات المدير (admin scoping) — 9 فشلًا
- `analytics-use-cases` (1)، `authorization` (1)، `conversion` (1)، `conversion-use-cases` (1)، `document-crud` (1)، `services-use-cases` (1)، `tag-use-cases` (1)، `tags` (1)، `dashboard` (1)
- **السبب:** الاختبارات تتوقع أن استعلامات المدير **غير مقيّدة** بـ `userId` (`undefined`)، لكن الكود يُمرّر `userId: 'user-1'` / `'u1'` فعليًا (`expected 'user-1' to be undefined`، `expected {...} to not have property "userId"`). تغيير سلوك في منطق النطاق مقابل الاختبارات — **قرار مطلوب** قبل الدمج، لأنه يمس أمن البيانات (مدير يرى بياناته فقط أم كل البيانات).

### د) `tests/backend/upload-document.use-case.test.ts` — 4 فشلًا
- **السبب:** `TypeError: this.storage.fileExists is not a function` في `apps/web/src/core/services/upload-document.use-case.ts:170` — الـ mock في الاختبار لا يوفّر `fileExists` بعد إضافة الفحص إلى الـ use-case. **إصلاح اختباري مباشر** (إضافة الدالة للـ mock)، ويفشل أيضًا توقّع `UPLOAD_ENQUEUE_FAILED` لأنه يُحجب بهذا الخطأ أولًا.

### هـ) `tests/backend/conversion-use-cases.test.ts` — 1 فشل
- `ConversionUseCases.startConversion > persists a ConversionJob row before enqueuing`: `[vitest] No "enqueueViaDriver" export is defined on the "@ibn-al-azhar-docs/pipeline" mock` — الـ mock ناقص تصديرًا جديدًا. **إصلاح اختباري مباشر**.

### و) `tests/backend/ocr-providers-local.test.ts` — 2 فشلًا (Surya)
- محاذاة الصفحات: الصفحة 1 تُرجع نصًا فارغًا بدل `'صفحة واحدة'`، و`pageErrors` تتضمن الصفحة 1 بينما الاختبار يتوقع الصفحة 2 فقط. فشل في تجميع نتائج OCR حسب ترتيب الصفحات (`SuryaOcrProvider.extractPages`).

**المجموع:** 12 + 11 + 9 + 4 + 1 + 2 = **39** ✓

---

## 3) القصور المتبقية

1. **39 اختبار وحدة فاشلًا** في 15 ملفًا (التفصيل أعلاه). لا يُنصح بالدمج قبل حسم فئتي (ب) و(ج) — تغييرات سلوكية؛ أما (د) و(هـ) فإصلاحات mocks سريعة، و(أ) يحتاج Redis أو عزلًا بيئيًا، و(و) يحتاج إصلاحًا في تجميع صفحات Surya.
2. **لا يوجد سكربت `build` في جذر package.json** — `pnpm build` يفشل بـ `Command "build" not found`. البناء الفعلي يتم عبر `pnpm build:hf-check` (أو `apps/web` مباشرة). يُنصح بإضافة سكربت `build` جذري يوجّه إلى `next build` لتجنب الالتباس.
3. **تحذير Next.js 16:** `The "middleware" file convention is deprecated. Please use "proxy" instead` — `apps/web/src/middleware.ts` يعمل لكنه مُهمَل؛ الترحيل إلى `proxy.ts` مطلوب مستقبلًا.
4. **اختبارات متخطّاة:** 2 في `storage-rate-limit.test.ts`.
5. **اختبار القياس (benchmark) لم يُنفَّذ فعليًا:** `benchmark.test.ts` ناجح شكليًا لكنه يُطبع `Benchmarking skipped due to missing jiwer/python environment` — بيئة Python/jiwer غير متوفرة، فلا توجد أرقام قياس OCR حقيقية من هذا التشغيل.
6. **شجرة عمل كبيرة غير ملتزَمة** (61 ملفًا متعقّبًا + ملفات جديدة) على فرع `fix/pipeline-runtime-fixes` — هذا التحقق صالح لهذه الشجرة بالذات، ويجب إعادة تشغيله بعد الالتزام/التنظيف.
7. **لم يُختبر خارج النطاق المطلوب:** مشاريع `integration` / `api` / `security` / `frontend`، وE2E (Playwright)، و`format:check`، و`secrets:scan`، والتغطية (coverage). الفشل في `unit` وحده كافٍ لمنع اعتبار الفرع أخضر في CI كاملًا.
8. **اعتماديات خارجية لم تُتحقق منها:** قاعدة بيانات Postgres وRedis وخدمات OCR (Gemini/Surya/Tesseract) — الاختبارات التي تعتمد عليها إما فشلت لعدم توفرها (Redis) أو تعمل بمحاكاة.

---

## 4) الخلاصة

- ✅ Lint نظيف، typecheck نظيف عبر 5 مشاريع، والبناء الإنتاجي (webpack/standalone) ينجح كاملًا بلا أخطاء تجميع.
- ❌ اختبارات الوحدات ليست خضراء: 39/1280 فاشلة (3%)، موزّعة بين فشل بيئي (Redis)، وخللَين سلوكيَّين يحتاجان قرارًا (تطبيع العربية/رموز الامتحان، ونطاق المدير)، و3 إصلاحات mocks، وخلل تجميع صفحات Surya.
- 📝 لم يُنشر أي شيء ولم يُدفع أي التزام — هذا التقرير هو المخرج الوحيد.
