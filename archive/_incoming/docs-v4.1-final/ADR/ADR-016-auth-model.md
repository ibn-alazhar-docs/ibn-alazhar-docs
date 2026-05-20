# ADR-016: Auth Model - NextAuth.js v5 JWT Strategy

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تحتاج إلى نظام مصادقة (authentication) لمرحلة MVP. الخيارات المتاحة تتراوح بين استخدام NextAuth.js v5 مع JWT strategy، بناء نظام مصادقة مخصص مع access/refresh token، أو استخدام session-based authentication مع قاعدة البيانات. القرار هنا يؤثر على تجربة المستخدم (مدى تكرار إعادة تسجيل الدخول)، تعقيد التنفيذ، قابلية التوسع، والأمان. الفريق صغير والمشروع في مرحلة MVP، لذا البساطة والسرعة في التنفيذ أولوية عالية مع الحفاظ على أساس أمني متين.

## القرار (Decision)
قررنا استخدام **NextAuth.js v5 مع JWT strategy** كنظام مصادقة لمرحلة MVP:

- **استراتيجية الجلسة:** JWT (وليس database session)
- **مدة الجلسة (maxAge):** 24 ساعة
- **تحديث الجلسة (updateAge):** 4 ساعات (يجدد الـ JWT إذا مرت 4 ساعات منذ آخر تحديث، ضمن فترة الـ 24 ساعة الكلية)
- **اسم الـ cookie:** `next-auth.session-token`
- **خصائص الـ cookie:** HttpOnly = true، Secure = true (يُرسل فقط عبر HTTPS)، SameSite = Lax
- **لا custom refresh token flow في MVP:** لا نضيف آلية access/refresh token منفصلة. الـ JWT cookie الواحد يكفي.

## البدائل المعتبرة (Options Considered)

### 1. NextAuth.js v5 مع JWT Strategy (المختار)
- **المميزات:** مدعوم أصليًا من Next.js، تكامل ممتاز مع App Router، لا حاجة للاستعلام عن قاعدة البيانات في كل طلب (stateless)، بساطة التنفيذ، مجتمع كبير وتوثيق جيد، cookie واحد يدير الجلسة بالكامل، updateAge يوفر آلية تجديد ضمنية بدون refresh token منفصل
- **العيوب:** مدة الجلسة 24 ساعة قد تبدو طويلة أمنيًا (لكنها تقلل إزعاج المستخدم)، لا يمكن إبطال جلسة فورًا بدون إضافة آلية إضافية (blocklist)، حجم الـ JWT يزداد مع زيادة البيانات المخزنة فيه

### 2. Custom Access/Refresh Token
- **المميزات:** تحكم كامل في دورة حياة الـ token، إمكانية إبطال الـ refresh token، مدة access token قصيرة (أكثر أمانًا)، مرونة عالية في التصميم
- **العيوب:** تعقيد كبير في التنفيذ (token rotation، storage، refresh endpoint، race conditions)، overhead تشغيلي (استعلامات قاعدة بيانات إضافية)، حاجة لإدارة حالات حافة كثيرة (expired refresh token، concurrent refresh requests)، لا يدعمه NextAuth أصليًا (نحتاج كتابة layer إضافية)، over-engineering لمرحلة MVP

### 3. Session-based Authentication (Database Sessions)
- **المميزات:** يمكن إبطال الجلسات فورًا (حذف من قاعدة البيانات)، لا بيانات حساسة في الـ cookie، تحكم دقيق في الجلسات النشطة
- **العيوب:** استعلام قاعدة بيانات في كل طلب (overhead على الأداء)، يحتاج جدول sessions في قاعدة البيانات، لا يتوافق جيدًا مع البنية serverless، صعوبة في التوسع الأفقي (session affinity أو shared database)، تعقيد إدارة تنظيف الجلسات المنتهية

