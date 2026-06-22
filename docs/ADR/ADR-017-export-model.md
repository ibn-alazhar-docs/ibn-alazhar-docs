# ADR-017: Export Model — Conversion ≠ Export

## الحالة (Status)

Accepted

## السياق (Context)

في التصميمات السابقة لمنصة Ibn Al-Azhar Docs — ابن الأزهر دوكس، كان مفهوم "التحويل" (conversion) و"التصدير" (export) مختلطين. كانت فكرة أن المستخدم يطلب "تحويل" ملف مع تحديد صيغة المخرجات (format) في نفس الطلب. هذا الخلط يخلق عدة مشاكل: لا يمكن إعادة تصدير نفس النص المستخرج بصيغة مختلفة بدون إعادة تنفيذ عملية OCR بالكامل، API غير واضح (ماذا يحدث إذا تغيرت متطلبات الصيغة؟)، وجداول قاعدة البيانات مختلطة بين بيانات الاستخراج وبيانات التنسيق. نحتاج إلى فصل واضح بين المفهومين.

## القرار (Decision)

قررنا فصل **Conversion** و **Export** كمفهومين مستقلين تمامًا:

### Conversion = استخراج النص عبر OCR

- **التعريف:** عملية استخراج النص من ملف (PDF/صورة) عبر OCR — لا تتضمن أي تحديد صيغة مخرجات
- **API Endpoint:** `POST /api/conversions` — بدون `format` param
- **Pipeline:** preparing → splitting → ocr → writing → done
- **الناتج:** نص مستخرج canonical يُخزّن في قاعدة البيانات

### Export = توليد ملف بصيغة معينة من ناتج Conversion

- **التعريف:** عملية توليد ملف بصيغة معينة (TXT/DOCX/JSON) من نتيجة conversion موجودة
- **API Endpoint:** `POST /api/exports` — يتطلب `conversionId` + `format`
- **الصيغ المدعومة في MVP:** TXT، DOCX، JSON
- **الناتج:** ملف بصيغة محددة يُخزّن في MinIO (bucket: `ibn-al-azhar-docs-files`، مسار: `exports/`)

## البدائل المعتبرة (Options Considered)

### 1. مفهومان منفصلان: Conversion + Export (المختار)

- **المميزات:** API أنظف وأوضح، يمكن إعادة التصدير بدون إعادة OCR، إضافة صيغ جديدة بدون تأثير على conversion، جداول قاعدة بيانات أوضح، فصل المسؤوليات (single responsibility)، إمكانية batch export في المستقبل
- **العيوب:** DB schema أكثر تعقيدًا (جدولين بدل واحد)، API endpoints أكثر، تحتاج واجهة مستخدم توضح الفرق بين conversion و export

### 2. مفهوم واحد مختلط (format في conversion request)

- **المميزات:** API أبسط (endpoint واحد)، DB schema أبسط (جدول واحد)، تنفيذ أسرع في البداية
- **العيوب:** لا يمكن إعادة التصدير بصيغة مختلفة بدون إعادة OCR (مكلف وغير فعال)، API يخلط بين مسؤوليتين مختلفتين، إضافة صيغة جديدة تتطلب تعديل conversion logic، صعوبة في تتبع حالة التصدير بشكل مستقل، إهدار موارد عند طلب نفس الملف بصيغ مختلفة

### 3. Conversion ينتج كل الصيغ تلقائيًا

- **المميزات:** لا حاجة لطلب export منفصل، كل الصيغ متاحة فورًا
- **العيوب:** إهدار موارد (قد لا يحتاج المستخدم كل الصيغ)، وقت معالجة أطول، مساحة تخزين أكبر، غير مرن عند إضافة صيغ جديدة

## تفاصيل التصميم التقني

### Conversion Pipeline

```
POST /api/conversions
Body: { fileId: string }
→ ينشئ سجل Conversion في قاعدة البيانات
→ يضيف مهمة OCR إلى BullMQ queue
→ يرجع conversionId للمتابعة عبر SSE

Pipeline States:
  preparing → splitting → ocr → writing → done
  (أو: failed في أي مرحلة)
```

