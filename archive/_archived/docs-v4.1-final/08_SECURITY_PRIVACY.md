# Ibn Al-Azhar Docs — ابن الأزهر دوكس — الأمن والخصوصية | Security & Privacy

> **التصنيف:** سري — للاستخدام الداخلي فقط  
> **الإصدار:** 1.0.0  
> **آخر تحديث:** 2025-03-05  
> **المرجع التقني:** أنظر `05_TECHNICAL_DESIGN.md` لمعمارية المصادقة، `06_API_SPEC.md` لتفاصيل الـ endpoints

---

## جدول المحتويات

1. [الأهداف الأمنية](#1-الأهداف-الأمنية)
2. [نموذج التهديدات (Threat Model)](#2-نموذج-التهديدات-threat-model)
3. [أمان المصادقة (Authentication Security)](#3-أمان-المصادقة-authentication-security)
4. [نموذج الصلاحيات (Authorization Model)](#4-نموذج-الصلاحيات-authorization-model)
5. [أمان رفع الملفات (Upload Security)](#5-أمان-رفع-الملفات-upload-security)
6. [أمان الوصول للملفات (File Access Security)](#6-أمان-الوصول-للملفات-file-access-security)
7. [أمان روابط المشاركة (Share Link Security)](#7-أمان-روابط-المشاركة-share-link-security)
8. [أمان ذاكرة PWA المؤقتة (PWA Cache Security)](#8-أمان-ذاكرة-pwa-المؤقتة-pwa-cache-security)
9. [خصوصية OCR](#9-خصوصية-ocr)
10. [الإفصاح عن الخدمات الخارجية (External Services Disclosure)](#10-الإفصاح-عن-الخدمات-الخارجية-external-services-disclosure)
11. [الاحتفاظ بالبيانات (Data Retention)](#11-الاحتفاظ-بالبيانات-data-retention)
12. [سياسة الحذف (Deletion Policy)](#12-سياسة-الحذف-deletion-policy)
13. [سياسة التسجيل (Logging Policy)](#13-سياسة-التسجيل-logging-policy)
14. [إدارة الأسرار (Secrets Management)](#14-إدارة-الأسرار-secrets-management)
15. [سياسة أمان المحتوى (Content Security Policy)](#15-سياسة-أمان-المحتوى-content-security-policy)
16. [تحديد المعدل (Rate Limiting)](#16-تحديد-المعدل-rate-limiting)
17. [منع الإساءة (Abuse Prevention)](#17-منع-الإساءة-abuse-prevention)
18. [أساسيات الاستجابة للحوادث (Incident Response Basics)](#18-أساسيات-الاستجابة-للحوادث-incident-response-basics)

---

## 1. الأهداف الأمنية

تستند منصة **Ibn Al-Azhar Docs — ابن الأزهر دوكس** إلى مبادئ ثلاثية CIA (السرية، السلامة، التوافر) مع إضافة بُعد الخصوصية كركيزة أساسية نظراً لطبيعة البيانات التعليمية الحساسة.

### 1.1 السرية (Confidentiality)

- لا يمكن الوصول إلى بيانات المستخدم إلا من قِبل المالك أو من يصرح له صراحةً عبر روابط مشاركة محدودة الأجل
- جميع البيانات في حالة السكون مشفرة (Encryption at Rest) عبر MinIO SSE
- جميع البيانات في حالة النقل مشفرة عبر TLS 1.3 (Caddy + Let's Encrypt)
- رموز المصادقة (Tokens) محفوظة في HttpOnly cookies فقط — لا يُسمح بالتخزين في localStorage أو ملفات نصية عادية

### 1.2 السلامة (Integrity)

- التحقق من سلامة الملفات المرفوعة عبر MIME type validation + file signature verification
- حماية من SQL Injection عبر Prisma parameterized queries + Zod input validation
- حماية من XSS عبر strict CSP + output encoding
- حماية من CSRF عبر NextAuth.js built-in CSRF tokens
- سجل تدقيق (Audit Log) لكل عملية تعديل أو حذف — أنظر `ActivityLog` في `07_DATABASE_SCHEMA.md`

### 1.3 التوافر (Availability)

- Rate limiting عبر Redis لمنع إساءة الاستخدام وهجمات DDoS
- معالجة الملفات الكبيرة عبر BullMQ queue مع retry logic
- فشل أنيق (Graceful degradation) عند تعطل الخدمات الخارجية (OCR)
- Health checks دورية مع تنبيهات

### 1.4 الخصوصية (Privacy)

- موافقة صريحة قبل إرسال أي ملف إلى خدمات خارجية (Google Drive API)
- تقليل جمع البيانات إلى الحد الأدنى (Data Minimization)
- حق المستخدم في التصدير والحذف الكامل
- شفافية كاملة حول تدفق البيانات — قسم [الإفصاح عن الخدمات الخارجية](#10-الإفصاح-عن-الخدمات-الخارجية-external-services-disclosure)

### 1.5 دروس مستفادة من Tahweel

الثغرات التالية تم التحقق منها في مستودع Tahweel ويجب تجنبها تماماً:

| الثغرة | الوصف | الحل في Ibn Al-Azhar Docs |
|---------|-------|---------------|
| `CSP = null` | لا توجد سياسة أمان محتوى | Strict CSP — [القسم 15](#15-سياسة-أمان-المحتوى-content-security-policy) |
| `CLIENT_SECRET` مكشوف في الكود | بيانات سرية مكتوبة في source code | Environment variables فقط — [القسم 14](#14-إدارة-الأسرار-secrets-management) |
| Token storage في ملف نصي عادي | رموز المصادقة محفوظة في ملف بدون حماية | HttpOnly cookies عبر NextAuth.js — [القسم 3](#3-أمان-المصادقة-authentication-security) |
| Google Fonts CDN | تحميل خطوط من مصدر خارجي | Self-hosted fonts — [القسم 15](#15-سياسة-أمان-المحتوى-content-security-policy) |
| لا يوجد حماية CSRF | طلبات تغيير الحالة بدون حماية | NextAuth.js CSRF — [القسم 3](#3-أمان-المصادقة-authentication-security) |
| لا يوجد تشفير في حالة السكون | ملفات MinIO بدون تشفير | MinIO SSE — [القسم 6](#6-أمان-الوصول-للملفات-file-access-security) |
| لا يوجد rate limiting | لا حدود لعدد الطلبات | Redis rate limiting — [القسم 16](#16-تحديد-المعدل-rate-limiting) |

---

## 2. نموذج التهديدات (Threat Model)

### 2.1 جدول التهديدات الشامل

| # | التهديد | السيناريو | الأثر | الاحتمالية | التخفيف | مطلوب في MVP؟ |
|---|---------|-----------|-------|------------|---------|---------------|
| T01 | **XSS (Cross-Site Scripting)** | حقن JavaScript خبيث عبر أسماء الملفات أو المحتوى المُدخل | عالي — سرقة session، تعديل المحتوى | متوسطة-عالية | Strict CSP، output encoding، Zod validation، React auto-escaping | ✅ نعم |
| T02 | **CSRF (Cross-Site Request Forgery)** | تنفيذ طلبات غير مصرح بها نيابة عن المستخدم المصادق عليه | عالي — عمليات حذف/تعديل بدون علم المستخدم | متوسطة | NextAuth.js built-in CSRF tokens، SameSite=Lax cookies | ✅ نعم |
| T03 | **SQL Injection** | حقن استعلامات SQL عبر مدخلات API غير المعقمة | حرج — تسريب بيانات كاملة | متوسطة | Prisma parameterized queries، Zod input validation، strict CSP | ✅ نعم |
| T04 | **هجوم رفع الملفات (File Upload Attack)** | رفع ملف خبيث (web shell، ملف تنفيذي) متنكر كملف PDF | حرج — تنفيذ كود عن بُعد | متوسطة | MIME type validation، file signature verification، size limits، عزل في MinIO | ✅ نعم |
| T05 | **اختراق خصوصية OCR** | إرسال ملفات تعليمية حساسة إلى Google Drive API بدون موافقة المستخدم | عالي — انتهاك خصوصية | منخفضة-متوسطة | موافقة صريحة، إشعار واضح، حذف فوري من Google — [القسم 9](#9-خصوصية-ocr) | ✅ نعم |
| T06 | **إساءة استخدام روابط المشاركة** | مشاركة غير مصرح بها لرابط، تخمين token، رابط منتهي الصلاحية لا يزال يعمل | عالي — وصول غير مصرح لملفات | متوسطة | crypto-random tokens (32 byte)، expiry enforcement، rate limiting downloads، إبطال يدوي | ✅ نعم |
| T07 | **PWA Cache Poisoning** | حقن محتوى خبيث في Service Worker cache أو تعديل الملفات المخزنة مؤقتاً | عالي — تنفيذ كود عند كل زيارة | منخفضة | Strict CSP، SRI for cached resources، cache versioning، HTTPS only | ✅ نعم |
| T08 | **تجاوز Rate Limiting** | استخدام IPs متعددة أو رؤوس متغيرة لتجاوز حدود الطلبات | متوسط — إساءة استخدام الموارد | متوسطة | Rate limiting متعدد الطبقات (IP + User + Endpoint)، Redis sliding window | ✅ نعم |
| T09 | **اختطاف الجلسة (Session Hijacking)** | سرقة JWT من cookie أو اعتراض session عبر XSS أو network sniffing | حرج — وصول كامل للحساب | متوسطة | HttpOnly + Secure + SameSite=Lax cookies، JWT في HttpOnly cookie عبر NextAuth.js v5 (عمر 24 ساعة)، إبطال عند تسجيل الخروج | ✅ نعم |
| T10 | **تسريب البيانات (Data Breach)** | وصول غير مصرح إلى قاعدة البيانات أو MinIO بسبب خطأ في الصلاحيات | حرج — تسريب بيانات تعليمية حساسة | منخفضة | Encryption at rest، مبدأ الامتياز الأقل، audit logging، network isolation | ✅ نعم |
| T11 | **التهديد الداخلي (Insider Threat)** | موظف أو مسؤول يسيء استخدام صلاحياته للوصول إلى بيانات المستخدمين | عالي — انتهاك خصوصية جسيم | منخفضة | Audit logging شامل، مبدأ الامتياز الأقل، مراجعة صلاحيات دورية، separation of duties | ⬜ Post-MVP |
| T12 | **DDoS** | إغراق الخادم بطلبات كثيفة لإيقاف الخدمة | عالي — انقطاع الخدمة | متوسطة | Caddy rate limiting، Redis rate limiting، Cloudflare (مستقبلاً)، graceful degradation | ✅ نعم (طبقة أساسية) |
| T13 | **MITM (Man-in-the-Middle)** | اعتراض البيانات أثناء النقل على شبكة غير آمنة | حرج — سرقة بيانات المصادقة | منخفضة | HTTPS إلزامي (Caddy + Let's Encrypt)، HSTS header، certificate pinning (مستقبلاً) | ✅ نعم |
| T14 | **Credential Stuffing** | استخدام بيانات مسربة من مواقع أخرى لتسجيل الدخول | عالي — وصول غير مصرح لحسابات | متوسطة | Rate limiting على تسجيل الدخول، bcrypt cost=12، فحص Have I Been Pwned (مستقبلاً)، account lockout | ✅ نعم |
| T15 | **كشف المعلومات (Information Disclosure)** | رسائل خطأ تفصيلية تكشف معلومات داخلية، stack traces في الإنتاج | متوسط — تسهيل هجمات أخرى | متوسطة | Error handling مركزي، عدم كشف stack traces في prod، generic error messages | ✅ نعم |
| T16 | **Directory Traversal** | محاولة الوصول إلى ملفات خارج المجلد المصرح عبر مسارات مثل `../../etc/passwd` | عالي — قراءة ملفات النظام | منخفضة | Prisma parameterized queries، مسارات MinIO معقمة (sanitized)، عدم استخدام مسارات المستخدم مباشرة | ✅ نعم |
| T17 | **Insecure Dependencies** | مكتبة طرف ثالث بها ثغرة معروفة | متوسط-حرج — حسب الثغرة | متوسطة | `npm audit` في CI، Dependabot، تحديث دوري، Snyk (مستقبلاً) | ✅ نعم (CI check) |
| T18 | **Brute Force على روابط المشاركة** | تخمين share tokens عبر طلبات متكررة | عالي — وصول لملفات مشاركة | متوسطة | Token بطول 32 bytes (256 bits)، rate limiting على endpoint التحميل، expiry قصير | ✅ نعم |

### 2.2 تصنيف التهديدات حسب STRIDE

| الفئة | التهديدات |
|-------|-----------|
| **S**poofing | T09, T14 |
| **T**ampering | T01, T02, T03, T07 |
| **R**epudiation | T11 |
| **I**nformation Disclosure | T05, T10, T15, T16 |
| **D**enial of Service | T08, T12 |
| **E**levation of Privilege | T04, T06, T18 |

---

## 3. أمان المصادقة (Authentication Security)

> **المرجع:** أنظر `05_TECHNICAL_DESIGN.md` — قسم Authentication Architecture

### 3.1 متطلبات كلمة المرور

| المعيار | القيمة |
|---------|--------|
| الحد الأدنى للطول | 8 أحرف |
| الحد الأقصى للطول | 128 حرف |
| أحرف كبيرة مطلوبة | نعم (حرف واحد على الأقل) |
| أحرف صغيرة مطلوبة | نعم (حرف واحد على الأقل) |
| أرقام مطلوبة | نعم (رقم واحد على الأقل) |
| رموز خاصة مطلوبة | لا (اختياري) |
| قائمة كلمات مرور محظورة | نعم — أشهر 10,000 كلمة مرور |
| bcrypt cost factor | 12 |
| الحد الأقصى لمحاولات تسجيل الدخول | 5 محاولات خلال 15 دقيقة |

### 3.2 تدفق JWT — NextAuth.js v5

يستخدم المشروع **NextAuth.js v5** مع استراتيجية **JWT** فقط — لا يوجد تدفق منفصل لـ access/refresh tokens.

```
┌─────────────┐    POST /api/auth/signin     ┌──────────────┐
│   Client     │ ──────────────────────────► │   Server      │
│  (Browser)   │                             │  (Next.js +   │
│              │                             │  NextAuth v5) │
│              │ ◄────────────────────────── │              │
│              │   Set-Cookie:               │              │
│              │   next-auth.session-token   │              │
│              │   (JWT, 24h maxAge)         │              │
│              │   HttpOnly; Secure;         │              │
│              │   SameSite=Lax;             │              │
│              │   Path=/                    │              │
└──────┬───────┘                             └──────────────┘
       │
       │  جلسة نشطة — التحقق عبر JWT في كل طلب
       │  تجديد الجلسة: GET /api/auth/session (NextAuth built-in)
       │
       ▼
┌─────────────┐  POST /api/auth/signout     ┌──────────────┐
│   Client     │ ──────────────────────────► │   Server      │
│              │                             │              │
│              │ ◄────────────────────────── │              │
│              │   Clear-Cookie:             │              │
│              │   next-auth.session-token   │              │
│              │   (إبطال JWT + مسح cookie)  │              │
└─────────────┘                             └──────────────┘
```

#### خصائص Session JWT (NextAuth.js v5)

| الخاصية | القيمة |
|----------|--------|
| الاستراتيجية | JWT (NextAuth.js v5 `session.strategy: "jwt"`) |
| العمر الافتراضي (maxAge) | 24 ساعة (86,400 ثانية) |
| المخزن | HttpOnly cookie — `next-auth.session-token` |
| Flags | `Secure; HttpOnly; SameSite=Lax; Path=/` |
| المحتوى | `{ sub: userId, role, iat, exp }` |
| التوقيع | `AUTH_SECRET` (HS256 عبر NextAuth) |
| الإبطال | مسح cookie + تعيين JWT كمنتهي عند تسجيل الخروج |
| تجديد الجلسة | GET `/api/auth/session` — NextAuth built-in endpoint |
| مفتاح التوقيع | `AUTH_SECRET` environment variable |

#### إعداد NextAuth.js v5

```typescript
// auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 ساعة
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 ساعة
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // التحقق من كلمة المرور + إرجاع المستخدم
        // ...
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      return session;
    },
  },
});
```

### 3.3 إدارة الجلسة

- **تسجيل الدخول:** NextAuth.js v5 يُنشئ JWT ويخزنه في HttpOnly cookie `next-auth.session-token`
- **التحقق من الجلسة:** كل طلب يمر عبر NextAuth middleware الذي يتحقق من JWT في cookie تلقائياً
- **تجديد الجلسة:** GET `/api/auth/session` — NextAuth built-in endpoint يعيد بيانات الجلسة الحالية
- **تسجيل الخروج:** POST `/api/auth/signout` — إبطال JWT + مسح cookie `next-auth.session-token`
- **نهاية الجلسة:** عند انتهاء صلاحية JWT (24 ساعة) أو تسجيل الخروج
- **Concurrent Sessions:** مسموح حتى 5 جلسات متزامنة لكل حساب

### 3.4 حماية من هجمات القوة الغاشمة (Brute Force)

```typescript
// مثال: Rate limiting على تسجيل الدخول
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 دقيقة
  max: 5,                       // 5 محاولات
  keyGenerator: (req) => {
    return `login:${req.ip}:${req.body.email}`;
  },
  handler: (req, res) => {
    // تسجيل في audit log
    await auditLog('login_rate_limited', { ip: req.ip, email: req.body.email });
    res.status(429).json({ error: 'too_many_attempts' });
  }
});
```

| الإجراء | الحد | النافذة الزمنية |
|---------|------|-----------------|
| تسجيل دخول فاشل | 5 محاولات | 15 دقيقة |
| إنشاء حساب جديد | 3 طلبات | 60 دقيقة |
| طلب إعادة تعيين كلمة المرور | 3 طلبات | 60 دقيقة |

بعد تجاوز حد تسجيل الدخول: يُقفل الحساب لمدة 30 دقيقة مع إشعار بريد إلكتروني (إن وُجد).

---

## 4. نموذج الصلاحيات (Authorization Model)

### 4.1 مصفوفة RBAC

| المورد | طالب (Student) | معلم (Teacher) | مسؤول (Admin) |
|--------|----------------|-----------------|---------------|
| **مستنداتي — عرض** | ✅ ملكه فقط | ✅ ملكه فقط | ✅ الكل |
| **مستنداتي — إنشاء** | ✅ | ✅ | ✅ |
| **مستنداتي — تعديل** | ✅ ملكه فقط | ✅ ملكه فقط | ✅ الكل |
| **مستنداتي — حذف** | ✅ ملكه فقط | ✅ ملكه فقط | ✅ الكل |
| **مستند مشترك — عرض** | ✅ عبر رابط صالح | ✅ عبر رابط صالح | ✅ |
| **مستند مشترك — تعديل** | ❌ | ✅ إذا كان المالك | ✅ |
| **مستند مشترك — حذف** | ❌ | ❌ | ✅ |
| **تحويل مستند** | ✅ ملكه فقط (5/يوم) | ✅ ملكه فقط (20/يوم) | ✅ بلا حد |
| **إنشاء رابط مشاركة** | ✅ ملكه فقط | ✅ ملكه فقط | ✅ |
| **إدارة المستخدمين** | ❌ | ❌ | ✅ |
| **عرض سجل التدقيق** | ❌ | ❌ | ✅ |
| **إعدادات النظام** | ❌ | ❌ | ✅ |
| **إحصائيات عامة** | ❌ | ❌ | ✅ |

### 4.2 تطبيق الصلاحيات

```typescript
// middleware pattern
async function authorize(resource: string, action: string, user: AuthUser, resourceId?: string) {
  // 1. التحقق من الدور (Role Check)
  if (!roleHasPermission(user.role, resource, action)) {
    throw new AuthorizationError('insufficient_role');
  }

  // 2. التحقق من الملكية (Ownership Check) — للموارد الشخصية
  if (resourceId && requiresOwnership(resource, action)) {
    const owner = await getResourceOwner(resource, resourceId);
    if (owner !== user.id && user.role !== 'admin') {
      throw new AuthorizationError('not_owner');
    }
  }

  // 3. تسجيل في سجل التدقيق
  await auditLog('authorization_check', { userId: user.id, resource, action, resourceId, granted: true });
}
```

### 4.3 مبدأ الامتياز الأقل (Principle of Least Privilege)

- كل مستخدم يبدأ بدور **طالب** بشكل افتراضي
- ترقية الدور تتم فقط من قِبل **مسؤول** عبر لوحة الإدارة
- لا يمكن للمستخدم تعديل دوره بنفسه
- API endpoints تتحقق من الصلاحيات في مستويين: middleware (دور) + handler (ملكية)

---

## 5. أمان رفع الملفات (Upload Security)

### 5.1 أنواع الملفات المسموحة

| الفئة | الامتدادات المسموحة | MIME Types |
|-------|---------------------|------------|
| مستندات | `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt` | `application/pdf`, `application/vnd.openxmlformats-officedocument.*`, `application/msword` |
| صور | `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff` | `image/jpeg`, `image/png`, `image/webp`, `image/tiff` |
| نصوص | `.txt`, `.csv` | `text/plain`, `text/csv` |

### 5.2 حدود الحجم

| الحد | القيمة |
|------|--------|
| الحد الأقصى لكل ملف | 100 MB (قابل للتعديل عبر `MAX_FILE_SIZE_BYTES`) |
| الحد الأقصى للطلب | 105 MB (مع overhead) |
| الحد الأقصى لكل مستخدم (إجمالي التخزين) | 1 GB (طالب) / 2 GB (معلم) / 10 GB (مسؤول) |

### 5.3 خطوات التحقق من الملف المرفوع

```
ملف مرفوع
    │
    ▼
[1] التحقق من حجم الملف ─── تجاوز؟ ──► رفض (413 Payload Too Large)
    │
    ▼
[2] التحقق من الامتداد ─── غير مسموح؟ ──► رفض (415 Unsupported Media Type)
    │
    ▼
[3] التحقق من MIME type (من header) ─── لا يتطابق؟ ──► رفض (415)
    │
    ▼
[4] التحقق من File Signature (magic bytes) ─── لا يتطابق مع MIME؟ ──► رفض (415)
    │
    ▼
[5] إنشاء اسم ملف آمن (UUID + extension محقق)
    │
    ▼
[6] رفع إلى MinIO (bucket/prefix خاص بالمستخدم)
    │
    ▼
[7] تسجيل في قاعدة البيانات + سجل التدقيق
```

### 5.4 التحقق من File Signature (Magic Bytes)

```typescript
const SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],           // %PDF
  'image/jpeg':      [[0xFF, 0xD8, 0xFF]],
  'image/png':       [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp':      [[0x52, 0x49, 0x46, 0x46]],           // RIFF
};

async function verifyFileSignature(buffer: Buffer, declaredMime: string): Promise<boolean> {
  const signatures = SIGNATURES[declaredMime];
  if (!signatures) return false;
  return signatures.some(sig =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}
```

### 5.5 اعتبارات فحص الفيروسات

| المرحلة | الحل |
|---------|------|
| MVP | لا يوجد فحص فيروسات — الاعتماد على MIME + signature + عزل MinIO |
| Post-MVP | دمج ClamAV في Docker Compose مع فحص غير متزامن عبر BullMQ |
| Enterprise | API خارجية لفحص الفيروسات (VirusTotal أو مشابه) |

> **ملاحظة:** حتى بدون فحص فيروسات، لا يتم تقديم الملفات المرفوعة كـ executable من الخادم. الملفات تُخزن في MinIO وتُقدم عبر presigned URLs فقط.

---

## 6. أمان الوصول للملفات (File Access Security)

### 6.1 فحوصات الصلاحيات

كل طلب وصول لملف يمر بالمراحل التالية:

1. **المصادقة:** هل المستخدم مسجل الدخول؟ (JWT verification عبر NextAuth)
2. **الملكية:** هل الملف ملك المستخدم؟ أو هل يوجد رابط مشاركة صالح؟
3. **التدقيق:** تسجيل عملية الوصول في ActivityLog

```typescript
async function getFileAccess(userId: string, fileId: string): Promise<PresignedUrl> {
  // 1. جلب الملف من قاعدة البيانات
  const file = await prisma.document.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError();

  // 2. التحقق من الملكية أو الصلاحيات
  if (file.userId !== userId) {
    // التحقق من صلاحية المسؤول
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      // التحقق من رابط مشاركة صالح
      const share = await prisma.shareLink.findFirst({
        where: { documentId: fileId, expiresAt: { gt: new Date() }, isActive: true }
      });
      if (!share) throw new AuthorizationError('no_access');
    }
  }

  // 3. تسجيل عملية الوصول
  await auditLog('file_access', { userId, fileId, action: 'download' });

  // 4. إصدار presigned URL قصير العمر
  return generatePresignedUrl(file.storageKey, 300); // 5 دقائق
}
```

### 6.2 Presigned URL

| الخاصية | القيمة |
|----------|--------|
| العمر الافتراضي | 5 دقائق (300 ثانية) |
| الحد الأقصى | 15 دقيقة |
| طريقة التوليد | MinIO SDK `presignedGetObject` |
| Single-use | لا (تقنياً) — لكن العمر القصير يحدد الاستخدام |
| المراقبة | كل استخدام يُسجل في audit log |

### 6.3 سياسات حاويات MinIO (Bucket Policies)

```
Bucket: ibn-al-azhar-docs-files
├── users/{userId}/
│   ├── uploads/          ← الملكية: المستخدم فقط + Admin
│   ├── conversions/      ← الملكية: المستخدم فقط + Admin
│   └── temp/             ← ملفات مؤقتة، تحذف تلقائياً
└── shared/               ← ملفات المشاركة النشطة فقط
```

- كل مستخدم له **prefix خاص** ضمن bucket واحد
- Bucket policy تمنع cross-user access على مستوى التطبيق
- Post-MVP: كل مستخدم له **bucket منفصل** مع سياسات مستقلة

### 6.4 التشفير في حالة السكون (Encryption at Rest)

```yaml
# MinIO configuration for SSE
environment:
  MINIO_SERVER_ENCRYPTION: "on"
  MINIO_SERVER_ENCRYPTION_TYPE: "SSE-S3"
```

- **SSE-S3:** تشفير تلقائي بواسطة MinIO باستخدام مفاتيح مُدارة داخلياً
- **Post-MVP:** SSE-KMS مع مفاتيح يديرها المستخدم (Customer-Managed Keys)
- التشفير شفاف للتطبيق — لا يتطلب تغيير في الكود

---

## 7. أمان روابط المشاركة (Share Link Security)

### 7.1 توليد الرمز (Token Generation)

```typescript
import { randomBytes } from 'crypto';

function generateShareToken(): string {
  return randomBytes(32).toString('hex'); // 64 hex chars, 256-bit token
}
```

| الخاصية | القيمة |
|----------|--------|
| الخوارزمية | `crypto.randomBytes` (CSPRNG) |
| الطول | 32 bytes = 64 hex characters |
| الإنتروبيا | 256 bits |
| القابلية للتخمين | عملياً مستحيلة (2^256 احتمال) |
| نوع العمود في DB | VarChar(128) — يكفي لـ 64 hex chars مع هامش |

### 7.2 انتهاء الصلاحية (Expiry)

| نوع الرابط | المدة الافتراضية | الحد الأقصى |
|------------|------------------|-------------|
| مشاهدة فقط | 7 أيام | 30 يوماً |
| تحميل | 7 أيام | 30 يوماً |
| رابط لمرة واحدة | يبطل بعد أول استخدام | — |

### 7.3 تطبيق الصلاحيات

```typescript
async function accessSharedDocument(token: string, requesterId?: string) {
  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: { document: true }
  });

  // 1. التحقق من وجود الرابط
  if (!share) throw new NotFoundError('share_not_found');

  // 2. التحقق من انتهاء الصلاحية
  if (share.expiresAt < new Date()) throw new ForbiddenError('share_expired');

  // 3. التحقق من التفعيل
  if (!share.isActive) throw new ForbiddenError('share_deactivated');

  // 4. إذا كان لمرة واحدة
  if (share.oneTimeUse && share.accessCount > 0) {
    throw new ForbiddenError('share_already_used');
  }

  // 5. تحديث عداد الاستخدام
  await prisma.shareLink.update({
    where: { id: share.id },
    data: { accessCount: { increment: 1 } }
  });

  // 6. تسجيل في audit log
  await auditLog('share_accessed', {
    shareId: share.id,
    documentId: share.documentId,
    requesterId: requesterId || 'anonymous',
    ip: getCurrentIp()
  });

  return share;
}
```

### 7.4 Rate Limiting على التحميل عبر المشاركة

| الحد | القيمة |
|------|--------|
| طلبات مشاهدة رابط مشاركة | 30 طلب/ساعة لكل IP |
| تحميل ملف مشترك | 10 تحميلات/ساعة لكل IP |
| تخمين رمز مشاركة | 5 طلبات/دقيقة لكل IP → حظر + تنبيه |

---

## 8. أمان ذاكرة PWA المؤقتة (PWA Cache Security)

### 8.1 ما يتم تخزينه مؤقتاً (Cached)

| المورد | الاستراتيجية | المدة | سبب التخزين |
|--------|-------------|-------|-------------|
| App Shell (HTML, JS, CSS) | Cache First | حتى تحديث SW | PWA offline support |
| Self-hosted Fonts | Cache First | حتى تحديث SW | أداء، لا اعتماد على CDN |
| الصور الثابتة (icons, logos) | Cache First | حتى تحديث SW | أداء |
| صفحات عامة (landing, help) | Stale While Revalidate | 24 ساعة | أداء + تحديث |

### 8.2 ما لا يتم تخزينه مؤقتاً (NOT Cached)

| المورد | السبب |
|--------|-------|
| بيانات المستخدم الشخصية | خصوصية — لا تخزين بيانات حساسة محلياً |
| قوائم المستندات | دقة البيانات — دائماً من الخادم |
| محتوى المستندات (PDF, DOCX) | خصوصية + حجم — عبر presigned URL فقط |
| رموز المصادقة | أمن — HttpOnly cookies لا يصلها SW |
| إعدادات الحساب | خصوصية |
| نتائج OCR | خصوصية — بيانات حساسة |

### 8.3 إبطال ذاكرة التخزين المؤقت (Cache Invalidation)

```javascript
// service-worker.js — عبر @serwist/next (proposal)
const CACHE_VERSION = 'ibn-al-azhar-docs-v1';
const CACHE_NAME = `${CACHE_VERSION}-${BUILD_HASH}`;

self.addEventListener('activate', (event) => {
  // حذف جميع الـ caches القديمة
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});
```

- كل deployment يُصدر BUILD_HASH جديد → cache جديد
- لا يتم تخزين استجابات API في الـ cache
- سياسة `Cache-Control: no-store` على جميع API responses
- يستخدم SW `versioned cache names` لضمان إبطال فوري
- Service Worker عبر **@serwist/next** ك proposal للتكامل مع Next.js

### 8.4 التعامل مع البيانات الحساسة في PWA

- لا يتم تخزين أي محتوى مستند محلياً
- IndexedDB يُستخدم فقط لإعدادات التفضيلات (preferences) وليس بيانات المستخدمين
- عند تسجيل الخروج: يتم مسح جميع الـ caches عبر `caches.delete()` و IndexedDB
- لا يتم أبداً تخزين tokens أو بيانات اعتماد في localStorage أو IndexedDB

---

## 9. خصوصية OCR

### 9.1 تدفق بيانات OCR عبر Google Drive API

```
┌──────────┐    1. رفع ملف     ┌──────────┐    2. رفع مؤقت    ┌──────────────┐
│  مستند     │ ───────────────► │  خادم     │ ───────────────► │  Google Drive │
│  (مستخدم)  │                  │  Ibn      │                  │  API         │
│            │                  │  Al-Azhar │                  │              │
│            │                  │  Docs     │ ◄─────────────── │              │
│            │                  │          │   3. OCR result   │              │
│            │ ◄─────────────── │          │    (text only)    │              │
│            │   4. نتيجة OCR   │          │                   │              │
│            │                  │          │   5. حذف فوري ◄── │              │
└──────────┘                  └──────────┘                   └──────────────┘
```

### 9.2 دورة حياة الملف المؤقت في Google

| المرحلة | المدة | التفاصيل |
|---------|-------|---------|
| رفع الملف إلى Google Drive | < 30 ثانية | ملف مؤقت في مجلد خاص بالتطبيق |
| معالجة OCR | 10-120 ثانية | استخراج النص فقط |
| حذف الملف من Google Drive | فوري بعد استخراج النص | `files.delete()` فور اكتمال OCR |
| الاحتفاظ بنص OCR | حسب سياسة المستخدم | يُخزن في قاعدة بيانات Ibn Al-Azhar Docs فقط |
| أقصى مدة بقاء في Google | 5 دقائق | BullMQ job timeout مع حذف إلزامي |

### 9.3 إشعار المستخدم وموافقته

```typescript
// قبل إرسال أي ملف للـ OCR
async function requestOCRConsent(userId: string, fileId: string): Promise<boolean> {
  // 1. التحقق من وجود موافقة سابقة
  const existing = await prisma.oCRConsent.findFirst({
    where: { userId, revokedAt: null }
  });

  if (existing) return true; // موافقة سابقة سارية

  // 2. إرجاع false — الواجهة تعرض إشعار الموافقة
  return false;
}

// عند الموافقة
async function grantOCRConsent(userId: string): Promise<void> {
  await prisma.oCRConsent.create({
    data: {
      userId,
      consentText: 'OCR_CONSENT_V1', // نسخة نص الموافقة
      grantedAt: new Date(),
      ipAddress: getCurrentIp(),
    }
  });

  await auditLog('ocr_consent_granted', { userId });
}
```

#### نص الإشعار المطلوب في الواجهة:

> ⚠️ **تنبيه خصوصية:** لاستخراج النص من الصور/PDF، سيتم إرسال ملفك مؤقتاً إلى خدمات Google للمعالجة. يتم حذف الملف فور استخراج النص (خلال 5 دقائق كحد أقصى). لا يتم الاحتفاظ بأي ملف على خوادم Google. بالضغط على "موافقة"، أنت توافق على هذه العملية.

### 9.4 تتبع الموافقة (Consent Tracking)

- `OCRConsent` entity في قاعدة البيانات — أنظر `07_DATABASE_SCHEMA.md`
- تسجيل IP address ونسخة نص الموافقة
- إمكانية سحب الموافقة في أي وقت
- عند سحب الموافقة: تعطيل OCR للمستخدم مع إمكانية الاستمرار في استخدام المنصة بدون OCR

---

## 10. الإفصاح عن الخدمات الخارجية (External Services Disclosure)

### 10.1 الخدمات الحالية

| الخدمة | الغرض | البيانات المُرسلة | مدة الاحتفاظ | موقع الخوادم |
|--------|-------|-------------------|-------------|-------------|
| **Google Drive API** | OCR — استخراج النص من الصور/PDF | ملف الصورة/PDF مؤقتاً | < 5 دقائق ثم حذف فوري | عالمي (حسب منطقة المستخدم) |
| **Google OAuth 2.0** | تسجيل الدخول عبر Google (اختياري) | رمز تفويض فقط | لا يتم الاحتفاظ ببيانات | عالمي |

### 10.2 تفاصيل Google Drive API

- **نطاق الصلاحيات المطلوب:** `https://www.googleapis.com/auth/drive.file` (ملفات أنشأها التطبيق فقط)
- **لا نطلب:** `drive.readonly` أو `drive` (وصول كامل لحساب المستخدم)
- **المجلد:** يتم إنشاء مجلد مخفي خاص بالتطبيق
- **المشاركة:** لا يتم مشاركة الملفات مع أي حساب آخر
- **API Usage:** ملف واحد في كل مرة، معالجة متزامنة

### 10.3 خدمات مستقبلية محتملة

| الخدمة | الغرض | الحالة | البيانات المتوقعة |
|--------|-------|--------|-------------------|
| Sentry | تتبع الأخطاء | قيد الدراسة | Error traces (بدون PII) |
| PostHog / Plausible | تحليلات الاستخدام | قيد الدراسة | بيانات مجهولة فقط |
| Cloudflare | CDN + DDoS protection | قيد الدراسة | بيانات الطلبات |
| VirusTotal | فحص الفيروسات | Post-MVP | Hashes + ملفات مؤقتة |

> **سياسة:** أي خدمة خارجية جديدة تتطلب مراجعة أمنية وتحديث هذا المستند وإشعار المستخدمين.

---

## 11. الاحتفاظ بالبيانات (Data Retention)

### 11.1 فترات الاحتفاظ حسب نوع البيانات

| نوع البيانات | فترة الاحتفاظ | السبب | طريقة الحذف |
|-------------|--------------|-------|------------|
| حسابات المستخدمين | حتى طلب الحذف | تقديم الخدمة | Soft delete → Hard delete بعد 30 يوماً |
| بيانات المصادقة (JWT في cookie) | 24 ساعة (NextAuth maxAge) | إدارة الجلسة | انتهاء صلاحية تلقائي |
| الملفات المرفوعة | حتى طلب الحذف | تقديم الخدمة | حذف من MinIO + قاعدة البيانات |
| نتائج التحويل | حتى طلب الحذف | تقديم الخدمة | حذف من MinIO + قاعدة البيانات |
| روابط المشاركة | حتى انتهاء الصلاحية أو الحذف | وظيفة المشاركة | حذف تلقائي عند انتهاء الصلاحية |
| سجل التدقيق (ActivityLog) | 90 يوماً | الأمن والتوافق | Hard delete بعد 90 يوماً |
| سجلات الموافقة على OCR | حتى حذف الحساب | التوافق القانوني | حذف مع الحساب |
| Job logs (BullMQ) | 7 أيام | المراقبة | حذف تلقائي من Redis |
| ملفات مؤقتة (temp/) | 24 ساعة | المعالجة | BullMQ cleanup job |
| سجلات الخادم (pino) | 30 يوماً | المراقبة والاستكشاف | Log rotation |

### 11.2 سياسة الاحتفاظ

- **مبدأ أساسي:** لا نحتفظ ببيانات أكثر مما يلزم لتقديم الخدمة
- **الملفات المحذوفة:** تُحذف فوراً من MinIO ولا يمكن استرجاعها
- **النسخ الاحتياطية:** تحتوي على بيانات محذوفة حتى دورة النسخ التالية — أنظر `10_DEVOPS_DEPLOYMENT.md`
- **التوافق:** تتوافق السياسة مع متطلبات GDPR (حيث ينطبق)

---

## 12. سياسة الحذف (Deletion Policy)

### 12.1 حذف المستندات الفردية

```
طلب حذف مستند
    │
    ▼
[1] Soft Delete — تعيين deletedAt في قاعدة البيانات
    │   └─ المستند يختفي من الواجهة فوراً
    │
    ▼ (بعد 7 أيام — BullMQ scheduled job)
[2] Hard Delete
    │   ├─ حذف الملف من MinIO
    │   ├─ حذف روابط المشاركة
    │   ├─ حذف سجلات التحويل
    │   └─ حذف السجل من قاعدة البيانات
    │
    ▼
[3] Audit Log entry (يُحتفظ به 90 يوماً)
```

### 12.2 حذف حساب المستخدم

| المرحلة | الإجراء | المدة |
|---------|---------|-------|
| 1. الطلب | المستخدم يطلب حذف الحساب عبر الإعدادات | — |
| 2. التأكيد | إرسال رابط تأكيد عبر البريد الإلكتروني | 24 ساعة للاستجابة |
| 3. Soft Delete | تعطيل الحساب، إخفاء البيانات | فوري بعد التأكيد |
| 4. فترة السماح | المستخدم يمكنه استعادة الحساب | 14 يوماً |
| 5. Hard Delete | حذف كامل لجميع البيانات | بعد 14 يوماً |
| 6. الحذف من النسخ الاحتياطية | يحدث تلقائياً خلال 7 أيام | حتى 7 أيام |

### 12.3 بيانات الحذف الكامل

عند حذف حساب المستخدم نهائياً، يتم حذف:

- ✅ ملفات MinIO (جميع الملفات في prefix المستخدم)
- ✅ سجلات قاعدة البيانات (User, Document, ShareLink, OCRConsent)
- ✅ جلسة المصادقة (مسح cookie JWT)
- ✅ Jobs في BullMQ المتعلقة بالمستخدم
- ❌ سجلات التدقيق (تُحتفظ لـ 90 يوماً — مع إخفاء PII)
- ❌ سجلات الخادم (تُحتفظ لـ 30 يوماً)

### 12.4 تصدير البيانات (Data Export)

قبل حذف الحساب، يمكن للمستخدم طلب تصدير كامل لبياناته:

- `GET /api/user/export` → ملف ZIP يحتوي:
  - ملف JSON ببيانات الملف الشخصي
  - جميع المستندات (الملفات الأصلية + المحولة)
  - سجل الموافقات
  - سجل المشاركات

---

## 13. سياسة التسجيل (Logging Policy)

### 13.1 ما يتم تسجيله

| الحدث | البيانات المسجلة | المستوى |
|-------|-----------------|---------|
| تسجيل دخول ناجح | userId, IP, timestamp, userAgent | `info` |
| تسجيل دخول فاشل | email (hashed), IP, timestamp | `warn` |
| إنشاء حساب | userId, IP, timestamp | `info` |
| رفع ملف | userId, fileId, fileName, fileSize, mimeType | `info` |
| تحويل ملف | userId, fileId, conversionType, duration | `info` |
| إنشاء رابط مشاركة | userId, shareId, fileId, expiresAt | `info` |
| وصول عبر رابط مشاركة | shareId, IP, timestamp, userAgent | `info` |
| حذف ملف | userId, fileId | `info` |
| حذف حساب | userId (hashed), IP | `warn` |
| طلب OCR | userId, fileId, consentId | `info` |
| تجاوز rate limit | IP, endpoint, userId (إن وُجد) | `warn` |
| خطأ في الخادم | error message, stack trace (dev only), requestId | `error` |
| تغيير الصلاحيات | adminId, targetUserId, oldRole, newRole | `warn` |
| موافقة/سحب OCR | userId, consentId, action | `info` |

### 13.2 ما لا يتم تسجيله أبداً

| البيانات | السبب |
|---------|-------|
| كلمات المرور | أمن — حتى بصيغة hashed |
| JWT tokens كاملة | أمن — قد تُسرق من السجلات |
| محتوى الملفات | خصوصية — المحتوى ملك المستخدم |
| نتائج OCR | خصوصية — بيانات حساسة |
| أرقام بطاقات الائتمان | توافق PCI-DSS |
| تفاصيل PII غير مشفرة | خصوصية |

### 13.3 تنسيق السجل المهيكل

```json
{
  "level": "info",
  "time": 1709654400000,
  "requestId": "req_abc123",
  "userId": "usr_456",
  "action": "file_upload",
  "msg": "File upload completed",
  "fileId": "doc_789",
  "fileSize": 2048000,
  "mimeType": "application/pdf",
  "ip": "192.168.1.1"
}
```

---

## 14. إدارة الأسرار (Secrets Management)

### 14.1 قائمة الأسرار المطلوبة

| السر | الوصف | الدوران |
|------|-------|---------|
| `AUTH_SECRET` | مفتاح توقيع JWT في NextAuth.js v5 | كل 90 يوماً |
| `GOOGLE_CLIENT_SECRET` | مفتاح Google OAuth | عند التسريب أو كل 6 أشهر |
| `POSTGRES_PASSWORD` | كلمة مرور قاعدة البيانات | كل 90 يوماً |
| `MINIO_ROOT_PASSWORD` | كلمة مرور MinIO | كل 90 يوماً |
| `MINIO_SECRET_KEY` | مفتاح MinIO API | كل 90 يوماً |
| `REDIS_PASSWORD` | كلمة مرور Redis (الإنتاج) | كل 90 يوماً |

### 14.2 أفضل الممارسات

```
🚫 محظور:
  - commit ملف .env إلى Git
  - مشاركة أسرار عبر قنوات غير مشفرة
  - استخدام نفس السر عبر بيئات مختلفة
  - كتابة أسرار في Dockerfile أو docker-compose.yml (باستثناء القيم الافتراضية للتطوير)

✅ مطلوب:
  - .gitignore يحتوي: .env, .env.local, .env.*.local
  - .env.example مع قيم وهمية فقط
  - CI check: git-secrets أو truffleHog في كل PR
  - تدقيق دوري: مراجعة أسرار البيئة الإنتاج كل 90 يوماً
```

### 14.3 سياسة دوران الأسرار

| الخطوة | الإجراء |
|--------|---------|
| 1 | إنشاء سر جديد في مدير الأسرار |
| 2 | تحديث المتغير في البيئة |
| 3 | إعادة تشغيل الخدمات المتأثرة (`docker compose restart app worker`) |
| 4 | التحقق من عمل التطبيق |
| 5 | إبطال السر القديم |
| 6 | تسجيل عملية الدوران في audit log |

---

## 15. سياسة أمان المحتوى (Content Security Policy)

### 15.1 سياسة CSP

```
default-src 'self';
script-src 'self' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://storage.ibn-al-azhar-docs.app;
font-src 'self';
connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
block-all-mixed-content
```

### 15.2 تطبيق CSP

- يتم تطبيق CSP عبر Caddy header في الإنتاج
- في التطوير: يتم تطبيقها عبر Next.js middleware
- لا يتم استخدام `unsafe-inline` إلا للأنماط (style-src) — ضروري لـ Tailwind CSS
- `unsafe-eval` ضروري لـ بعض مكتبات Next.js في وضع التطوير فقط

### 15.3 Self-hosted Fonts

- لا يتم تحميل خطوط من Google Fonts CDN
- جميع الخطوط مستضافة ذاتياً في `/public/fonts/`
- هذا يمنع تتبع المستخدمين عبر طلبات الخطوط الخارجية

---

## 16. تحديد المعدل (Rate Limiting)

### 16.1 حدود المعدل حسب Endpoint

| Endpoint | الحد | النافذة | المفتاح |
|----------|------|---------|---------|
| `POST /api/auth/signin` | 5 طلبات | 15 دقيقة | IP + email |
| `POST /api/auth/register` | 3 طلبات | 60 دقيقة | IP |
| `POST /api/documents/upload` | 10 طلبات | ساعة | userId |
| `POST /api/share` | 20 طلبات | ساعة | userId |
| `GET /api/share/[token]` | 30 طلبات | ساعة | IP |
| `GET /api/*` (عام) | 100 طلب | دقيقة | IP |
| `POST /api/*` (عام) | 30 طلب | دقيقة | userId |

### 16.2 آلية التنفيذ

```typescript
// نظام Rate Limiting متعدد الطبقات

// الطبقة 1: Caddy (مستوى IP)
// 100 طلب/دقيقة/IP العام
// 10 طلبات/ثانية/IP على /api/*
// Block عند التجاوز لمدة 5 دقائق

// الطبقة 2: Next.js Middleware (مستوى المستخدم)
// فحص الجلسة + الصلاحيات عبر NextAuth
// Rate limiting لكل مستخدم (Redis counter)
// 60 طلب/دقيقة/مستخدم على API

// الطبقة 3: Application Logic (مستوى العملية)
// فحص حصة التحويل اليومية
// فحص حصة التخزين
// فحص عدد الملفات في الدفعة
```

### 16.3 Redis Sliding Window

```typescript
import { redis } from '@/lib/redis';

async function rateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}:${Math.random()}`);
  pipeline.zcard(key);
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(now + windowMs),
  };
}
```

---

## 17. منع الإساءة (Abuse Prevention)

### 17.1 كشف الإساءة

| المؤشر | طريقة الكشف | العتبة | الإجراء |
|--------|------------|--------|---------|
| طلبات متكررة | Caddy access logs + rate limiting | >100 req/min/IP | Block مؤقت (5 دقائق) |
| حسابات متعددة من نفس IP | تسجيل IP عند التسجيل | >3 حسابات/IP في 24 ساعة | مراجعة يدوية |
| تحويلات مفرطة | عداد يومي في PostgreSQL | >200% من الحصة اليومية | إشعار + تقييد |
| تخزين مفاجئ | مراقبة storageUsed | زيادة >500MB في ساعة | تنبيه للمشرف |
| أنماط Bot | تحليل User-Agent + سلوك | طلبات بدون جلسة متصفح | Block + CAPTCHA |

### 17.2 إجراءات الإساءة

| مستوى الإساءة | الإجراء | المدة | إمكانية الاستئناف |
|--------------|---------|-------|------------------|
| أول مخالفة (خفيفة) | تحذير عبر البريد الإلكتروني | — | لا حاجة |
| مخالفة متكررة | تقييد مؤقت (reduce quota 50%) | 7 أيام | نعم — عبر بريد الدعم |
| إساءة جسيمة | تعليق الحساب | حتى المراجعة | نعم — خلال 48 ساعة |
| إساءة خطيرة (هجوم) | حظر فوري + إبلاغ | دائم | عبر المراجعة القانونية |
| إنشاء حسابات وهمية | حظر جميع الحسابات المرتبطة | دائم | لا |

---

## 18. أساسيات الاستجابة للحوادث (Incident Response Basics)

### 18.1 مراحل الاستجابة

| المرحلة | الإجراء | المسؤول | المدة المستهدفة |
|---------|---------|---------|----------------|
| 1. الكشف | تنبيه من المراقبة أو إبلاغ مستخدم | DevOps | فوري |
| 2. التقييم | تحديد نطاق التأثير وخطورة الحادث | Security Lead | < 15 دقيقة |
| 3. الاحتواء | عزل الأنظمة المتأثرة، حظر IPs | DevOps | < 30 دقيقة |
| 4. الاستعادة | إعادة الخدمات للتشغيل، تطبيق إصلاحات | DevOps | < 2 ساعة |
| 5. التواصل | إشعار المستخدمين المتأثرين | Product Lead | < 24 ساعة |
| 6. المراجعة | تحليل السبب الجذري، تحديث الإجراءات | الفريق كاملاً | < 48 ساعة |

### 18.2 قائمة اتصال الطوارئ

| الدور | المسؤول | طريقة الاتصال |
|-------|---------|-------------|
| DevOps Lead | (يُحدد) | هاتف + Slack |
| Security Lead | (يُحدد) | هاتف + Slack |
| Product Lead | (يُحدد) | هاتف + بريد إلكتروني |

### 18.3 سجل الحوادث

كل حادث يُوثّق في ملف خاص يحتوي على:

- تاريخ ووقت الكشف
- وصف الحادث ونطاق التأثير
- الخطوات المتخذة للاحتواء والاستعادة
- السبب الجذري (إن وُجد)
- الإجراءات الوقائية المقترحة
- تحديثات السياسات الناتجة عن الحادث
