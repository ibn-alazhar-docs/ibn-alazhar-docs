# أدوات CLI / MCP المقترحة — Ibn Al Azhar Docs

> توثيق فقط. لم يُنفَّذ خادم MCP جديد. الأدوات أدناه مقترحة لربط المنصة
> ببيئات CLI/IDE (MCP) مستقبلاً.

## بروتوكول

- MCP Protocol Version: `2024-11-05`
- النقل: stdio (JSON-RPC 2.0)
- الخادم (مقترح): `ibn-al-azhar-docs-mcp`

## الأدوات (Tools)

### 1. `list_documents`

- **الوصف:** سرد المستندات (مع التصفية حسب المجلد/الوسم/الحالة).
- **المُدخلات:**
  - `folderId` (string, optional)
  - `tag` (string, optional)
  - `status` (string, optional)
  - `limit` (number, optional, default 50)
- **المُخرجات:** `{ documents: Document[] }`

### 2. `get_document`

- **الوصف:** جلب مستند واحد (البيانات الوصفية + مسار التخزين).
- **المُدخلات:**
  - `documentId` (string, required)
- **المُخرجات:** `{ document: Document }`

### 3. `save_audit_session`

- **الوصف:** حفظ جلسة تدقيق (meta + source + converted + latest pointer) في audit vault.
- **المُدخلات:**
  - `documentId` (string, required)
  - `filename` (string, optional)
  - `sourceText` (string, optional)
  - `convertedMarkdown` (string, optional)
  - `bookTitle` (string, optional)
  - `metadata` (object, optional)
- **المُخرجات:** `{ sessionId, sessionMeta }`

### 4. `get_latest_audit_session`

- **الوصف:** جلب آخر جلسة تدقيق لمستند.
- **المُدخلات:**
  - `documentId` (string, required)
- **المُخرجات:** `{ session }`

### 5. `list_audit_sessions`

- **الوصف:** سرد جميع جلسات التدقيق لمستند.
- **المُدخلات:**
  - `documentId` (string, required)
- **المُخرجات:** `{ sessions: AuditSessionMeta[] }`

### 6. `export_document`

- **الوصف:** طلب تصدير مستند (md/txt/docx/epub/json/pdf/searchable-pdf).
- **المُدخلات:**
  - `documentId` (string, required)
  - `format` (string, required)
- **المُخرجات:** `{ jobId, message }`

### 7. `scan_books_directory` (مصدر: pdf-to-word converter)

- **الوصف:** مسح مجلد الكتب وحساب عدد الصفحات والأحجام.

### 8. `convert_book_to_word` (مصدر: pdf-to-word converter)

- **الوصف:** تحويل كتاب واحد إلى Word/Markdown.

### 9. `batch_convert_folder` (مصدر: pdf-to-word converter)

- **الوصف:** تحويل مجمّع لمجلد كامل مع أرشفة ZIP مجدولة.

### 10. `get_batch_status` (مصدر: pdf-to-word converter)

- **الوصف:** متابعة حالة التقدم والاستئناف التلقائي.

## Audit Vault — تنسيق الملفات

- `{sessionId}_meta.json` — البيانات الوصفية.
- `{sessionId}_source.txt` — النص المصدري (اختياري).
- `{sessionId}_converted.md` — Markdown المحوّل (اختياري).
- `latest_session.json` — مؤشر آخر جلسة (يشمل النصوص).
- مسار التخزين: `audit/{documentId}/` (driver: local/minio).

## ملاحظات

- لا تغيير في `QUEUE_DRIVER`.
- لا migration لقاعدة البيانات.
- الأسرار لا تُطبع.
