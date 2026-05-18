# ابن الأزهر دوكس — دليل المساهمة | Ibn Al-Azhar Docs — Contributing Guide

> **التصنيف:** مجتمعي — مرجع لكل المساهمين الحاليين والجدد
> **الإصدار:** 4.0.0 | آخر تحديث: 2025-03-05
> **المرتبط:** أنظر `21_CONTRIBUTING.md` هذا الملف، `09_QA_TEST_PLAN.md` للمعايير، `22_REPO_STRUCTURE.md` لهيكل المستودع

---

## جدول المحتويات

1. [مرحبًا بك](#مرحبًا-بك)
2. [مدونة السلوك](#مدونة-السلوك)
3. [كيف تساهم](#كيف-تساهم)
4. [إعداد بيئة التطوير](#إعداد-بيئة-التطوير)
5. [أسلوب الكود](#أسلوب-الكود)
6. [سير العمل في Git](#سير-العمل-في-git)
7. [عملية Pull Request](#عملية-pull-request)
8. [متطلبات الاختبار](#متطلبات-الاختبار)
9. [التدويل](#التدويل)
10. [الثغرات الأمنية](#الثغرات-الأمنية)
11. [المجتمع](#المجتمع)

---

## مرحبًا بك

شكرًا لاهتمامك بالمساهمة في **Ibn Al-Azhar Docs — ابن الأزهر دوكس**! نحن نسعى لبناء منصة عربية مفتوحة المصدر لإدارة المستندات التعليمية، وكل مساهمة—مهما كانت صغيرة—تُحدِث فرقًا.

### من يمكنه المساهمة

| النوع | أمثلة |
|------|-------|
| **مطوّرون** | كتابة كود، إصلاح أخطاء، تحسين أداء |
| **مصمّمون** | تحسين واجهة المستخدم، أيقونات، تجربة المستخدم |
| **كُتّاب** | توثيق، ترجمة، مقالات تعليمية |
| **مختبرون** | الإبلاغ عن الأخطاء، اختبار الميزات الجديدة |
| **مستخدمون** | اقتراح ميزات، مشاركة تجربة الاستخدام |

لا تحتاج إلى أن تكون خبيرًا—هذا المشروع هو فرصة للتعلّم أيضًا.

### قراءة مطلوبة قبل المساهمة

| الدور | الوثائق المطلوبة |
|-------|-----------------|
| **مساهمو الواجهة (UI)** | [29_BRAND_IMPLEMENTATION_GUIDE.md](./29_BRAND_IMPLEMENTATION_GUIDE.md) — دليل تطبيق العلامة التجارية (الألوان الرسمية، خط Cairo، قواعد الاستخدام) |
| **مساهمو الميزات (Features)** | [31_SPEC_KIT_WORKFLOW.md](./31_SPEC_KIT_WORKFLOW.md) — سير عمل مجموعة المواصفات (no-code-before-spec، هيكل المواصفات) |
| **جميع المساهمين** | [04_UI_DESIGN_SYSTEM.md](./04_UI_DESIGN_SYSTEM.md) — نظام التصميم، [28_TERMINOLOGY_AND_NAMING_STANDARD.md](./28_TERMINOLOGY_AND_NAMING_STANDARD.md) — معايير التسمية |

---

## مدونة السلوك

### المبادئ

1. **الاحترام:** تعامل مع الجميع باحترام وتقدير بغض النظر عن الخلفية أو المستوى التقني
2. **البناء:** النقد البنّاء مرحب به—اقترح حلولًا بدلًا من التركيز على المشاكل فقط
3. **الشمولية:** استخدم لغة ترحيبية، وتجنب المصطلحات الاستبعادية
4. **الصبر:** ليس الجميع يتحدث العربية أو الإنجليزية بطلاقة—ساعد بدلًا من أن تنتقد
5. **التعاون:** اعمل مع الآخرين، لا تعمل ضدّهم

### الإبلاغ عن مخالفات

إذا تعرّضت لسلوك غير لائق أو شهدت ذلك، راسل: **conduct@ibn-al-azhar-docs.app**

تُعالج جميع البلاغات بسرية تامة.

---

## كيف تساهم

### الإبلاغ عن الأخطاء (Bug Reports)

قبل الإبلاغ، تأكد من:

1. **البحث أولًا:** ابحث في [Issues المفتوحة](https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs/issues) عن مشكلة مشابهة
2. **التأكد من الحداثة:** اختبر مع آخر إصدار (main branch)
3. **جمع المعلومات:** المتصفح، نظام التشغيل، خطوات الإعادة

#### قالب الإبلاغ عن خطأ

```markdown
## وصف الخطأ
[وصف واضح ومختصر]

## خطوات الإعادة
1. انتقل إلى '...'
2. انقر على '...'
3. مرّر إلى '...'
4. شاهد الخطأ

## السلوك المتوقّع
[ما الذي كان يجب أن يحدث]

## لقطات الشاشة
[إذا أمكن، أضف لقطات توضّح المشكلة]

## بيئة التشغيل
- نظام التشغيل: [مثال: Android 14]
- المتصفح: [مثال: Chrome 122]
- الإصدار: [مثال: v0.1.0]
- نوع الجهاز: [هاتف / حاسوب محمول / حاسوب مكتبي]

## سياق إضافي
[أي معلومات أخرى تساعد في فهم المشكلة]
```

### اقتراح ميزات (Feature Requests)

```markdown
## المشكلة
[وصف المشكلة أو الحاجة التي تقود لاقتراح هذه الميزة]

## الحل المقترَح
[وصف واضح للميزة المطلوبة]

## البدائل المُدرَكة
[البديلة الأخرى التي فكّرت فيها]

## السياق الإضافي
[مخططات، روابط، أمثلة من منتجات أخرى]
```

### المساهمات البرمجية (Code Contributions)

1. ابحث عن issue يحمل علامة `good first issue` أو `help wanted`
2. علّق على issue معلنًا عن رغبتك في العمل عليه
3. انتظر تعيينه لك (لتجنب تكرار العمل)
4. أنشئ فرعًا وابدأ العمل
5. افتح Pull Request عند الانتهاء

### المساهمات في التوثيق

- صحّح الأخطاء الإملائية والنحوية
- أضف أمثلة وتوضيحات
- ترجم أقسامًا إلى العربية أو الإنجليزية
- حسّن التنسيق والعرض

---

## إعداد بيئة التطوير

### المتطلبات الأساسية

| المتطلب | الإصدار | طريقة التثبيت |
|---------|---------|---------------|
| **Node.js** | 20.x LTS | `nvm install 20` أو `fnm install 20` |
| **pnpm** | 9.x | `corepack enable && corepack prepare pnpm@latest --activate` |
| **Docker** | 24.x+ | [docker.com/get-docker](https://docker.com/get-docker) |
| **Docker Compose** | v2.20+ | مضمّن مع Docker Desktop |
| **Git** | 2.40+ | مدير حزم النظام |
| **VS Code** (اختياري) | أحدث | مع الامتدادات الموصى بها |

### خطوات الإعداد

```bash
# 1. استنساخ المستودع (Fork ثم Clone)
git clone https://github.com/YOUR_USERNAME/ibn-al-azhar-docs.git
cd ibn-al-azhar-docs

# 2. إضافة المستودع الأصلي كـ upstream
git remote add upstream https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs.git

# 3. تثبيت التبعيات
pnpm install

# 4. نسخ ملف المتغيرات البيئية
cp .env.example .env

# 5. تحرير المتغيرات البيئية
# أهم المتغيرات لتعديلها:
#   AUTH_SECRET — توليد: openssl rand -hex 32
#   ADMIN_EMAIL — بريد المدير الأول
#   ADMIN_PASSWORD — كلمة مرور المدير الأول
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — من Google Cloud Console
$EDITOR .env

# 6. تشغيل الخدمات الأساسية (PostgreSQL, Redis, MinIO)
docker compose up -d db redis minio minio-init

# 7. تطبيق ترحيلات قاعدة البيانات وإنشاء Prisma Client
pnpm prisma migrate dev
pnpm prisma generate

# 8. بذر قاعدة البيانات (ينشئ حساب المدير من ADMIN_EMAIL/ADMIN_PASSWORD)
pnpm prisma db seed

# 9. تشغيل خادم التطوير
pnpm dev

# 10. التحقق من عمل كل شيء
# افتح http://localhost:3000/ar في المتصفح
```

### تشغيل Worker محليًا

```bash
# في نافذة طرفية منفصلة
WORKER_MODE=true pnpm worker:dev
```

### تشغيل الاختبارات

```bash
# اختبارات الوحدة (Vitest)
pnpm test:unit

# اختبارات التكامل (Vitest)
pnpm test:integration

# اختبارات E2E (Playwright)
pnpm test:e2e

# فحص الأنواع
pnpm typecheck

# فحص الأسلوب
pnpm lint
```

### المتغيرات البيئية المطلوبة

أنظر `.env.example` للقائمة الكاملة. المتغيرات الأساسية للتطوير:

```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=                          # openssl rand -hex 32
ADMIN_EMAIL=admin@example.com          # بريد المدير الأول
ADMIN_PASSWORD=                        # كلمة مرور المدير الأول
DATABASE_URL=postgresql://ibn_al_azhar_docs:ibn_al_azhar_docs_dev@localhost:5432/ibn_al_azhar_docs
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
GOOGLE_CLIENT_ID=                     # اختياري للتطوير
GOOGLE_CLIENT_SECRET=                 # اختياري للتطوير
```

> **ملاحظة:** يمكنك التطوير بدون Google OAuth—تسجيل الدخول عبر Credentials يعمل بدون إعداد Google.

---

## أسلوب الكود

### TypeScript

| القاعدة | المثال |
|---------|--------|
| استخدم `strict` mode | `"strict": true` في tsconfig.json |
| أنشئ أنواعًا صريحة، تجنب `any` | استخدم `unknown` بدل `any` عند الضرورة |
| استخدم `interface` للكائنات، `type` للاتحادات | `interface User { ... }` / `type Status = 'active' \| 'suspended'` |
| استخدم `enum` فقط للقيم الثابتة المعروفة | `enum Role { Student, Teacher, Admin }` |
| سمِّ الواردات والصادرات بأسماء واضحة | `export function validateFile()` وليس `export function vf()` |
| استخدم Optional Chaining وNullish Coalescing | `user?.name ?? 'مجهول'` |

### React / Next.js

| القاعدة | الشرح |
|---------|-------|
| **Server Component افتراضيًا** | لا تضف `'use client'` إلا عند الحاجة |
| **استخدم `'use client'` فقط عند الحاجة** | عندما تحتاج: `useState`, `useEffect`, event handlers, browser APIs |
| **مكوّن واحد لكل ملف** | ملف واحد = مكوّن واحد مُصدَّر افتراضيًا |
| **أسماء مكوّنات PascalCase** | `FileUploader.tsx` وليس `fileUploader.tsx` |
| **أسماء hooks بـ use-prefix** | `useSSE.ts` وليس `sseHook.ts` |
| **مكوّنات shadcn/ui في `components/ui/`** | لا تُعدِّل مكوّنات shadcn مباشرة—أنشئ wrapper |
| **فصل المنطق عن العرض** | استخدم custom hooks لاستخراج المنطق |
| **استخدم `next/link` للروابط** | وليس `<a>` عادي |

```typescript
// ✅ صحيح — Server Component
export default async function FilesPage() {
  const files = await getFiles();
  return <FileList files={files} />;
}

// ✅ صحيح — Client Component (عند الحاجة فقط)
'use client';
export function FileUploader() {
  const [uploading, setUploading] = useState(false);
  // ...
}
```

### Tailwind CSS

| القاعدة | المثال |
|---------|--------|
| استخدم utility classes مباشرة | `<div className="flex items-center gap-2">` |
| لا تُنشئ `@apply` مخصصة | استخدم `cva` (class variance authority) للأنماط المتكررة |
| استخدم logical properties لـ RTL | `ms-4` بدل `ml-4`، `me-4` بدل `mr-4` |
| استخدم `rtl:` variant عند الضرورة | `rtl:text-right ltr:text-left` |
| رتّب الأصناف بالترتيب المنطقي | layout → spacing → sizing → typography → colors → effects |

```typescript
// ✅ صحيح — RTL-friendly
<div className="flex items-center gap-2 ps-3 pe-4">

// ❌ خطأ — لا يعمل مع RTL
<div className="flex items-center gap-2 pl-3 pr-4">
```

### اصطلاحات التسمية

| العنصر | الاصطلاح | مثال |
|--------|----------|------|
| الملفات والمجلدات | kebab-case | `file-upload.tsx`, `use-sse.ts` |
| المكونات | PascalCase | `FileUploader`, `ConversionCard` |
| الدوال والمتغيرات | camelCase | `fetchFiles`, `isLoading` |
| الثوابت | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_DPI` |
| الأنواع (Types) | PascalCase | `ConversionStatus`, `FileMetadata` |
| واجهات (Interfaces) | PascalCase مع `I` اختياري | `User` أو `IUser` |
| مسارات API | kebab-case | `/api/files/upload`, `/api/conversions` |
| جداول قاعدة البيانات | PascalCase (Prisma) | `User`, `Conversion`, `File` |
| أعمدة قاعدة البيانات | camelCase (Prisma) | `createdAt`, `storageKey` |

---

## سير العمل في Git

### تسمية الفروع

| النوع | التنسيق | مثال |
|-------|---------|------|
| ميزة جديدة | `feat/وصف-مختصر` | `feat/file-upload-progress` |
| إصلاح خطأ | `fix/وصف-مختصر` | `fix/sse-reconnect-bug` |
| تحسين | `improve/وصف-مختصر` | `improve/ocr-retry-logic` |
| توثيق | `docs/وصف-مختصر` | `docs/api-reference` |
| إعادة بناء | `refactor/وصف-مختصر` | `refactor/auth-middleware` |
| اختبار | `test/وصف-مختصر` | `test/conversion-pipeline` |

### رسائل الالتزام (Conventional Commits)

نتبع [Conventional Commits](https://www.conventionalcommits.org/) v1.0.0:

```
<نوع>(<نطاق>): <وصف>

[نص إضافي اختياري]

[إشارات اختيارية]
```

#### الأنواع

| النوع | الاستخدام | مثال |
|-------|----------|------|
| `feat` | ميزة جديدة | `feat(upload): إضافة شريط تقدّم الرفع` |
| `fix` | إصلاح خطأ | `fix(sse): إصلاح إعادة الاتصال بعد انقطاع` |
| `docs` | توثيق | `docs(api): تحديث وثائق نقاط النهاية` |
| `style` | تنسيق (لا يغيّر المنطق) | `style(ui): توحيد مسافات في FileCard` |
| `refactor` | إعادة بناء | `refactor(auth): تبسيط middleware` |
| `perf` | تحسين أداء | `perf(worker): تقليل استهلاك الذاكرة` |
| `test` | إضافة/تعديل اختبارات | `test(ocr): إضافة اختبارات تنظيف النص` |
| `chore` | مهام صيانة | `chore(deps): تحديث التبعيات` |
| `ci` | تغييرات CI/CD | `ci: إضافة فحص Trivy للأمان` |

#### النطاقات الشائعة

`upload`, `ocr`, `conversion`, `export`, `auth`, `sse`, `pwa`, `ui`, `api`, `db`, `worker`, `i18n`, `docs`

> **ملاحظة:** `conversion` (استخراج OCR) و`export` (توليد ملف بصيغة) نطاقان منفصلان.

#### قواعد إضافية

- **اللغة:** الوصف بالعربية، النوع والنطاق بالإنجليزية
- **الزمن:** صيغة الأمر (أضف، أصلِح، حدِّث) وليس الماضي (أُضيف، أُصلِح)
- **الطول:** أقل من 72 حرفًا في السطر الأول
- **Breaking change:** أضف `!` بعد النوع أو `BREAKING CHANGE:` في النص الإضافي

```
feat(auth)!: تغيير آلية الجلسة إلى JWT فقط

BREAKING CHANGE: لا يعتمد بعد على database sessions.
يجب تحديث AUTH_SECRET في .env
```

### سير العمل

```
1. أنشئ فرعًا من main
   git checkout main
   git pull upstream main
   git checkout -b feat/my-feature

2. أكتب الكود مع التزامات صغيرة وواضحة
   git add .
   git commit -m "feat(scope): وصف التغيير"

3. حدِّث فرعك مع main بانتظام
   git fetch upstream
   git rebase upstream/main

4. ادفع إلى fork الخاص بك
   git push origin feat/my-feature

5. افتح Pull Request
```

---

## عملية Pull Request

### قائمة المراجعة قبل فتح PR

- [ ] الكود يعمل محليًا (`pnpm dev`)
- [ ] اجتاز فحص الأنواع (`pnpm typecheck`)
- [ ] اجتاز فحص الأسلوب (`pnpm lint`)
- [ ] اجتاز اختبارات الوحدة (`pnpm test:unit`)
- [ ] أضفت اختبارات جديدة للوظيفة المُضافة أو المُعدَّلة
- [ ] حدّثت التوثيق إذا لزم الأمر
- [ ] التزمت بـ Conventional Commits
- [ ] اختبرت الاتجاهين RTL وLTR
- [ ] لا توجد أخطاء في Console
- [ ] رسائل الالتزام نظيفة (أعيد كتابتها عبر interactive rebase عند الحاجة)

### قالب Pull Request

```markdown
## الوصف
[وصف واضح للتغييرات]

## نوع التغيير
- [ ] ميزة جديدة (feat)
- [ ] إصلاح خطأ (fix)
- [ ] تحسين (improve)
- [ ] إعادة بناء (refactor)
- [ ] توثيق (docs)
- [ ] اختبار (test)

## الاختبار
[كيف اختبرت هذا التغيير]

## لقطات الشاشة
[إذا كان التغيير يتضمن واجهة مستخدم]

## القائمة المراجعية
- [ ] اختبرت RTL وLTR
- [ ] أضفت/حدّثت اختبارات
- [ ] لا توجد تحذيرات جديدة في lint
- [ ] التوثيق مُحدَّث

## مرتبط
Closes #[issue-number]
```

### معايير المراجعة

| المعيار | التفصيل |
|---------|---------|
| **الصحة** | الكود يحقق المتطلب المذكور في issue |
| **الجودة** | كود نظيف، مُوثَّق، يتبع اصطلاحات المشروع |
| **الأمان** | لا ثغرات أمنية (XSS, injection, إلخ) |
| **الأداء** | لا تراجع ملحوظ في الأداء |
| **الاختبار** | تغطية اختبارية كافية للوظيفة الجديدة |
| **التوافق** | لا كسر للتوافق مع الإصدارات السابقة (أو مع توثيق واضح) |
| **RTL** | الواجهة تعمل بشكل صحيح بالاتجاهين |
| **i18n** | النصوص الجديدة مُترجَمة في ملفات الرسائل |

### متطلبات CI

جميع فحوصات CI التالية يجب أن تجتاز قبل دمج PR:

| الفحص | الأمر |
|-------|-------|
| Type Check | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Unit Tests | `pnpm test:unit --coverage` |
| Integration Tests | `pnpm test:integration` |
| Security Audit | `pnpm audit --audit-level=high` |

### قواعد الدمج

- **Squash and Merge** للفروع ذات الالتزامات الصغيرة المتعددة
- **Merge Commit** للفروع ذات الالتزامات المُنظَّمة جيدًا
- يتطلب موافقة مراجع واحد على الأقل
- لا تُدمَج PR بواسطة صاحبها—مراجع آخر يدمج

---

## متطلبات الاختبار

### اختبارات الوحدة (Unit Tests)

- **الإطار:** Vitest
- **تغطية مستهدفة:** 80% للكود الجديد
- **الموقع:** بجانب الملف المُختَبر (co-located)
  - `lib/validators/files.ts` → `lib/validators/files.test.ts`
  - `components/FileCard.tsx` → `components/FileCard.test.tsx`

```typescript
// مثال: lib/validators/files.test.ts
import { describe, it, expect } from 'vitest';
import { validateFile } from './files';

describe('validateFile', () => {
  it('يرفض ملفات أكبر من 100MB', () => {
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    expect(validateFile(largeFile)).toEqual({
      valid: false,
      error: 'FILE_TOO_LARGE',
    });
  });

  it('يقبل ملفات PDF صالحة', () => {
    const pdfFile = new File(['content'], 'doc.pdf', {
      type: 'application/pdf',
    });
    expect(validateFile(pdfFile)).toEqual({ valid: true });
  });
});
```

### اختبارات E2E (End-to-End)

- **الإطار:** Playwright
- **مطلوبة لـ:** تدفقات المستخدم الرئيسية (رفع، تحويل، تصدير، مصادقة)
- **الموقع:** `tests/e2e/`

```typescript
// مثال: tests/e2e/upload.spec.ts
import { test, expect } from '@playwright/test';

test('رفع ملف PDF وتحويله', async ({ page }) => {
  // تسجيل الدخول
  await page.goto('/ar/login');
  await page.fill('[name="email"]', 'test@ibn-al-azhar-docs.app');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // رفع ملف
  await page.goto('/ar/files');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/sample.pdf');
  await expect(page.locator('text=sample.pdf')).toBeVisible();

  // بدء التحويل (Conversion — OCR extraction)
  await page.click('text=تحويل');
  await expect(page.locator('text=جارٍ المعالجة')).toBeVisible();
});
```

### اختبار RTL

كل ميزة جديدة تتضمن واجهة مستخدم يجب اختبارها بالاتجاهين:

```typescript
// مثال: اختبار RTL
test('يعمل المكون بالاتجاهين', async ({ page }) => {
  // RTL — العربية
  await page.goto('/ar/files');
  const rtlDir = await page.getAttribute('html', 'dir');
  expect(rtlDir).toBe('rtl');

  // LTR — الإنجليزية
  await page.goto('/en/files');
  const ltrDir = await page.getAttribute('html', 'dir');
  expect(ltrDir).toBe('ltr');
});
```

---

## التدويل

### إضافة ترجمة جديدة

1. أضف المفتاح في `apps/web/messages/ar.json`:
```json
{
  "files": {
    "upload": {
      "dragDrop": "اسحب الملفات وأفلتها هنا",
      "browse": "أو تصفّح ملفاتك"
    }
  }
}
```

2. أضف المفتاح المقابل في `apps/web/messages/en.json`:
```json
{
  "files": {
    "upload": {
      "dragDrop": "Drag and drop files here",
      "browse": "Or browse your files"
    }
  }
}
```

3. استخدم الترجمة في المكوّن:
```typescript
import { useTranslations } from 'next-intl';

export function FileUploader() {
  const t = useTranslations('files.upload');
  return <p>{t('dragDrop')}</p>;
}
```

### اعتبارات RTL

| القاعدة | الشرح |
|---------|-------|
| استخدم CSS logical properties | `padding-inline-start` بدل `padding-left` |
| استخدم Tailwind logical utilities | `ps-4`, `pe-4`, `ms-2`, `me-2` |
| لا تُصلِب الاتجاه في CSS | دع `dir` attribute يتحكم |
| اختبر بالاتجاهين | RTL (عربي) وLTR (إنجليزي) |
| انتبه للأيقونات الاتجاهية | الأسهم والأيقونات يجب تنعكس مع RTL |
| استخدم `rtl:` variant عند الحاجة | `rtl:rotate-180` للأيقونات |

### ترتيب مفاتيح الترجمة

رتب المفاتيح حسب الصفحة ثم المكون ثم الوظيفة:

```json
{
  "common": { ... },          // مشترك
  "auth": {                    // صفحات المصادقة
    "login": { ... },
    "register": { ... }
  },
  "files": {                   // صفحات الملفات
    "list": { ... },
    "upload": { ... },
    "details": { ... }
  },
  "conversions": { ... },      // صفحات التحويلات (Conversion/OCR)
  "exports": { ... },          // صفحات التصدير (Export)
  "settings": { ... },         // صفحة الإعدادات
  "admin": { ... }             // لوحة الإدارة
}
```

---

## الثغرات الأمنية

### كيف تُبلِغ عن ثغرة أمنية

**لا تفتح Issue عام لثغرة أمنية.**

راسلنا عبر: **security@ibn-al-azhar-docs.app**

أو استخدم [GitHub Security Advisories](https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs/security/advisories/new)

### سياسة الإفصاح المسؤول

| المرحلة | الإجراء | الإطار الزمني |
|---------|---------|--------------|
| 1. الإبلاغ | المُبلِّغ يرسل التفاصيل عبر القنوات الآمنة | — |
| 2. التأكيد | الفريق يؤكد الثغرة ويُقيّم خطورتها | 48 ساعة |
| 3. الإصلاح | الفريق يعمل على إصلاح الثغرة | حسب الخطورة: حرج 7 أيام، عالي 14 يوم |
| 4. الإشعار | يُرسَل إشعار للمُبلِّغ بالإصلاح | عند الدمج |
| 5. النشر | يُنشَر الإصلاح مع ملاحظات الإصدار | مع الإصدار التالي |
| 6. الإفصاح | يُفصَح عن تفاصيل الثغرة بعد النشر | 30 يوم بعد النشر |

### نطاق البرنامج

| داخل النطاق | خارج النطاق |
|-------------|-------------|
| SQL injection | Denial of Service |
| XSS (Cross-Site Scripting) | أخطاء تهجئة |
| CSRF | مشاكل لا تؤثر على المستخدمين |
| مصادقة مكسورة | مشاكل تتطلب وصولًا فعليًا للخادم |
| تسريب بيانات | إصدارات قديمة من التبعيات (أبلغ لمزودها) |
| تخزين ملفات غير آمن | |

أنظر `08_SECURITY_PRIVACY.md` للتفاصيل الكاملة.

---

## المجتمع

### قنوات التواصل

| القناة | الغرض | الرابط |
|--------|-------|--------|
| **GitHub Discussions** | نقاشات عامة، أسئلة، اقتراحات | [github.com/ibn-al-azhar-docs/ibn-al-azhar-docs/discussions](https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs/discussions) |
| **GitHub Issues** | تقارير الأخطاء، طلبات الميزات | [github.com/ibn-al-azhar-docs/ibn-al-azhar-docs/issues](https://github.com/ibn-al-azhar-docs/ibn-al-azhar-docs/issues) |
| **Discord** | محادثات فورية، مساعدة سريعة | [discord.gg/ibn-al-azhar-docs](https://discord.gg/ibn-al-azhar-docs) |
| **البريد الإلكتروني** | استفسارات عامة | community@ibn-al-azhar-docs.app |

### الاجتماعات الدورية

| الاجتماع | التكرار | المدة | المحتوى |
|----------|---------|-------|---------|
| **تقويم Phase** | أسبوعي | 30 دقيقة | مراجعة تقدّم Phase، تحديث الأولويات |
| **مراجعة المجتمع** | شهري | 60 دقيقة | عرض الميزات الجديدة، جمع الملاحظات |
| **مراجعة تقنية** | نصف شهري | 45 دقيقة | مناقشة القرارات التقنية، مراجعة PRs المعقدة |

### نظام التقدير

نُقدّر المساهمات عبر:

- **شكر علني** في ملاحظات الإصدار (Release Notes)
- **علامة `contributor`** في GitHub
- **قائمة المساهمين** في README
- **تقدير شهري** لأكثر المساهمين نشاطًا
- **دعوة للمساهمة المستمرة** بعد مساهمات متعددة ذات جودة عالية

### أول مساهمة

إذا كانت هذه أول مساهمة لك، ابحث عن Issues تحمل العلامات:

| العلامة | المعنى |
|--------|--------|
| `good first issue` | مناسبة للمبتدئين—نطاق محدد وواضح |
| `help wanted` | نحتاج مساعدة المجتمع فيها |
| `documentation` | تحسينات في التوثيق—لا تتطلب كود |
| `i18n` | ترجمة وتدويل |
| `accessibility` | تحسينات في الوصولية |
