# ابن الأزهر دوكس — مخطط قاعدة البيانات

> **Ibn Al-Azhar Docs — Database Schema Document**
> الإصدار: 4.0.0 | آخر تحديث: 2025-03-06
> التصنيف: مرجع تنفيذي — Prisma Schema نهائي جاهز للاستخدام

---

## جدول المحتويات

1. [نظرة عامة على ERD](#1-نظرة-عامة-على-erd)
2. [المخطط الحالي (MVP)](#2-المخطط-الحالي-mvp)
3. [المخطط المستقبلي (V2/V3)](#3-المخطط-المستقبلي-v2v3)
4. [تفصيل الجداول](#4-تفصيل-الجداول)
5. [استراتيجية الحذف الناعم](#5-استراتيجية-الحذف-الناعم)
6. [سياسة الاحتفاظ بالبيانات](#6-سياسة-الاحتفاظ-بالبيانات)
7. [استراتيجية الترحيل](#7-استراتيجية-الترحيل)
8. [استراتيجية الفهرسة](#8-استراتيجية-الفهرسة)
9. [Prisma Schema النهائي](#9-prisma-schema-النهائي)

---

## 1. نظرة عامة على ERD

### 1.1 الرسم النصي للعلاقات

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    User      │       │   Folder     │       │      File       │
├─────────────┤       ├─────────────┤       ├─────────────────┤
│ id (PK)     │──┐    │ id (PK)     │──┐    │ id (PK)         │
│ email       │  │    │ name        │  │    │ name            │
│ passwordHash│  │    │ parentId(FK)│◄─┤    │ folderId (FK)   │──► Folder
│ name        │  │    │ ownerId(FK) │◄─┼───│ ownerId (FK)    │──► User
│ role        │  │    └─────────────┘  │    │ mimeType        │
│ status      │  │                     │    │ sizeBytes       │
│ avatarUrl   │  │    ┌─────────────────┐   │ storageKey      │
│ preferences │  │    │  ShareLink      │   │ status          │
│ storageUsed │  │    ├─────────────────┤   │ sourceType      │
└──────┬──────┘  │    │ id (PK)        │   │ pageCount       │
       │         │    │ fileId (FK)    │──►│ dpi             │
       │         │    │ folderId (FK)  │──►│ ocrEngine       │
       │         ├───►│ ownerId (FK)   │   │ deletedAt       │
       │         │    │ token          │   └────────┬────────┘
       │         │    │ permission     │            │
       │         │    │ expiresAt      │            │ 1:N
       │         │    └─────────────────┘            │
       │         │                          ┌───────▼──────────┐
       │         │                          │  ConvertedFile   │
       │         │                          ├──────────────────┤
       │         │                          │ id (PK)          │
       │         │                          │ fileId (FK)      │──► File
       │         │                          │ storageKey       │
       │         │                          │ sizeBytes        │
       │         │                          │ qualityScore     │
       │         │                          └──────────────────┘
       │         │
       │    ┌────▼─────────────┐       ┌──────────────────────┐
       │    │  ActivityLog     │       │     Conversion       │
       │    ├──────────────────┤       ├──────────────────────┤
       │    │ id (PK)          │       │ id (PK)              │
       ├───►│ userId (FK)      │  ┌───►│ userId (FK)          │──► User
       │    │ action           │  │    │ status               │
       │    │ resourceId       │  │    │ settings             │
       │    │ resourceType     │  │    │ totalFiles           │
       │    │ details          │  │    │ completedFiles       │
       │    │ ipAddress        │  │    │ failedFiles          │
       │    │ userAgent        │  │    │ errorMessage         │
       │    └──────────────────┘  │    └──────────┬───────────┘
       │                          │               │ 1:N
       │                          │    ┌──────────▼───────────┐
       │                          │    │  ConversionFile      │
       │                          │    ├──────────────────────┤
       │                          │    │ id (PK)              │
       │                          ├───►│ conversionId (FK)    │──► Conversion
       │                          │    │ fileId (FK)          │──► File
       │                          │    │ status               │
       │                          │    │ currentPage          │
       │                          │    │ totalPages           │
       │                          │    │ percentage           │
       │                          │    │ errorMessage         │
       │                          │    └──────────────────────┘
       │                          │
       │                          │    ┌──────────────────────┐
       │                          │    │  Export              │
       │                          │    ├──────────────────────┤
       │                          │    │ id (PK)              │
       │                          │    │ conversionId (FK)    │──► Conversion
       │                          │    │ fileId (FK)          │──► File
       │                          │    │ format               │
       │                          │    │ storageKey           │
       │                          │    │ sizeBytes            │
       │                          │    │ status               │
       │                          │    └──────────────────────┘
       │                          │
       │    ┌─────────────────────┤    ┌──────────────────────┐
       │    │  NextAuth.js        │    │  NextAuth.js          │
       │    ├─────────────────────┤    ├──────────────────────┤
       ├───►│  Account           │    │  Session              │
       │    │  id (PK)           │    │  id (PK)              │
       │    │  userId (FK)       │    │  sessionToken         │
       │    │  provider          │    │  userId (FK)          │──► User
       │    │  providerAccountId │    │  expires              │
       │    └────────────────────┘    └──────────────────────┘
       │
       │    ┌──────────────────────┐
       │    │ VerificationToken    │
       │    ├──────────────────────┤
       └───►│ identifier          │
            │ token               │
            │ expires             │
            └──────────────────────┘
```

### 1.2 ملخص العلاقات

| من | إلى | النوع | الوصف |
|----|-----|-------|-------|
| User | Folder | 1:N | مستخدم يملك مجلدات |
| User | File | 1:N | مستخدم يملك ملفات |
| User | Conversion | 1:N | مستخدم ينشئ تحويلات |
| User | ShareLink | 1:N | مستخدم يُنشئ روابط مشاركة |
| User | ActivityLog | 1:N | مستخدم يُنشئ سجلات نشاط |
| User | Account | 1:N | مستخدم لديه حسابات OAuth |
| User | Session | 1:N | مستخدم لديه جلسات |
| Folder | Folder | self-ref | مجلد يحتوي مجلدات فرعية |
| Folder | File | 1:N | مجلد يحتوي ملفات |
| Folder | ShareLink | 1:N | مجلد يُشارَك عبر روابط |
| File | ConvertedFile | 1:N | ملف له نتائج تحويل متعددة |
| File | ShareLink | 1:N | ملف يُشارَك عبر روابط |
| File | ConversionFile | 1:N | ملف يظهر في تحويلات متعددة |
| File | Export | 1:N | ملف له تصديرات متعددة |
| Conversion | ConversionFile | 1:N | تحويل يحتوي ملفات متعددة |
| Conversion | Export | 1:N | تحويل له تصديرات متعددة |
| ConversionFile | ConvertedFile | 1:1 | ملف تحويل → نتيجة واحدة |

---

## 2. المخطط الحالي (MVP)

### 2.1 الجداول المطلوبة

| الجدول | الوصف | الأولوية |
|--------|-------|---------|
| User | بيانات المستخدمين | MVP |
| Folder | المجلدات التنظيمية | MVP |
| File | الملفات المرفوعة | MVP |
| ConvertedFile | نتائج التحويل (OCR text) | MVP |
| Conversion | عمليات التحويل (OCR extraction) | MVP |
| ConversionFile | ملفات داخل تحويل | MVP |
| Export | تصديرات بصيغ محددة | MVP |
| ShareLink | روابط المشاركة | MVP |
| ActivityLog | سجل النشاط | MVP |
| Account | حسابات OAuth (NextAuth) | MVP |
| Session | الجلسات (NextAuth) | MVP |
| VerificationToken | رموز التحقق (NextAuth) | MVP |

---

## 3. المخطط المستقبلي (V2/V3)

### 3.1 V2 — الإشعارات

```prisma
model Notification {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String   // "conversion_complete", "share_received", "storage_warning"
  title      String
  message    String
  isRead     Boolean  @default(false)
  actionUrl  String?  // رابط الإجراء
  metadata   Json?    // بيانات إضافية
  readAt     DateTime?
  createdAt  DateTime @default(now())

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}
```

### 3.2 V2 — إصدارات الملفات

```prisma
model FileVersion {
  id           String   @id @default(cuid())
  fileId       String
  file         File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  version      Int      // رقم الإصدار (1, 2, 3, ...)
  storageKey   String   // مفتاح MinIO لهذا الإصدار
  sizeBytes    BigInt
  mimeType     String
  changeDescription String?
  createdById  String
  createdBy    User     @relation(fields: [createdById], references: [id])
  createdAt    DateTime @default(now())

  @@unique([fileId, version])
  @@index([fileId, version])
  @@map("file_versions")
}
```

### 3.3 V3 — المؤسسات

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  plan        String   @default("free") // "free", "pro", "enterprise"
  storageUsed BigInt   @default(0)
  storageLimit BigInt  @default(10737418240) // 10GB
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  memberships Membership[]
  folders     Folder[]
  files       File[]

  @@map("organizations")
}

model Membership {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           String       @default("member") // "owner", "admin", "member"
  status         String       @default("active")  // "active", "invited", "removed"
  joinedAt       DateTime     @default(now())

  @@unique([organizationId, userId])
  @@index([userId])
  @@map("memberships")
}
```

---

## 4. تفصيل الجداول

### 4.1 User

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `email` | String | لا | - | - | unique, max(255) |
| `passwordHash` | String? | نعم | null | - | null للمستخدمين عبر OAuth فقط |
| `name` | String | لا | - | - | max(100) |
| `role` | Enum | لا | `student` | - | `student`, `teacher`, `admin` |
| `status` | Enum | لا | `active` | - | `active`, `suspended`, `pending` |
| `avatarUrl` | String? | نعم | null | - | max(500) |
| `preferences` | Json | لا | `{}` | - | locale, theme, إلخ |
| `storageUsed` | BigInt | لا | `0` | - | بالبايت |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**العلاقات**:
- `folders`: Folder[] (عكسي: ownerId)
- `files`: File[] (عكسي: ownerId)
- `conversions`: Conversion[] (عكسي: userId)
- `shareLinks`: ShareLink[] (عكسي: ownerId)
- `activityLogs`: ActivityLog[] (عكسي: userId)
- `accounts`: Account[] (NextAuth)
- `sessions`: Session[] (NextAuth)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `User_email_key` | email | UNIQUE | تسجيل الدخول، البحث |
| `User_role_idx` | role | INDEX | تصفية المديرين |
| `User_status_idx` | status | INDEX | تصفية الحسابات النشطة |

---

### 4.2 Folder

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `name` | String | لا | - | - | max(100) |
| `parentId` | String? | نعم | null | FK → Folder.id | self-reference |
| `ownerId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |
| `deletedAt` | DateTime? | نعم | null | - | soft delete |

**العلاقات**:
- `parent`: Folder? (عكسي: parentId) → self-reference
- `children`: Folder[] (عكسي: parentId)
- `owner`: User (عكسي: folders)
- `files`: File[] (عكسي: folderId)
- `shareLinks`: ShareLink[] (عكسي: folderId)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `Folder_ownerId_parentId_idx` | ownerId, parentId | COMPOSITE | جلب محتويات مجلد |
| `Folder_parentId_idx` | parentId | INDEX | التنقل في الشجرة |
| `Folder_deletedAt_idx` | deletedAt | INDEX | استبعاد المحذوفات |
| `Folder_ownerId_name_idx` | ownerId, name | COMPOSITE | البحث عن مجلد بالاسم |

**القيود**:
- لا يمكن أن يكون parentId = id (دوري ذاتي)
- عمق المجلدات أقصاه 10 مستويات (يُتحقق في application layer)

---

### 4.3 File

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `name` | String | لا | - | - | max(255) |
| `folderId` | String? | نعم | null | FK → Folder.id | onDelete: SetNull |
| `ownerId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `mimeType` | String | لا | - | - | max(100) |
| `sizeBytes` | BigInt | لا | - | - | ≥ 0, ≤ 100MB |
| `storageKey` | String | لا | - | - | max(500)، مسار MinIO |
| `status` | Enum | لا | `ready` | - | `ready`, `processing`, `error` |
| `sourceType` | Enum | لا | - | - | `pdf`, `image` |
| `pageCount` | Int? | نعم | null | - | يُملأ بعد التحليل |
| `dpi` | Int? | نعم | null | - | يُملأ بعد التقسيم |
| `ocrEngine` | String? | نعم | null | - | `google-drive`، إلخ |
| `deletedAt` | DateTime? | نعم | null | - | soft delete |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**العلاقات**:
- `folder`: Folder? (عكسي: files)
- `owner`: User (عكسي: files)
- `convertedFiles`: ConvertedFile[] (عكسي: fileId)
- `conversionFiles`: ConversionFile[] (عكسي: fileId)
- `exports`: Export[] (عكسي: fileId)
- `shareLinks`: ShareLink[] (عكسي: fileId)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `File_ownerId_folderId_idx` | ownerId, folderId | COMPOSITE | جلب ملفات مجلد المستخدم |
| `File_ownerId_status_idx` | ownerId, status | COMPOSITE | تصفية حسب الحالة |
| `File_storageKey_key` | storageKey | UNIQUE | الوصول المباشر للملف |
| `File_mimeType_idx` | mimeType | INDEX | تصفية حسب النوع |
| `File_deletedAt_idx` | deletedAt | INDEX | استبعاد المحذوفات |
| `File_ownerId_name_idx` | ownerId, name | COMPOSITE | البحث بالاسم |

**القيود**:
- mimeType يجب أن يكون من الأنواع المدعومة (يُتحقق في application layer)
- sizeBytes يجب أن يكون ≤ 100MB (يُتحقق قبل الرفع)
- storageKey فريد عالميًا (UUID في المسار)

---

### 4.4 ConvertedFile

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `fileId` | String | لا | - | FK → File.id | onDelete: Cascade |
| `storageKey` | String | لا | - | - | max(500)، مسار MinIO |
| `sizeBytes` | BigInt | لا | - | - | ≥ 0 |
| `qualityScore` | Float? | نعم | null | - | 0.0 - 1.0 |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**العلاقات**:
- `file`: File (عكسي: convertedFiles)

**ملاحظة**: هذا الجدول يخزن نتيجة OCR المستخرجة (نص خام). لم يعد يحتوي على حقل `format` — تنسيق التصدير يُحدد عند إنشاء Export، وليس عند التحويل.

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `ConvertedFile_fileId_key` | fileId | UNIQUE | نتيجة OCR واحدة لكل ملف |

**القيود**:
- ملف واحد لا يمكن أن يكون له أكثر من نتيجة OCR واحدة (unique constraint على fileId)
- qualityScore يُحسب بناءً على جودة OCR (نسبة النص المُستخرج)

---

### 4.5 Conversion

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `userId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `status` | Enum | لا | `queued` | - | `queued`, `processing`, `completed`, `failed`, `cancelled` |
| `settings` | Json | لا | `{}` | - | إعدادات التحويل (بدون format) |
| `totalFiles` | Int | لا | `0` | - | ≥ 0 |
| `completedFiles` | Int | لا | `0` | - | ≥ 0 |
| `failedFiles` | Int | لا | `0` | - | ≥ 0 |
| `errorMessage` | String? | نعم | null | - | max(1000) |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**حقل `settings` (Json)**:
```typescript
interface ConversionSettings {
  ocrEngine: 'google-drive';
  language: 'ar' | 'en' | 'auto';
  dpi: number;         // 150-600
}
```

> **تغيير مهم**: تم إزالة حقل `format` من `ConversionSettings`. التحويل يقوم باستخراج النص عبر OCR فقط. لتحديد صيغة التصدير، يُستخدم جدول `Export` المنفصل مع `conversionId` + `format`.

**العلاقات**:
- `user`: User (عكسي: conversions)
- `files`: ConversionFile[] (عكسي: conversionId)
- `exports`: Export[] (عكسي: conversionId)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `Conversion_userId_status_idx` | userId, status | COMPOSITE | جلب تحويلات المستخدم حسب الحالة |
| `Conversion_status_createdAt_idx` | status, createdAt | COMPOSITE | العثور على تحويلات عالقة |
| `Conversion_userId_createdAt_idx` | userId, createdAt | COMPOSITE | ترتيب زمني |

---

### 4.6 ConversionFile

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `conversionId` | String | لا | - | FK → Conversion.id | onDelete: Cascade |
| `fileId` | String | لا | - | FK → File.id | onDelete: Cascade |
| `status` | Enum | لا | `pending` | - | `pending`, `preparing`, `splitting`, `ocr`, `writing`, `done`, `failed` |
| `currentPage` | Int | لا | `0` | - | ≥ 0 |
| `totalPages` | Int | لا | `0` | - | ≥ 0 |
| `percentage` | Float | لا | `0` | - | 0.0 - 100.0 |
| `errorMessage` | String? | نعم | null | - | max(1000) |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**العلاقات**:
- `conversion`: Conversion (عكسي: files)
- `file`: File (عكسي: conversionFiles)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `ConversionFile_conversionId_idx` | conversionId | INDEX | جلب ملفات تحويل |
| `ConversionFile_conversionId_status_idx` | conversionId, status | COMPOSITE | متابعة التقدم |
| `ConversionFile_fileId_idx` | fileId | INDEX | البحث عن تحويلات ملف |

**القيود**:
- لا يمكن تكرار نفس الملف في نفس التحويل (unique: conversionId + fileId)

---

### 4.7 Export

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `conversionId` | String | لا | - | FK → Conversion.id | onDelete: Cascade |
| `fileId` | String | لا | - | FK → File.id | onDelete: Cascade |
| `format` | Enum | لا | - | - | `txt`, `docx`, `json` |
| `storageKey` | String? | نعم | null | - | max(500)، مسار MinIO — يُملأ بعد الاكتمال |
| `sizeBytes` | BigInt? | نعم | null | - | ≥ 0 — يُملأ بعد الاكتمال |
| `status` | Enum | لا | `pending` | - | `pending`, `processing`, `completed`, `failed` |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**العلاقات**:
- `conversion`: Conversion (عكسي: exports)
- `file`: File (عكسي: exports)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `Export_conversionId_format_key` | conversionId, format | UNIQUE | تصدير واحد لكل تحويل بصيغة محددة |
| `Export_conversionId_idx` | conversionId | INDEX | جلب تصديرات تحويل |
| `Export_fileId_idx` | fileId | INDEX | جلب تصديرات ملف |
| `Export_format_idx` | format | INDEX | تصفية حسب الصيغة |
| `Export_status_idx` | status | INDEX | متابعة حالة التصدير |

**القيود**:
- لا يمكن تكرار التصدير بنفس التحويل والصيغة (unique: conversionId + format)
- يجب أن يكون التحويل بحالة `completed` قبل إنشاء تصدير (يُتحقق في application layer)
- storageKey و sizeBytes يكونان null حتى يكتمل التصدير

---

### 4.8 ShareLink

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `fileId` | String? | نعم | null | FK → File.id | onDelete: Cascade |
| `folderId` | String? | نعم | null | FK → Folder.id | onDelete: Cascade |
| `ownerId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `token` | String | لا | auto-generated | - | UNIQUE, VarChar(128) |
| `permission` | Enum | لا | `view` | - | `view`, `download` |
| `expiresAt` | DateTime? | نعم | null | - | null = لا ينتهي |
| `downloadCount` | Int | لا | `0` | - | ≥ 0 |
| `isActive` | Boolean | لا | `true` | - | - |
| `createdAt` | DateTime | لا | `now()` | - | - |
| `updatedAt` | DateTime | لا | auto | - | - |

**العلاقات**:
- `file`: File? (عكسي: shareLinks)
- `folder`: Folder? (عكسي: shareLinks)
- `owner`: User (عكسي: shareLinks)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `ShareLink_token_key` | token | UNIQUE | الوصول عبر الرابط |
| `ShareLink_ownerId_idx` | ownerId | INDEX | جلب روابط المستخدم |
| `ShareLink_fileId_idx` | fileId | INDEX | جلب روابط ملف |
| `ShareLink_expiresAt_isActive_idx` | expiresAt, isActive | COMPOSITE | تنظيف الروابط المنتهية |

**القيود**:
- يجب توفير fileId أو folderId (واحد على الأقل)
- token يُنشأ تلقائيًا عبر `crypto.randomBytes(32).toString('hex')` — يُنتج 64 حرفًا سداسيًا عشوائيًا
- حقل `token` من نوع VarChar(128) لاستيعاب الـ64 حرفًا مع هامش أمان
- expiresAt يجب أن يكون في المستقبل (إن وُجد)، أقصى 30 يوم

---

### 4.9 ActivityLog

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `userId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `action` | String | لا | - | - | max(50) |
| `resourceId` | String? | نعم | null | - | معرّف المورد المتأثر |
| `resourceType` | String? | نعم | null | - | `File`, `Folder`, `Conversion`, `Export`, `ShareLink`, `User` |
| `details` | Json? | نعم | null | - | تفاصيل إضافية |
| `ipAddress` | String? | نعم | null | - | max(45)، IPv4/IPv6 |
| `userAgent` | String? | نعم | null | - | max(500) |
| `createdAt` | DateTime | لا | `now()` | - | - |

**العلاقات**:
- `user`: User (عكسي: activityLogs)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `ActivityLog_userId_createdAt_idx` | userId, createdAt | COMPOSITE | سجل نشاط المستخدم |
| `ActivityLog_action_idx` | action | INDEX | تصفية حسب نوع النشاط |
| `ActivityLog_resourceType_resourceId_idx` | resourceType, resourceId | COMPOSITE | سجل نشاط مورد |
| `ActivityLog_createdAt_idx` | createdAt | INDEX | تنظيف البيانات القديمة |

**القيود**:
- هذا الجدول للإدراج فقط (INSERT) — لا يُحدّث ولا يُحذف (إلا عبر retention policy)
- لا يوجد `updatedAt` — السجلات ثابتة

---

### 4.10 Account (NextAuth.js)

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `userId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `type` | String | لا | - | - | `oauth`, `credentials` |
| `provider` | String | لا | - | - | `google`, `credentials` |
| `providerAccountId` | String | لا | - | - | - |
| `refresh_token` | String? | نعم | null | - | - |
| `access_token` | String? | نعم | null | - | - |
| `expires_at` | Int? | نعم | null | - | - |
| `token_type` | String? | نعم | null | - | - |
| `scope` | String? | نعم | null | - | - |
| `id_token` | String? | نعم | null | - | - |
| `session_state` | String? | نعم | null | - | - |

**العلاقات**:
- `user`: User (عكسي: accounts)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `Account_provider_providerAccountId_key` | provider, providerAccountId | UNIQUE | مطابقة حساب OAuth |

---

### 4.11 Session (NextAuth.js)

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `id` | String (cuid) | لا | auto-generated | PK | - |
| `sessionToken` | String | لا | - | - | UNIQUE |
| `userId` | String | لا | - | FK → User.id | onDelete: Cascade |
| `expires` | DateTime | لا | - | - | - |

**العلاقات**:
- `user`: User (عكسي: sessions)

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `Session_sessionToken_key` | sessionToken | UNIQUE | البحث عن جلسة |

---

### 4.12 VerificationToken (NextAuth.js)

| الحقل | النوع | Nullable | افتراضي | العلاقة | القيد |
|-------|------|----------|---------|---------|-------|
| `identifier` | String | لا | - | - | بريد إلكتروني أو معرّف |
| `token` | String | لا | - | - | UNIQUE |
| `expires` | DateTime | لا | - | - | - |

**ملاحظة**: هذا الجدول لا يحتوي على `id` أو علاقة مباشرة بـ User. NextAuth.js يتعامل معه كـ composite unique.

**الفهارس**:
| الاسم | الحقول | النوع | السبب |
|-------|--------|------|-------|
| `VerificationToken_identifier_token_key` | identifier, token | UNIQUE | التحقق من الرمز |

---

## 5. استراتيجية الحذف الناعم

### 5.1 الآلية

يُستخدم حقل `deletedAt` (Nullable DateTime) في الجداول التي تحتوي على بيانات قابلة للاسترداد:

| الجدول | يدعم Soft Delete | حقل deletedAt |
|--------|-----------------|---------------|
| User | لا | لا يوجد (الحذف عبر `status: suspended`) |
| Folder | **نعم** | `deletedAt` |
| File | **نعم** | `deletedAt` |
| ConvertedFile | لا | يُحذف فعليًا مع الملف الأصلي |
| Conversion | لا | يحتفظ بالسجل للأرشفة |
| ConversionFile | لا | يُحذف مع Conversion |
| Export | لا | يُحذف مع Conversion أو الملف |
| ShareLink | لا | يُعطّل عبر `isActive = false` |
| ActivityLog | لا | لا يُحذف أبدًا (إلا عبر retention) |

### 5.2 تدفق الحذف

```
حذف ملف:
  1. تعيين file.deletedAt = now()
  2. تحديث user.storageUsed -= file.sizeBytes
  3. تعطيل shareLinks المرتبطة (isActive = false)
  4. إلغاء conversionFiles النشطة
  5. [بعد 30 يوم] حذف من MinIO + حذف سجل DB نهائيًا

حذف مجلد:
  1. تعيين folder.deletedAt = now()
  2. تعيين deletedAt لجميع المجلدات الفرعية والملفات (recursive)
  3. تحديث storageUsed لجميع الملفات المحذوفة
  4. [بعد 30 يوم] حذف نهائي
```

### 5.3 الاستعلام مع Soft Delete

جميع الاستعلامات تتبع نمطًا موحدًا:

```typescript
// ✅ صحيح — يستبعد المحذوفات
const files = await prisma.file.findMany({
  where: {
    ownerId: userId,
    deletedAt: null,  // يستبعد المحذوفات ناعميًا
  },
});

// ❌ خطأ — يُرجع المحذوفات أيضًا
const files = await prisma.file.findMany({
  where: { ownerId: userId },
});
```

**تحسين مستقبلي**: إضافة Prisma middleware يعمل كـ global filter على `deletedAt: null`.

### 5.4 سياسة الاحتفاظ بعد الحذف الناعم

| الجدول | فترة الاحتفاظ بعد الحذف الناعم | الإجراء بعد انتهاء الفترة |
|--------|-------------------------------|--------------------------|
| File | 30 يوم | حذف من MinIO + حذف سجل DB |
| Folder | 30 يوم | حذف سجل DB (الملفات تُحذف أولًا) |
| ShareLink | فوري (isActive = false) | حذف سجل DB بعد 90 يوم |

---

## 6. سياسة الاحتفاظ بالبيانات

### 6.1 فترات الاحتفاظ

| نوع البيانات | فترة الاحتفاظ | الإجراء |
|-------------|-------------|--------|
| بيانات المستخدمين | حتى حذف الحساب | حذف كامل عند طلب المستخدم |
| الملفات المرفوعة | حتى حذف المستخدم | حذف بعد 30 يوم من soft delete |
| نتائج التحويل | حتى حذف الملف الأصلي | حذف مع الملف |
| التصديرات | حتى حذف التحويل أو الملف | حذف مع الملف |
| سجل النشاط | 90 يوم | حذف تلقائي بعد 90 يوم |
| الجلسات | حتى انتهاء الصلاحية (24 ساعة) | حذف تلقائي |
| رموز التحقق | حتى انتهاء الصلاحية (1 ساعة) | حذف تلقائي |
| روابط المشاركة | حتى انتهاء الصلاحية أو الإلغاء | حذف بعد 90 يوم من التعطيل |

### 6.2 تنظيف البيانات التلقائي

```typescript
// jobs/retention-cleanup.job.ts
// يُشغّل يوميًا عبر BullMQ repeatable job

async function retentionCleanup() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // 1. حذف الملفات المحذوفة ناعميًا منذ أكثر من 30 يوم
  const expiredFiles = await prisma.file.findMany({
    where: { deletedAt: { lte: thirtyDaysAgo } },
    select: { id: true, storageKey: true },
  });

  for (const file of expiredFiles) {
    await minioClient.removeObject('ibn-al-azhar-docs-files', file.storageKey);
    await prisma.file.delete({ where: { id: file.id } });
  }

  // 2. حذف المجلدات المحذوفة ناعميًا
  await prisma.folder.deleteMany({
    where: { deletedAt: { lte: thirtyDaysAgo } },
  });

  // 3. حذف سجلات النشاط القديمة
  await prisma.activityLog.deleteMany({
    where: { createdAt: { lte: ninetyDaysAgo } },
  });

  // 4. حذف روابط المشاركة المعطلة القديمة
  await prisma.shareLink.deleteMany({
    where: {
      isActive: false,
      updatedAt: { lte: ninetyDaysAgo },
    },
  });

  logger.info({
    deletedFiles: expiredFiles.length,
    retentionPeriod: '30d files, 90d logs',
  }, 'Retention cleanup completed');
}
```

---

## 7. استراتيجية الترحيل

### 7.1 نهج الترحيل

يُستخدم **Prisma Migrate** كأداة ترحيل أساسية:

```bash
# إنشاء ترحيل جديد
npx prisma migrate dev --name add_export_table

# تطبيق الترحيلات في الإنتاج
npx prisma migrate deploy

# التراجع عن ترحيل (بيئة التطوير فقط)
npx prisma migrate reset
```

### 7.2 قواعد الترحيل

| القاعدة | التفاصيل |
|---------|---------|
| لا تعديل ترحيل سابق | بمجرد دمجه، الترحيل لا يُعدّل |
| ترحيل واحد لكل PR | كل PR يحتوي ترحيل واحد على الأكثر |
| Seed بعد الترحيل | `prisma db seed` يُشغّل بعد كل `migrate dev` |
| Backup قبل الإنتاج | `pg_dump` قبل كل `migrate deploy` |
| Zero-downtime | الترحيلات لا تُغلق الأعمدة الموجودة |

### 7.3 استراتيجية الترحيل بدون توقف

```
الخطوة 1: إضافة عمود جديد (nullable) ← التطبيق يتجاهله
الخطوة 2: نشر كود يقرأ العمود الجديد (قيمة افتراضية) ← توافق عكسي
الخطوة 3: ملء العمود بالبيانات (background job)
الخطوة 4: نشر كود يكتب في العمود الجديد
الخطوة 5: جعل العمود NOT NULL (ترحيل منفصل) ← الآن آمن
الخطوة 6: حذف العمود القديم (بعد فترة انتقالية)
```

### 7.4 البيانات الأولية (Seed)

```typescript
// prisma/seed.ts
async function main() {
  // إنشاء مدير افتراضي
  await prisma.user.upsert({
    where: { email: 'admin@ibn-al-azhar-docs.local' },
    update: {},
    create: {
      email: 'admin@ibn-al-azhar-docs.local',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12),
      name: 'مدير النظام',
      role: 'admin',
      status: 'active',
      preferences: { locale: 'ar', theme: 'light' },
    },
  });

  // إنشاء مجلدات افتراضية
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@ibn-al-azhar-docs.local' },
  });

  if (admin) {
    await prisma.folder.createMany({
      data: [
        { name: 'نماذج الامتحانات', ownerId: admin.id },
        { name: 'المحاضرات', ownerId: admin.id },
        { name: 'الأبحاث', ownerId: admin.id },
      ],
      skipDuplicates: true,
    });
  }
}
```

---

## 8. استراتيجية الفهرسة

### 8.1 فهارس MVP

| الجدول | الفهرس | الحقول | النوع | السبب |
|--------|--------|--------|------|-------|
| User | `User_email_key` | email | UNIQUE | تسجيل الدخول |
| User | `User_role_idx` | role | B-Tree | تصفية المديرين |
| User | `User_status_idx` | status | B-Tree | تصفية الحسابات النشطة |
| Folder | `Folder_ownerId_parentId_idx` | ownerId, parentId | COMPOSITE | جلب محتويات مجلد مستخدم |
| Folder | `Folder_parentId_idx` | parentId | B-Tree | التنقل في الشجرة |
| Folder | `Folder_deletedAt_idx` | deletedAt | B-Tree | استبعاد المحذوفات |
| Folder | `Folder_ownerId_name_idx` | ownerId, name | COMPOSITE | البحث عن مجلد بالاسم |
| File | `File_ownerId_folderId_idx` | ownerId, folderId | COMPOSITE | جلب ملفات مجلد |
| File | `File_storageKey_key` | storageKey | UNIQUE | الوصول المباشر |
| File | `File_mimeType_idx` | mimeType | B-Tree | تصفية حسب النوع |
| File | `File_deletedAt_idx` | deletedAt | B-Tree | استبعاد المحذوفات |
| File | `File_ownerId_name_idx` | ownerId, name | COMPOSITE | البحث بالاسم |
| ConvertedFile | `ConvertedFile_fileId_key` | fileId | UNIQUE | نتيجة OCR واحدة لكل ملف |
| Conversion | `Conversion_userId_status_idx` | userId, status | COMPOSITE | تحويلات المستخدم حسب الحالة |
| Conversion | `Conversion_status_createdAt_idx` | status, createdAt | COMPOSITE | تحويلات عالقة |
| ConversionFile | `ConversionFile_conversionId_idx` | conversionId | B-Tree | جلب ملفات تحويل |
| ConversionFile | `ConversionFile_conversionId_fileId_key` | conversionId, fileId | UNIQUE | منع التكرار |
| Export | `Export_conversionId_format_key` | conversionId, format | UNIQUE | تصدير واحد لكل تحويل+صيغة |
| Export | `Export_conversionId_idx` | conversionId | B-Tree | جلب تصديرات تحويل |
| Export | `Export_fileId_idx` | fileId | B-Tree | جلب تصديرات ملف |
| Export | `Export_format_idx` | format | B-Tree | تصفية حسب الصيغة |
| Export | `Export_status_idx` | status | B-Tree | متابعة حالة التصدير |
| ShareLink | `ShareLink_token_key` | token | UNIQUE | الوصول عبر الرابط |
| ShareLink | `ShareLink_ownerId_idx` | ownerId | B-Tree | روابط المستخدم |
| ShareLink | `ShareLink_fileId_idx` | fileId | B-Tree | روابط ملف |
| ActivityLog | `ActivityLog_userId_createdAt_idx` | userId, createdAt | COMPOSITE | سجل نشاط المستخدم |
| ActivityLog | `ActivityLog_action_idx` | action | B-Tree | تصفية حسب نوع النشاط |
| ActivityLog | `ActivityLog_createdAt_idx` | createdAt | B-Tree | تنظيف البيانات القديمة |

### 8.2 فهارس V2 (مستقبلية)

| الجدول | الفهرس | الحقول | النوع | السبب |
|--------|--------|--------|------|-------|
| File | `File_search_vector_idx` | search_vector | GIN | بحث نصي كامل (tsvector) |
| File | `File_ownerId_sourceType_idx` | ownerId, sourceType | COMPOSITE | تصفية متقدمة |
| Conversion | `Conversion_userId_createdAt_idx` | userId, createdAt | COMPOSITE | ترتيب زمني مع ترقيم صفحات |
| ActivityLog | `ActivityLog_resourceType_resourceId_idx` | resourceType, resourceId | COMPOSITE | سجل نشاط مورد |

---

## 9. Prisma Schema النهائي

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  dbName   = "ibn_al_azhar_docs"
}

// ─────────────────────────────────────────────
// User & Auth
// ─────────────────────────────────────────────

enum UserRole {
  student
  teacher
  admin
}

enum UserStatus {
  active
  suspended
  pending
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique @db.VarChar(255)
  passwordHash String?    @db.VarChar(255)
  name         String     @db.VarChar(100)
  role         UserRole   @default(student)
  status       UserStatus @default(active)
  avatarUrl    String?    @db.VarChar(500)
  preferences  Json       @default("{}")
  storageUsed  BigInt     @default(0)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  folders      Folder[]
  files        File[]
  conversions  Conversion[]
  shareLinks   ShareLink[]
  activityLogs ActivityLog[]
  accounts     Account[]
  sessions     Session[]

  @@index([role])
  @@index([status])
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─────────────────────────────────────────────
// Folders
// ─────────────────────────────────────────────

model Folder {
  id        String    @id @default(cuid())
  name      String    @db.VarChar(100)
  parentId  String?
  ownerId   String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  parent    Folder?   @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children  Folder[]  @relation("FolderHierarchy")
  owner     User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  files     File[]
  shareLinks ShareLink[]

  @@index([parentId])
  @@index([deletedAt])
  @@index([ownerId, parentId])
  @@index([ownerId, name])
  @@map("folders")
}

// ─────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────

enum FileStatus {
  ready
  processing
  error
}

enum SourceType {
  pdf
  image
}

model File {
  id          String     @id @default(cuid())
  name        String     @db.VarChar(255)
  folderId    String?
  ownerId     String
  mimeType    String     @db.VarChar(100)
  sizeBytes   BigInt
  storageKey  String     @unique @db.VarChar(500)
  status      FileStatus @default(ready)
  sourceType  SourceType
  pageCount   Int?
  dpi         Int?
  ocrEngine   String?    @db.VarChar(50)
  deletedAt   DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  folder        Folder?          @relation(fields: [folderId], references: [id], onDelete: SetNull)
  owner         User             @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  convertedFile ConvertedFile?
  conversionFiles ConversionFile[]
  exports      Export[]
  shareLinks   ShareLink[]

  @@index([ownerId, folderId])
  @@index([ownerId, status])
  @@index([mimeType])
  @@index([deletedAt])
  @@index([ownerId, name])
  @@map("files")
}

// ─────────────────────────────────────────────
// Converted Files (OCR Results)
// ─────────────────────────────────────────────

model ConvertedFile {
  id           String   @id @default(cuid())
  fileId       String   @unique
  storageKey   String   @db.VarChar(500)
  sizeBytes    BigInt
  qualityScore Float?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  file File @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@map("converted_files")
}

// ─────────────────────────────────────────────
// Conversions (OCR Extraction Pipeline)
// ─────────────────────────────────────────────

enum ConversionStatus {
  queued
  processing
  completed
  failed
  cancelled
}

model Conversion {
  id             String           @id @default(cuid())
  userId         String
  status         ConversionStatus @default(queued)
  settings       Json             @default("{}")
  totalFiles     Int              @default(0)
  completedFiles Int              @default(0)
  failedFiles    Int              @default(0)
  errorMessage   String?          @db.VarChar(1000)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  user   User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  files  ConversionFile[]
  exports Export[]

  @@index([userId, status])
  @@index([status, createdAt])
  @@index([userId, createdAt])
  @@map("conversions")
}

enum ConversionFileStatus {
  pending
  preparing
  splitting
  ocr
  writing
  done
  failed
}

model ConversionFile {
  id            String              @id @default(cuid())
  conversionId  String
  fileId        String
  status        ConversionFileStatus @default(pending)
  currentPage   Int                 @default(0)
  totalPages    Int                 @default(0)
  percentage    Float               @default(0)
  errorMessage  String?             @db.VarChar(1000)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  conversion Conversion @relation(fields: [conversionId], references: [id], onDelete: Cascade)
  file       File       @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([conversionId, fileId])
  @@index([conversionId])
  @@index([conversionId, status])
  @@index([fileId])
  @@map("conversion_files")
}

// ─────────────────────────────────────────────
// Exports (Format Generation from Conversion)
// ─────────────────────────────────────────────

enum ExportFormat {
  txt
  docx
  json
}

enum ExportStatus {
  pending
  processing
  completed
  failed
}

model Export {
  id           String      @id @default(cuid())
  conversionId String
  fileId       String
  format       ExportFormat
  storageKey   String?     @db.VarChar(500)
  sizeBytes    BigInt?
  status       ExportStatus @default(pending)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  conversion Conversion @relation(fields: [conversionId], references: [id], onDelete: Cascade)
  file       File       @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([conversionId, format])
  @@index([conversionId])
  @@index([fileId])
  @@index([format])
  @@index([status])
  @@map("exports")
}

// ─────────────────────────────────────────────
// Share Links
// ─────────────────────────────────────────────

enum SharePermission {
  view
  download
}

model ShareLink {
  id            String         @id @default(cuid())
  fileId        String?
  folderId      String?
  ownerId       String
  token         String         @unique @db.VarChar(128)
  permission    SharePermission @default(view)
  expiresAt     DateTime?
  downloadCount Int            @default(0)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  file   File?  @relation(fields: [fileId], references: [id], onDelete: Cascade)
  folder Folder? @relation(fields: [folderId], references: [id], onDelete: Cascade)
  owner  User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@index([fileId])
  @@index([expiresAt, isActive])
  @@map("share_links")
}

// ─────────────────────────────────────────────
// Activity Logs
// ─────────────────────────────────────────────

model ActivityLog {
  id           String   @id @default(cuid())
  userId       String
  action       String   @db.VarChar(50)
  resourceId   String?
  resourceType String?  @db.VarChar(50)
  details      Json?
  ipAddress    String?  @db.VarChar(45)
  userAgent    String?  @db.VarChar(500)
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("activity_logs")
}
```

> **ملاحظات على Prisma Schema**:
> - `datasource.db.dbName` مضبوط على `"ibn_al_azhar_docs"` كاسم قاعدة البيانات
> - `ShareLink.token` من نوع `@db.VarChar(128)` — يكفي لـ 64 حرفًا سداسيًا (من `crypto.randomBytes(32).toString('hex')`) مع هامش أمان
> - `ConvertedFile` لم يعد يحتوي على حقل `format` — التنسيق يُحدد عند إنشاء `Export`
> - نموذج `Export` منفصل عن `ConvertedFile` — يأخذ `conversionId` + `format` وينشئ ملفًا بصيغة محددة
> - `Conversion.settings` لا يحتوي على `format` — التحويل يقوم باستخراج OCR فقط
> - جميع مراجع MinIO تشير إلى bucket `ibn-al-azhar-docs-files`
