# ADR-010: Security Baseline

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تتعامل مع ملفات تعليمية قد تحتوي على بيانات حساسة (أوراق اختبار، واجبات طلابية، سجلات). نحتاج إلى تأسيس خط أمان أساسي (security baseline) يضع معايير أمنية واضحة للتطوير. المؤسسات التعليمية المستهدفة قد تخضع لمتطلبات تنظيمية تتطلب مستوى معين من الأمان.

## القرار (Decision)
قررنا تطبيق مجموعة من الإجراءات الأمنية كحد أدنى إلزامي لجميع مكونات المنصة:
1. **HTTPS إلزامي:** لا وصول HTTP عادي، إعادة توجيه تلقائية عبر Caddy
2. **Content Security Policy (CSP) صارم:** تحديد مصادر الموارد المسموح بها
3. **HttpOnly + Secure + SameSite=Lax cookies:** لحماية session tokens
4. **Rate Limiting:** حماية من brute force و abuse
5. **Audit Logging:** تسجيل جميع العمليات الحساسة
6. **Input Validation:** معالجة المدخلات بـ Zod schemas
7. **Authentication:** NextAuth.js v5 مع JWT strategy (maxAge 24h، updateAge 4h)، HttpOnly Secure SameSite=Lax cookie باسم `next-auth.session-token`، بدون custom refresh token flow في MVP
8. **File Upload Security:** حد حجم ملف 100MB، validation للنوع والمحتوى
9. **Share Link Security:** token عشوائي بطول 64 hex chars (`crypto.randomBytes(32).toString('hex')`)، غير قابل للتخمين

## البدائل المعتبرة (Options Considered)

### 1. Security Baseline شامل (المختار)
- **المميزات:** يغطي معظم أنواع الهجمات الشائعة، متوافق مع OWASP Top 10، يمكن تطبيقه تدريجيًا، يوفر حماية متعددة الطبقات (defense in depth)
- **العيوب:** جهد تطوير إضافي، قد يحد من بعض المرونة (مثل CSP الصارم)، يتطلب مراجعة دورية

### 2. الحد الأدنى فقط (HTTPS + Authentication)
- **المميزات:** جهد أقل، أبسط تطبيق
- **العيوب:** لا حماية من XSS (بدون CSP)، لا حماية من CSRF (بدون SameSite)، لا تتبع للانتهاكات (بدون audit logs)، غير كافٍ للمؤسسات التعليمية

### 3. WAF (Web Application Firewall) فقط
- **المميزات:** حماية سريعة بدون تغيير الكود، يغطي هجمات شائعة تلقائيًا
- **العيوب:** لا يغطي منطق التطبيق، لا يحمي من authenticated attacks، تكلفة إضافية، يعطي شعورًا زائفًا بالأمان

### 4. Security by Obscurity (إخفاء المعلومات)
- **المميزات:** بسيط، قد يردع بعض المهاجمين المبتدئين
- **العيوب:** ليس أمانًا حقيقيًا، يخفي المشاكل بدلاً من حلها، غير موثوق

## تفاصيل الإجراءات الأمنية

| الإجراء | التفاصيل | الأولوية |
|---|---|---|
| HTTPS إلزامي | Caddy مع Let's Encrypt + auto-redirect | P0 |
| CSP صارم | default-src 'self'، script-src 'self'، لا inline scripts | P0 |
| HttpOnly cookies | Session token لا يمكن الوصول لها عبر JS | P0 |
| SameSite=Lax | حماية من CSRF مع السماح بـ top-level navigations | P0 |
| Rate Limiting | 100 طلب/دقيقة لكل IP، 5 محاولات login/15 دقيقة | P1 |
| Audit Logging | تسجيل: login، upload، delete، share، download | P1 |
| Input Validation | Zod schemas لكل API endpoint | P0 |
| Password Hashing | bcrypt مع salt rounds ≥ 12 | P0 |
| CORS محدود | السماح فقط بالـ origin الخاص بنا | P1 |
| File Upload Validation | نوع الملف + حجم الملف (100MB max) + virus scan (مستقبلًا) | P1 |
| Authentication (NextAuth.js v5 JWT) | JWT strategy، maxAge 24h، updateAge 4h، cookie: `next-auth.session-token` HttpOnly Secure SameSite=Lax | P0 |
| Share Link Token | `crypto.randomBytes(32).toString('hex')` = 64 hex chars | P0 |

## تفاصيل المصادقة (Authentication)

| العنصر | القيمة |
|---|---|
| المكتبة | NextAuth.js v5 |
| الاستراتيجية | JWT (وليس session-based أو custom access/refresh token) |
| مدة الجلسة (maxAge) | 24 ساعة |
| تحديث الجلسة (updateAge) | 4 ساعات |
| اسم الـ cookie | `next-auth.session-token` |
| خصائص الـ cookie | HttpOnly = true، Secure = true (HTTPS only)، SameSite = Lax |
| Refresh Token | غير مطلوب في MVP (يمكن إضافته في V2 إذا لزم) |

## العواقب (Consequences)
- **إيجابية:** حماية شاملة توافق أفضل الممارسات الأمنية (OWASP)، audit trail لتحقيقات الأمان، حماية من أكثر الهجمات شيوعًا (XSS، CSRF، brute force)، NextAuth.js v5 JWT يبسّط المصادقة ومدعوم أصليًا من Next.js، Caddy يوفر HTTPS تلقائي، ثقة أكبر من المؤسسات التعليمية
- **سلبية:** CSP الصارم قد يمنع بعض الأنماط (مثل inline styles من مكتبات third-party)، rate limiting قد يؤثر على المستخدمين الشرعيين في بعض الحالات، audit logging يزيد حجم قاعدة البيانات، جهد تطوير وصيانة إضافي
- **مخاطر:** بعض مكتبات الطرف الثالث قد لا تتوافق مع CSP الصارم. الحل: استخدام nonce-based CSP أو تحديد مصادر محددة بدلاً من 'self' فقط. CDN مثل Cloudflare قد يحتاج إعدادًا خاصًا مع CSP.

## المتابعة (Follow-up)
- إعداد CSP headers مع Next.js middleware
- تكوين NextAuth.js v5 مع JWT strategy وsecure cookie settings — انظر ADR-016
- تنفيذ rate limiting middleware (express-rate-limit أو custom)
- تصميم audit log schema في Prisma
- إعداد Zod validation schemas لكل API endpoint
- إجراء security audit أولي بعد تنفيذ MVP
- إعداد أتمتة لفحص الثغرات (npm audit، Snyk)
- كتابة security documentation للفريق
- إعداد Vitest لاختبارات الأمان — انظر ADR-016