| المرحلة   | الوصف                                                     |
| --------- | --------------------------------------------------------- |
| preparing | التحقق من الملف وإعداد البيئة                             |
| splitting | تقسيم PDF إلى صفحات (إذا لزم)                             |
| ocr       | تنفيذ OCR عبر Google Drive API (MVP) أو Tesseract.js (V2) |
| writing   | حفظ النص المستخرج في قاعدة البيانات                       |
| done      | العملية اكتملت بنجاح                                      |

### Export Flow

```
POST /api/exports
Body: { conversionId: string, format: "txt" | "docx" | "json" }
→ يتحقق من وجود Conversion بحالة "done"
→ ينشئ سجل Export في قاعدة البيانات
→ يولّد الملف بالصيغة المطلوبة
→ يرفع الملف إلى MinIO (bucket: ibn-al-azhar-docs-files, path: exports/)
→ يرجع download URL
```

| الصيغة | الوصف                                        |
| ------ | -------------------------------------------- |
| TXT    | نص عادي بدون تنسيق                           |
| DOCX   | مستند Word مع تنسيق أساسي (فقرات، اتجاه RTL) |
| JSON   | بيانات منظمة (صفحات، فقرات، نصوص)            |

### Prisma Schema (مبسط)

```prisma
model Conversion {
  id          String   @id @default(cuid())
  fileId      String
  file        File     @relation(fields: [fileId], references: [id])
  status      ConversionStatus // PREPARING, SPLITTING, OCR, WRITING, DONE, FAILED
  progress    Int      @default(0) // 0-100
  extractedText String? // النص المستخرج (canonical)
  pageCount   Int?
  ocrEngine   String?  // "google-drive" | "tesseract"
  errorMessage String?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime? // soft delete

  exports     Export[]
}

model Export {
  id           String   @id @default(cuid())
  conversionId String
  conversion   Conversion @relation(fields: [conversionId], references: [id])
  format       ExportFormat // TXT, DOCX, JSON
  status       ExportStatus // PENDING, PROCESSING, DONE, FAILED
  fileUrl      String?  // مسار الملف في MinIO
  fileSize     Int?     // حجم الملف بالبايت
  errorMessage String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime? // soft delete
}

enum ConversionStatus {
  PREPARING
  SPLITTING
  OCR
  WRITING
  DONE
  FAILED
}

enum ExportFormat {
  TXT
  DOCX
  JSON
}

enum ExportStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

## العواقب (Consequences)

- **إيجابية:** API أنظف وأوضح (مسؤولية واحدة لكل endpoint)، يمكن إعادة التصدير بصيغة مختلفة بدون إعادة OCR (توفير وقت وموارد)، إضافة صيغ تصدير جديدة في المستقبل بدون تعديل conversion logic، فصل واضح في قاعدة البيانات يسهل الاستعلامات والتقارير، كل عملية لها حالة وتقدم مستقلان، إمكانية batch export في V2 (تصدير عدة تحويلات بصيغة واحدة)
- **سلبية:** DB schema أكثر تعقيدًا (جدول Export إضافي)، API endpoints أكثر (2 بدل 1)، تحتاج واجهة مستخدم توضح الفرق بين "استخراج النص" و"تصدير بملف"، تنفيذ Export worker إضافي في BullMQ
- **مخاطر:** إذا لم يكن الفصل واضحًا في واجهة المستخدم، قد يربك المستخدمون. الحل: تصميم UI يعرض Conversion كـ "استخراج النص" و Export كـ "تنزيل بصيغة"، مع سير عمل واضح (استخرج أولًا → ثم صدّر).

## المتابعة (Follow-up)

- تصميم جداول Conversion و Export الكاملة في Prisma schema
- تنفيذ `POST /api/conversions` endpoint مع BullMQ job
- تنفيذ `POST /api/exports` endpoint مع توليد الملفات
- تنفيذ SSE لتحديثات تقدم Conversion (preparing→splitting→ocr→writing→done)
- بناء واجهة مستخدم توضح سير العمل: استخراج → تصدير
- تنفيذ توليد ملفات TXT، DOCX، JSON من النص المستخرج
- رفع ملفات التصدير إلى MinIO (bucket: `ibn-al-azhar-docs-files`، path: `exports/`)
- إضافة Presigned URLs لتنزيل ملفات التصدير
- في V2: تنفيذ batch export (تصدير عدة تحويلات بصيغة واحدة)
- في V2: إضافة صيغ تصدير إضافية (PDF، SRT، الخ)
