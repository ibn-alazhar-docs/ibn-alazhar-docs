# جاهزية الإطلاق — Ibn Al-Azhar Docs — ابن الأزهر دوكس

> إصدار: 4.0 | تاريخ: 2025-03 | حالة: مسودة
> مرجع: [05_TECHNICAL_DESIGN.md](./05_TECHNICAL_DESIGN.md) | [16_RISK_REGISTER.md](./16_RISK_REGISTER.md) | [18_OPEN_QUESTIONS.md](./18_OPEN_QUESTIONS.md)

---

## جدول المحتويات

1. [قائمة فحص إطلاق MVP — مطلوب](#1-قائمة-فحص-إطلاق-mvp--مطلوب)
2. [قائمة فحص إطلاق MVP — موصى به](#2-قائمة-فحص-إطلاق-mvp--موصى-به)
3. [قائمة فحص ما بعد MVP](#3-قائمة-فحص-ما-بعد-mvp)
4. [قائمة فحص المؤسسات/المستقبل](#4-قائمة-فحص-المؤسساتالمستقبل)
5. [قائمة فحص الأمان](#5-قائمة-فحص-الأمان)
6. [قائمة فحص الخصوصية](#6-قائمة-فحص-الخصوصية)
7. [قائمة فحص ضمان الجودة](#7-قائمة-فحص-ضمان-الجودة)
8. [قائمة فحص الأداء](#8-قائمة-فحص-الأداء)
9. [قائمة فحص PWA](#9-قائمة-فحص-pwa)
10. [قائمة فحص DevOps](#10-قائمة-فحص-devops)
11. [قائمة فحص التوثيق](#11-قائمة-فحص-التوثيق)
12. [قائمة فحص التراجع](#12-قائمة-فحص-التراجع-rollback)
13. [معايير القرار: انطلاق أو لا](#13-معايير-القرار-انطلاق-أو-لا-gono-go)
14. [إجراءات يوم الإطلاق](#14-إجراءات-يوم-الإطلاق)
15. [خطة المراقبة بعد الإطلاق](#15-خطة-المراقبة-بعد-الإطلاق)

---

## 1. قائمة فحص إطلاق MVP — مطلوب

> **القاعدة**: هذه العناصر يجب أن تكتمل قبل إطلاق MVP. كل عنصر موجود في PRD و Backlog و Roadmap.

| التصنيف | العنصر | الحالة | المسؤول | ملاحظات |
|---|---|---|---|---|
| **المنتج** | رفع الملفات (PDF + صور) حتى 100MB | ⬜ | فريق Backend | يدعم drag & drop واختيار متعدد. الحد الأقصى: 100MB |
| **المنتج** | تحويل OCR عبر Google Drive API (استخراج نص) | ⬜ | فريق Backend | يجب اختبار الحصة اليومية |
| **المنتج** | تصدير TXT/DOCX/JSON (توليد صيغ) | ⬜ | فريق Backend | منفصل عن التحويل — راجع Epic 6 + Epic 7 |
| **المنتج** | إدارة الملفات (مجلدات، سلة محذوفات) | ⬜ | فريق Full-stack | أساسي: إنشاء/حذف/إعادة تسمية/نقل |
| **المنتج** | مشاركة عبر روابط عامة (token: 64 hex chars) | ⬜ | فريق Backend | 32 bytes = 64 hex chars |
| **المنتج** | دعم RTL الكامل | ⬜ | فريق Frontend | اختبار جميع المكونات |
| **المنتج** | مصادقة تسجيل/دخول (NextAuth.js v5 JWT 24h) | ⬜ | فريق Backend | JWT فقط، لا access/refresh |
| **الأمان** | تشفير HTTPS إلزامي (Caddy auto-TLS) | ⬜ | DevOps | عبر Caddy reverse proxy |
| **الأمان** | حماية CSRF (NextAuth.js v5 built-in) | ⬜ | فريق Backend | مُدمج في NextAuth.js v5 |
| **الأمان** | حماية XSS | ⬜ | فريق Frontend | React auto-escaping + CSP |
| **الأمان** | حماية SQLi | ⬜ | فريق Backend | Prisma parameterized queries |
| **ضمان الجودة** | اختبارات وحدية > 70% (Vitest) | ⬜ | فريق التطوير | Vitest + Testing Library — NOT Jest |
| **ضمان الجودة** | اختبارات E2E للمسارات الأساسية | ⬜ | فريق QA | Playwright |
| **PWA** | Service Worker أساسي يعمل | ⬜ | فريق Frontend | @serwist/next أو SW مكتوب يدويًا — قيد التقييم |
| **PWA** | Web App Manifest كامل | ⬜ | فريق Frontend | أيقونات 192+512 |
| **DevOps** | Docker Compose للإنتاج | ⬜ | DevOps | web, worker, postgres, redis, minio, caddy |
| **DevOps** | نسخ احتياطي تلقائي (PostgreSQL + MinIO) | ⬜ | DevOps | يومي |
| **التوثيق** | README شامل | ⬜ | فريق التطوير | setup + run + deploy |
| **الخصوصية** | سياسة خصوصية منشورة | ⬜ | Product Lead | قبل الإطلاق مباشرة |

---

## 2. قائمة فحص إطلاق MVP — موصى به

> **القاعدة**: هذه العناصر موصى بها بشدة لكنها لا تمنع الإطلاق. إذا لم تكتمل، يجب توثيقها كـ known issue.

| التصنيف | العنصر | الحالة | المسؤول | ملاحظات |
|---|---|---|---|---|
| **المنتج** | لوحة تحكم المدير | ⬜ | فريق Frontend | إحصائيات + إدارة مستخدمين |
| **المنتج** | بحث في أسماء الملفات (ILIKE) | ⬜ | فريق Backend | حل MVP — Meilisearch في V2 |
| **الأمان** | Rate limiting شامل | ⬜ | فريق Backend | 100 req/min لكل مستخدم |
| **الأمان** | Account lockout (5 محاولات → قفل 15 دقيقة) | ⬜ | فريق Backend | حماية من brute force |
| **الأمان** | فحص اختراق ذاتي أساسي (OWASP Top 10) | ⬜ | Security Lead | قبل الإطلاق |
| **ضمان الجودة** | اختبارات تكامل (Vitest + Prisma test db) | ⬜ | فريق Backend | جميع API routes |
| **ضمان الجودة** | اختبار متصفحات متعددة | ⬜ | فريق QA | Chrome + Firefox + Safari + Edge |
| **ضمان الجودة** | اختبار استجابة الموبايل | ⬜ | فريق QA | 375px, 768px, 1024px |
| **PWA** | صفحة Offline مخصصة | ⬜ | فريق Frontend | رسالة واضحة + زر إعادة المحاولة |
| **PWA** | Install Prompt مخصص بالعربية | ⬜ | فريق Frontend | beforeinstallprompt event |
| **PWA** | عمل offline شبه كامل | ⬜ | فريق Frontend | تصفح الملفات المحفوظة |
| **الخصوصية** | حق التصدير (بيانات المستخدم كـ JSON) | ⬜ | فريق Backend | GDPR-compatible |
| **DevOps** | Monitoring + Alerting | ⬜ | DevOps | Uptime + تنبيهات |
| **التوثيق** | دليل النشر | ⬜ | DevOps | خطوة بخطوة |
| **التوثيق** | دليل المستخدم | ⬜ | Product Lead | عربي مع لقطات شاشة |

---

## 3. قائمة فحص ما بعد MVP

> **القاعدة**: هذه العناصر مُخطط لها بعد إطلاق MVP بنجاح. لا يجب أن تؤخر الإطلاق.

| التصنيف | العنصر | ملاحظات |
|---|---|---|
| **المنتج** | بحث متقدم داخل المحتوى (Meilisearch) | V2 |
| **المنتج** | تحرير نتائج OCR يدويًا | V2 |
| **المنتج** | Google OAuth provider | إضافة لـ Credentials |
| **المنتج** | إعادة كلمة المرور | مؤجل من Phase 1 |
| **المنتج** | تأكيد البريد الإلكتروني | مؤجل من Phase 1 |
| **المنتج** | Dark mode | مؤجل من Phase 1 |
| **المنتج** | Background Sync للرفع | V2 |
| **المنتج** | Push Notifications (اكتمال OCR) | V2 |
| **الأمان** | CSP report-only → enforce | بعد مراقبة |
| **الأمان** | Penetration testing احترافي | بعد الاستقرار |
| **الخصوصية** | تشفير البيانات في الراحة (MinIO) | V2 |
| **DevOps** | Log aggregation (Loki أو مشابه) | V2 |
| **DevOps** | Kubernetes migration | إذا لزم |

---

## 4. قائمة فحص المؤسسات/المستقبل

> **القاعدة**: هذه العناصر مخصصة للاستخدام المؤسسي أو الميزات المستقبلية البعيدة.

| التصنيف | العنصر | ملاحظات |
|---|---|---|
| **المنتج** | SSO / SAML integration | مؤسسي |
| **المنتج** | Multi-tenancy | مؤسسي |
| **المنتج** | OCR محلي (Tesseract) كبديل عن Google | V3 |
| **المنتج** | واجهة برمجة تطبيقات عامة (Public API) | V2 |
| **المنتج** | Webhooks | V2 |
| **الأمان** | SOC 2 compliance | مؤسسي |
| **الأمان** | Data residency options | مؤسسي |
| **DevOps** | High availability / multi-node | مؤسسي |
| **DevOps** | Geographic redundancy | مؤسسي |

---

## 5. قائمة فحص الأمان

| # | العنصر | الحالة | الأولوية | تفاصيل |
|---|---|---|---|---|
| 1 | **HTTPS إلزامي** — تفعيل auto-TLS عبر Caddy | ⬜ | حرجة | إعادة توجيه HTTP → HTTPS |
| 2 | **Content Security Policy (CSP)** — تحديد مصادر السكربت والصور | ⬜ | حرجة | منع inline scripts غير ضرورية |
| 3 | **CSRF Protection** — عبر NextAuth.js v5 + SameSite cookies | ⬜ | حرجة | مُدمج في NextAuth.js v5 |
| 4 | **XSS Prevention** — React auto-escaping + sanitize user HTML | ⬜ | حرجة | فحص dompurify للمحتوى المُصدَّر |
| 5 | **SQL Injection Prevention** — Prisma parameterized queries حصراً | ⬜ | حرجة | لا استخدام `$queryRawUnsafe` |
| 6 | **Rate Limiting** — تقييد الطلبات (100 req/min لكل مستخدم) | ⬜ | عالية | عبر middleware مخصص أو Redis |
| 7 | **Authentication Security** — NextAuth.js v5 JWT فقط (24h)، bcrypt | ⬜ | حرجة | لا access/refresh token منفصل |
| 8 | **Session Management** — انتهاء الجلسة بعد 24 ساعة | ⬜ | عالية | httpOnly + secure + SameSite cookies |
| 9 | **Secrets Management** — متغيرات البيئة في `.env` غير مُلتزم في Git | ⬜ | حرجة | `.env.example` فقط في المستودع |
| 10 | **File Upload Validation** — التحقق من نوع الملف (MIME magic bytes) | ⬜ | حرجة | لا الاعتماد على extension فقط |
| 11 | **File Size Enforcement** — حد أقصى 100MB على مستوى API + Caddy | ⬜ | عالية | فحص Content-Length header |
| 12 | **Directory Traversal Prevention** — التحقق من مسارات الملفات | ⬜ | حرجة | عدم استخدام user input في المسارات مباشرة |
| 13 | **API Input Validation** — Zod schemas لجميع endpoints | ⬜ | عالية | فحص أنواع + أطوال + تنسيقات |
| 14 | **CORS Configuration** — تقييد Origins المسموحة | ⬜ | عالية | `Access-Control-Allow-Origin` محدد |
| 15 | **Security Headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy | ⬜ | عالية | عبر Caddy أو Next.js middleware |
| 16 | **Dependency Audit** — `npm audit` بدون ثغرات حرجة | ⬜ | عالية | قبل كل إطلاق |
| 17 | **MinIO Access Control** — سياسات bucket تقييد الوصول | ⬜ | عالية | المستخدم يصل لملفاته فقط (bucket: ibn-al-azhar-docs-files) |
| 18 | **Google Drive API Key Security** — مفتاح الخدمة في متغيرات بيئة | ⬜ | حرجة | عدم تعريض المفتاح في Frontend |
| 19 | **Logging & Audit Trail** — تسجيل العمليات الحساسة دون بيانات شخصية | ⬜ | متوسطة | لا log لكلمات المرور أو tokens |
| 20 | **IDOR Protection** — فحص صلاحيات في كل طلب | ⬜ | حرجة | لا الاعتماد على ID فقط دون ملكية |
| 21 | **Subresource Integrity (SRI)** — للسكربتات الخارجية | ⬜ | متوسطة | CDN resources |
| 22 | **Account Lockout** — قفل الحساب بعد 5 محاولات فاشلة | ⬜ | عالية | فتح تلقائي بعد 15 دقيقة |

---

## 6. قائمة فحص الخصوصية

| # | العنصر | الحالة | الأولوية | تفاصيل |
|---|---|---|---|---|
| 1 | **سياسة الخصوصية منشورة** — صفحة `/privacy` واضحة ومتاحة | ⬜ | حرجة | بالعربية مع مصطلحات تقنية إنجليزية |
| 2 | **شروط الاستخدام منشورة** — صفحة `/terms` | ⬜ | حرجة | تحديد المسؤوليات والحدود |
| 3 | **موافقة المستخدم** — checkbox عند التسجيل على الخصوصية + الشروط | ⬜ | حرجة | تخزين تاريخ الموافقة |
| 4 | **حق الحذف** — المستخدم يمكنه حذف حسابه وكل بياناته | ⬜ | حرجة | حذف cascade من PostgreSQL + MinIO |
| 5 | **حق التصدير** — المستخدم يمكنه تصدير بياناته | ⬜ | عالية | JSON dump لملفاته ومetadata |
| 6 | **شرح معالجة OCR** — توضيح أن الملفات تُرسل لـ Google Drive API | ⬜ | حرجة | صفحة مخصصة أو في الخصوصية |
| 7 | **فترة الاحتفاظ بالبيانات** — سلة المحذوفات 30 يوماً ثم حذف نهائي | ⬜ | عالية | Job مجدول للتنظيف |
| 8 | **تشفير البيانات في النقل** — HTTPS إلزامي (Caddy) | ⬜ | حرجة | عبر Caddy reverse proxy |
| 9 | **عدم مشاركة البيانات مع أطراف ثالثة** — ما عدا Google Drive API للـ OCR | ⬜ | حرجة | توثيق واضح |
| 10 | **سجل الوصول** — من وصل للملفات المشتركة ومتى | ⬜ | متوسطة | لروابط المشاركة العامة |
| 11 | **تأثير Google Drive OCR على الخصوصية** — إفصاح صريح | ⬜ | حرجة | ملفاتك تُرسل مؤقتاً لخوادم Google |
| 12 | **ملفات تعريف الارتباط (Cookies)** — إشعار + شرح الأنواع | ⬜ | عالية | Session cookies فقط في MVP |

---

## 7. قائمة فحص ضمان الجودة (QA)

| # | العنصر | الحالة | الأولوية | تفاصيل |
|---|---|---|---|---|
| 1 | **Unit Tests > 70% coverage** — Vitest + Testing Library | ⬜ | حرجة | للمنطق الأساسي: OCR, export, file handling — NOT Jest |
| 2 | **Integration Tests** — Vitest + Prisma test db | ⬜ | عالية | قاعدة بيانات اختبارية |
| 3 | **E2E Tests — مسار رفع ملف** — من الرفع حتى عرض النتائج | ⬜ | حرجة | Playwright |
| 4 | **E2E Tests — مسار OCR** — رفع → تحويل → تصدير | ⬜ | حرجة | Playwright |
| 5 | **E2E Tests — مسار التسجيل/الدخول** — إنشاء حساب + تسجيل دخول | ⬜ | حرجة | Playwright |
| 6 | **E2E Tests — مسار المشاركة** — إنشاء رابط + وصول ضيف | ⬜ | عالية | Playwright |
| 7 | **RTL Testing** — فحص جميع الصفحات باتجاه RTL | ⬜ | حرجة | فحص المحاذاة + الترتيب + الأسهم |
| 8 | **Cross-Browser Testing** — Chrome, Firefox, Safari, Edge (آخر إصدارين) | ⬜ | عالية | سطح المكتب + الجوال |
| 9 | **Mobile Responsive Testing** — شاشات 375px, 768px, 1024px | ⬜ | عالية | لا محتوى مقطوع أو متداخل |
| 10 | **Accessibility Testing** — WCAG 2.1 Level AA | ⬜ | عالية | axe-core + فحص يدوي |
| 11 | **File Upload Edge Cases** — ملفات كبيرة (99MB)، ملفات تالفة، أنواع خاطئة | ⬜ | عالية | رسائل خطأ واضحة — حد 100MB |
| 12 | **Concurrent Upload Testing** — 5 ملفات في نفس الوقت | ⬜ | متوسطة | BullMQ queue يعمل بشكل صحيح |
| 13 | **Offline Mode Testing** — قطع الإنترنت واستخدام التطبيق | ⬜ | عالية | صفحة offline + cache |
| 14 | **PWA Install Testing** — تثبيت على Chrome + Firefox + Safari | ⬜ | عالية | ظهور prompt التثبيت |
| 15 | **Security Testing** — محاولة XSS, CSRF, IDOR يدوياً | ⬜ | حرجة | OWASP Top 10 |
| 16 | **Performance Testing** — Lighthouse على الصفحات الرئيسية | ⬜ | عالية | Performance > 80 |
| 17 | **Arabic Text Rendering** — تأكيد عرض النص العربي بدون مشاكل | ⬜ | حرجة | خطوط + تشكيل + أرقام عربية |
| 18 | **Error Handling** — كل حالة خطأ لها رسالة مفيدة بالعربية | ⬜ | عالية | لا error messages تقنية مكشوفة |

---

## 8. قائمة فحص الأداء

| # | العنصر | الحالة | المستهدف | تفاصيل |
|---|---|---|---|---|
| 1 | **Lighthouse Performance Score** — الصفحة الرئيسية | ⬜ | > 80 | على Mobile simulated 3G |
| 2 | **Lighthouse Accessibility Score** | ⬜ | > 90 | axe-core + Lighthouse |
| 3 | **First Contentful Paint (FCP)** | ⬜ | < 1.8s | على 4G |
| 4 | **Largest Contentful Paint (LCP)** | ⬜ | < 2.5s | على 4G |
| 5 | **Time to Interactive (TTI)** | ⬜ | < 3.5s | على 4G |
| 6 | **API Response Time (P95)** | ⬜ | < 500ms | لـ endpoints غير OCR |
| 7 | **OCR Processing Time** | ⬜ | < 30s لكل 10 صفحات | يعتمد على Google Drive API |
| 8 | **Bundle Size** — JavaScript الرئيسي | ⬜ | < 200KB gzipped | Next.js code splitting |
| 9 | **Image Optimization** — تنسيق WebP تلقائي | ⬜ | Next.js `<Image>` | lazy loading + responsive |
| 10 | **Database Query Optimization** — استعلامات بطيئة | ⬜ | < 100ms | Prisma query logging |
| 11 | **MinIO Upload Throughput** | ⬜ | > 10MB/s | على نفس الشبكة |
| 12 | **Memory Usage** — Next.js server | ⬜ | < 512MB | تحت حمل عادي |
| 13 | **Cache Hit Ratio** — Redis | ⬜ | > 80% | للجلسات والبيانات المتكررة |

---

## 9. قائمة فحص PWA

| # | العنصر | الحالة | الأولوية | تفاصيل |
|---|---|---|---|---|
| 1 | **Service Worker مسجّل** — @serwist/next (قيد التقييم) أو SW مكتوب يدويًا | ⬜ | حرجة | @serwist/next هو اقتراح — لم يُحسم بعد |
| 2 | **Web App Manifest كامل** — `/manifest.json` أو `/manifest.webmanifest` | ⬜ | حرجة | name, icons, theme_color, display |
| 3 | **أيقونات PWA** — 192x192 + 512x512 على الأقل | ⬜ | حرجة | PNG + maskable icon |
| 4 | **صفحة Offline مخصصة** — تعمل بدون إنترنت | ⬜ | عالية | رسالة واضحة + زر إعادة المحاولة |
| 5 | **Install Prompt** — ظهور prompt التثبيت على Chrome | ⬜ | عالية | beforeinstallprompt event |
| 6 | **Splash Screen** — أيقونة + لون عند فتح التطبيق | ⬜ | متوسطة | عبر manifest theme_color |
| 7 | **Offline Browsing** — تصفح الملفات المحفوظة مسبقاً | ⬜ | عالية | Cache-first strategy |
| 8 | **Background Sync** — رفع الملفات عند عودة الاتصال | ⬜ | منخفضة | Post-MVP |
| 9 | **Push Notifications** — إشعارات اكتمال OCR | ⬜ | منخفضة | Post-MVP |
| 10 | **HTTPS إلزامي** — PWA يتطلب HTTPS | ⬜ | حرجة | عبر Caddy |
| 11 | **Scoped Navigation** — التنقل داخل التطبيق بدون إعادة تحميل | ⬜ | عالية | Next.js App Router |
| 12 | **Apple Mobile Web App** — meta tags لـ iOS | ⬜ | عالية | apple-mobile-web-app-capable + status-bar-style |
| 13 | **Favicon + Apple Touch Icon** | ⬜ | عالية | لمتصفح Safari |

---

## 10. قائمة فحص DevOps

| # | العنصر | الحالة | الأولوية | تفاصيل |
|---|---|---|---|---|
| 1 | **Docker Compose للإنتاج** — جميع الخدمات | ⬜ | حرجة | web, worker, postgres, redis, minio, caddy — حاويات: ibn-al-azhar-docs-* |
| 2 | **Docker Health Checks** — لكل حاوية | ⬜ | عالية | `/health` endpoints |
| 3 | **Caddy Reverse Proxy** — تهيئة SSL تلقائي | ⬜ | حرجة | القرار: Caddy كـ reverse proxy |
| 4 | **نسخ احتياطي لـ PostgreSQL** — يومي تلقائي | ⬜ | حرجة | `pg_dump` + رفع لـ S3/محلي |
| 5 | **نسخ احتياطي لـ MinIO** — يومي تلقائي | ⬜ | حرجة | `mc mirror` أو rsync — bucket: ibn-al-azhar-docs-files |
| 6 | **نسخ احتياطي لـ Redis** — RDB snapshots | ⬜ | عالية | كل 15 دقيقة |
| 7 | **اختبار استعادة النسخ الاحتياطية** — restore من النسخة | ⬜ | عالية | مرة على الأقل قبل الإطلاق |
| 8 | **Monitoring** — Uptime monitoring | ⬜ | عالية | healthchecks.io أو Uptime Kuma |
| 9 | **Log Aggregation** — تجميع السجلات | ⬜ | عالية | Docker logs أو Loki |
| 10 | **Alerting** — تنبيه عند تعطل الخدمة | ⬜ | حرجة | بريد إلكتروني + webhook |
| 11 | **CI/CD Pipeline** — GitHub Actions | ⬜ | عالية | lint → Vitest → build → deploy |
| 12 | **Environment Variables** — `.env.production` آمن | ⬜ | حرجة | أسماء واضحة + `.env.example` |
| 13 | **Prisma Migrations** — تشغيل تلقائي في CI/CD | ⬜ | حرجة | `prisma migrate deploy` — DB: ibn_al_azhar_docs |
| 14 | **SSL Certificate Renewal** — Caddy auto-renewal | ⬜ | حرجة | تأكيد عمل التجديد التلقائي |
| 15 | **Resource Limits** — Docker memory + CPU limits | ⬜ | عالية | منع OOM على VPS صغير |
| 16 | **Firewall Configuration** — فتح 80 + 443 فقط | ⬜ | حرجة | UFW أو iptables |
| 17 | **SSH Hardening** — مفاتيح فقط، لا كلمات مرور | ⬜ | حرجة | `PasswordAuthentication no` |
| 18 | **Database Connection Pooling** — Prisma connection limit | ⬜ | عالية | `connection_limit=10` |
| 19 | **Container Restart Policy** — `unless-stopped` | ⬜ | عالية | لجميع الحاويات |
| 20 | **Disk Space Monitoring** — تنبيه عند > 80% | ⬜ | عالية | خاصة لـ MinIO |

---

## 11. قائمة فحص التوثيق

| # | العنصر | الحالة | الأولوية | تفاصيل |
|---|---|---|---|---|
| 1 | **README.md شامل** — نظرة عامة + setup + run + deploy | ⬜ | حرجة | عربي + إنجليزي |
| 2 | **دليل النشر** — خطوة بخطوة لـ self-hosting | ⬜ | حرجة | راجع [15_DOCUMENTATION_PLAN.md](./15_DOCUMENTATION_PLAN.md) |
| 3 | **API Documentation** — جميع endpoints موثقة | ⬜ | عالية | OpenAPI/Swagger أو Markdown |
| 4 | **دليل المطور** — المساهمة + code style + testing | ⬜ | عالية | CONTRIBUTING.md |
| 5 | **دليل المستخدم** — كيفية استخدام المنصة | ⬜ | عالية | عربي مع لقطات شاشة |
| 6 | **دليل المدير** — إدارة النظام + الإعدادات | ⬜ | عالية | عربي |
| 7 | **ARCHITECTURE.md** — مخطط البنية التحتية | ⬜ | عالية | راجع [05_TECHNICAL_DESIGN.md](./05_TECHNICAL_DESIGN.md) |
| 8 | **CHANGELOG.md** — سجل التغييرات | ⬜ | متوسطة | Keep a Changelog format |
| 9 | **دليل استكشاف الأخطاء** — مشاكل شائعة + حلول | ⬜ | عالية | راجع [15_DOCUMENTATION_PLAN.md](./15_DOCUMENTATION_PLAN.md) |
| 10 | **دليل تثبيت PWA** — لكل متصفح | ⬜ | عالية | Chrome, Firefox, Safari, Edge |
| 11 | **سياسة الخصوصية** — صفحة في التطبيق | ⬜ | حرجة | عربي |
| 12 | **شروط الاستخدام** — صفحة في التطبيق | ⬜ | حرجة | عربي |

---

## 12. قائمة فحص التراجع (Rollback)

في حال فشل الإطلاق أو اكتشاف مشاكل حرجة، اتبع الخطوات التالية بالترتيب:

### المرحلة 1: التقييم الفوري (خلال 15 دقيقة)

| الخطوة | الإجراء | المسؤول |
|---|---|---|
| 1 | تحديد خطورة المشكلة: هل تؤثر على البيانات أم على الوظائف فقط؟ | Product Lead |
| 2 | التحقق من: هل المشكلة في Frontend أم Backend أم Infrastructure؟ | DevOps + Lead Dev |
| 3 | التواصل مع الفريق: إشعار على قناة الطوارئ | Product Lead |

### المرحلة 2: قرار التراجع (خلال 30 دقيقة)

| المعيار | التراجع | إصلاح سريع |
|---|---|---|
| فقدان بيانات مستخدمين | ✅ نعم | ❌ لا |
| ثغرة أمنية حرجة | ✅ نعم | ❌ لا |
| تعطل كامل للخدمة > 15 دقيقة | ✅ نعم | ❌ لا |
| خطأ في عرض الواجهة فقط | ❌ لا | ✅ نعم |
| بطء في الأداء | ❌ لا | ✅ نعم |

### المرحلة 3: تنفيذ التراجع

```bash
# 1. التراجع لنسخة Docker السابقة
docker compose down
docker compose -f docker-compose.rollback.yml up -d

# أو: التراجع لعلامة Git سابقة
git checkout v0.9.0  # آخر نسخة مستقرة
docker compose build && docker compose up -d

# 2. التراجع لقاعدة البيانات (إذا كانت هناك migrations جديدة)
pg_restore -d ibn_al_azhar_docs /backup/pre_launch_dump.sql

# 3. التحقق من عمل الخدمات
curl https://ibn-al-azhar-docs.app/api/health
docker compose logs --tail=50

# 4. إشعار المستخدمين (إذا كانوا موجودين)
# صفحة صيانة أو رسالة في التطبيق
```

### المرحلة 4: ما بعد التراجع

| الإجراء | التفاصيل |
|---|---|
| تحليل السبب الجذري | ماذا حدث ولماذا؟ |
| إصلاح المشكلة في فرع تطوير | مع اختبارات للسيناريو |
| إعادة الإطلاق | بعد اجتياز جميع الفحوصات |
| توثيق الدرس المستفاد | في سجل الحوادث |

---

## 13. معايير القرار: انطلاق أو لا (Go/No-Go)

> **القاعدة**: يجب اجتياز **جميع** معايير "مطلوب" قبل الإطلاق. فشل واحد = No-Go.

### معايير مطلوبة (Blockers)

| # | المعيار | المستهدف | القياس | تم؟ |
|---|---|---|---|---|
| 1 | صفر ثغرات أمنية حرجة | 0 critical/high vulnerabilities | `npm audit` + فحص يدوي | ⬜ |
| 2 | جميع مسارات المستخدم الأساسية تعمل | رفع ← OCR ← تصدير ← مشاركة | E2E tests تمر | ⬜ |
| 3 | HTTPS يعمل بشكل صحيح (Caddy) | Lock icon في جميع المتصفحات | فحص يدوي | ⬜ |
| 4 | تسجيل الدخول والخروج يعملان (NextAuth.js v5 JWT 24h) | إنشاء حساب + تسجيل دخول + خروج | E2E test | ⬜ |
| 5 | نسخ احتياطي تلقائي مثبت ومُختبر | PostgreSQL + MinIO | استعادة ناجحة | ⬜ |
| 6 | لا تسريب بيانات بين المستخدمين | IDOR test | فحص يدوي + آلي | ⬜ |
| 7 | Service Worker يعمل بدون أخطاء | لا console errors | Chrome DevTools | ⬜ |

### معايير موصى بها (Should-Have)

| # | المعيار | المستهدف | القياس | تم؟ |
|---|---|---|---|---|
| 8 | Unit test coverage > 70% | 70%+ | Vitest coverage report | ⬜ |
| 9 | Lighthouse Performance > 80 | 80+ | Lighthouse CI | ⬜ |
| 10 | API response time P95 < 500ms | < 500ms | k6 أو Artillery | ⬜ |
| 11 | PWA يمر بـ Lighthouse PWA audit | 100% | Lighthouse | ⬜ |
| 12 | جميع النصوص بالعربية + RTL صحيح | 0 محاذاة خاطئة | فحص بصري + آلي | ⬜ |
| 13 | Monitoring + Alerting يعملان | تنبيه خلال 5 دقائق من التعطل | اختبار يدوي | ⬜ |
| 14 | CI/CD pipeline يمر بنجاح | green build | GitHub Actions | ⬜ |

### معايير مرغوبة (Nice-to-Have)

| # | المعيار | المستهدف | القياس | تم؟ |
|---|---|---|---|---|
| 15 | Lighthouse Accessibility > 90 | 90+ | Lighthouse CI | ⬜ |
| 16 | Offline mode شبه كامل | تصفح الملفات المحفوظة | فحص يدوي | ⬜ |
| 17 | دليل المستخدم مكتمل | جميع الأقسام | مراجعة | ⬜ |

---

## 14. إجراءات يوم الإطلاق

### الجدول الزمني

| الوقت | النشاط | المسؤول | ملاحظات |
|---|---|---|---|
| **09:00** | فحص ما قبل الإطلاق: تشغيل جميع health checks | DevOps | تأكيد جميع الخدمات تعمل |
| **09:15** | نسخ احتياطي نهائي لـ PostgreSQL + MinIO | DevOps | `pre_launch_backup_$(date +%Y%m%d_%H%M)` |
| **09:30** | تشغيل CI/CD pipeline: lint → Vitest → build → deploy | DevOps | مراقبة كل مرحلة |
| **09:45** | نشر الحاوية الجديدة: `docker compose up -d` | DevOps | Rolling deployment |
| **10:00** | تشغيل Prisma migrations: `prisma migrate deploy` | Backend Lead | على قاعدة بيانات الإنتاج (ibn_al_azhar_docs) |
| **10:10** | فحص الدخان (Smoke Testing): الرفع + OCR + التصدير | QA Lead | حساب اختباري |
| **10:25** | فحص الأمان: HTTPS + Headers + Session | Security Lead | عبر browser dev tools |
| **10:40** | فحص PWA: تثبيت على Chrome Android | Frontend Lead | ظهور install prompt |
| **10:55** | فحص RTL: جميع الصفحات الرئيسية | Frontend Lead | محاذاة + اتجاه |
| **11:10** | فحص الأداء: Lighthouse على الصفحات الرئيسية | QA Lead | Performance > 80 |
| **11:25** | مراجعة السجلات: لا أخطاء حرجة | DevOps | `docker compose logs --tail=100` |
| **11:40** | **قرار Go/No-Go** | Product Lead + جميع القادة | اجتماع 15 دقيقة |
| **12:00** | 🔓 فتح التسجيل للمستخدمين (إذا Go) | DevOps | إزالة feature flag أو invite-only |
| **12:15** | نشر إعلان الإطلاق | Product Lead | وسائل التواصل + الموقع |
| **12:30–18:00** | مراقبة مستمرة: أخطاء + أداء + استخدام | جميع الفريق | كل ساعة |
| **18:00** | مراجعة أولية: إحصائيات اليوم الأول | Product Lead | مستخدمين + ملفات + أخطاء |

### قائمة جهات الاتصال للطوارئ

| الدور | الاسم | طريقة التواصل |
|---|---|---|
| Product Lead | — | هاتف + قناة طوارئ |
| DevOps Lead | — | هاتف + قناة طوارئ |
| Backend Lead | — | هاتف + قناة طوارئ |
| Frontend Lead | — | هاتف + قناة طوارئ |

---

## 15. خطة المراقبة بعد الإطلاق

### أول 24 ساعة

| الفترة | التكرار | ما يتم مراقبته | إجراء عند المشكلة |
|---|---|---|---|
| 0–2 ساعة | كل 15 دقيقة | Uptime, error rate, response time | تراجع فوري إذا error rate > 5% |
| 2–6 ساعات | كل 30 دقيقة | نفسه + مستخدمين نشطين | إصلاح سريع أو تراجع |
| 6–12 ساعة | كل ساعة | نفسه + تحويلات OCR | تحقق من Google Drive API quota |
| 12–24 ساعة | كل ساعتين | نفسه + استخدام القرص | تنظيف إذا قرص > 90% |

**مؤشرات مراقبة محددة:**

- **Error Rate**: < 1% من الطلبات ترجع 5xx
- **API Latency P95**: < 500ms
- **Uptime**: > 99.5%
- **OCR Success Rate**: > 95% (استثناء الملفات التالفة)
- **Active Users**: مراقبة النمو
- **Disk Usage**: < 80%
- **Memory Usage**: < 80% على VPS

### الأسبوع الأول

| اليوم | مراقبة | إجراء |
|---|---|---|
| اليوم 2 | مراجعة سجلات الأخطاء + تصنيفها | إنشاء tickets للـ bugs |
| اليوم 3 | تحليل أداء OCR + حصة Google Drive | تحسين إذا لزم |
| اليوم 4 | مراجعة ملاحظات المستخدمين | ترتيب حسب الأولوية |
| اليوم 5 | فحص النسخ الاحتياطية: هل تعمل يومياً؟ | استعادة تجريبية |
| اليوم 6 | مراجعة استهلاك الموارد على VPS | ضبط limits إذا لزم |
| اليوم 7 | تقرير أسبوعي: إحصائيات + مشاكل + خطوات تالية | إرسال للفريق |

### الشهر الأول

| الأسبوع | المراقبة | الإجراء |
|---|---|---|
| الأسبوع 2 | أنماط الاستخدام + الميزات الأكثر استخداماً | تحسين الميزات الشائعة |
| الأسبوع 3 | مراجعة الأمان: هل هناك محاولات مشبوهة؟ | تحديث الحماية إذا لزم |
| الأسبوع 4 | تقرير شهري شامل: KPIs + مشاكل + خطة التحسين | مراجعة مع الفريق |

### مؤشرات النجاح بعد شهر واحد

| المؤشر | المستهدف | القياس |
|---|---|---|
| مستخدمون نشطون (أسبوعياً) | > 50 | Analytics |
| ملفات مرفوعة | > 500 | Database query |
| معدل تحويل OCR ناجح | > 90% | Logs |
| Uptime | > 99% | Uptime monitor |
| متوسط زمن الاستجابة API | < 500ms | Logs |
| تقييم المستخدمين | > 4/5 | استبيان بسيط |
| أخطاء حرجة | 0 | Error tracking |

---

> **ملاحظة**: هذا المستند مرجع حي يتم تحديثه مع تقدم المشروع. يجب مراجعته قبل كل milestone رئيسي.
> مرجع مرتبط: [16_RISK_REGISTER.md](./16_RISK_REGISTER.md) | [18_OPEN_QUESTIONS.md](./18_OPEN_QUESTIONS.md) | [15_DOCUMENTATION_PLAN.md](./15_DOCUMENTATION_PLAN.md)
