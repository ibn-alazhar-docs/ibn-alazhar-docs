# ابن الأزهر دوكس — مواصفة API

> **Ibn Al-Azhar Docs — API Specification (Contract Document)**
> الإصدار: 4.0.0 | آخر تحديث: 2025-03-06
> التصنيف: عقد تنفيذي — يجب أن تتوافق معه جميع عمليات التنفيذ

---

## جدول المحتويات

1. [مبادئ تصميم API](#1-مبادئ-تصميم-api)
2. [المصادقة والتفويض](#2-المصادقة-والتفويض)
3. [التنسيق الموحد للأخطاء](#3-التنسيق-الموحد-للأخطاء)
4. [ترقيم الصفحات](#4-ترقيم-الصفحات)
5. [مواصفة SSE](#5-مواصفة-sse)
6. [الرؤوس المشتركة](#6-الرؤوس-المشتركة)
7. [قواعد تحديد الطلبات](#7-قواعد-تحديد-الطلبات)
8. [استراتيجية الإصدارات](#8-استراتيجية-الإصدارات)
9. [Health Check](#9-health-check)
10. [Auth Endpoints](#10-auth-endpoints)
11. [Files Endpoints](#11-files-endpoints)
12. [Folders Endpoints](#12-folders-endpoints)
13. [Conversions Endpoints](#13-conversions-endpoints)
14. [Exports Endpoints](#14-exports-endpoints)
15. [Share Endpoints](#15-share-endpoints)
16. [Admin Endpoints](#16-admin-endpoints)
17. [Search Endpoint](#17-search-endpoint)

---

## 1. مبادئ تصميم API

### 1.1 المبادئ الأساسية

| المبدأ | التفاصيل |
|--------|---------|
| RESTful | أسماء موارد في URL، أفعال HTTP للعمليات |
| JSON | جميع الطلبات والاستجابات بصيغة JSON (ما عدا multipart upload) |
| UTF-8 | ترميز موحد لجميع النصوص |
| Stateless | كل طلب يحتوي على كل المعلومات اللازمة (JWT في cookie) |
| Consistent | تنسيق موحد للطلبات والاستجابات والأخطاء |
| Versioned | بادئة `/api/` بدون رقم إصدار في MVP (الإصدار الافتراضي هو v1) |

### 1.2 قواعد تسمية Endpoints

- أسماء الموارد بصيغة الجمع: `/files`, `/folders`, `/conversions`, `/exports`
- استخدام HTTP methods: `GET` (قراءة), `POST` (إنشاء), `PATCH` (تحديث جزئي), `DELETE` (حذف)
- Nested resources: `/files/:id/download`, `/conversions/:id/cancel`
- Actions (non-CRUD): `/conversions/:id/cancel`, `/auth/login`

### 1.3 HTTP Status Codes المستخدمة

| Code | المعنى | الاستخدام |
|------|--------|----------|
| 200 | OK | نجاح GET, PATCH |
| 201 | Created | نجاح POST (إنشاء مورد) |
| 204 | No Content | نجاح DELETE |
| 400 | Bad Request | بيانات إدخال غير صالحة |
| 401 | Unauthorized | غير مُصادَق |
| 403 | Forbidden | غير مُخوَّل |
| 404 | Not Found | المورد غير موجود |
| 409 | Conflict | تعارض (بريد إلكتروني مسجل) |
| 413 | Payload Too Large | ملف أكبر من الحد |
| 415 | Unsupported Media Type | نوع ملف غير مدعوم |
| 429 | Too Many Requests | تجاوز حد الطلبات |
| 500 | Internal Server Error | خطأ في الخادم |
| 502 | Bad Gateway | فشل خدمة خارجية (OCR/Export) |

---

## 2. المصادقة والتفويض

### 2.1 آلية المصادقة

- **الطريقة**: HttpOnly Cookie يحتوي على JWT (`next-auth.session-token`)
- **الإرسال**: تلقائي مع كل طلب (SameSite=Lax)
- **الصلاحية**: 24 ساعة (maxAge)، مع تحديث ضمني كل 4 ساعات (updateAge)
- **التجديد**: عبر NextAuth.js built-in mechanism (`GET /api/auth/session`)، لا توجد نقطة نهاية refresh مخصصة

### 2.2 مستويات الصلاحية

| الرمز | المعنى |
|------|--------|
| `PUBLIC` | لا يتطلب مصادقة |
| `AUTH` | يتطلب مصادقة (أي مستخدم مسجل) |
| `OWNER` | يتطلب أن يكون المستخدم مالك المورد |
| `ROLE:teacher` | يتطلب دور معلم أو أعلى |
| `ROLE:admin` | يتطلب دور مدير |

### 2.3 تضمين Auth في الطلبات

لا حاجة لإرسال أي header إضافي. المتصفح يُرسل الـcookie تلقائيًا مع كل طلب لنفس النطاق.

لأغراض الاختبار (مثل Postman):
```
Cookie: next-auth.session-token=eyJhbGciOiJ...
```

---

## 3. التنسيق الموحد للأخطاء

```typescript
interface ApiError {
  error: {
    code: string;        // رمز الخطأ البرمجي
    message: string;     // رسالة خطأ يمكن عرضها للمستخدم
    details?: Array<{    // تفاصيل إضافية (اختياري)
      field?: string;    // اسم الحقل الذي سبب الخطأ
      message: string;   // رسالة الخطأ الخاصة بالحقل
    }>;
  };
}
```

### 3.1 رموز الأخطاء

| الرمز | HTTP Status | الوصف |
|-------|------------|-------|
| `VALIDATION_ERROR` | 400 | بيانات إدخال غير صالحة |
| `UNAUTHORIZED` | 401 | لم يتم تسجيل الدخول أو الجلسة منتهية |
| `FORBIDDEN` | 403 | ليس لديك صلاحية لهذا الإجراء |
| `NOT_FOUND` | 404 | المورد المطلوب غير موجود |
| `FILE_TOO_LARGE` | 413 | حجم الملف يتجاوز الحد المسموح (100MB) |
| `UNSUPPORTED_FILE_TYPE` | 415 | نوع الملف غير مدعوم |
| `EMAIL_EXISTS` | 409 | البريد الإلكتروني مسجل مسبقًا |
| `RATE_LIMITED` | 429 | تجاوزت حد الطلبات المسموحة |
| `OCR_FAILED` | 502 | فشل في خدمة التعرف البصري |
| `EXPORT_FAILED` | 502 | فشل في توليد التصدير |
| `INTERNAL_ERROR` | 500 | خطأ داخلي في الخادم |

---

## 4. ترقيم الصفحات

### 4.1 المواصفة

تُستخدم طريقة cursor-based pagination للقوائم الكبيرة:

**Request Parameters:**

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `cursor` | string | - | معرّف آخر عنصر في الصفحة السابقة |
| `limit` | number | 20 | عدد العناصر في الصفحة (1-100) |
| `sort` | string | `createdAt` | حقل الترتيب |
| `order` | string | `desc` | اتجاه الترتيب (`asc` / `desc`) |

**Response Format:**

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;  // null = لا توجد صفحة تالية
    hasMore: boolean;
    total: number;              // العدد الإجمالي (من query منفصل)
  };
}
```

### 4.2 مثال

```
GET /api/files?cursor=clx_abc123&limit=20&sort=createdAt&order=desc
```

```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "clx_def456",
    "hasMore": true,
    "total": 157
  }
}
```

---

## 5. مواصفة SSE

### 5.1 الاتصال

```
GET /api/conversions/:id/events
Accept: text/event-stream
Cookie: next-auth.session-token=...
```

### 5.2 أنواع الأحداث

| Event Type | الوصف | البيانات |
|-----------|-------|---------|
| `progress` | تحديث تقدم التحويل | ConversionProgress |
| `file_progress` | تحديث تقدم ملف واحد | ConversionFileProgress |
| `export_progress` | تحديث تقدم التصدير | ExportProgress |
| `complete` | اكتمال التحويل | ConversionResult |
| `failed` | فشل التحويل | ConversionError |
| `heartbeat` | نبضة (كل 30 ثانية) | لا بيانات |

### 5.3 تنسيق البيانات

```
event: progress
data: {"conversionId":"clx_abc","completedFiles":2,"totalFiles":5,"percentage":40}

event: file_progress
data: {"fileId":"clx_file1","status":"ocr","currentPage":3,"totalPages":8,"percentage":37.5}

event: export_progress
data: {"exportId":"clx_exp1","format":"docx","status":"generating","percentage":50}

event: complete
data: {"conversionId":"clx_abc","status":"completed","completedFiles":5,"totalFiles":5}

event: failed
data: {"conversionId":"clx_abc","error":"OCR_FAILED","message":"فشل في معالجة الصفحة 3"}

: heartbeat
```

### 5.4 إعادة الاتصال

- المتصفح يُعيد الاتصال تلقائيًا عند انقطاع SSE
- يُرسل `Last-Event-ID` header مع آخر معرّف حدث استلمه
- الخادم يرسل `id` مع كل حدث:
  ```
  id: evt_12345
  event: progress
  data: {...}
  ```
- عند إعادة الاتصال، يُرسل الخادم الأحداث التي حدثت بعد `Last-Event-ID`
- إذا كان التحويل مكتملًا، يُرسل الخادم فورًا حدث `complete`

---

## 6. الرؤوس المشتركة

### 6.1 رؤوس الطلبات

| Header | الوصف | مطلوب |
|--------|-------|-------|
| `Content-Type` | `application/json` أو `multipart/form-data` | نعم (لـ POST/PATCH) |
| `Accept` | `application/json` أو `text/event-stream` | لا |
| `Accept-Language` | `ar` أو `en` | لا (يُستخدم للرسائل) |
| `Cookie` | يحتوي على session token | تلقائي |

### 6.2 رؤوس الاستجابة

| Header | الوصف |
|--------|-------|
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Request-Id` | معرّف فريد للطلب (للتتبع) |
| `X-RateLimit-Limit` | الحد الأقصى للطلبات |
| `X-RateLimit-Remaining` | الطلبات المتبقية |
| `X-RateLimit-Reset` | وقت إعادة تعيين الحد (Unix timestamp) |

---

## 7. قواعد تحديد الطلبات

### 7.1 حدود الطلبات

| Endpoint Category | الحد | النافذة |
|------------------|------|---------|
| Auth (login/register) | 5 طلبات | لكل دقيقة لكل IP |
| Auth (forgot-password) | 3 طلبات | لكل ساعة لكل IP |
| File Upload | 10 طلبات | لكل دقيقة لكل مستخدم |
| Conversions | 5 طلبات | لكل دقيقة لكل مستخدم |
| Exports | 10 طلبات | لكل دقيقة لكل مستخدم |
| General API | 60 طلب | لكل دقيقة لكل مستخدم |
| SSE Connection | 3 اتصالات | متزامنة لكل مستخدم |
| Search | 20 طلب | لكل دقيقة لكل مستخدم |

### 7.2 تجاوز الحد

عند تجاوز الحد:

```json
HTTP 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "تجاوزت حد الطلبات. حاول مرة أخرى بعد 45 ثانية.",
    "details": [
      {
        "field": "retryAfter",
        "message": "45"
      }
    ]
  }
}
```

---

## 8. استراتيجية الإصدارات

- **MVP**: لا رقم إصدار في URL. جميع endpoints تحت `/api/...`
- **V2**: عند إدخال تغييرات غير متوافقة، يُضاف `/api/v2/...`
- **التوافق**: الحفاظ على التوافق العكسي قدر الإمكان
- **الإهمال**: يُعلن عن إهمال endpoint عبر header `Sunset` قبل 3 أشهر من الحذف

---

## 9. Health Check

### GET /api/health

- **الغرض**: التحقق من حالة الخدمة (يُستخدم من قِبل Caddy/Docker للمراقبة)
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC`

#### Request

لا يوجد body أو parameters.

#### Response — 200 OK

```json
{
  "status": "healthy",
  "timestamp": "2025-03-06T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "minio": "connected"
  }
}
```

#### Response — 503 Service Unavailable

```json
{
  "status": "unhealthy",
  "timestamp": "2025-03-06T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "disconnected",
    "redis": "connected",
    "minio": "connected"
  }
}
```

- **Rate Limit**: 1 طلب / 10 ثوانٍ لكل IP
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

## 10. Auth Endpoints

### 10.1 POST /api/auth/register

- **الغرض**: تسجيل حساب جديد
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC`

#### Request Body

```typescript
{
  email: string;        // بريد إلكتروني صالح، حتى 255 حرف
  password: string;     // 8-128 حرف، يجب أن يحتوي على حرف كبير وصغير ورقم
  name: string;         // 2-100 حرف
  role?: "student" | "teacher";  // افتراضي: "student"
}
```

**Validation (Zod)**:
```typescript
const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(128)
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم'),
  name: z.string().min(2).max(100),
  role: z.enum(['student', 'teacher']).default('student'),
});
```

#### Response — 201 Created

```json
{
  "user": {
    "id": "clx_abc123",
    "email": "ahmed@example.com",
    "name": "أحمد محمد",
    "role": "student",
    "status": "active",
    "avatarUrl": null,
    "createdAt": "2025-03-06T10:00:00.000Z"
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | بيانات غير صالحة |
| `EMAIL_EXISTS` | 409 | البريد مسجل مسبقًا |
| `RATE_LIMITED` | 429 | تجاوز حد التسجيل |

- **Rate Limit**: 5 طلبات / دقيقة لكل IP
- **Side Effects**: إنشاء سجل User، إرسال email تأكيد (V2)، إنشاء session
- **Audit Event**: `USER_REGISTER` مع `{ userId, email, role }`

---

### 10.2 POST /api/auth/login

- **الغرض**: تسجيل الدخول (يُنفذ عبر NextAuth.js credentials callback)
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC`

#### Request Body

```typescript
{
  email: string;
  password: string;
}
```

#### Response — 200 OK

```json
{
  "user": {
    "id": "clx_abc123",
    "email": "ahmed@example.com",
    "name": "أحمد محمد",
    "role": "student",
    "status": "active",
    "avatarUrl": null
  }
}
```

**ملاحظة**: يتم تعيين HttpOnly cookie `next-auth.session-token` تلقائيًا.

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | بيانات مفقودة |
| `UNAUTHORIZED` | 401 | بريد إلكتروني أو كلمة مرور غير صحيحة |
| `FORBIDDEN` | 403 | الحساب مُعلّق أو غير مُفعّل |
| `RATE_LIMITED` | 429 | تجاوز حد المحاولات |

- **Rate Limit**: 5 طلبات / دقيقة لكل IP
- **Side Effects**: إنشاء JWT session، تعيين `next-auth.session-token` cookie، تحديث lastLogin
- **Audit Event**: `USER_LOGIN` مع `{ userId, method: 'credentials' }`

---

### 10.3 POST /api/auth/logout

- **الغرض**: تسجيل الخروج
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Request

لا يوجد body.

#### Response — 200 OK

```json
{
  "message": "تم تسجيل الخروج بنجاح"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | لا يوجد session نشطة |

- **Rate Limit**: 10 طلبات / دقيقة لكل مستخدم
- **Side Effects**: حذف session من DB، حذف `next-auth.session-token` cookie
- **Audit Event**: `USER_LOGOUT` مع `{ userId }`

---

### 10.4 GET /api/auth/session

- **الغرض**: الحصول على الجلسة الحالية وتجديدها ضمنيًا (NextAuth.js built-in)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

> **ملاحظة**: هذه نقطة النهاية المُدمجة في NextAuth.js لتحديث الجلسة. يتم استدعاؤها تلقائيًا كل 4 ساعات (updateAge). لا توجد نقطة نهاية `POST /api/auth/refresh` مخصصة — التجديد يحدث ضمنيًا عبر هذه النقطة.

#### Request

لا يوجد body.

#### Response — 200 OK

```json
{
  "user": {
    "id": "clx_abc123",
    "email": "ahmed@example.com",
    "name": "أحمد محمد",
    "role": "student"
  },
  "expires": "2025-03-07T10:00:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | الجلسة منتهية أو غير صالحة |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: تجديد JWT ضمني (إذا مرت 4 ساعات منذ آخر تحديث)، تحديث cookie
- **Audit Event**: لا شيء

---

### 10.5 POST /api/auth/forgot-password

- **الغرض**: طلب رابط إعادة تعيين كلمة المرور
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC`

#### Request Body

```typescript
{
  email: string;
}
```

#### Response — 200 OK

```json
{
  "message": "إذا كان البريد مسجلاً، ستستلم رابط إعادة التعيين"
}
```

**ملاحظة**: نفس الاستجابة سواء كان البريد مسجلاً أم لا (لمنع كشف البريدات).

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | بريد إلكتروني غير صالح |
| `RATE_LIMITED` | 429 | تجاوز حد الطلبات |

- **Rate Limit**: 3 طلبات / ساعة لكل IP
- **Side Effects**: إنشاء VerificationToken، إرسال بريد إلكتروني مع رابط إعادة التعيين
- **Audit Event**: `PASSWORD_RESET_REQUESTED` مع `{ email }` (بدون userId إن لم يكن مسجلاً)

---

### 10.6 POST /api/auth/reset-password

- **الغرض**: إعادة تعيين كلمة المرور باستخدام الرمز
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC`

#### Request Body

```typescript
{
  token: string;       // رمز إعادة التعيين من البريد
  password: string;    // كلمة المرور الجديدة (نفس قواعد التسجيل)
}
```

#### Response — 200 OK

```json
{
  "message": "تم إعادة تعيين كلمة المرور بنجاح"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | كلمة مرور غير صالحة |
| `UNAUTHORIZED` | 401 | الرمز غير صالح أو منتهي الصلاحية |

- **Rate Limit**: 5 طلبات / ساعة لكل IP
- **Side Effects**: تحديث كلمة المرور، حذف الرمز، إبطال جميع sessions الأخرى
- **Audit Event**: `PASSWORD_RESET_COMPLETED` مع `{ userId }`

---

### 10.7 GET /api/auth/me

- **الغرض**: الحصول على بيانات المستخدم الحالي
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Request

لا يوجد body أو parameters.

#### Response — 200 OK

```json
{
  "id": "clx_abc123",
  "email": "ahmed@example.com",
  "name": "أحمد محمد",
  "role": "student",
  "status": "active",
  "avatarUrl": null,
  "preferences": {
    "locale": "ar",
    "theme": "light"
  },
  "storageUsed": 52428800,
  "storageLimit": 524288000,
  "createdAt": "2025-01-15T08:00:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 10.8 POST /api/auth/google

- **الغرض**: المصادقة عبر Google OAuth
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC`

#### Request Body

```typescript
{
  idToken: string;   // Google ID Token من العميل
}
```

#### Response — 200 OK (مستخدم حالي)

```json
{
  "user": {
    "id": "clx_abc123",
    "email": "ahmed@gmail.com",
    "name": "أحمد محمد",
    "role": "student",
    "status": "active",
    "avatarUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

#### Response — 201 Created (مستخدم جديد)

```json
{
  "user": {
    "id": "clx_xyz789",
    "email": "sara@gmail.com",
    "name": "سارة أحمد",
    "role": "student",
    "status": "active",
    "avatarUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | idToken غير صالح |
| `UNAUTHORIZED` | 401 | فشل التحقق من Google token |
| `EMAIL_EXISTS` | 409 | البريد مسجل بطريقة أخرى (بدون account linking) |

- **Rate Limit**: 5 طلبات / دقيقة لكل IP
- **Side Effects**: إنشاء/ربط Account، إنشاء session، تعيين `next-auth.session-token` cookie
- **Audit Event**: `USER_LOGIN` مع `{ userId, method: 'google' }`

---

## 11. Files Endpoints

### 11.1 GET /api/files

- **الغرض**: قائمة ملفات المستخدم
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH` (يُرجع ملفات المستخدم فقط)

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `cursor` | string | - | معرّف آخر ملف في الصفحة السابقة |
| `limit` | number | 20 | عدد الملفات (1-100) |
| `sort` | string | `createdAt` | حقل الترتيب: `createdAt`, `name`, `sizeBytes` |
| `order` | string | `desc` | `asc` / `desc` |
| `folderId` | string | - | تصفية حسب المجلد (null = الجذر) |
| `mimeType` | string | - | تصفية حسب النوع: `application/pdf`, `image/*` |
| `status` | string | - | تصفية حسب الحالة: `ready`, `processing`, `error` |
| `search` | string | - | بحث في اسم الملف (ILIKE) |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "clx_file1",
      "name": "محاضرة الرياضيات.pdf",
      "folderId": "clx_folder1",
      "mimeType": "application/pdf",
      "sizeBytes": 5242880,
      "status": "ready",
      "sourceType": "pdf",
      "pageCount": 12,
      "dpi": null,
      "ocrEngine": null,
      "createdAt": "2025-03-06T14:30:00.000Z",
      "updatedAt": "2025-03-06T14:30:00.000Z",
      "folder": {
        "id": "clx_folder1",
        "name": "الرياضيات"
      }
    }
  ],
  "pagination": {
    "nextCursor": "clx_file20",
    "hasMore": true,
    "total": 45
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `VALIDATION_ERROR` | 400 | معاملات غير صالحة |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 11.2 POST /api/files/upload

- **الغرض**: رفع ملف جديد
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Request

- **Content-Type**: `multipart/form-data`

| Field | النوع | مطلوب | الوصف |
|-------|------|--------|-------|
| `file` | File | نعم | ملف PDF أو صورة (حتى 100MB) |
| `folderId` | string | لا | معرّف المجلد الهدف |

**Validation**:
- الأنواع المسموحة: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`
- الحجم الأقصى: 100MB
- يجب أن يكون folderId تابعًا للمستخدم (إن وُجد)

#### Response — 201 Created

```json
{
  "id": "clx_file1",
  "name": "محاضرة الرياضيات.pdf",
  "folderId": "clx_folder1",
  "mimeType": "application/pdf",
  "sizeBytes": 5242880,
  "status": "ready",
  "sourceType": "pdf",
  "pageCount": 12,
  "createdAt": "2025-03-06T14:30:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | ملف مفقود أو folderId غير صالح |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FILE_TOO_LARGE` | 413 | الملف أكبر من 100MB |
| `UNSUPPORTED_FILE_TYPE` | 415 | نوع الملف غير مدعوم |
| `FORBIDDEN` | 403 | تجاوز الحصة التخزينية |
| `NOT_FOUND` | 404 | المجلد غير موجود |
| `RATE_LIMITED` | 429 | تجاوز حد الرفع |

- **Rate Limit**: 10 طلبات / دقيقة لكل مستخدم
- **Side Effects**: تخزين في MinIO (`ibn-al-azhar-docs-files` bucket)، إنشاء سجل File، تحديث storageUsed
- **Audit Event**: `FILE_UPLOAD` مع `{ fileId, fileName, sizeBytes, folderId }`

---

### 11.3 GET /api/files/:id

- **الغرض**: تفاصيل ملف محدد
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Path Parameters

| Parameter | النوع | الوصف |
|-----------|------|-------|
| `id` | string | معرّف الملف (cuid) |

#### Response — 200 OK

```json
{
  "id": "clx_file1",
  "name": "محاضرة الرياضيات.pdf",
  "folderId": "clx_folder1",
  "mimeType": "application/pdf",
  "sizeBytes": 5242880,
  "status": "ready",
  "sourceType": "pdf",
  "pageCount": 12,
  "dpi": null,
  "ocrEngine": null,
  "deletedAt": null,
  "createdAt": "2025-03-06T14:30:00.000Z",
  "updatedAt": "2025-03-06T14:30:00.000Z",
  "folder": {
    "id": "clx_folder1",
    "name": "الرياضيات"
  },
  "conversions": [
    {
      "id": "clx_conv1",
      "status": "completed",
      "createdAt": "2025-03-06T15:00:00.000Z"
    }
  ],
  "exports": [
    {
      "id": "clx_exp1",
      "format": "docx",
      "status": "completed",
      "createdAt": "2025-03-06T15:05:00.000Z"
    }
  ]
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك الملف |
| `NOT_FOUND` | 404 | الملف غير موجود |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 11.4 PATCH /api/files/:id

- **الغرض**: تحديث بيانات ملف (اسم، مجلد)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Request Body

```typescript
{
  name?: string;       // 1-255 حرف
  folderId?: string | null;  // نقل إلى مجلد (null = الجذر)
}
```

#### Response — 200 OK

```json
{
  "id": "clx_file1",
  "name": "محاضرة الرياضيات - معدّل.pdf",
  "folderId": "clx_folder2",
  "updatedAt": "2025-03-06T09:00:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | اسم غير صالح |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك الملف |
| `NOT_FOUND` | 404 | الملف أو المجلد غير موجود |

- **Rate Limit**: 30 طلب / دقيقة لكل مستخدم
- **Side Effects**: تحديث سجل File
- **Audit Event**: `FILE_UPDATE` مع `{ fileId, changes }`

---

### 11.5 DELETE /api/files/:id

- **الغرض**: حذف ملف (soft delete)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Path Parameters

| Parameter | النوع | الوصف |
|-----------|------|-------|
| `id` | string | معرّف الملف |

#### Response — 204 No Content

لا يوجد body.

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك الملف |
| `NOT_FOUND` | 404 | الملف غير موجود أو محذوف مسبقًا |

- **Rate Limit**: 30 طلب / دقيقة لكل مستخدم
- **Side Effects**: تعيين `deletedAt`، تحديث `storageUsed` (ناقص الحجم)، إلغاء التحويلات النشطة
- **Audit Event**: `FILE_DELETE` مع `{ fileId, fileName }`

---

### 11.6 GET /api/files/:id/download

- **الغرض**: الحصول على رابط تحميل الملف الأصلي
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin` أو صلاحية مشاركة فعالة

#### Response — 200 OK

```json
{
  "url": "https://storage.ibn-al-azhar-docs.local/ibn-al-azhar-docs-files/users/clx_abc/uploads/2025/03/uuid.pdf?X-Amz-Algorithm=...&X-Amz-Expires=300",
  "expiresAt": "2025-03-06T10:35:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك ولا يملك صلاحية مشاركة |
| `NOT_FOUND` | 404 | الملف غير موجود |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: إنشاء presigned URL (صالح 5 دقائق) من `ibn-al-azhar-docs-files` bucket
- **Audit Event**: `FILE_DOWNLOAD` مع `{ fileId }`

---

## 12. Folders Endpoints

### 12.1 GET /api/folders

- **الغرض**: قائمة مجلدات المستخدم
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH` (مجلدات المستخدم فقط)

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `parentId` | string | - | تصفية حسب المجلد الأب (null = الجذر) |
| `cursor` | string | - | معرّف آخر مجلد |
| `limit` | number | 20 | عدد المجلدات (1-100) |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "clx_folder1",
      "name": "الرياضيات",
      "parentId": null,
      "fileCount": 15,
      "createdAt": "2025-02-01T08:00:00.000Z",
      "updatedAt": "2025-03-06T14:30:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": null,
    "hasMore": false,
    "total": 3
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 12.2 POST /api/folders

- **الغرض**: إنشاء مجلد جديد
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Request Body

```typescript
{
  name: string;           // 1-100 حرف
  parentId?: string | null;  // معرّف المجلد الأب (null = الجذر)
}
```

#### Response — 201 Created

```json
{
  "id": "clx_folder2",
  "name": "الفيزياء",
  "parentId": null,
  "createdAt": "2025-03-06T10:00:00.000Z",
  "updatedAt": "2025-03-06T10:00:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | اسم غير صالح |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `NOT_FOUND` | 404 | المجلد الأب غير موجود |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: إنشاء سجل Folder
- **Audit Event**: `FOLDER_CREATE` مع `{ folderId, name, parentId }`

---

### 12.3 GET /api/folders/:id

- **الغرض**: تفاصيل مجلد مع محتوياته
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Response — 200 OK

```json
{
  "id": "clx_folder1",
  "name": "الرياضيات",
  "parentId": null,
  "createdAt": "2025-02-01T08:00:00.000Z",
  "updatedAt": "2025-03-06T14:30:00.000Z",
  "children": [
    {
      "id": "clx_folder3",
      "name": "واجبات",
      "parentId": "clx_folder1"
    }
  ],
  "files": [
    {
      "id": "clx_file1",
      "name": "محاضرة 1.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 5242880
    }
  ]
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك المجلد |
| `NOT_FOUND` | 404 | المجلد غير موجود |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 12.4 PATCH /api/folders/:id

- **الغرض**: تحديث بيانات مجلد
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Request Body

```typescript
{
  name?: string;              // 1-100 حرف
  parentId?: string | null;   // نقل إلى مجلد آخر
}
```

#### Response — 200 OK

```json
{
  "id": "clx_folder1",
  "name": "الرياضيات - الفصل الأول",
  "parentId": "clx_folder5",
  "updatedAt": "2025-03-06T10:30:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | اسم غير صالح أو دورة في المجلدات |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك المجلد |
| `NOT_FOUND` | 404 | المجلد أو المجلد الأب غير موجود |

- **Rate Limit**: 30 طلب / دقيقة لكل مستخدم
- **Side Effects**: تحديث سجل Folder
- **Audit Event**: `FOLDER_UPDATE` مع `{ folderId, changes }`

---

### 12.5 DELETE /api/folders/:id

- **الغرض**: حذف مجلد ومحتوياته (soft delete)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Response — 204 No Content

لا يوجد body.

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك المجلد |
| `NOT_FOUND` | 404 | المجلد غير موجود |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: soft delete للمجلد وجميع المجلدات الفرعية والملفات، تحديث storageUsed
- **Audit Event**: `FOLDER_DELETE` مع `{ folderId, fileCount }`

---

## 13. Conversions Endpoints

> **ملاحظة مهمة**: التحويل (Conversion) يقوم باستخراج النص عبر OCR فقط. لا يأخذ معامل `format`. لتوليد ملف بصيغة محددة، استخدم `/api/exports`.

### 13.1 POST /api/conversions

- **الغرض**: إنشاء تحويل جديد (استخراج OCR)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Request Body

```typescript
{
  fileIds: string[];       // 1-50 معرّف ملف
  settings?: {
    ocrEngine?: "google-drive";  // افتراضي: "google-drive"
    language?: "ar" | "en" | "auto";  // افتراضي: "auto"
    dpi?: number;                // 150-600، افتراضي: 300
  };
}
```

**Validation**:
- `fileIds`: بين 1 و 50 معرّف
- جميع الملفات يجب أن تكون ملك المستخدم
- جميع الملفات يجب أن تكون بحالة `ready`
- لا يجب أن يكون للملف تحويل نشط

#### Response — 201 Created

```json
{
  "id": "clx_conv1",
  "userId": "clx_abc123",
  "status": "queued",
  "settings": {
    "ocrEngine": "google-drive",
    "language": "auto",
    "dpi": 300
  },
  "totalFiles": 3,
  "completedFiles": 0,
  "failedFiles": 0,
  "errorMessage": null,
  "files": [
    {
      "id": "clx_cf1",
      "fileId": "clx_file1",
      "status": "pending",
      "currentPage": 0,
      "totalPages": 0,
      "percentage": 0
    }
  ],
  "createdAt": "2025-03-06T10:00:00.000Z",
  "updatedAt": "2025-03-06T10:00:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | بيانات غير صالحة |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | تجاوز الحصة أو ملفات ليست ملك المستخدم |
| `NOT_FOUND` | 404 | ملف غير موجود |
| `RATE_LIMITED` | 429 | تجاوز حد التحويلات |

- **Rate Limit**: 5 طلبات / دقيقة لكل مستخدم
- **Side Effects**: إنشاء سجلات Conversion + ConversionFile، إضافة BullMQ job
- **Audit Event**: `CONVERSION_CREATE` مع `{ conversionId, fileCount }`

---

### 13.2 GET /api/conversions

- **الغرض**: قائمة تحويلات المستخدم
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `cursor` | string | - | معرّف آخر تحويل |
| `limit` | number | 20 | عدد التحويلات (1-100) |
| `status` | string | - | تصفية حسب الحالة: `queued`, `processing`, `completed`, `failed`, `cancelled` |
| `sort` | string | `createdAt` | حقل الترتيب |
| `order` | string | `desc` | `asc` / `desc` |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "clx_conv1",
      "status": "completed",
      "totalFiles": 3,
      "completedFiles": 3,
      "failedFiles": 0,
      "createdAt": "2025-03-06T10:00:00.000Z",
      "updatedAt": "2025-03-06T10:05:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": null,
    "hasMore": false,
    "total": 12
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `VALIDATION_ERROR` | 400 | معاملات غير صالحة |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 13.3 GET /api/conversions/:id

- **الغرض**: تفاصيل تحويل محدد مع حالة كل ملف
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Response — 200 OK

```json
{
  "id": "clx_conv1",
  "userId": "clx_abc123",
  "status": "processing",
  "settings": {
    "ocrEngine": "google-drive",
    "language": "auto",
    "dpi": 300
  },
  "totalFiles": 3,
  "completedFiles": 1,
  "failedFiles": 0,
  "errorMessage": null,
  "files": [
    {
      "id": "clx_cf1",
      "fileId": "clx_file1",
      "status": "done",
      "currentPage": 12,
      "totalPages": 12,
      "percentage": 100,
      "errorMessage": null
    },
    {
      "id": "clx_cf2",
      "fileId": "clx_file2",
      "status": "ocr",
      "currentPage": 5,
      "totalPages": 15,
      "percentage": 33,
      "errorMessage": null
    },
    {
      "id": "clx_cf3",
      "fileId": "clx_file3",
      "status": "pending",
      "currentPage": 0,
      "totalPages": 0,
      "percentage": 0,
      "errorMessage": null
    }
  ],
  "exports": [
    {
      "id": "clx_exp1",
      "format": "docx",
      "status": "completed",
      "sizeBytes": 45678,
      "createdAt": "2025-03-06T10:05:00.000Z"
    }
  ],
  "createdAt": "2025-03-06T10:00:00.000Z",
  "updatedAt": "2025-03-06T10:02:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك التحويل |
| `NOT_FOUND` | 404 | التحويل غير موجود |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 13.4 POST /api/conversions/:id/cancel

- **الغرض**: إلغاء تحويل قيد التقدم
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Response — 200 OK

```json
{
  "id": "clx_conv1",
  "status": "cancelled",
  "cancelledAt": "2025-03-06T10:01:30.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك التحويل |
| `NOT_FOUND` | 404 | التحويل غير موجود |
| `VALIDATION_ERROR` | 400 | التحويل مكتمل أو ملغى مسبقًا |

- **Rate Limit**: 10 طلبات / دقيقة لكل مستخدم
- **Side Effects**: إلغاء BullMQ job، تحديث حالة Conversion
- **Audit Event**: `CONVERSION_CANCEL` مع `{ conversionId }`

---

### 13.5 GET /api/conversions/:id/events

- **الغرض**: تدفق SSE لأحداث التحويل
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

يرجى الرجوع إلى [القسم 5 — مواصفة SSE](#5-مواصفة-sse) للتفاصيل الكاملة.

---

## 14. Exports Endpoints

> **ملاحظة**: التصدير يولّد ملفًا بصيغة محددة من نتيجة تحويل مكتملة. يجب أن يكون التحويل بحالة `completed` قبل التصدير.

### 14.1 POST /api/exports

- **الغرض**: إنشاء تصدير جديد من نتيجة تحويل
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Request Body

```typescript
{
  conversionId: string;              // معرّف التحويل المكتمل
  format: "txt" | "docx" | "json";  // صيغة التصدير
}
```

**Validation**:
- `conversionId`: يجب أن يكون تحويلًا مكتملًا (`status: completed`)
- `conversionId`: يجب أن يكون ملك المستخدم
- `format`: صيغة مدعومة
- لا يمكن تكرار التصدير بنفس التحويل والصيغة (unique: conversionId + format)

#### Response — 201 Created

```json
{
  "id": "clx_exp1",
  "conversionId": "clx_conv1",
  "fileId": "clx_file1",
  "format": "docx",
  "status": "pending",
  "sizeBytes": null,
  "storageKey": null,
  "createdAt": "2025-03-06T10:05:00.000Z",
  "updatedAt": "2025-03-06T10:05:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | بيانات غير صالحة أو صيغة غير مدعومة |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | التحويل ليس ملك المستخدم |
| `NOT_FOUND` | 404 | التحويل غير موجود |
| `VALIDATION_ERROR` | 400 | التحويل لم يكتمل بعد |
| `EMAIL_EXISTS` | 409 | تصدير موجود مسبقًا بنفس التحويل والصيغة |
| `RATE_LIMITED` | 429 | تجاوز حد التصديرات |

- **Rate Limit**: 10 طلبات / دقيقة لكل مستخدم
- **Side Effects**: إنشاء سجل Export، إضافة BullMQ export job، توليد الملف ورفعه إلى MinIO (`ibn-al-azhar-docs-files`)
- **Audit Event**: `EXPORT_CREATE` مع `{ exportId, conversionId, format }`

---

### 14.2 GET /api/exports

- **الغرض**: قائمة التصديرات لتحويل محدد
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `conversionId` | string | - | معرّف التحويل (مطلوب) |
| `cursor` | string | - | معرّف آخر تصدير |
| `limit` | number | 20 | عدد التصديرات (1-100) |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "clx_exp1",
      "conversionId": "clx_conv1",
      "format": "docx",
      "status": "completed",
      "sizeBytes": 45678,
      "createdAt": "2025-03-06T10:05:00.000Z"
    },
    {
      "id": "clx_exp2",
      "conversionId": "clx_conv1",
      "format": "txt",
      "status": "completed",
      "sizeBytes": 12345,
      "createdAt": "2025-03-06T10:06:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": null,
    "hasMore": false,
    "total": 2
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `VALIDATION_ERROR` | 400 | conversionId مفقود أو غير صالح |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 14.3 GET /api/exports/:id

- **الغرض**: تفاصيل تصدير محدد
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Response — 200 OK

```json
{
  "id": "clx_exp1",
  "conversionId": "clx_conv1",
  "fileId": "clx_file1",
  "format": "docx",
  "status": "completed",
  "sizeBytes": 45678,
  "storageKey": "exports/2025/03/clx_exp1/result.docx",
  "createdAt": "2025-03-06T10:05:00.000Z",
  "updatedAt": "2025-03-06T10:05:30.000Z",
  "conversion": {
    "id": "clx_conv1",
    "status": "completed",
    "totalFiles": 3
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك التصدير |
| `NOT_FOUND` | 404 | التصدير غير موجود |

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: لا شيء

---

### 14.4 GET /api/exports/:id/download

- **الغرض**: الحصول على رابط تحميل التصدير
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin` أو صلاحية مشاركة فعالة

#### Response — 200 OK

```json
{
  "url": "https://storage.ibn-al-azhar-docs.local/ibn-al-azhar-docs-files/exports/2025/03/clx_exp1/result.docx?X-Amz-Algorithm=...&X-Amz-Expires=300",
  "expiresAt": "2025-03-06T10:40:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك ولا يملك صلاحية مشاركة |
| `NOT_FOUND` | 404 | التصدير غير موجود |
| `VALIDATION_ERROR` | 400 | التصدير لم يكتمل بعد |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: إنشاء presigned URL (صالح 5 دقائق) من `ibn-al-azhar-docs-files` bucket
- **Audit Event**: `EXPORT_DOWNLOAD` مع `{ exportId, format }`

---

## 15. Share Endpoints

### 15.1 POST /api/share

- **الغرض**: إنشاء رابط مشاركة
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Request Body

```typescript
{
  fileId?: string;                   // مشاركة ملف (fileId أو folderId، واحد على الأقل)
  folderId?: string;                 // مشاركة مجلد
  permission?: "view" | "download";  // افتراضي: "view"
  expiresAt?: string | null;         // تاريخ الانتهاء (null = لا ينتهي)، أقصى 30 يوم
}
```

#### Response — 201 Created

```json
{
  "id": "clx_sl1",
  "token": "a1b2c3d4e5f6...64_hex_chars_total",
  "fileId": "clx_file1",
  "folderId": null,
  "permission": "view",
  "expiresAt": null,
  "isActive": true,
  "downloadCount": 0,
  "createdAt": "2025-03-06T10:00:00.000Z"
}
```

**ملاحظة**: الـtoken يُنشأ عبر `crypto.randomBytes(32).toString('hex')` (64 حرف hex).

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | لم يتم تحديد fileId أو folderId |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك المورد |
| `NOT_FOUND` | 404 | الملف أو المجلد غير موجود |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: إنشاء سجل ShareLink
- **Audit Event**: `SHARE_CREATE` مع `{ shareLinkId, resourceId, permission }`

---

### 15.2 GET /api/share/:token

- **الغرض**: الحصول على بيانات رابط المشاركة (PUBLIC — لا يتطلب مصادقة)
- **المصادقة**: غير مطلوبة (`PUBLIC`)
- **الصلاحية**: `PUBLIC` (لكن يتحقق من صلاحية الرابط)

#### Response — 200 OK

```json
{
  "id": "clx_sl1",
  "token": "a1b2c3d4e5f6...64_hex_chars_total",
  "permission": "view",
  "expiresAt": null,
  "isActive": true,
  "resource": {
    "type": "file",
    "id": "clx_file1",
    "name": "محاضرة الرياضيات.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 5242880
  }
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `NOT_FOUND` | 404 | الرابط غير موجود أو منتهي أو معطّل |

- **Rate Limit**: 30 طلب / دقيقة لكل IP
- **Side Effects**: لا شيء
- **Audit Event**: `SHARE_VIEW` مع `{ shareLinkId }`

---

### 15.3 DELETE /api/share/:id

- **الغرض**: إلغاء رابط مشاركة
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `OWNER` أو `ROLE:admin`

#### Response — 200 OK

```json
{
  "id": "clx_sl1",
  "isActive": false,
  "deactivatedAt": "2025-03-06T11:00:00.000Z"
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `FORBIDDEN` | 403 | ليس مالك الرابط |
| `NOT_FOUND` | 404 | الرابط غير موجود |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: تعيين `isActive = false`
- **Audit Event**: `SHARE_DEACTIVATE` مع `{ shareLinkId }`

---

## 16. Admin Endpoints

### 16.1 GET /api/admin/users

- **الغرض**: قائمة المستخدمين (للمديرين فقط)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `ROLE:admin`

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `cursor` | string | - | معرّف آخر مستخدم |
| `limit` | number | 20 | عدد المستخدمين (1-100) |
| `role` | string | - | تصفية حسب الدور |
| `status` | string | - | تصفية حسب الحالة |
| `search` | string | - | بحث في الاسم أو البريد |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "clx_user1",
      "email": "ahmed@example.com",
      "name": "أحمد محمد",
      "role": "student",
      "status": "active",
      "storageUsed": 52428800,
      "createdAt": "2025-01-15T08:00:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": null,
    "hasMore": false,
    "total": 150
  }
}
```

- **Rate Limit**: 60 طلب / دقيقة لكل مستخدم
- **Audit Event**: `ADMIN_USER_LIST`

---

### 16.2 PATCH /api/admin/users/:id

- **الغرض**: تحديث بيانات مستخدم (للمديرين فقط)
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `ROLE:admin`

#### Request Body

```typescript
{
  role?: "student" | "teacher" | "admin";
  status?: "active" | "suspended";
}
```

#### Response — 200 OK

```json
{
  "id": "clx_user1",
  "role": "teacher",
  "status": "active",
  "updatedAt": "2025-03-06T11:00:00.000Z"
}
```

- **Rate Limit**: 30 طلب / دقيقة لكل مستخدم
- **Side Effects**: تحديث سجل User، إبطال sessions إذا تغيرت الحالة
- **Audit Event**: `ADMIN_USER_UPDATE` مع `{ targetUserId, changes }`

---

### 16.3 GET /api/admin/stats

- **الغرض**: إحصائيات النظام
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `ROLE:admin`

#### Response — 200 OK

```json
{
  "users": {
    "total": 150,
    "students": 120,
    "teachers": 25,
    "admins": 5
  },
  "files": {
    "total": 1250,
    "totalSizeBytes": 53687091200,
    "byMimeType": {
      "application/pdf": 800,
      "image/png": 300,
      "image/jpeg": 100,
      "image/webp": 50
    }
  },
  "conversions": {
    "total": 500,
    "completed": 450,
    "failed": 20,
    "processing": 5
  },
  "exports": {
    "total": 350,
    "byFormat": {
      "txt": 100,
      "docx": 200,
      "json": 50
    }
  },
  "storage": {
    "usedBytes": 53687091200,
    "quotaBytes": 107374182400
  }
}
```

- **Rate Limit**: 10 طلبات / دقيقة لكل مستخدم
- **Audit Event**: `ADMIN_STATS_VIEW`

---

### 16.4 GET /api/admin/activity

- **الغرض**: سجل النشاط
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `ROLE:admin`

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `cursor` | string | - | معرّف آخر سجل |
| `limit` | number | 50 | عدد السجلات (1-100) |
| `userId` | string | - | تصفية حسب المستخدم |
| `action` | string | - | تصفية حسب نوع النشاط |
| `startDate` | string | - | من تاريخ |
| `endDate` | string | - | إلى تاريخ |

#### Response — 200 OK

```json
{
  "data": [
    {
      "id": "clx_log1",
      "userId": "clx_abc123",
      "action": "FILE_UPLOAD",
      "resourceType": "File",
      "resourceId": "clx_file1",
      "details": { "fileName": "محاضرة.pdf", "sizeBytes": 5242880 },
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-03-06T10:00:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": "clx_log50",
    "hasMore": true,
    "total": 5000
  }
}
```

- **Rate Limit**: 30 طلب / دقيقة لكل مستخدم
- **Audit Event**: `ADMIN_ACTIVITY_VIEW`

---

## 17. Search Endpoint

### 17.1 GET /api/search

- **الغرض**: البحث في ملفات المستخدم
- **المصادقة**: مطلوبة (`AUTH`)
- **الصلاحية**: `AUTH`

#### Query Parameters

| Parameter | النوع | افتراضي | الوصف |
|-----------|------|---------|-------|
| `q` | string | - | نص البحث (مطلوب، 2-200 حرف) |
| `type` | string | `files` | نوع البحث: `files` |
| `limit` | number | 20 | عدد النتائج (1-50) |
| `folderId` | string | - | تصفية حسب المجلد |
| `mimeType` | string | - | تصفية حسب النوع |

#### Response — 200 OK

```json
{
  "query": "محاضرة",
  "results": [
    {
      "id": "clx_file1",
      "name": "محاضرة الرياضيات.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 5242880,
      "folderId": "clx_folder1",
      "folder": { "id": "clx_folder1", "name": "الرياضيات" },
      "createdAt": "2025-03-06T14:30:00.000Z"
    }
  ],
  "total": 5
}
```

#### Errors

| Code | Status | السبب |
|------|--------|-------|
| `VALIDATION_ERROR` | 400 | نص البحث قصير جدًا |
| `UNAUTHORIZED` | 401 | غير مُصادَق |
| `RATE_LIMITED` | 429 | تجاوز حد البحث |

- **Rate Limit**: 20 طلب / دقيقة لكل مستخدم
- **Side Effects**: لا شيء
- **Audit Event**: `SEARCH` مع `{ query, resultCount }`