### 4. Third-party Auth فقط (Google/GitHub OAuth)
- **المميزات:** لا إدارة لكلمات المرور، تجربة تسجيل دخول سلسة، أمان عالي (يُفوَّض لمزود الخدمة)
- **العيوب:** اعتماد كامل على مزود خارجي، لا يعمل بدون إنترنت (on-premise)، لا يناسب جميع المؤسسات التعليمية (بعضها يمنع Google/GitHub)، لا تحكم في سياسات كلمات المرور، يحتاج credentials provider كـ fallback

## تفاصيل التنفيذ

| العنصر | القيمة |
|---|---|
| المكتبة | NextAuth.js v5 (`next-auth`) |
| الاستراتيجية | JWT (`session: { strategy: "jwt" }`) |
| مدة الجلسة (maxAge) | 24 ساعة (`session: { maxAge: 24 * 60 * 60 }`) |
| تحديث الجلسة (updateAge) | 4 ساعات (`session: { updateAge: 4 * 60 * 60 }`) |
| اسم الـ cookie | `next-auth.session-token` |
| HttpOnly | `true` — لا يمكن الوصول عبر JavaScript |
| Secure | `true` — يُرسل فقط عبر HTTPS |
| SameSite | `Lax` — حماية من CSRF مع السماح بـ top-level navigations |
| Refresh Token | غير مطلوب في MVP |
| إبطال الجلسة | يمكن إضافة JWT blocklist (Redis) في V2 إذا لزم |

## سير عمل المصادقة

1. المستخدم يسجّل الدخول عبر credentials (email + password)
2. NextAuth.js يتحقق من كلمة المرور (bcrypt) وينشئ JWT
3. الـ JWT يُخزّن في cookie باسم `next-auth.session-token`
4. كل طلب لاحق يحمل الـ cookie تلقائيًا
5. NextAuth.js يتحقق من صلاحية الـ JWT في كل طلب
6. إذا مرت 4 ساعات (updateAge)، يُجدَّد الـ JWT تلقائيًا
7. بعد 24 ساعة (maxAge)، تنتهي صلاحية الجلسة ويُعاد توجيه المستخدم لصفحة تسجيل الدخول

## العواقب (Consequences)
- **إيجابية:** تنفيذ أبسط بكثير من نظام access/refresh token مخصص، NextAuth.js v5 مدعوم أصليًا من Next.js ولا يتطلب إعدادًا معقدًا، لا استعلامات قاعدة بيانات إضافية في كل طلب (stateless JWT)، cookie واحد يدير الجلسة بالكامل، updateAge يوفر تجديدًا ضمنيًا بدون تعقيد refresh token، مجتمع NextAuth كبير وموارد تعليمية وفيرة
- **سلبية:** مدة 24 ساعة قد تبدو طويلة أمنيًا (لكنها تقلل إزعاج إعادة تسجيل الدخول)، لا يمكن إبطال جلسة فورًا بدون إضافة آلية إضافية (JWT blocklist في Redis)، حجم الـ JWT يزداد مع إضافة بيانات مخصصة (custom claims)، إذا فُقد الـ cookie (مثلاً مسح المستخدم cookies) يجب إعادة تسجيل الدخول
- **مخاطر:** إذا احتجنا إبطال جلسات فوريًا (مثل حساب مُخترق)، سنحتاج لإضافة JWT blocklist. هذا يمكن تنفيذه في V2 باستخدام Redis set مع TTL. إذا شكا المستخدمون من إعادة تسجيل الدخول المتكررة (بسبب 24h maxAge)، يمكن إطوال المدة أو إضافة refresh token في V2.

## المتابعة (Follow-up)
- إعداد NextAuth.js v5 مع JWT strategy في Next.js 16
- تنفيذ credentials provider مع bcrypt password hashing
- إضافة OAuth providers اختيارية (Google، GitHub) كخيارات إضافية
- تصميم صفحات تسجيل الدخول والتسجيل RTL-first
- تنفيذ middleware لحماية الـ API routes وصفحات التطبيق
- مراقبة مدة الجلسة وشكاوى المستخدمين حول إعادة تسجيل الدخول
- في V2: تقييم الحاجة لـ refresh token أو JWT blocklist بناءً على ملاحظات المستخدمين
- إعداد Vitest لاختبارات المصادقة (login، logout، session expiry، token validation)
