# Incoming ADR report — docs-v4.1-final

Generated: 2026-05-18T17:08:50+03:00

## docs/_incoming/docs-v4.1-final/ADR/ADR-001-pwa-first.md

# ADR-001: PWA-first بدلاً من Desktop-first

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس هي منصة إدارة مستندات تعليمية تستهدف المؤسسات التعليمية والطلاب في العالم العربي. نحتاج إلى تحديد نموذج التطبيق الأساسي الذي سيستخدمه المستخدمون للوصول إلى المنصة. الخيارات المتاحة تتراوح بين تطبيق ويب تقدمي (PWA)، تطبيق سطح مكتب عبر Tauri (مثل مشروع tahweel-tauri)، تطبيق موبايل أصلي عبر React Native، أو تطبيق Electron تقليدي. القرار هنا يؤثر بشكل جوهري على تجربة المستخدم، تكلفة التطوير، نطاق الوصول، وقدرات النظام مثل الوصول للأجهزة المحلية (native APIs). المؤسسات التعليمية المستهدفة غالبًا لا تمتلك ميزانيات ضخمة لتثبيت برمجيات على كل جهاز، لذا سهولة الوصول عبر المتصفح تعتبر ميزة تنافسية حاسمة.

## القرار (Decision)
قررنا بناء المنصة كتطبيق ويب تقدمي (PWA) باستخدام Next.js 16 مع @serwist/next لإدارة Service Worker. هذا يعني أن التطبيق يعمل بشكل أساسي في المتصفح مع إمكانية التثبيت على الأجهزة (installable)، دعم العمل بدون اتصال (offline support)، وإشعارات push. PWA يوفر وصولاً فورياً عبر رابط URL بدون حاجة لتثبيت، مع الحفاظ على تجربة شبيهة بالتطبيقات الأصلية. نستخدم Caddy كـ reverse proxy أمام التطبيق مع HTTPS تلقائي عبر Let's Encrypt.

## البدائل المعتبرة (Options Considered)

### 1. PWA مع Next.js + @serwist/next (المختار)
- **المميزات:** وصول فوري عبر المتصفح، قابلية التثبيت على جميع المنصات (desktop + mobile)، تحديثات تلقائية بدون متجر تطبيقات، تكلفة تطوير أقل، codebase واحد، @serwist/next يوفر تكاملًا أصليًا مع Next.js 16 App Router
- **العيوب:** وصول محدود لـ native APIs (مثل الوصول المباشر للنظام الملفات)، أداء أقل من التطبيقات الأصلية في بعض الحالات، دعم المتصفحات يتفاوت

### 2. Tauri Desktop App (مثل tahweel-tauri)
- **المميزات:** أداء ممتاز، وصول كامل لنظام التشغيل، حزمة تثبيت صغيرة (Rust backend)، أمان عالي
- **العيوب:** سطح مكتب فقط (لا يعمل على الموبايل)، يحتاج تثبيت على كل جهاز، تحديثات تتوزع يدويًا، تكلفة تطوير أعلى للمنصات المتعددة

### 3. React Native
- **المميزات:** تجربة أصلية على الموبايل، وصول لـ native APIs، أداء جيد
- **العيوب:** لا يدعم سطح المكتب بشكل جيد، يحتاج codebase منفصل أو مشاركة محدودة، يتطلب نشرًا عبر متاجر التطبيقات، تكلفة تطوير عالية

### 4. Electron
- **المميزات:** وصول كامل لـ Node.js APIs، سطح مكتب على جميع المنصات، نظام بيئي ناضج
- **العيوب:** حزمة تثبيت ضخمة (~150MB+)، استهلاك عالي للذاكرة، سطح مكتب فقط، مشاكل أمنية محتملة

## العواقب (Consequences)
- **إيجابية:** المستخدمون يمكنهم الوصول فورًا عبر رابط URL بدون تثبيت، التطبيق يعمل على جميع الأجهزة من codebase واحد، إمكانية التثبيت كتطبيق على الشاشة الرئيسية، دعم offline عبر Service Worker (مع @serwist/next)، تحديثات فورية بدون موافقة متجر تطبيقات، تكلفة تطوير وصيانة أقل بكثير، Caddy يوفر HTTPS تلقائي وreverse proxy فعّال
- **سلبية:** لا يمكننا الوصول المباشر لنظام الملفات المحلي (نستخدم File System Access API كحل جزئي)، بعض Native APIs غير متاحة (مثل Bluetooth، بعض أجهزة الاستشعار)، أداء المعالجة الثقيلة محدود بقدرات المتصفح، دعم Push Notifications يتفاوت بين المتصفحات (خاصة على iOS)
- **مخاطر:** اعتمادنا على تطور معايير الويب قد يبطئ بعض الميزات، iOS Safari لا يدعم جميع ميزات PWA بنفس مستوى Chrome

## المتابعة (Follow-up)
- إعداد @serwist/next مع Next.js 16 App Router (انظر ADR-009)
- تصميم Service Worker strategy (انظر ADR-009)
- اختبار تجربة التثبيت على Chrome وSafari وFirefox
- إعداد Caddy كـ reverse proxy مع HTTPS تلقائي (انظر ADR-013)
- توثيق حدود PWA للمستخدمين (ما لا يمكننا فعله)
- إعادة تقييم الحاجة لتطبيق Tauri للمستخدمين المتقدمين في الإصدارات المستقبلية

## docs/_incoming/docs-v4.1-final/ADR/ADR-002-frontend-stack.md

# ADR-002: Frontend Stack - Next.js 16

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تحتاج إلى frontend framework يوفر: Server-Side Rendering (SSR) لتحسين أداء الصفحات الأولى وتحسين محركات البحث (SEO)، API routes مدمجة لبناء الـ backend داخل نفس المشروع، دعم PWA من خلال التكامل مع @serwist/next، ونظام بيئي React قوي يسهل إيجاد مكتبات ومطورين. الاختيار هنا يؤثر على بنية المشروع بأكمله، سرعة التطوير، قابلية التوسع، وتجربة المطور (DX).

## القرار (Decision)
اخترنا Next.js 16 مع App Router كـ frontend stack الأساسي. Next.js يوفر لنا إطار عمل متكامل (full-stack framework) يجمع بين SSR، API Routes، وتحسين الأداء التلقائي (automatic optimizations). App Router يوفر نموذج ملفات مبني على المجلدات (file-based routing) مع دعم React Server Components وServer Actions.

## البدائل المعتبرة (Options Considered)

### 1. Next.js 16 مع App Router (المختار)
- **المميزات:** إطار عمل متكامل (SSR + API + PWA)، نظام بيئي ضخم، تحسينات أداء تلقائية (Image optimization، Code splitting)، React Server Components، Server Actions، مجتمع كبير وتوثيق ممتاز، دعم TypeScript أصلي
- **العيوب:** Vendor lock-in لأنماط Vercel، تعقيد في نموذج الـ caching (خاصة في الإصدارات السابقة)، App Router لا يزال يتطور، بعض القرارات المعمارية مفروضة من Vercel

### 2. Remix
- **المميزات:** نموذج بيانات مبني على الويب القياسي (fetch API)، nested routing ممتاز، أداء جيد، فلسفة واضحة
- **العيوب:** مجتمع أصغر من Next.js، دعم PWA يحتاج عملًا إضافيًا، نظام بيئي أقل نضجًا، توظيف مطورين أصعب

### 3. Nuxt 3 (Vue.js)
- **المميزات:** إطار عمل متكامل مماثل، أداء ممتاز، Vue.js أسهل في التعلم
- **العيوب:** مجتمع أصغر في الشرق الأوسط، Vue ecosystem أقل عمقًا من React، التوظيف أصعب في سوق React-dominant، انتقال من React يحتاج إعادة تعلم

### 4. SvelteKit
- **المميزات:** أداء ممتاز (compiled framework)، bundle size صغير، DX رائع
- **العيوب:** مجتمع صغير نسبيًا، مكتبات أقل، التوظيف صعب جدًا، دعم المؤسسات محدود

### 5. Express + SPA (React Vite)
- **المميزات:** تحكم كامل، لا vendor lock-in، بسيط ومفهوم
- **العيوب:** لا SSR بدون إعداد معقد، يجب بناء كل شيء يدويًا (routing، code splitting، optimization)، صيانة أعلى، لا تكامل مدمج بين frontend و backend

## العواقب (Consequences)
- **إيجابية:** إطار عمل واحد يغطي frontend + API + SSR، سرعة تطوير عالية مع الميزات الجاهزة، مجتمع ضخم وموارد تعليمية وفيرة، React ecosystem متاح بالكامل، تحسينات أداء تلقائية، توظيف مطورين أسهل لشهرة Next.js
- **سلبية:** الاعتماد على أنماط Vercel قد يحد من المرونة في المستقبل، تعقيد App Router قد يبطئ الفريق في البداية، بعض مشاكل الـ caching تحتاج فهمًا عميقًا، تحديثات Next.js قد تكسر أنماط موجودة (كما حدث في الانتقال من Pages إلى App Router)
- **مخاطر:** إذا قررت Vercel تغيير نموذج الترخيص أو التسعير بشكل جذري، قد نحتاج لإعادة تقييم. لكن Next.js مفتوح المصدر ويمكن استضافته ذاتيًا.

## المتابعة (Follow-up)
- تحديد إصدار Next.js 16 الدقيق والتأكد من استقرار App Router
- وضع مواصفات لـ project structure مع App Router
- تحديد استراتيجية الـ deployment (self-hosted vs Vercel) — انظر ADR-013
- إعداد قالب مشروع (starter template) مع TypeScript، Tailwind CSS، وnext-intl
- إعداد @serwist/next لدعم PWA — انظر ADR-009
- تدريب الفريق على React Server Components وServer Actions
- إعداد Vitest كإطار اختبار — انظر ADR-016

## docs/_incoming/docs-v4.1-final/ADR/ADR-003-backend-stack.md

# ADR-003: Backend Stack - Next.js API Routes + BullMQ Workers

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تحتاج إلى طبقة backend تعالج عدة أنواع من المهام: HTTP API endpoints للعمليات العادية (CRUD، مصادقة، استعلامات)، معالجة خلفية (background processing) للعمليات الثقيلة مثل OCR وتحويل الملفات، وتحديثات فورية (real-time updates) لإبلاغ المستخدم عن تقدم العمليات. الفريق صغير والمشروع في مرحلة MVP، لذا نحتاج إلى حل يوازن بين البساطة والقدرة على التوسع.

## القرار (Decision)
قررنا استخدام Next.js API Routes كطبقة HTTP API + BullMQ Workers كطبقة معالجة خلفية. هذا يعني:
- **API Routes:** تعالج الطلبات المتزامنة (sync requests) مثل إنشاء مستخدم، رفع ملف، استعلام بيانات
- **BullMQ Workers:** تعالج المهام غير المتزامنة (async jobs) مثل OCR، تحويل PDF، تحسين الصور
- **الاتصال بينهما:** API Routes تضيف مهام إلى BullMQ queue، Workers تنفذها وترسل تحديثات عبر SSE

## البدائل المعتبرة (Options Considered)

### 1. Next.js API Routes + BullMQ Workers (المختار)
- **المميزات:** Codebase موحد (monorepo)، مشاركة الأنواع (types) بين frontend و backend، نشر مبسط، BullMQ موثوق وناضج، TypeScript أصلي، monitoring dashboard مع Bull Board
- **العيوب:** API Routes لها حدود (execution time limits خاصة على serverless)، لا تصلح لـ long-running connections، تحتاج Redis منفصل لـ BullMQ

### 2. Express/Fastify Server منفصل
- **المميزات:** تحكم كامل، لا حدود وقت تنفيذ، middleware ecosystem ناضج، مناسب لـ WebSocket
- **العيوب:** Codebase منفصل يحتاج صيانة مزدوجة، مشاكل CORS، نشر أكثر تعقيدًا، مشاركة types تحتاج جهدًا إضافيًا، تكلفة تشغيل أعلى

### 3. Serverless Functions (AWS Lambda / Vercel Functions)
- **المميزات:** قابلية توسع تلقائية، دفع مقابل الاستخدام فقط، لا إدارة خوادم
- **العيوب:** حدود وقت تنفيذ صارمة (10 ثوانٍ - 15 دقيقة)، cold starts، تكلفة غير متوقعة مع الاستخدام المرتفع، لا يناسب عمليات OCR طويلة، اعتماد على مزود سحابي

### 4. Monolith API (Express + Workers في نفس العملية)
- **المميزات:** أبسط نشر، لا Redis مطلوب، لا اتصال بين عمليات
- **العيوب:** لا يمكن توسيع API و Workers بشكل مستقل، مشاكل في الاستقرار (عملية ثقيلة قد توقف API)، لا يمكن جدولة الأولويات بسهولة

## العواقب (Consequences)
- **إيجابية:** بنية واضحة تفصل بين HTTP API والمعالجة الخلفية، codebase موحد يسهل الصيانة والتطوير، مشاركة Prisma models و TypeScript types بين كل الأجزاء، BullMQ يوفر retry logic وdead letter queues وrate limiting، إمكانية توسع مستقلة للـ workers (نضيف workers أكثر عند الحاجة)، مراقبة المهام عبر Bull Board
- **سلبية:** API Routes في Next.js لها حد حجم الطلب (4MB default) وحد وقت تنفيذ (يعتمد على الـ hosting)، نحتاج Redis instance إضافي، التعامل مع long-running HTTP requests يحتاج حلاً بديلاً (SSE proxy)، debugging أكثر تعقيدًا عبر عمليات متعددة
- **مخاطر:** إذا تجاوزنا حدود API Routes، سنحتاج إما لتعديل الإعدادات أو إضافة API server منفصل. هذا قرار يمكن تغييره لاحقًا بدون إعادة بناء كاملة.

## المتابعة (Follow-up)
- تحديد حدود API Routes (request size، timeout) وتوثيق الحلول البديلة
- تصميم قائمة الـ job types (OCR، convert، export، thumbnail، cleanup) وأولوياتها
- إعداد Redis instance (انظر ADR-006)
- إعداد Bull Board لمراقبة المهام
- تحديد استراتيجية retry و dead letter queue لكل نوع مهمة
- اختبار أداء API Routes تحت حمل عالٍ
- تصميم API endpoints للـ Conversion و Export كمسارات منفصلة — انظر ADR-017

## docs/_incoming/docs-v4.1-final/ADR/ADR-004-database-and-orm.md

# ADR-004: Database and ORM - PostgreSQL + Prisma

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تحتاج إلى قاعدة بيانات موثوقة تخزن: بيانات المستخدمين، بيانات الملفات والمستندات (metadata)، سجلات التحويل (conversions) والتصدير (exports)، إعدادات المشاركة، وسجلات المراجعة (audit logs). المشروع مكتوب بـ TypeScript، لذا نحتاج إلى تكامل قوي مع TypeScript لتقليل الأخطاء وتحسين تجربة المطور. المؤسسات التعليمية المستهدفة قد يكون لديها متطلبات خصوصية بيانات تحتم استضافة ذاتية لقاعدة البيانات. نحتاج أيضًا إلى دعم JSON fields لتخزين metadata المرنة، وfull-text search للبحث في المستندات.

## القرار (Decision)
اخترنا PostgreSQL 16 كقاعدة بيانات رئيسية مع Prisma 6 كـ ORM. اسم قاعدة البيانات: `ibn_al_azhar_docs`. PostgreSQL يوفر موثوقية عالية، دعم JSONB للبيانات المرنة، full-text search مدمج (بما فيها دعم العربية المحدود)، وextended features مثل Row Level Security. Prisma يوفر TypeScript type safety تلقائي، migrations مدارة، وPrisma Studio لاستعراض البيانات.

## البدائل المعتبرة (Options Considered)

### 1. PostgreSQL + Prisma 6 (المختار)
- **المميزات:** Type safety تلقائي من Prisma (auto-generated types)، schema-first design مع prisma.schema، migrations تلقائية ومجدولة، Prisma Studio لاستعراض البيانات، دعم JSONB وfull-text search في PostgreSQL، مجتمع Prisma نشط، دعم SQLite للتطوير المحلي
- **العيوب:** Prisma runtime overhead (Prisma Engine مكتوب بـ Rust ويستهلك ~20MB ذاكرة)، بعض الاستعلامات المعقدة تحتاج raw SQL، Prisma Client يُنشأ (generated) وقد يبطئ CI/CD، بعض الميزات المتقدمة لـ PostgreSQL غير مدعومة في Prisma DSL

### 2. PostgreSQL + Drizzle ORM
- **المميزات:** أداء أعلى (no runtime overhead)، SQL-like API أقرب لـ SQL الحقيقي، bundle size أصغر، دعم أفضل لـ PostgreSQL features المتقدمة
- **العيوب:** مجتمع أصغر، توثيق أقل نضجًا، لا يوجد Prisma Studio مكافئ، migrations أقل نضجًا، منحنى تعلم أعلى للفريق

### 3. MySQL + Prisma
- **المميزات:** MySQL أسهل في الإدارة للمبتدئين، استضافة متوفرة بكثرة
- **العيوب:** دعم JSON أضعف من PostgreSQL، لا full-text search جيد للعربية، أداء أقل في الاستعلامات المعقدة، ميزات أقل بشكل عام

### 4. SQLite + Prisma
- **المميزات:** أبسط نشر (ملف واحد)، لا حاجة لخادم قاعدة بيانات، مثالي للتطوير المحلي
- **العيوب:** لا يدعم التزامن العالي (concurrent writes)، لا يصلح لـ production مع مستخدمين متعددين، لا full-text search متقدم، محدود في التوسع

### 5. Supabase (PostgreSQL مدار)
- **المميزات:** PostgreSQL مدار مع إضافات (Auth، Storage، Realtime)، لوحة تحكم ممتازة، API تلقائي
- **العيوب:** اعتماد على مزود خارجي، تكلفة أعلى مع التوسع، خصوصية البيانات (الخوادم خارجية)، vendor lock-in في ميزات Supabase-specific

### 6. PlanetScale (MySQL مدار)
- **المميزات:** MySQL مدار مع branching، أداء ممتاز، scaling تلقائي
- **العيوب:** MySQL بدلاً من PostgreSQL، لا يدعم foreign keys في الخطة المجانية (تم إلغاء الخطة المجانية)، تكلفة عالية، vendor lock-in

## تفاصيل قاعدة البيانات

| العنصر | القيمة |
|---|---|
| اسم قاعدة البيانات | `ibn_al_azhar_docs` |
| محرك قاعدة البيانات | PostgreSQL 16 |
| ORM | Prisma 6 |
| تطوير محلي | SQLite (عبر Prisma) |
| إنتاج | PostgreSQL 16 (Docker) |

## العواقب (Consequences)
- **إيجابية:** تكامل TypeScript ممتاز يقلل أخطاء وقت التشغيل، schema واحد هو مصدر الحقيقة (single source of truth)، migrations مدارة تقلل مخاطر تغيير قاعدة البيانات، PostgreSQL موثوق ومجرب في الإنتاج، JSONB يوفر مرونة في تخزين metadata، إمكانية الترقية إلى ميزات PostgreSQL المتقدمة (RLS، partitioning، materialized views)
- **سلبية:** Prisma Engine يستهلك ذاكرة إضافية (~20-30MB)، بعض الاستعلامات المعقدة تحتاج $queryRaw وتفقد type safety، Prisma Client generation يبطئ عملية البناء، أداء Prisma أقل بقليل من raw SQL أو Drizzle في الاستعلامات البسيطة
- **مخاطر:** اعتمادنا على Prisma يعني أننا نتأثر بقرارات فريق Prisma (تغييرات في الترخيص، breaking changes). لكن Prisma مفتوح المصدر ويمكن الانتقال لـ Drizzle لاحقًا مع جهد معقول.

## المتابعة (Follow-up)
- تصميم database schema الأولي (users، files، conversions، exports، shares، audit_logs) — مع فصل Conversion و Export كجداول منفصلة (انظر ADR-017)
- تحديد استراتيجية الـ migrations (development vs production)
- إعداد PostgreSQL instance للاستضافة الذاتية (انظر ADR-013)
- تكوين Prisma للاستخدام مع SQLite في التطوير المحلي و PostgreSQL في الإنتاج
- تقييم الحاجة لـ connection pooling (PgBouncer) مع Prisma
- دراسة دعم full-text search العربي في PostgreSQL وبدائله (Meilisearch)

## docs/_incoming/docs-v4.1-final/ADR/ADR-005-object-storage.md

# ADR-005: Object Storage - MinIO

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تعالج المستندات والملفات التعليمية. نحتاج إلى نظام تخزين كائنات (object storage) للملفات المرفوعة (uploads) والملفات المحولة (converted files) والمُصدَّرة (exported files)، بما في ذلك ملفات PDF وصور المستندات ومخرجات OCR. حجم الملفات يتراوح بين بضع كيلوبايتات و100 ميجابايت. المنصة تستهدف مؤسسات تعليمية بميزانيات محدودة، والكثير من هذه المؤسسات لديها متطلبات خصوصية بيانات تمنع تخزين الملفات على خوادم خارجية. نحتاج إلى S3-compatible API لأن العديد من المكتبات والأدوات (مثل multer-s3، Presigned URLs) تعتمد على هذه الواجهة.

## القرار (Decision)
اخترنا MinIO كنظام تخزين كائنات مستضاف ذاتيًا (self-hosted). MinIO هو خادم تخزين كائنات متوافق مع Amazon S3 API، يمكن تشغيله على نفس الخادم (single VPS) أو بشكل موزع. يوفر لنا تحكمًا كاملاً في البيانات، تكلفة تشغيل منخفضة، وواجهة S3 المتوافقة التي تتيح استخدام أي مكتبة S3 موجودة. اسم الـ bucket الرئيسي: `ibn-al-azhar-docs-files`.

## البدائل المعتبرة (Options Considered)

### 1. MinIO (self-hosted) (المختار)
- **المميزات:** متوافق تمامًا مع S3 API، استضافة ذاتية (البيانات على خادمنا)، مجاني ومفتوح المصدر، واجهة ويب مدمجة (MinIO Console)، يدعم Presigned URLs، يمكن تشغيله كحاوية Docker واحدة، أداء ممتاز للملفات المتوسطة والصغيرة، يدعم encryption at rest
- **العيوب:** يحتاج صيانة وإدارة (backups، monitoring، updates)، لا يوفر CDN مدمج (نحتاج إعداد CDN منفصل)، أداء أقل من S3 مع الملفات الكبيرة جدًا، يتطلب تخزين محلي كافٍ على الخادم

### 2. AWS S3
- **المميزات:** موثوقية عالية جدًا (11 nines durability)، CDN مدمج (CloudFront)، لا صيانة مطلوبة، أداء ممتاز، تكامل مع خدمات AWS الأخرى
- **العيوب:** تكلفة شهرية متكررة تعتمد على حجم البيانات وعدد الطلبات، البيانات خارج المؤسسة (مخاوف خصوصية)، اعتماد على مزود خارجي، شبكات المنطقة العربية قد تعاني من latency مع AWS regions

### 3. Cloudflare R2
- **المميزات:** متوافق مع S3 API، لا تكلفة egress (خروج البيانات مجاني)، CDN مدمج (Cloudflare)، تسعير تنافسي
- **العيوب:** لا يزال ناضجًا نسبيًا، قيود على حجم الملفات (5TB لكل ملف)، اعتماد على مزود خارجي، مخاوف خصوصية البيانات، بعض ميزات S3 غير مدعومة بعد

### 4. Local Filesystem
- **المميزات:** أبسط حل، لا حاجة لخادم إضافي، أداء محلي ممتاز
- **العيوب:** لا S3 API (نحتاج كتابة abstraction layer)، لا يتوسع بسهولة، مشاكل مع النسخ الاحتياطي والاستعادة، صعوبة في الترحيل، لا Presigned URLs، مخاطر فقدان البيانات إذا تعطل القرص

## تفاصيل الـ Bucket

| العنصر | القيمة |
|---|---|
| اسم الـ bucket الرئيسي | `ibn-al-azhar-docs-files` |
| مسار الرفع | `uploads/` |
| مسار مخرجات OCR | `conversions/` |
| مسار ملفات التصدير | `exports/` |
| مسار الصور المصغرة | `thumbnails/` |
| حجم الملف الأقصى | 100 MB |

## العواقب (Consequences)
- **إيجابية:** تحكم كامل في البيانات (الملفات تبقى على خادمنا)، تكلفة تشغيل منخفضة جدًا (مجاني باستثناء مساحة القرص)، واجهة S3 متوافقة تتيح استخدام مكتبات جاهزة (aws-sdk)، إمكانية الترحيل السهل لـ AWS S3 أو Cloudflare R2 مستقبلًا إذا لزم الأمر، MinIO Console يوفر واجهة إدارة سهلة، يدعم bucket policies وversioning
- **سلبية:** نحتاج لإدارة النسخ الاحتياطي (backups) يدويًا أو عبر scripts، لا CDN مدمج يعني أن التحميل من مواقع بعيدة قد يكون بطيئًا (نحتاج إعداد Cloudflare CDN أمامه)، المساحة التخزينية محودة بسعة الخادم، يحتاج monitoring للتأكد من عدم نفاد المساحة
- **مخاطر:** إذا نما حجم البيانات بشكل كبير، قد نحتاج للترقية إلى VPS أكبر أو الانتقال لـ AWS S3. واجهة S3 المتوافقة تجعل هذا الانتقال ممكنًا بدون تغيير في الكود.

## المتابعة (Follow-up)
- إعداد MinIO كحاوية Docker مع volumes مناسبة
- إنشاء bucket `ibn-al-azhar-docs-files` مع structure (uploads/، conversions/، exports/، thumbnails/)
- إعداد Presigned URLs للتحميل والتنزيل المباشر
- تصميم استراتيجية النسخ الاحتياطي (rsync، MinIO mirroring)
- تقييم الحاجة لـ CDN (Cloudflare free tier) أمام MinIO
- إعداد lifecycle policies لحذف الملفات المؤقتة
- توثيق عملية الترحيل المحتملة إلى AWS S3 أو R2

## docs/_incoming/docs-v4.1-final/ADR/ADR-006-job-queue.md

# ADR-006: Job Queue - Redis + BullMQ

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تنفذ عمليات كثيفة تستغرق وقتًا طويلاً مثل: التعرف البصري على الحروف (OCR) للمستندات العربية، تحويل الملفات (conversion - استخراج النص عبر OCR)، تصدير الملفات (export - توليد صيغ TXT/DOCX/JSON)، إنشاء صور مصغرة (thumbnails)، وتنظيف الملفات المؤقتة. هذه العمليات لا يمكن تنفيذها بشكل متزامن مع طلب HTTP لأنها تستغرق من ثوانٍ إلى دقائق. نحتاج إلى نظام طوابير مهام (job queue) يوفر: تنفيذًا موثوقًا (لا تفقد المهام)، إعادة المحاولة عند الفشل (retry logic)، تحديد أولويات المهام (priorities)، تتبع التقدم (progress tracking)، ومراقبة وحلول للمهام المعلقة (monitoring و dead letter queues). المشروع مكتوب بـ TypeScript بالكامل، لذا يُفضّل حل أصلي في Node.js.

## القرار (Decision)
اخترنا Redis كـ message broker مع BullMQ كـ job queue library. BullMQ هي مكتبة Node.js مكتوبة بـ TypeScript ومبنية على Redis، توفر كل الميزات المطلوبة: موثوقية عالية، retry logic مرن، أولويات، تأخير (delayed jobs)، تتبع التقدم، وBull Board لمراقبة المهام. Redis يعمل أيضًا كـ cache layer للتطبيق (session storage، API caching)، مما يبرر إضافته كعنصر بنية تحتية.

## البدائل المعتبرة (Options Considered)

### 1. Redis + BullMQ (المختار)
- **المميزات:** أصلي في TypeScript (type safety كامل)، موثوقية عالية (at-least-once delivery)، retry logic مرن مع backoff strategies، أولويات وتأخير مدمجان، تتبع التقدم (progress events)، Bull Board لمراقبة المهام، إمكانية تشغيل workers متعددين، Redis مفيد أيضًا كـ cache وsession store، مجتمع نشط
- **العيوب:** يحتاج Redis instance إضافي، Redis في الذاكرة (memory-bound) قد يكون مكلفًا مع بيانات كثيرة، BullMQ مرتبط بـ Redis (لا يمكن استبداله بسهولة)، إدارة Redis تحتاج خبرة (persistence، replication)

### 2. RabbitMQ
- **المميزات:** موثوقية عالية جدًا (message broker ناضج)، يدعم أنماط messaging معقدة، لا يعتمد على الذاكرة فقط (persistence أفضل)، يدعم multiple consumers و routing patterns
- **العيوب:** لا يوفر job queue features مدمجة (progress، retry، priorities)، يحتاج كتابة abstraction layer، إدارة معقدة، overhead أعلى من Redis، لا TypeScript-native، لا Bull Board مكافئ

### 3. Celery (Python)
- **المميزات:** ناضج جدًا ومجرب، يدعم أنماط معقدة، مكتبة Python غنية للـ OCR
- **العيوب:** يتطلب Python runtime منفصل (mixing Python + Node.js)، إدارة عمليات متعددة، لا تكامل أصلي مع TypeScript، overhead تشغيلي أعلى، تعقيد في التواصل بين Python workers و Node.js API

### 4. Agenda.js (MongoDB-based)
- **المميزات:** لا يحتاج Redis (يستخدم MongoDB)، أصلي في Node.js، بسيط
- **العيوب:** أداء أقل من Redis-based solutions، لا يدعم أولويات بشكل جيد، MongoDB dependency (نحن لا نستخدم MongoDB)، مجتمع أصغر، لا monitoring dashboard جيد، أقل موثوقية مع الأحمال العالية

### 5. Bull v3 (الإصدار السابق)
- **المميزات:** ناضج ومجرب، مستقر
- **العيوب:** لا يدعم Redis Cluster بشكل جيد، أبطأ من BullMQ، some bugs won't be fixed، التطوير انتقل لـ BullMQ

### 6. Temporal
- **المميزات:** موثوقية عالية جدًا، يدعم long-running workflows، observability مدمج، retry و compensation مدمجان
- **العيوب:** معقد جدًا لاحتياجاتنا، infrastructure overhead ضخم (needs its own server)، منحنى تعلم حاد، over-engineering لـ MVP

## العواقب (Consequences)
- **إيجابية:** نظام طوابير موثوق ومجرب، TypeScript أصلي يقلل الأخطاء، Bull Board يوفر مراقبة فورية للمهام، Redis متعدد الاستخدامات (queue + cache + sessions)، أداء عالي مع Redis في الذاكرة، إمكانية توسع أفقي (إضافة workers)، retry logic مدمج يقلل من المهام المفقودة
- **سلبية:** Redis instance إضافي يحتاج إدارة (persistence، backups، memory management)، الاعتماد على Redis يعني نقطة فشل واحدة (single point of failure) ما لم نعمل replication، ذاكرة Redis محودة وقد تحتاج ترقية مع نمو البيانات، BullMQ مرتبط بـ Redis ولا يمكن استبداله بسهولة
- **مخاطر:** إذا نفدت ذاكرة Redis، قد تفقد المهام. الحل: إعداد Redis persistence (AOF + RDB) وmonitoring للذاكرة.

## المتابعة (Follow-up)
- إعداد Redis instance مع persistence (AOF) وmaxmemory policy مناسب
- تحديد قائمة الـ queues وأولوياتها: OCR queue (أولوية عالية)، Export queue (أولوية متوسطة)، Cleanup queue (أولوية منخفضة)
- إعداد Bull Board لمراقبة المهام في بيئة الإنتاج
- تصميم استراتيجية retry لكل نوع مهمة (max attempts، backoff strategy)
- إعداد monitoring لـ Redis (memory usage، connected clients، queue lengths)
- توثيق إجراءات استعادة Redis من النسخ الاحتياطي

## docs/_incoming/docs-v4.1-final/ADR/ADR-007-ocr-strategy.md

# ADR-007: OCR Strategy - Google Drive for MVP

## الحالة (Status)
Accepted

## السياق (Context)
التعرف البصري على الحروف (OCR) هو ميزة جوهرية في منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس. المستخدمون يحتاجون لتحويل المستندات المكتوبة باللغة العربية إلى نص قابل للبحث والنسخ. جودة OCR للعربية تعتبر تحديًا خاصًا لأن اللغة العربية لها خصائص فريدة: اتصال الحروف، أشكال متعددة لكل حرف، تشكيل (حركات)، واتجاه الكتابة من اليمين لليسار. معظم محركات OCR المفتوحة المصدر تقدم جودة متوسطة للعربية. نحتاج إلى قرار مرحلي: ماذا نستخدم في MVP (الحد الأدنى المنتج)، وماذا نستخدم في الإصدارات المستقبلية. تجدر الإشارة أن OCR هو جزء من عملية Conversion (استخراج النص) وليس Export (تصدير بصيغة) — انظر ADR-017.

## القرار (Decision)
قررنا استخدام Google Drive API كحل OCR لمرحلة MVP، مع التخطيط لإضافة Tesseract.js كحل محلي في V2. استراتيجية Google Drive OCR تعتمد على رفع الملف مؤقتًا إلى Google Drive، requesting OCR عبر API، ثم استخراج النص وحذف الملف. هذا يوفر جودة ممتازة للعربية بدون تكلفة مباشرة (Google Drive API مجاني ضمن حدود الاستخدام).

## البدائل المعتبرة (Options Considered)

### 1. Google Drive OCR API (المختار لـ MVP)
- **المميزات:** جودة ممتازة للعربية (من أفضل المحركات المتاحة)، مجاني ضمن quotas (1 مليار طلب/يوم)، لا يحتاج بنية تحتية إضافية، يدعم لغات متعددة تلقائيًا، نتائج فورية
- **العيوب:** مخاوف خصوصية (الملفات تُرفع لخوادم Google مؤقتًا)، اعتماد على خدمة خارجية (availability)، حدود استخدام قد تُستنفد مع أحمال عالية، يتطلب Google Cloud account وAPI credentials، العملية غير مباشرة (upload → import → download → delete)

### 2. Tesseract.js (المخطط لـ V2)
- **المميزات:** يعمل محليًا (لا خصوصية مخاوف)، مفتوح المصدر، يعمل في Node.js worker، لا اعتماد على خدمات خارجية، يمكن تشغيله offline
- **العيوب:** جودة OCR للعربية أقل من Google Drive، بطيء نسبيًا (WebAssembly في Node.js)، يحتاج نماذج لغة محددة (Arabic trained data)، استهلاك CPU وذاكرة مرتفع

### 3. PaddleOCR
- **المميزات:** جودة ممتازة للعربية (نموذج PPOCR)، مفتوح المصدر، يدعم اتجاه النص (RTL)، أداء جيد
- **العيوب:** يتطلب Python runtime، لا يعمل أصليًا في Node.js، يحتاج GPU لأداء مثالي، تعقيد في إدارة Python environment، overhead تشغيلي إضافي

### 4. Nougat (Meta)
- **المميزات:** جودة عالية للمستندات الأكاديمية (LaTeX output)، مفتوح المصدر، نموذج حديث
- **العيوب:** مخصص للمستندات الأكاديمية الإنجليزية بشكل أساسي، دعم العربية محدود، يحتاج GPU، ثقيل جدًا في التشغيل، لا يناسب حالة الاستخدام العامة

### 5. AWS Textract
- **المميزات:** جودة جيدة، خدمة مدارة بالكامل، لا بنية تحتية مطلوبة، يدعم forms و tables
- **العيوب:** تكلفة عالية ($1.50 لكل 1000 صفحة)، جودة العربية أقل من Google Drive، اعتماد على AWS، لا يناسب الميزانية المحدودة

### 6. Azure AI Document Intelligence
- **المميزات:** جودة ممتازة، يدعم layouts معقدة، خدمة مدارة
- **العيوب:** تكلفة عالية، اعتماد على Microsoft Azure، دعم العربية متوسط، لا يناسب الميزانية المحدودة

## العواقب (Consequences)
- **إيجابية:** جودة OCR عالية جدًا للعربية من اليوم الأول، لا تكلفة مباشرة للمستخدم، لا حاجة لبنية تحتية إضافية، تجربة مستخدم ممتازة في MVP، يمكن البدء فورًا
- **سلبية:** مخاوف خصوصية: ملفات المستخدمين تُرفع لخوادم Google مؤقتًا (يجب توثيق ذلك بوضوح للمستخدمين)، اعتماد على خدمة خارجية: إذا تعطلت Google Drive API، يتوقف OCR، عملية غير مباشرة تضيف latency (upload + process + download + delete)، حدود استخدام Google API قد تكون مشكلة مع النمو
- **مخاطر:** قد ترفض بعض المؤسسات التعليمية رفع ملفاتها لخوادم Google حتى مؤقتًا. هذا يجب أن يكون واضحًا في سياسة الخصوصية. الحل: تقديم Tesseract.js كبديل محلي في V2 للمؤسسات المتشددة خصوصيًا.

## المتابعة (Follow-up)
- إعداد Google Cloud project وتفعيل Drive API
- تصميم workflow رفع OCR (upload → import with OCR → extract text → delete file)
- تحديد سياسة حذف الملفات من Google Drive (immediate deletion بعد الاستخراج)
- كتابة سياسة خصوصية توضح معالجة الملفات عبر Google
- إعداد monitoring لاستخدام Google Drive API quotas
- بدء R&D مع Tesseract.js لتحضير V2
- تقييم PaddleOCR كبديل محلي إذا توفرت بيئة Python
- تصميم Conversion pipeline مع estados واضحة (preparing→splitting→ocr→writing→done) — انظر ADR-017

## docs/_incoming/docs-v4.1-final/ADR/ADR-008-progress-updates.md

# ADR-008: Progress Updates - Server-Sent Events (SSE)

## الحالة (Status)
Accepted

## السياق (Context)
عندما يقوم مستخدم منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس بعملية طويلة مثل OCR (conversion) أو تصدير ملفات (export)، يحتاج لرؤية تقدم العملية في الوقت الفعلي (real-time progress updates). بدون هذه الميزة، سيشعر المستخدم بالقلق وقد يعتقد أن التطبيق متجمد أو أن العملية فشلت. نحتاج إلى آلية تدفع تحديثات من الخادم إلى العميل (server → client push) لإرسال: نسبة التقدم (0% - 100%)، حالة العملية (processing، completed، failed)، ورسائل خطأ إن وُجدت. التحديثات هي اتجاه واحد فقط (من الخادم للعميل)، ولا نحتاج للعميل أن يرسل بيانات عبر نفس القناة.

## القرار (Decision)
اخترنا Server-Sent Events (SSE) كآلية لتحديثات التقدم في الوقت الفعلي. SSE هو معيار ويب يسمح للخادم بدفع بيانات للعميل عبر اتصال HTTP طويل أحادي الاتجاه. نستخدمه لإرسال أحداث التقدم (progress events) من BullMQ workers عبر Next.js API Route إلى واجهة المستخدم.

## البدائل المعتبرة (Options Considered)

### 1. Server-Sent Events (SSE) (المختار)
- **المميزات:** أحادي الاتجاه (يناسب حالتنا: server → client فقط)، إعادة اتصال تلقائية (auto-reconnect مدمج)، مبني على HTTP عادي (لا حاجة لـ upgrade)، يعمل مع معظم proxies و load balancers، API بسيط (EventSource في المتصفح)، لا يحتاج مكتبات إضافية، يدعم event types و IDs
- **العيوب:** اتجاه واحد فقط (لا يمكن للعميل الإرسال)، لا يدعم binary data (نص فقط)، بعض حدود الاتصال في المتصفحات (6 اتصالات لكل domain في HTTP/1.1)، لا يوجد في Next.js API Routes دعم أصلي (يحتاج custom response stream)

### 2. WebSocket
- **المميزات:** اتصال ثنائي الاتجاه (bidirectional)، أداء عالي مع الرسائل المتكررة، يدعم binary data، اتصال دائم مع heartbeat
- **العيوب:** أكثر تعقيدًا من SSE (protocol upgrade، framing، heartbeat)، نحتاج لـ WebSocket server إضافي (Socket.io أو ws)، مشاكل مع بعض proxies و firewalls، إعادة الاتصال يجب إدارتها يدويًا، overkill لحالتنا (نحتاج server → client فقط)، إعداد مع Next.js معقد (لا دعم أصلي)

### 3. HTTP Polling
- **المميزات:** أبسط حل (طلب GET دوري)، يعمل في كل الظروف، لا يحتاج دعم خاص
- **العيوب:** latency عالية (تعتمد على فترة الـ polling)، استهلاك موارد غير ضروري (طلبات كثيرة حتى بدون تحديث)، لا يصلح لتحديثات فورية، overhead على الخادم مع كثرة المستخدمين

### 4. Long Polling
- **المميزات:** أقل latency من polling العادي، يعمل في كل الظروف
- **العيوب:** أكثر تعقيدًا من SSE، استهلاك اتصالات أعلى، لا يحتفظ باتصال دائم، overhead على الخادم، إدارة timeouts معقدة

## العواقب (Consequences)
- **إيجابية:** حل بسيط وأنيق لتحديثات أحادية الاتجاه، auto-reconnect مدمج يضمن استمرارية التحديثات، مبني على HTTP عادي (يتوافق مع CDNs وproxies)، لا يحتاج بنية تحتية إضافية، تجربة مستخدم سلسة مع تحديثات فورية، يمكن دمجه مع Next.js API Routes عبر ReadableStream
- **سلبية:** Next.js API Routes لا تدعم SSE بشكل أصلي (نحتاج كتابة custom stream handler)، حدود اتصال HTTP/1.1 (6 لكل domain) قد تكون مشكلة مع عمليات متعددة، لا يمكن للعميل إرسال بيانات عبر SSE (نحتاج طلب HTTP عادي لذلك)، بعض متصفحات الهاتف قد توقف SSE في الخلفية
- **مخاطر:** إذا احتجنا في المستقبل لاتصال ثنائي الاتجاه (مثل collaborative editing)، سنحتاج لإضافة WebSocket. هذا يمكن أن يتعايش مع SSE بدون تعارض.

## المتابعة (Follow-up)
- تنفيذ SSE endpoint في Next.js API Route باستخدام ReadableStream
- تصميم format للـ events (type، data، id) — يشمل أحداث Conversion و Export بشكل منفصل
- إعداد EventSource client في واجهة المستخدم مع error handling
- اختبار سلوك إعادة الاتصال عند انقطاع الشبكة
- تحديد كيفية ربط BullMQ job progress بـ SSE events (عبر Redis pub/sub)
- اختبار حدود الاتصال المتزامنة مع عمليات متعددة
- توثيق API لـ SSE endpoint

## docs/_incoming/docs-v4.1-final/ADR/ADR-009-pwa-cache-boundaries.md

# ADR-009: PWA Cache Boundaries

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس كتطبيق ويب تقدمي (PWA) تحتاج إلى دعم العمل بدون اتصال (offline support) وتحميل سريع عبر التخزين المؤقت (caching). لكن ليس كل المحتوى يجب أن يُخزّن مؤقتًا بنفس الطريقة: App Shell (واجهة التطبيق الأساسية) يجب أن يعمل offline، بينما بيانات المستخدم يجب أن تكون دائمًا محدثة من الخادم. الملفات المحولة (PDF، صور) قد تكون كبيرة ويجب ألا تملأ الـ cache. نحتاج إلى استراتيجيات تخزين مؤقت مختلفة لكل نوع من المحتوى، مع مراعاة حدود مساحة التخزين وآليات إبطال الـ cache (cache invalidation).

## القرار (Decision)
قررنا تطبيق استراتيجيات تخزين مؤقت متعددة بناءً على نوع المحتوى باستخدام @serwist/next كأداة إدارة Service Worker:
- **Cache First:** لـ App Shell (HTML، CSS، JS bundles، fonts، static assets)
- **Network First:** لـ API endpoints (قوائم الملفات، إحصائيات، settings)
- **Network Only:** لبيانات المستخدم الحساسة وعمليات الكتابة (تحميل ملفات، حذف، تعديل)
- **Stale While Revalidate:** للصور المصغرة (thumbnails) والأيقونات

اسم الـ cache الرئيسي: `ibn-al-azhar-docs-v1` (يُحدَّث مع كل إصدار جديد).

## البدائل المعتبرة (Options Considered)

### 1. @serwist/next مع استراتيجيات متعددة حسب نوع المحتوى (المختار)
- **المميزات:** تكامل أصلي مع Next.js 16 App Router، كل نوع محتوى يحصل على الاستراتيجية المثالية، توازن بين الأداء والحداثة، تجربة offline جيدة للتطبيق الأساسي، بيانات المستخدم دائمًا محدثة، @serwist/next يحل محل next-pwa المتوقف
- **العيوب:** تعقيد في إدارة Service Worker، صعوبة في debugging، cache invalidation يتطلب استراتيجية واضحة، @serwist/next لا يزال يتطور

### 2. next-pwa (workbox-based)
- **المميزات:** كان الحل الأكثر شيوعًا، مبني على workbox.js الناضج
- **العيوب:** المشروع متوقف (unmaintained)، لا يدعم Next.js 16 بشكل جيد، مشاكل مع App Router، لا ينصح به للمشاريع الجديدة

### 3. Cache First لكل شيء
- **المميزات:** أداء ممتاز، يعمل offline بالكامل، بسيط في التنفيذ
- **العيوب:** بيانات قديمة، مستخدم قد يرى معلومات لم تعد صحيحة، cache invalidation كابوس، لا يناسب البيانات الديناميكية

### 4. Network First لكل شيء
- **المميزات:** بيانات دائمًا محدثة، لا مشاكل cache staleness
- **العيوب:** لا يعمل offline (حتى App Shell)، أداء أبطأ (كل طلب يذهب للشبكة)، استهلاك بيانات غير ضروري

### 5. Stale While Revalidate لكل شيء
- **المميزات:** استجابة فورية + تحديث في الخلفية، توازن جيد
- **العيوب:** قد يعرض بيانات قديمة مؤقتًا، لا يضمن الحداثة، قد يربك المستخدم (بيانات تتغير فجأة)

### 6. لا Service Worker (بدون offline)
- **المميزات:** أبسط حل، لا مشاكل cache
- **العيوب:** لا offline support، أداء أبطأ، لا PWA install capability، تجربة مستخدم أقل

## تفاصيل الاستراتيجيات المختارة

| نوع المحتوى | الاستراتيجية | اسم الـ Cache | السبب |
|---|---|---|---|
| App Shell (HTML/CSS/JS/fonts) | Cache First | `ibn-al-azhar-docs-v1-static` | لا يتغير كثيرًا، ضروري لـ offline |
| API GET (قوائم، إحصائيات) | Network First | `ibn-al-azhar-docs-v1-api` | نحتاج أحدث البيانات، مع fallback لـ cache |
| API POST/PUT/DELETE | Network Only | — | عمليات كتابة لا يمكن تخزينها مؤقتًا |
| بيانات المستخدم الحساسة | Network Only | — | خصوصية وأمان |
| Thumbnails وصور | Stale While Revalidate | `ibn-al-azhar-docs-v1-images` | عرض سريع + تحديث في الخلفية |
| ملفات PDF محولة | لا تخزين مؤقت (أو محدود) | — | حجم كبير يملأ الـ cache |

## العواقب (Consequences)
- **إيجابية:** تجربة offline ممتازة للتطبيق الأساسي (App Shell يعمل دائمًا)، بيانات المستخدم دائمًا محدثة، أداء تحميل سريع للموارد الثابتة، تحكم دقيق فيما يُخزّن وما لا يُخزّن، حجم cache مُدار ومنتظم، @serwist/next يوفر تكاملًا حديثًا مع Next.js 16
- **سلبية:** تعقيد في إدارة Service Worker وعدة استراتيجيات، cache invalidation عند تحديث التطبيق يحتاج versioning واضح، debugging مشاكل الـ cache أصعب من التطبيقات العادية، اختبار سلوك offline يتطلب جهدًا إضافيًا
- **مخاطر:** إذا لم نُدِر cache invalidation بشكل صحيح، قد يرى المستخدم إصدارات قديمة من التطبيق بعد التحديثات. الحل: استخدام content-based hashing (Next.js يفعل هذا تلقائيًا) وversioned cache names (`ibn-al-azhar-docs-v1` → `ibn-al-azhar-docs-v2` ...).

## المتابعة (Follow-up)
- إعداد @serwist/next مع Next.js 16 App Router
- تحديد cache names وversioning strategy (`ibn-al-azhar-docs-v1` كنقطة بداية)
- إعداد قائمة routes لكل استراتيجية
- اختبار سلوك offline لكل نوع محتوى
- تحديد cache size limits (max entries، max age)
- تصميم آلية إخطار المستخدم عند توفر تحديث (update available)
- إعداد Lighthouse CI للتحقق من PWA compliance

## docs/_incoming/docs-v4.1-final/ADR/ADR-010-security-baseline.md

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

## docs/_incoming/docs-v4.1-final/ADR/ADR-011-arabic-rtl-first.md

# ADR-011: Arabic-first / RTL-first Design

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تستهدف بشكل أساسي المستخدمين العرب في المؤسسات التعليمية. اللغة العربية تكتب من اليمين إلى اليسار (RTL)، بينما معظم أدوات وأطر تطوير الويب مصممة بشكل افتراضي لاتجاه اليسار إلى اليمين (LTR). في مشاريع سابقة، كانت دعم RTL يُضاف كـ afterthought (فكرة لاحقة)، مما أدى إلى: نصوص مقلوبة، أيقونات في الجهة الخاطئة، تخطيطات معطوبة، وتجربة مستخدم سيئة. نحتاج إلى قرار واضح: هل نصمم RTL أولًا ثم نضيف LTR، أم العكس، أم نصمم للغتين معًا من البداية؟

## القرار (Decision)
قررنا اعتماد نهج **RTL-first design** (التصميم للعربية أولًا). هذا يعني:
- التصميم والتطوير يبدأان بالاتجاه RTL كالاتجاه الافتراضي
- استخدام CSS Logical Properties بدلاً من physical properties (مثل `margin-inline-start` بدلاً من `margin-left`)
- استخدام next-intl لإدارة الترجمة والتعددية اللغوية (i18n)
- كل مكون UI يُختبر أولًا بـ RTL قبل LTR
- اتجاه الصفحة يُحدد عبر `dir="rtl"` و`lang="ar"` على مستوى الـ HTML root

## البدائل المعتبرة (Options Considered)

### 1. RTL-first Design (المختار)
- **المميزات:** تجربة عربية طبيعية وسلسة، لا حاجة لـ RTL fixes لاحقة، كود أنيق مع logical properties، أولوية للمستخدم الأساسي، تقليل الـ bugs المتعلقة بالاتجاه
- **العيوب:** يتطلب تدريب الفريق على logical properties، بعض مكتبات UI لا تدعم RTL بشكل كامل، اختبار LTR يتطلب جهدًا إضافيًا

### 2. RTL كـ Afterthought (إضافة لاحقة)
- **المميزات:** تطوير أسرع في البداية (باستخدام أدوات LTR المعتادة)، توافق أفضل مع معظم المكتبات
- **العيوب:** تجربة عربية سيئة، إصلاح RTL مكلف جدًا لاحقًا (قد يعيد كتابة نصوص CSS كاملة)، bugs مستمرة، يشعر المستخدم العربي بأن المنصة ليست له

### 3. Bilingual-first (اللغتين متساويتين من البداية)
- **المميزات:** دعم مثالي لكلا الاتجاهين، جاهز للتوسع الدولي
- **العيوب:** جهد تطوير مضاعف، كل مكون يحتاج تصميم واختبار لاتجاهين، بطئ التطوير، over-engineering لمرحلة MVP حيث المستخدم الأساسي عربي

### 4. استخدام RTL CSS Framework (مثل RTL CSS utilities فقط)
- **المميزات:** حل سريع بدون تغيير طريقة الكتابة
- **العيوب:** لا يعالج المشكلة من الجذور، يعتمد على post-processing، قد يفشل مع الحالات المعقدة، لا يضمن تجربة مستخدم جيدة

## المبادئ التقنية للتنفيذ

| المبدأ | التفصيل |
|---|---|
| CSS Logical Properties | استخدام `inline-start`/`inline-end` بدلاً من `left`/`right` |
| `dir="rtl"` على root | تحديد الاتجاه على مستوى التطبيق |
| next-intl | إدارة الرسائل المترجمة وplural rules |
| Tailwind RTL Plugin | استخدام `rtl:` variant في Tailwind CSS |
| مكونات RTL-aware | كل مكون يراعي الاتجاه في البنية |
| اختبار RTL أولًا | RTL هو الافتراضي في القوالب والاختبارات |

## العواقب (Consequences)
- **إيجابية:** تجربة مستخدم عربية طبيعية وسلسة، لا حاجة لـ patches وإصلاحات لاحقة، كود CSS أنيق وقابل للصيانة مع logical properties، المستخدم العربي يشعر أن المنصة صُممت له، إضافة اللغة الإنجليزية لاحقًا أسهل مع البنية الصحيحة
- **سلبية:** منحنى تعلم للفريق على logical properties وRTL patterns، بعض مكتبات React UI (مثل بعض مكونات shadcn/ui) قد تحتاج تعديلات لـ RTL، اختبار كل مكون في كلا الاتجاهين يزيد وقت التطوير، بعض الأدوات والـ dev tools تفترض LTR افتراضيًا
- **مخاطر:** إذا لم يلتزم الفريق بـ logical properties بشكل صارم، سنتوقف عن fixed physical properties مما سيخلق bugs. الحل: ESLint rules تمنع استخدام `left`/`right` في CSS، وcode review checklist.

## المتابعة (Follow-up)
- إعداد next-intl مع ملفات ترجمة عربية وإنجليزية
- إضافة Tailwind RTL plugin وlogical properties utilities
- إنشاء ESLint rules تمنع physical CSS properties
- تصميم مكونات UI أساسية RTL-first (Button، Input، Modal، Navigation)
- إعداد Storybook مع RTL preview
- كتابة دليل أنماط RTL للفريق (RTL Style Guide)
- اختبار المنصة على متصفحات عربية (مثل Samsung Internet)

## docs/_incoming/docs-v4.1-final/ADR/ADR-012-soft-delete-retention.md

# ADR-012: Soft Delete and Retention

## الحالة (Status)
Accepted

## السياق (Context)
في منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس، يقوم المستخدمون بإدارة مستندات تعليمية مهمة (أوراق اختبار، واجبات، ملاحظات). حذف ملف بالخطأ يمكن أن يكون كارثيًا، خاصة إذا كان الملف الوحيد الذي يملكه المستخدم. نحتاج إلى آلية تتيح استعادة الملفات المحذوفة دون الاحتفاظ بها إلى الأبد (مما يستهلك مساحة تخزين). التوازن المطلوب هو بين إمكانية الاستعادة والكفاءة في استخدام التخزين.

## القرار (Decision)
قررنا تطبيق **Soft Delete مع فترة احتفاظ 30 يومًا**:
- عند حذف ملف، لا يُحذف فعليًا، بل يُضاف حقل `deletedAt` بتاريخ الحذف
- الملف المحذوف لا يظهر في القوائم العادية للمستخدم
- المستخدم يمكنه استعادة الملف من "سلة المحذوفات" خلال 30 يومًا
- بعد 30 يومًا، يُحذف الملف نهائيًا عبر cron job (hard delete + حذف من MinIO bucket `ibn-al-azhar-docs-files`)
- الملفات المحذوفة لا تُحتسب في مساحة التخزين للمستخدم

## البدائل المعتبرة (Options Considered)

### 1. Soft Delete مع فترة احتفاظ 30 يومًا (المختار)
- **المميزات:** إمكانية استعادة الملفات المحذوفة بالخطأ، فترة 30 يومًا كافية لمعظم الحالات، تنظيف تلقائي يوفر مساحة التخزين، تجربة مستخدم ممتازة (سلة محذوفات)
- **العيوب:** استهلاك تخزين إضافي خلال فترة الـ 30 يومًا، يحتاج cron job للتنظيف، استعلامات قاعدة البيانات أكثر تعقيدًا (filter out soft-deleted records)

### 2. Hard Delete (حذف نهائي فوري)
- **المميزات:** لا استهلاك إضافي للتخزين، استعلامات بسيطة، لا حاجة لـ cron job
- **العيوب:** لا إمكانية استعادة، تجربة مستخدم سيئة، طلبات دعم فني لاستعادة ملفات لا يمكن تلبيتها، فقدان بيانات قد تكون مهمة

### 3. Soft Delete بدون حد زمني (احتفاظ دائم)
- **المميزات:** استعادة دائمة، لا خطر من فقدان البيانات
- **العيوب:** استهلاك تخزين متزايد باستمرار، تكلفة أعلى مع الوقت، قاعدة بيانات أكبر وأبطأ، لا تنظيف تلقائي

### 4. Soft Delete مع فترات مختلفة حسب نوع الملف
- **المميزات:** مرونة عالية (ملفات مهمة تحتفظ لفترة أطول)، كفاءة في التخزين
- **العيوب:** تعقيد في التنفيذ والإدارة، إرباك للمستخدم (فترات مختلفة)، overhead في الـ cron job

### 5. Soft Delete مع تأكيد متعدد المراحل
- **المميزات:** تقليل الحذف بالخطأ، حماية إضافية
- **العيوب:** تجربة مستخدم مزعجة، لا يمنع الحذف المتعمد الخاطئ، لا يوفر استعادة

## تفاصيل التنفيذ

| العنصر | التفصيل |
|---|---|
| حقل `deletedAt` | `DateTime?` nullable في Prisma schema |
| سلة المحذوفات | صفحة مخصصة تعرض الملفات المحذوفة |
| استعادة | زر "استعادة" يعيد `deletedAt` إلى `null` |
| حذف نهائي | زر "حذف نهائي" يحذف فعليًا (للمستخدمين المتقدمين) |
| Cron Job | يعمل يوميًا، يحذف الملفات التي تجاوزت 30 يومًا |
| Prisma Middleware | filter تلقائي لاستبعاد السجلات المحذوفة |
| مساحة التخزين | الملفات المحذوفة لا تُحتسب في quota المستخدم |
| حذف من MinIO | حذف الملف من bucket `ibn-al-azhar-docs-files` بعد الحذف النهائي من قاعدة البيانات |

## العواقب (Consequences)
- **إيجابية:** المستخدمون يمكنهم استعادة ملفاتهم المحذوفة بالخطأ خلال 30 يومًا، تجربة مستخدم أفضل بكثير (سلة محذوفات مألوفة)، تقليل طلبات الدعم الفني، تنظيف تلقائي يمنع تراكم الملفات المحذوفة، شعور بالأمان عند استخدام المنصة
- **سلبية:** استهلاك تخزين إضافي خلال فترة الاحتفاظ (قد يكون كبيرًا مع ملفات PDF كثيرة)، استعلامات Prisma تحتاج filter إضافي (`where: { deletedAt: null }`)، يحتاج cron job موثوق (BullMQ repeating job)، حذف الملفات من MinIO يجب أن يحدث بعد الحذف النهائي من قاعدة البيانات
- **مخاطر:** إذا تعطل cron job، ستراكم الملفات المحذوفة. الحل: monitoring لـ cron job وalerting عند الفشل. إذا نما حجم البيانات المحذوفة بشكل كبير، قد نحتاج batch deletion.

## المتابعة (Follow-up)
- إضافة حقل `deletedAt` لكل models ذات الصلة في Prisma schema (بما فيها Conversion و Export — انظر ADR-017)
- تنفيذ Prisma middleware أو client extension لـ soft delete filtering
- بناء واجهة "سلة المحذوفات" في الـ frontend
- تنفيذ cron job يومي عبر BullMQ repeating jobs
- اختبار عملية الاستعادة والحذف النهائي (بما فيها الحذف من MinIO)
- إعداد monitoring لـ cron job
- تحديث سياسة الخصوصية بشأن فترة الاحتفاظ

## docs/_incoming/docs-v4.1-final/ADR/ADR-013-self-hosting-free-first.md

# ADR-013: Self-Hosting / Free-First Strategy

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تستهدف مؤسسات تعليمية في العالم العربي، الكثير منها لديه ميزانيات تقنية محدودة. النموذج السائد في السوق هو الاشتراكات الشهرية لخدمات سحابية (SaaS)، لكن هذا لا يناسب المؤسسات الصغيرة والمتوسطة. نحتاج إلى قرار استراتيجي: هل نبني المنصة كخدمة سحابية مدفوعة، أم كمنصة يمكن استضافتها ذاتيًا بتكلفة شبه مجانية، أم مزيجًا من الاثنين؟ القرار يؤثر على البنية التقنية بالكامل: اختيار قواعد البيانات، التخزين، قوائم الانتظار، وتكلفة التشغيل. هدفنا هو تقليل التكلفة الشهرية للحد الأدنى مع الحفاظ على جودة الخدمة.

## القرار (Decision)
قررنا اعتماد استراتيجية **Self-hosting / Free-first**:
- جميع المكونات يمكن تشغيلها على VPS واحد بتكلفة ~$6/شهر (Hetzner أو DigitalOcean)
- لا اعتماد على خدمات سحابية مدفوعة (لا AWS، لا Supabase، لا PlanetScale)
- MinIO بدلاً من S3، PostgreSQL بدلاً من Supabase، Redis بدلاً من ElastiCache
- Caddy كـ reverse proxy مع HTTPS تلقائي (Let's Encrypt)
- Docker Compose لنشر جميع الخدمات معًا
- يمكن لاحقًا تقديم خطة سحابية مدفوعة (managed hosting) كمصدر دخل

## البدائل المعتبرة (Options Considered)

### 1. Self-hosted على VPS واحد — Free-first (المختار)
- **المميزات:** تكلفة منخفضة جدًا (~$6/شهر)، تحكم كامل في البيانات والبنية، لا vendor lock-in، خصوصية البيانات (كل شيء على خادمنا)، يمكن للمؤسسات استضافته على خوادمهم الخاصة، قابل للتوسع التدريجي
- **العيوب:** عبء تشغيلي (operational burden): صيانة، تحديثات، نسخ احتياطي، مراقبة، نقطة فشل واحدة (single VPS = single point of failure)، يحتاج خبرة DevOps، لا scaling تلقائي

### 2. Cloud-managed services (SaaS model)
- **المميزات:** لا إدارة بنية تحتية، scaling تلقائي، موثوقية عالية، تحديثات تلقائية، يمكن التركيز على المنتج
- **العيوب:** تكلفة شهرية عالية (~$50-200/شهر للمبتدئين)، خصوصية البيانات (خوادم خارجية)، vendor lock-in، لا يناسب المؤسسات ذات الميزانيات المحدودة، تعتمد على مزودي الخدمة

### 3. Hybrid (بعض الخدمات self-hosted + بعضها cloud)
- **المميزات:** توازن بين التكلفة والموثوقية، يمكن اختيار أفضل حل لكل مكون
- **العيوب:** تعقيد في إدارة بيئتين، مشاكل latency بين self-hosted و cloud، تكلفة لا يمكن التنبؤ بها، صعوبة في debugging

### 4. Serverless / Function-as-a-Service
- **المميزات:** لا إدارة خوادم، دفع مقابل الاستخدام فقط، scaling تلقائي فوري
- **العيوب:** تكلفة غير متوقعة مع الاستخدام المرتفع، cold starts، حدود وقت التنفيذ، لا يناسب عمليات طويلة مثل OCR، اعتماد على مزود سحابي

## البنية المقترحة على VPS واحد

| المكون | التقنية | الموارد المقدرة |
|---|---|---|
| التطبيق | Next.js (Docker) | ~256MB RAM |
| قاعدة البيانات | PostgreSQL 16 (Docker) — DB name: `ibn_al_azhar_docs` | ~256MB RAM |
| التخزين | MinIO (Docker) — bucket: `ibn-al-azhar-docs-files` | يعتمد على الملفات |
| طوابير المهام | Redis + BullMQ Workers (Docker) | ~128MB RAM |
| Reverse Proxy | Caddy (Docker) — HTTPS تلقائي | ~32MB RAM |
| **المجموع** | | **~700MB RAM** |

**VPS الموصى به:** 2 vCPU + 4GB RAM + 40GB SSD (~$6/شهر على Hetzner)

## العواقب (Consequences)
- **إيجابية:** تكلفة تشغيل منخفضة جدًا تجعل المنصة متاحة للجميع (free-first)، تحكم كامل في البنية والبيانات، لا vendor lock-in، يمكن للمؤسسات تشغيله على خوادمهم (on-premise)، نموذج أعمال مرن (free self-hosted + paid managed)، Caddy يبسّط إدارة HTTPS والـ reverse proxy
- **سلبية:** عبء تشغيلي كبير (backups، updates، monitoring، security patches)، نقطة فشل واحدة (إذا تعطل VPS، تتوقف المنصة بالكامل)، لا scaling أفقي تلقائي، يحتاج فريق DevOps أو مهارات تشغيلية، recovery time أطول عند الأعطال
- **مخاطر:** إذا نما عدد المستخدمين بشكل كبير، VPS واحد لن يكفي. الحل: الانتقال التدريجي إلى بنية موزعة (separate database server، worker servers)، أو تقديم خطة مدفوعة على بنية سحابية.

## المتابعة (Follow-up)
- إنشاء Docker Compose file لجميع الخدمات
- كتابة دليل نشر (Deployment Guide) خطوة بخطوة
- إعداد Caddy كـ reverse proxy مع HTTPS تلقائي (Let's Encrypt)
- تصميم استراتيجية النسخ الاحتياطي (daily PostgreSQL dumps + MinIO sync)
- إعداد monitoring أساسي (Uptime Kuma أو Prometheus + Grafana)
- كتابة scripts للتحديث التلقائي (watchtower أو custom)
- اختبار النشر الكامل على VPS تجريبي
- توثيق متطلبات النظام الأدنى

## docs/_incoming/docs-v4.1-final/ADR/ADR-014-file-size-limits.md

# ADR-014: File Size Limits

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تسمح للمستخدمين برفع وتحويل المستندات. بدون حدود لحجم الملفات ومساحة التخزين، يمكن لمستخدم واحد أن يستهلك جميع موارد الخادم (مساحة القرص، الذاكرة، وقت المعالجة). هذا يؤثر على جميع المستخدمين الآخرين. في المقابل، حدود صارمة جدًا قد تجعل المنصة غير صالحة للاستخدام العملي. نحتاج إلى التوازن بين: استخدام معقول للموارد، تجربة مستخدم مقبولة، وحماية من الاستهلاك المفرط (abuse). المنصة تعمل على VPS واحد بموارد محدودة (4GB RAM، 40GB SSD)، لذا إدارة الموارد حاسمة.

## القرار (Decision)
قررنا تطبيق الحدود التالية:

| الحد | القيمة | الملاحظات |
|---|---|---|
| حجم الملف الأقصى للرفع | 100 MB | يكفي لمعظم المستندات التعليمية |
| مساحة التخزين — طالب (student) | 1 GB | قابلة للزيادة من قبل المشرف |
| مساحة التخزين — معلم (teacher) | 2 GB | قابلة للزيادة من قبل المشرف |
| مساحة التخزين — مشرف (admin) | 10 GB | الحد الأقصى الافتراضي |
| عدد التحويلات اليومية | 20 تحويل/يوم | حماية من الاستهلاك المفرط |
| عدد الملفات لكل عملية تحويل | 10 ملفات | تحويل دفعي محدود |
| مدة الاحتفاظ بالملفات المحولة | 30 يومًا | بعد ذلك حذف تلقائي |
| حجم الطلب الأقصى (HTTP) | 100 MB | Next.js API Route limit |

## البدائل المعتبرة (Options Considered)

### 1. حدود معتدلة مع حصص حسب الدور (المختار: 100MB / role-based quota / 20 يوميًا)
- **المميزات:** كافية لمعظم الاستخدامات التعليمية (مستندات PDF، صور، واجبات)، تحمي الموارد بشكل معقول، واضحة وسهلة الفهم للمستخدم، يمكن تعديلها لاحقًا، حصص مختلفة تناسب أدوار المستخدمين المختلفة
- **العيوب:** قد لا تكفي لبعض الحالات الخاصة (كتب رقمية كبيرة، أرشيفات ضخمة)، تحتاج آلية لطلب رفع الحدود

### 2. حدود سخية (500MB / 5GB لجميع الأدوار / بدون حد يومي)
- **المميزات:** تجربة مستخدم ممتازة، تناسب جميع الحالات تقريبًا
- **العيوب:** استهلاك موارد عالي، خطر استنفاد مساحة القرص، تكلفة تشغيل أعلى، خطر abuse أعلى

### 3. حدود صارمة (25MB / 500MB / 10 يوميًا)
- **المميزات:** حماية قصوى للموارد، تكلفة تشغيل منخفضة
- **العيوب:** غير عملية للعديد من المستندات التعليمية، تجربة مستخدم سيئة، PDFs الكبيرة لا يمكن رفعها

### 4. حدود ديناميكية (تعتمد على حمل الخادم)
- **المميزات:** استغلال أمثل للموارد، مرونة عالية
- **العيوب:** تجربة مستخدم غير متسقة (أحيانًا يُرفض الملف وأحيانًا لا)، صعوبة التوثيق، تعقيد في التنفيذ، إرباك للمستخدمين

### 5. بدون حدود (ثقة بالمستخدمين)
- **المميزات:** أبسط تنفيذ، تجربة مستخدم بلا قيود
- **العيوب:** خطر استهلاك موارد من مستخدم واحد، لا حماية من abuse، تكلفة غير متوقعة، لا يناسب VPS محدود الموارد

## تبرير الحدود المختارة

- **100 MB لكل ملف:** المستندات التعليمية النموذجية (PDF مع صور، أوراق اختبار ممسوحة ضوئيًا) نادرًا ما تتجاوز 50MB. ملفات 100MB تغطي 99% من الحالات. ملفات أكبر عادة تكون كتب رقمية أو أرشيفات يمكن معالجتها بشكل خاص.
- **حصص حسب الدور:**
  - **طالب (student) — 1 GB:** يكفي لتخزين واجبات وملاحظات فصل دراسي واحد (~10 ملفات كبيرة أو عشرات الملفات الصغيرة)
  - **معلم (teacher) — 2 GB:** يحتاج مساحة أكبر لأوراق الاختبار والمواد التعليمية لعدة فصول
  - **مشرف (admin) — 10 GB:** يدير المحتوى على مستوى المؤسسة ويحتاج مساحة أكبر بكثير
- **20 تحويل يوميًا:** عمليات OCR والتحويل ثقيلة على الموارد. 20 تحويلًا يوميًا تكفي للاستخدام الفردي وتحمي الخادم من الاستهلاك المفرط.

## العواقب (Consequences)
- **إيجابية:** حماية واضحة للموارد المحدودة، توقعات واضحة للمستخدمين، حصص حسب الدور تناسب الاحتياجات الفعلية لكل فئة، يمكن تعديل الحدود بسهولة عبر configuration، يمنع مستخدمًا واحدًا من التأثير على الآخرين، تكلفة تشغيل متوقعة ومحدودة
- **سلبية:** بعض المستخدمين قد يحتاجون حدودًا أعلى (معلمون بأرشيفات كبيرة)، حدود التحويل اليومية قد تزعج المستخدمين النشطين، احتمال رفض ملفات مشروعة أكبر من 100MB، يجب بناء UI واضح لإبلاغ المستخدم بالحدود المتبقية
- **مخاطر:** إذا كانت الحدود منخفضة جدًا عن احتياجات المستخدمين الفعلية، قد يتركون المنصة. الحل: مراقبة معدلات رفض الملفات وزيادة الحدود إذا لزم الأمر. إضافة آلية طلب رفع الحدود للمشرفين.

## المتابعة (Follow-up)
- تنفيذ validation لحجم الملف في الـ frontend (قبل الرفع) والـ backend (بعد الرفع) — حد أقصى 100MB
- إضافة عداد مساحة التخزين في لوحة المستخدم مع عرض الحصة حسب الدور
- إضافة عداد التحويلات اليومية المتبقية
- تصميم UI واضح عند تجاوز الحدود (رسائل خطأ مفيدة)
- إضافة إمكانية رفع الحدود للمشرفين (admin panel)
- مراقبة معدلات رفض الملفات وتعديل الحدود بناءً على البيانات
- توثيق الحدود في صفحة المساعدة

## docs/_incoming/docs-v4.1-final/ADR/ADR-015-public-share-links.md

# ADR-015: Public Share Links

## الحالة (Status)
Accepted

## السياق (Context)
في البيئة التعليمية، يحتاج المستخدمون (معلمون وطلاب) لمشاركة المستندات مع الآخرين بشكل متكرر: معلم يشارك ورقة اختبار مع الطلاب، طالب يرسل واجبًا للمعلم، أو قسم أكاديمي يوزع مادة تعليمية. نحتاج إلى آلية مشاركة بسيطة وسهلة لا تتطلب إنشاء حساب لكل شخص يريد الاطلاع على الملف. في الوقت نفسه، نحتاج لحماية الملفات من الوصول غير المصرح به. السؤال: هل نقدم روابط عامة (public links) يمكن لأي شخص يملك الرابط الوصول للملف، أم نطلب تسجيل دخول من كل مستلم، أم مزيجًا من الاثنين؟

## القرار (Decision)
قررنا تنفيذ **روابط مشاركة عامة (Public Share Links)** مع الضوابط التالية:
- كل ملف يمكن إنشاء رابط مشاركة فريد له (unique token في الرابط)
- الـ token يُولَّد باستخدام `crypto.randomBytes(32).toString('hex')` وينتج سلسلة hex بطول 64 حرفًا — بدون UUID، بدون بادئة "sh_"
- الرابط يمنح صلاحية محددة: عرض (view) أو تنزيل (download)
- يمكن تعيين تاريخ انتهاء (optional expiry date) للرابط
- يمكن تعيين كلمة مرور اختيارية (optional password) للرابط
- صاحب الملف يمكنه إبطال الرابط في أي وقت
- كل رابط له إحصائيات وصول أساسية (عدد المشاهدات والتنزيلات)

## البدائل المعتبرة (Options Considered)

### 1. روابط عامة مع صلاحيات وتحكم (المختار)
- **المميزات:** مشاركة سهلة وسريعة (إرسال رابط)، لا يحتاج المستلم لحساب، صلاحيات محددة (view vs download)، انتهاء صلاحية اختياري، إمكانية الإلغاء، إحصائيات وصول
- **العيوب:** إذا تسرب الرابط يمكن لأي شخص الوصول للملف، لا هوية للمستلم (لا نعرف من شاهد الملف)، كلمة المرور الاختيارية تضيف تعقيدًا

### 2. بدون مشاركة (كل مستخدم يرى ملفاته فقط)
- **المميزات:** أقصى درجات الخصوصية، لا مخاطر تسريب، أبسط تنفيذ
- **العيوب:** لا يلبي احتياج المستخدمين الأساسية، لا فائدة تعاونية، المستخدمون سيستخدمون أدوات خارجية (WhatsApp، Email) للمشاركة

### 3. مشاركة بين المستخدمين فقط (user-to-user sharing)
- **المميزات:** نعرف هوية كل من يصل للملف، تحكم أفضل بالصلاحيات، إمكانية سحب الوصول
- **العيوب:** يتطلب تسجيل حساب من كل مستلم، حاجز دخول عالي، لا يناسب المشاركة السريعة مع طلاب جدد، تعقيد في إدارة الصلاحيات

### 4. مزيج: روابط عامة + مشاركة بين المستخدمين
- **المميزات:** مرونة عالية، يناسب جميع السيناريوهات، أفضل تجربة مستخدم
- **العيوب:** تعقيد في التنفيذ والـ UI، حالات حافة كثيرة (كيف تتفاعل الصلاحيات؟)، جهد تطوير مضاعف في MVP

## تفاصيل التصميم التقني

| العنصر | التفصيل |
|---|---|
| هيكل الرابط | `/share/{token}` حيث token = `crypto.randomBytes(32).toString('hex')` (64 hex chars) |
| توليد الـ token | `crypto.randomBytes(32).toString('hex')` — 64 حرف hex عشوائي، بدون UUID، بدون بادئة "sh_" |
| قاعدة البيانات | جدول `ShareLink` مع: fileId، token، permission، expiresAt، passwordHash، createdBy |
| الصلاحيات | `view` (عرض في المتصفح فقط) أو `download` (عرض + تنزيل) |
| الانتهاء | `expiresAt` اختياري، إذا لم يُحدد فالرابط دائم |
| كلمة المرور | bcrypt hash اختياري، يُطلب قبل عرض الملف |
| الإحصائيات | جدول `ShareAccess` يسجّل: timestamp، IP (hashed)، action (view/download) |
| الإلغاء | حذف السجل من جدول `ShareLink` يبطل الرابط فورًا |

## أمان الـ Token

| الخاصية | القيمة |
|---|---|
| طريقة التوليد | `crypto.randomBytes(32).toString('hex')` |
| طول الـ token | 64 حرف hex (256 bits من الإنتروبيا) |
| تنسيق الـ token | hex string خالص — بدون UUID، بدون بادئة "sh_" |
| مساحة البحث | 2^256 ≈ 1.16 × 10^77 احتمال — غير قابل للتخمين |
| سبب الاختيار | أعلى إنتروبيا من UUID v4 (122 bits)، بدون أنماط يمكن تخمينها |

## العواقب (Consequences)
- **إيجابية:** مشاركة سهلة وسريعة تناسب البيئة التعليمية، لا حاجة لحساب للمستلم (مناسب للطلاب)، صلاحيات محددة تحمي المحتوى (view-only يمنع التنزيل)، انتهاء الصلاحية يضمن عدم بقاء الوصول للأبد، إمكانية الإلغاء تعطي تحكمًا لصاحب الملف، إحصائيات الوصول تساعد المعلمين على المتابعة، token بطول 64 hex chars يوفر أمانًا عاليًا ضد التخمين
- **سلبية:** إذا تسرب رابط بدون كلمة مرور يمكن لأي شخص الوصول للملف (security by obscurity)، لا نعرف هوية من يصل عبر الرابط (فقط IP مجهولة)، الروابط قد تُشارك بشكل أوسع من المقصود (forwarding)، إدارة الروابط تضيف تعقيدًا للواجهة
- **مخاطر:** الروابط العامة قد تُستخدم لتوزيع محتوى غير مصرح به (مثل أوراق اختبار مسربة). الحل: إمكانية تعيين كلمة مرور، وتسجيل IP addresses (hashed) لتتبع الاستخدام المشبوه. يجب أيضًا توثيق أن الروابط كروابط Google Drive — لا يُضمن سرية تامة بدون كلمة مرور.

## المتابعة (Follow-up)
- تصميم Prisma schema لجدول `ShareLink` و `ShareAccess` مع token كـ 64 hex chars
- تنفيذ API endpoints: create share، revoke share، access shared file
- بناء واجهة إنشاء رابط مشاركة (modal مع خيارات الصلاحيات والانتهاء وكلمة المرور)
- بناء صفحة `/share/[token]` للوصول للملف المشترك
- إضافة قائمة "الروابط المشتركة" في صفحة إدارة الملفات
- تنفيذ إحصائيات الوصول الأساسية
- اختبار أمان الروابط (لا يمكن تخمين token بطول 64 hex chars، لا bypass للصلاحيات)
- توثيق سياسة المشاركة للمستخدمين

## docs/_incoming/docs-v4.1-final/ADR/ADR-016-auth-model.md

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

## docs/_incoming/docs-v4.1-final/ADR/ADR-017-export-model.md

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

| المرحلة | الوصف |
|---|---|
| preparing | التحقق من الملف وإعداد البيئة |
| splitting | تقسيم PDF إلى صفحات (إذا لزم) |
| ocr | تنفيذ OCR عبر Google Drive API (MVP) أو Tesseract.js (V2) |
| writing | حفظ النص المستخرج في قاعدة البيانات |
| done | العملية اكتملت بنجاح |

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

| الصيغة | الوصف |
|---|---|
| TXT | نص عادي بدون تنسيق |
| DOCX | مستند Word مع تنسيق أساسي (فقرات، اتجاه RTL) |
| JSON | بيانات منظمة (صفحات، فقرات، نصوص) |

### Prisma Schema (مبسط)

## docs/_incoming/docs-v4.1-final/ADR/ADR-018-hosting-strategy.md

# ADR-018: Hosting Strategy — Multi-Stage Deployment Approach

## الحالة (Status)
Proposed / Needs Verification

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس هي تطبيق full-stack يتكون من تطبيق Next.js، قاعدة بيانات PostgreSQL، خادم Redis لإدارة الطوابير، MinIO للتخزين، وBullMQ workers لمعالجة المهام في الخلفية. التطبيق containerized بالكامل باستخدام Docker. نحتاج إلى استراتيجية استضافة متدرجة تبدأ من مرحلة التطوير المحلي وصولًا إلى الإنتاج، مع أولوية واضحة للحلول المجانية أو منخفضة التكلفة. التحدي الرئيسي هو أن معظم منصات الاستضافة المجانية مصممة للتطبيقات الثابتة (static) أو serverless functions، بينما تطبيقنا يحتاج إلى خدمات متعددة تعمل معًا (قاعدة بيانات، تخزين كائنات، طوابير مهام، وعامل خلفي). هذا يحد كثيرًا من خيارات الاستضافة المجانية المتاحة. نحتاج أيضًا إلى نطاق فرعي مجاني (free subdomain) لمرحلة النموذج الأولي، مع إمكانية استخدام نطاق مخصص لاحقًا في الإنتاج.

## القرار (Decision)
قررنا اعتماد استراتيجية استضافة **متدرجة متعددة المراحل**، حيث تختلف حلول الاستضافة حسب مرحلة المشروع:

### المرحلة 1: التطوير المحلي — Docker Compose (مؤكد)
- **البيئة:** جهاز المطور المحلي
- **الأدوات:** Docker Compose يشغّل جميع الخدمات (Next.js, PostgreSQL, Redis, MinIO, BullMQ workers)
- **الأمر الواحد:** `docker compose up` يرفع البيئة الكاملة
- **السبب:** بيئة تطوير متسقة، لا اعتماد على خدمات خارجية، سرعة في التطوير والاختبار

### المرحلة 2: النموذج الأولي / العرض التجريبي — Hugging Face Spaces (للنموذج الأولي فقط)
- **البيئة:** Hugging Face Spaces (Docker SDK)
- **المميزات:** مجاني، نطاق فرعي تلقائي (`username-space.hf.space`)، يدعم Docker containers، مجتمع كبير
- **القيود:** موارد محدودة (CPU فقط في المجاني، ذاكرة محدودة)، لا يدعم persistent storage بشكل موثوق، لا يناسب الإنتاج
- **الاستخدام:** عرض الوظائف الأساسية للمستثمرين والمختبرين فقط

### المرحلة 3: معاينة الواجهة الأمامية — Cloudflare Pages / Vercel (يحتاج تحقق)
- **البيئة:** Cloudflare Pages أو Vercel
- **الغرض:** معاينة الواجهة الأمامية فقط (frontend preview) لكل pull request
- **القيود:** لا يدعم الخدمات الخلفية (PostgreSQL, Redis, MinIO) — يحتاج إلى backend مستضاف في مكان آخر
- **يحتاج تحقق:** هل يمكن تشغيل Next.js SSR مع API routes على Cloudflare Pages؟ ما هي حدود Vercel المجانية لـ serverless functions؟ هل يمكن ربطه بـ backend خارجي؟

### المرحلة 4: مرشح MVP الكامل — يُختار بعد التحقق
- **الخيارات المرشحة:** Render, Fly.io, Railway, Koyeb, Oracle Cloud Free Tier
- **المعايير:** يدعم Docker containers متعددة، قاعدة بيانات PostgreSQL مُدارة أو ذاتية، تخزين كائنات أو MinIO، Redis مُدار أو ذاتي، نطاق فرعي مجاني أو نطاق مخصص، تكلفة مجانية أو شبه مجانية للمبتدئين
- **يحتاج تحقق:** مقارنة تفصيلية بين الخيارات من حيث الموارد المجانية، حدود الذاكرة والمعالج، دعم Docker Compose، استمرارية التخزين، وحدود النطاق الترددي

### المرحلة 5: الإنتاج الموصى به — VPS مُعرب بـ Docker + Caddy (موصى به للإنتاج)
- **البيئة:** VPS واحد (Hetzner أو DigitalOcean ~$6/شهر)
- **الأدوات:** Docker Compose + Caddy كـ reverse proxy
- **السبب:** تكلفة منخفضة، تحكم كامل، HTTPS تلقائي عبر Caddy، لا vendor lock-in
- **تفاصيل أكثر:** راجع ADR-013 و ADR-019

## البدائل المعتبرة (Options Considered)

### 1. Hugging Face Spaces (للنموذج الأولي)
- **المميزات:** مجاني تمامًا، نطاق فرعي تلقائي، يدعم Docker SDK، واجهة ويب سهلة، مجتمع نشط، إمكانية إضافة hardware مدفوع لاحقًا
- **العيوب:** موارد محدودة جدًا (CPU-only, ~16GB RAM maximum في الخطة المجانية)، لا persistent storage موثوق (البيانات تُفقد عند إعادة التشغيل)، لا يناسب تشغيل قاعدة بيانات، designed for ML models وليس web apps، أداء متذبذب

### 2. Vercel
- **المميزات:** تكامل ممتاز مع Next.js، نشر تلقائي من Git، preview deployments لكل PR، HTTPS تلقائي، CDN عالمي، Serverless Functions
- **العيوب:** لا يدعم تشغيل PostgreSQL/Redis/MinIO، Serverless Functions لها حدود (10 ثواني في الخطة المجانية، 60 ثانية في Pro)، لا يشغّل Docker containers، لا يعمل كـ full-stack hosting لتطبيقنا، الاعتماد على external database يزيد التعقيد والتكلفة

### 3. Netlify
- **المميزات:** مشابه لـ Vercel، نشر سهل، CDN عالمي، serverless functions
- **العيوب:** نفس قيود Vercel تقريبًا، لا يدعم Docker، لا خدمات خلفية، designed for static/serverless فقط

### 4. Cloudflare Pages
- **المميزات:** CDN عالمي قوي، مجاني بسخاء، Workers للـ serverless functions، Pages Functions تدعم Next.js جزئيًا
- **العيوب:** دعم Next.js محدود (ليست كل الميزات مدعومة)، لا Docker، لا خدمات خلفية، Workers لها حدود وقت تنفيذ صارمة، storage محدود (KV/D1 لا يُعادل PostgreSQL)

### 5. Render
- **المميزات:** يدعم Docker containers، PostgreSQL مُدار مجاني (محدود)، Redis مُدار، نشر تلقائي من Git، HTTPS مجاني
- **العيوب:** الخطة المجانية محدودة جدًا (750 ساعة/شهر، الخدمات تنام بعد 15 دقيقة من عدم النشاط)، PostgreSQL المجاني ينتهي بعد 90 يومًا، لا MinIO مُدار، أداء متذبذب على الخطة المجانية

### 6. Fly.io
- **المميزات:** يدعم Docker containers، شبكة عالمية، أجهزة افتراضية كاملة (not just serverless)، volumes مستمرة، CLI ممتاز
- **العيوب:** يحتاج بطاقة ائتمان حتى للخطة المجانية، الخطة المجانية محدودة (3 أجهزة مشتركة)، billing معقد وصعب التنبؤ به، دعم محدود في الخطة المجانية

### 7. Railway
- **المميزات:** تجربة مطور ممتازة، يدعم Docker، PostgreSQL وRedis مُداران، نشر تلقائي من Git، dashboard جميل
- **العيوب:** لا خطة مجانية دائمة (تجربة فقط)، pricing يعتمد على الاستخدام (صعب التنبؤ به)، لا يناسب free-first strategy

### 8. Koyeb
- **المميزات:** يدعم Docker، نشر عالمي، واجهة بسيطة، خطة مجانية محدودة
- **العيوب:** خطة مجانية محدودة جدًا (service واحدة فقط)، لا MinIO، مجتمع صغير، لا نضج كافٍ

### 9. Oracle Cloud Free Tier
- **المميزات:** مجاني للأبد (Always Free)، VMs حقيقية بموارد جيدة (4 ARM cores, 24GB RAM)، 200GB block storage، قاعدة بيانات Autonomous Database مجانية
- **العيوب:** تسجيل معقد وبطيء (قد يستغرق أيام)، واجهة إدارة معقدة، دعم فني محدود في الخطة المجانية، مشاكل في تفعيل الحسابات العربية، performance متذبذب أحيانًا

### 10. VPS Self-hosting
- **المميزات:** تحكم كامل، تكلفة منخفضة ومتوقعة، لا قيود على البرمجيات، خصوصية البيانات، قابل للتوسع

## docs/_incoming/docs-v4.1-final/ADR/ADR-019-docker-container-first.md

# ADR-019: Docker Container-First Approach

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تتكون من عدة خدمات مترابطة: تطبيق Next.js كواجهة ويب وخادم API، قاعدة بيانات PostgreSQL لتخزين البيانات العلائقية، خادم Redis لإدارة طوابير المهام والتخزين المؤقت، خادم MinIO للتخزين الكائني (object storage) المتوافق مع S3، وBullMQ workers لمعالجة المهام في الخلفية (OCR، تصدير، تنظيف). هذه الخدمات المتعددة تخلق تحديات كبيرة في بيئة التطوير: كل مطور يحتاج إلى تثبيت وإعداد كل خدمة محليًا، إصدارات مختلفة من PostgreSQL و Redis بين المطورين تسبب مشاكل توافق، بيئة التطوير المحلية قد تختلف عن بيئة الإنتاج مما يسبب أخطاء لا يمكن إعادة إنتاجها، وإعداد مطور جديد يستغرق وقتًا طويلًا. نحتاج إلى نهج يضمن اتساق البيئة عبر جميع مراحل المشروع ويبسّط عملية الإعداد والنشر.

## القرار (Decision)
قررنا اعتماد نهج **Docker-first** مع Docker Compose كأداة أساسية للتطوير المحلي، مع فصل حاويات الويب والعمال، واستخدام MinIO محليًا، وCaddy كمرشح reverse proxy للإنتاج.

### 1. لماذا Docker-first (بيئة متسقة أولاً)
- **اتساق البيئة (Environment Consistency):** نفس الصورة (image) تعمل على جهاز أي مطور بنفس الطريقة. لا فرق بين "يعمل عندي" و"لا يعمل عندك". قاعدة بيانات PostgreSQL، Redis، MinIO — كلها تعمل بنفس الإصدار والتهيئة في كل مكان.
- **بساطة الانضمام (Onboarding Simplicity):** مطور جديد يحتاج فقط إلى تثبيت Docker وتشغيل `docker compose up`. لا حاجة لتثبيت PostgreSQL محليًا، أو إعداد Redis، أو تهيئة MinIO. هذا يقلل وقت الإعداد من ساعات إلى دقائق.
- **تماثل الإنتاج (Production Parity):** الحاويات المستخدمة في التطوير هي نفسها (أو قريبة جدًا) من تلك المستخدمة في الإنتاج. هذا يقلل من أخطاء "يعمل في التطوير لكن لا يعمل في الإنتاج" بشكل كبير.

### 2. لماذا Docker Compose للتطوير المحلي (تنسيق متعدد الخدمات)
- **تنسيق متعدد الخدمات (Multi-service Orchestration):** تطبيقنا يحتاج إلى 5 خدمات تعمل معًا (Next.js, PostgreSQL, Redis, MinIO, Workers). Docker Compose يُعرّف كل هذه الخدمات في ملف واحد (`compose.yaml`) ويشغلها بأمر واحد.
- **تشغيل بأمر واحد (One-command Startup):** `docker compose up` يرفع كل الخدمات بالترتيب الصحيح مع الاعتماديات (depends_on) والتهيئة المناسبة.
- **شبكة مشتركة (Shared Network):** جميع الخدمات تتواصل عبر شبكة Docker داخلية، لا حاجة لإعداد اتصالات يدوية.
- **متغيرات بيئة مركزية (Centralized Environment):** ملف `.env` واحد يتحكم في تهيئة جميع الخدمات.

### 3. لماذا حاوية عامل منفصلة (فصل الويب والعمال)
- **عزل الموارد (Resource Isolation):** عمليات OCR والتصدير تستهلك موارد كثيرة (CPU، ذاكرة). فصل العمال في حاوية خاصة يمنعهم من التأثير على أداء خادم الويب.
- **تحجيم مستقل (Independent Scaling):** في الإنتاج، يمكن تشغيل عدة نسخ من حاوية العمال (worker replicas) دون زيادة نسخ خادم الويب، أو العكس. هذا يوفر الموارد ويحسن الأداء.
- **عزل الأعطال (Failure Isolation):** إذا تعطل عامل OCR بسبب ملف تالف أو خطأ في المعالجة، لا يتأثر خادم الويب. العامل يُعاد تشغيله تلقائيًا (restart policy) بينما يستمر التطبيق في خدمة المستخدمين.

### 4. لماذا MinIO محليًا (تخزين كائني متوافق مع S3)
- **متوافق مع S3 (S3-compatible):** MinIO يوفر واجهة برمجة تطبيقات متوافقة تمامًا مع Amazon S3. الكود الذي يعمل مع MinIO في التطوير يعمل مع S3 في الإنتاج بدون تغيير (أو تغيير بسيط في متغيرات البيئة).
- **لا اعتماد على السحابة (No Cloud Dependency):** لا نحتاج إلى حساب AWS أو اتصال إنترنت لاختبار رفع الملفات وتنزيلها. كل شيء يعمل محليًا.
- **تماثل الإنتاج (Production Parity):** سلوك MinIO محليًا قريب جدًا من S3 في الإنتاج، مما يقلل المفاجآت عند النشر.
- **تحكم كامل في البيانات (Full Data Control):** الملفات مخزنة محليًا في Docker volume، يمكن فحصها وحذفها وإعادة إنشائها بسهولة.

### 5. لماذا Caddy كمرشح reverse proxy للإنتاج
- **HTTPS تلقائي (Automatic HTTPS):** Caddy يحصل على شهادات Let's Encrypt تلقائيًا ويجددها بدون أي إعداد يدوي. هذا يزيل عبء إدارة الشهادات بالكامل.
- **تهيئة بسيطة (Simple Configuration):** ملف Caddyfile بسيط وواضح مقارنة بـ nginx. لا حاجة لقوالب معقدة أو أوامر كثيرة.
- **Reverse Proxy مدمج:** يوجه الطلبات إلى حاويات Docker الداخلية بسهولة.
- **ضغط تلقائي (Compression):** يدعم ضغط HTTP تلقائيًا (gzip, zstd) لتحسين أداء الموقع.
- **خفيف الوزن:** ذاكرة أقل من nginx، وبداية تشغيل أسرع.

## البدائل المعتبرة (Options Considered)

### 1. Docker-first مع Docker Compose (المختار)
- **المميزات:** اتساق البيئة، بساطة الانضمام، تماثل الإنتاج، تنسيق متعدد الخدمات، أوامر بسيطة، مجتمع كبير
- **العيوب:** Docker Desktop يستهلك موارد (ذاكرة ومعالج)، منحنى تعلم Docker للمطورين الجدد، overhead في بناء الصور، إدارة volumes قد تكون معقدة

### 2. تثبيت محلي لكل خدمة (Bare Metal)
- **المميزات:** لا overhead حاويات، أداء أسرع قليلاً، وصول مباشر للخدمات
- **العيوب:** إعداد مختلف لكل نظام تشغيل، مشاكل توافق الإصدارات، وقت إعداد طويل للمطورين الجدد، بيئة مختلفة عن الإنتاج، صعوبة التنظيف والإعادة

### 3. Kubernetes محلي (Minikube / Kind)
- **المميزات:** أقرب لبيئة الإنتاج المتقدمة، يدعم أوامر Kubernetes الأصلية
- **العيوب:** معقد جدًا لمشروع في مرحلة MVP، overhead ضخم على الموارد، منحنى تعلم حاد، لا مبرر لتعقيد K8s مع 5 خدمات فقط

### 4. Nix Flakes
- **المميزات:** بيئات متكاملة قابلة للتكرار، لا حاويات
- **العيوب:** منحنى تعلم حاد جدًا، مجتمع أصغر، لا يدعم خدمات Docker (PostgreSQL، Redis) بنفس السهولة، لا تماثل مع الإنتاج

## تفاصيل البنية المقترحة

### ملفات Docker المقترحة

| الملف | الغرض |
|---|---|
| `compose.yaml` | تعريف الخدمات الأساسية (production-like) |
| `compose.dev.yaml` | تجاوزات التطوير (hot reload، debug ports، seed data) |
| `compose.prod.example.yaml` | مثال تهيئة الإنتاج (Caddy، resource limits) |
| `Dockerfile` | صورة تطبيق Next.js (multi-stage build) |
| `Dockerfile.worker` | صورة عامل BullMQ (مبنية على نفس الصورة الأساسية) |
| `.dockerignore` | استبعاد الملفات غير الضرورية من الصورة |

### هيكل الحاويات

```
┌─────────────────────────────────────────┐
│           Docker Network                │
│                                         │
│  ┌──────────┐    ┌──────────────┐       │
│  │  Next.js  │───▶│ PostgreSQL   │       │
│  │  (web)    │    │  (db)        │       │

## docs/_incoming/docs-v4.1-final/ADR/ADR-020-spec-kit-workflow.md

# ADR-020: Spec-Driven Development Workflow (Spec Kit)

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس مشروع تعليمي تقني معقد يتضمن واجهة أمامية (frontend)، خادم خلفي (backend)، قاعدة بيانات، تخزين كائني، طوابير مهام، وعامل خلفي. الفريق صغير ويعتمد بشكل كبير على المساعدة الذكية (AI-assisted development). بدون منهجية واضحة، هناك مخاطر حقيقية: العمل على ميزات غير محددة بدقة يؤدي إلى إعادة العمل (rework)، عدم وجود ربط واضح بين المتطلبات والتنفيذ يسبب فجوات وثائقية، الوثائق تخرج عن التزامن مع الكود بمرور الوقت، والقرارات التقنية تُتخذ بدون سياق موثق. نحتاج إلى منهجية تطوير مبنية على المواصفات (specs) تضمن تتبعًا كاملًا من المتطلبات إلى التنفيذ، وتبقي الوثائق متزامنة مع الكود.

## القرار (Decision)
قررنا اعتماد منهجية **التطوير المبني على المواصفات (Spec-Driven Development)** مستوحاة من أسلوب GitHub Spec Kit، مع استخدام مصطلح "المراحل" (Phases) بدلاً من "السباقات" (Sprints)، وجعل المواصفات هي المصدر الأساسي للحقيقة (source of truth).

### 1. لماذا التطوير المبني على المواصفات (Spec-Driven Development)
- **منع إعادة العمل (Prevents Rework):** عندما تكون المواصفات واضحة ومفصلة قبل البدء في التنفيذ، يقل احتمال الحاجة إلى إعادة كتابة الكود بسبب متطلبات غير مفهومة أو ميزات غير محددة بدقة. المواصفة تجبرنا على التفكير في الحالات الحدية والتفاصيل قبل كتابة سطر واحد.
- **ضمان التتبع (Ensures Traceability):** كل ميزة في الكود يمكن تتبعها إلى مواصفة، وكل مواصفة يمكن تتبعها إلى متطلب. هذا يسمح لنا بمعرفة لماذا تم تنفيذ شيء ما، وما هو السلوك المتوقع، وما هي الحالات الحدية التي تم اعتبارها. بدون تتبع، يصبح الكود صعب الفهم والتعديل مع نمو المشروع.
- **مواءمة الفريق (Aligns Team):** المواصفات توفر لغة مشتركة بين أعضاء الفريق (مطورين، مصممين، مختبرين). الجميع يشير إلى نفس المستند عند مناقشة ميزة أو حل مشكلة. هذا يقلل سوء الفهم ويزيد الإنتاجية.

### 2. لماذا مصطلح "المراحل" بدلاً من "السباقات" (Phases not Sprints)
- **أوضح للمجهودات متعددة الأسابيع (Clearer for Multi-week Efforts):** السباق (Sprint) عادة أسبوعان إلى 4 أسابيع وينتهي بتسليم. لكن بعض المجهودات تحتاج 6-8 أسابيع وتتضمن عدة سباقات. مصطلح "المرحلة" (Phase) يعكس هذا الواقع بشكل أدق: المرحلة 1 قد تشمل عدة سباقات فرعية.
- **تجنب إرهاق السباقات (Avoids Phase Fatigue):** مفهوم السباق يخلق ضغطًا لتسليم شيء كل أسبوعين، حتى لو لم يكن جاهزًا. المراحل تسمح بتسليم أكثر مرونة: ما يهم هو إنجاز أهداف المرحلة، وليس تسليم شيء كل أسبوعين بشكل مصطنع.
- **أكثر مرونة في التخطيط (More Flexible Planning):** يمكن إعادة ترتيب الأولويات داخل المرحلة دون الشعور بفشل السباق. المراحل تتكيف مع الواقع بدلًا من إجبار الواقع على قالب السباق.

### 3. كيف تصبح المواصفات المصدر الأساسي للحقيقة (Specs as Source of Truth)
المواصفات تتشكل في هرمية واضحة حيث كل مستوى يبني على المستوى الذي قبله:

```
Brand Guidelines (دليل العلامة التجارية)
    ↓
MVP Scope Lock (تحديد نطاق MVP)
    ↓
PRD — Product Requirements Document (وثيقة متطلبات المنتج)
    ↓
Tech Stack ADRs (قرارات البنية التقنية — ADR-001 إلى ADR-017)
    ↓
Specs (مواصفات الميزات — مفصلة لكل ميزة)
    ↓
Implementation Tasks (مهام التنفيذ — مشتقة من المواصفات)
    ↓
Code + Tests (الكود والاختبارات)
```

- **Brand Guidelines:** تحدد الهوية البصرية واللغوية (ألوان، خطوط، نبرة، اتجاه RTL). كل قرار تصميمي يجب أن يعود إليها.
- **MVP Scope Lock:** تحدد ما يدخل في MVP وما لا يدخل. هذا يمنع توسع النطاق (scope creep).
- **PRD:** يحدد المتطلبات الوظيفية وغير الوظيفية بالتفصيل.
- **Tech Stack ADRs:** توثق القرارات التقنية (لماذا Next.js، لماذا PostgreSQL، لماذا BullMQ، إلخ).
- **Specs:** تفصل كل ميزة (feature) بدقة: السلوك المتوقع، واجهة API، مخطط قاعدة البيانات، حالات الحد، معايير القبول.
- **Implementation Tasks:** مهام تنفيذية مشتقة مباشرة من المواصفات. كل مهمة تشير إلى المواصفة التي تنفذها.
- **Code + Tests:** الكود النهائي والاختبارات. يجب أن يعكس المواصفات بدقة.

### 4. كيف تُولّد مهام التنفيذ من المواصفات (Spec → Tasks Workflow)
السير من المواصفة إلى الكود يتبع خطوات واضحة:

1. **Spec (مواصفة):** تُكتب مواصفة الميزة بالتفصيل (سلوك، API، مخطط، حالات حد، معايير قبول)
2. **Plan (خطة):** تُحلل المواصفة إلى خطوات تنفيذية (ماذا ننفذ أولًا، ما هي الاعتماديات، ما هو الترتيب المنطقي)
3. **Tasks (مهام):** تُقسم الخطة إلى مهام قابلة للتنفيذ (كل مهمة لها ناتج محدد ومعيار إنجاز واضح)
4. **Implement (تنفيذ):** تُنفذ المهام بالترتيب مع الإشارة إلى المواصفة الأصلية
5. **Validate (تحقق):** يُتحقق من أن التنفيذ يطابق المواصفة (مراجعة كود، اختبارات، مراجعة يدوية)
6. **Review (مراجعة):** مراجعة نهائية للتأكد من تغطية المواصفة بالكامل وعدم وجود انحرافات

### 5. كيف تبقى الوثائق متزامنة مع الكود (Docs Stay Synchronized)
- **لا تغيير سلوك بدون تحديث المواصفة:** أي تغيير في سلوك التطبيق (سواء إضافة ميزة، تعديل سلوك، أو إزالة وظيفة) يجب أن يبدأ بتحديث المواصفة أولاً، ثم يتبعه تغيير الكود. هذا يمنع الانحراف بين ما هو موثق وما هو مُنفذ.
- **المراجعة الدورية (Spec Review):** في بداية كل مرحلة، تُراجع المواصفات ذات الصلة للتأكد من أنها ما زالت تعكس المتطلبات الحالية.
- **الربط ثنائي الاتجاه (Bidirectional Linking):** كل مهمة تنفيذ تشير إلى المواصفة، وكل مواصفة تشير إلى المهام المشتقة منها. هذا يسهل التتبع في كلا الاتجاهين.

## البدائل المعتبرة (Options Considered)

### 1. Spec-Driven Development — GitHub Spec Kit Style (المختار)
- **المميزات:** تتبع كامل من المتطلبات إلى التنفيذ، المواصفات كمصدر حقيقة واحد، هرمية واضحة للوثائق، قابلية التكيف مع مراحل مختلفة، يجبر على التفكير قبل التنفيذ
- **العيوب:** وقت إضافي لكتابة المواصفات قبل التنفيذ، خطر الإفراط في التوثيق (over-documentation)، يحتاج انضباط للحفاظ على تزامن الوثائق والكود

### 2. Agile Scrum مع Sprints تقليدية
- **المميزات:** ممارسة شائعة، أدوات كثيرة، قوالب جاهزة
- **العيوب:** ضغط Phase قد يضحي بالجودة، لا يناسب المجهودات الطويلة بشكل طبيعي، يركز على السرعة أكثر من الدقة، المواصفات غالبًا تُكتب بشكل سطحي

### 3.瀑布 (Waterfall) التقليدي
- **المميزات:** توثيق شامل قبل التنفيذ، واضح ومنظم
- **العيوب:** صلب جدًا، لا يتكيف مع التغييرات، تأخير كبير قبل رؤية نتائج، لا يناسب المشاريع الديناميكية

### 4. No formal process (التطوير الحر)
- **المميزات:** أسرع بداية، مرونة كاملة
- **العيوب:** فوضوي مع نمو المشروع، لا تتبع، وثائق منعدمة أو قديمة، صعوبة في الانضمام للفريق، إعادة عمل كثيرة

## docs/_incoming/docs-v4.1-final/ADR/ADR-021-impeccable-design-quality.md

# ADR-021: Impeccable Design Quality for AI-Assisted UI Development

## الحالة (Status)
Accepted

## السياق (Context)
منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس تعتمد بشكل كبير على التطوير المدعوم بالذكاء الاصطناعي (AI-assisted development) لبناء واجهة المستخدم. هذا النهج سريع وفعال، لكنه يحمل مخاطر جودة معروفة: أنماط التصميم العامة التي يولّدها الذكاء الاصطناعي (generic AI patterns) لا تتوافق دائمًا مع هوية العلامة التجارية، قد تتجاهل متطلبات اللغة العربية واتجاه RTL، وقد تنتج واجهات تبدو "مقبولة" لكنها تفتقر إلى الشخصية والجودة المتميزة. المشروع يستهدف مؤسسات تعليمية في العالم العربي، لذا يجب أن تكون واجهة المستخدم احترافية، متسقة مع الهوية البصرية، متوافقة مع معايير إمكانية الوصول (accessibility)، ومصممة للغة العربية أولًا (Arabic-first/RTL-first). نحتاج إلى طبقة ضمان جودة (quality layer) تراجع واجهة المستخدم المولّدة بالذكاء الاصطناعي وتضمن أنها تلبي معايير العلامة التجارية وإمكانية الوصول والتصميم RTL.

## القرار (Decision)
قررنا استخدام **Impeccable** كأداة مراجعة جودة التصميم للتطوير المدعوم بالذكاء الاصطناعي، مع وضعين مختلفين (Brand mode و Product mode)، وقواعد مضادة للأنماط العامة (Anti-slop rules) مفروضة على جميع مراحل التطوير.

### 1. لماذا نستخدم Impeccable (لماذا نحتاج طبقة ضمان جودة)
- **كشف الأنماط العامة للذكاء الاصطناعي (Catches Generic AI Patterns):** الذكاء الاصطناعي يميل إلى توليد أنماط تصميم مكررة ومعروفة: تدرجات أرجوانية/زرقاء، تأثيرات زجاجية (glassmorphism)، تخطيطات إنجليزية أولًا، خط Inter الافتراضي. Impeccable يكشف هذه الأنماط وينبه عنها قبل أن تصل إلى الإنتاج.
- **فرض اتساق العلامة التجارية (Enforces Brand Consistency):** Impeccable يفحص أن المكونات والألوان والخطوط والتباعد تتوافق مع دليل العلامة التجارية (Brand Guidelines). أي انحراف عن الهوية المحددة يُكتشف ويُصحح.
- **تحسين جودة واجهة المستخدم (Improves UI Quality):** من خلال المراجعة المنهجية لكل مكون وشاشة، Impeccable يرفع مستوى الجودة بشكل عام ويمنع التراكم التدريجي للانحرافات البسيطة (design debt).

### 2. وضع العلامة التجارية مقابل وضع المنتج (Brand Mode vs Product Mode)
يُستخدم وضعان مختلفان حسب نوع الصفحة أو المكون:

| المعيار | Brand Mode (وضع العلامة) | Product Mode (وضع المنتج) |
|---|---|---|
| **متى يُستخدم** | صفحات الهبوط (landing pages)، التسويق، العرض العام | لوحة التحكم (dashboard)، التطبيق الداخلي، أدوات الإدارة |
| **الأولوية العليا** | الانطباع البصري، الهوية، السرد البصري (visual storytelling) | الوظائف، الوضوح، الكفاءة، الاتساق |
| **الخطوط** | خط العلامة التجارية الأساسي (Amiri أو Noto Naskh Arabic) | خط واضح للقراءة الطويلة (IBM Plex Sans Arabic أو Noto Sans Arabic) |
| **الألوان** | ألوان العلامة التجارية الكاملة مع التدرجات المسموحة | لوحة ألوان محدودة تتماشى مع نظام التصميم |
| **التباعد** | تباعد واسع للتنفس البصري والأناقة | تباعد مضبوط للكثافة المعلوماتية والكفاءة |
| **الرسوم المتحركة** | مسموحة بشكل أوسع (تأثيرات دخول، حركة سردية) | محدودة (transitions بسيطة، loading states) |
| **التحقق من RTL** | صارم — كل النصوص والعناصر يجب أن تكون RTL | صارم — نفس المتطلبات لكن مع تركيز على المحاذاة والترقيم |
| **مثال** | صفحة رئيسية، صفحة "من نحن"، عرض الميزات | لوحة تحكم المستخدم، محرر المستندات، إعدادات الحساب |

### 3. كيف يتكامل مع نظام تصميم واجهة المستخدم (Integration with UI Design System)
Impeccable ليس أداة معزولة — إنه جزء من دورة تحسين مستمرة:

```
Brand Guidelines (دليل العلامة التجارية)
        ↓
   Design Tokens (رموز التصميم — ألوان، خطوط، تباعد)
        ↓
   UI Components (مكونات واجهة المستخدم — shadcn/ui + تخصيص)
        ↓
   ┌─────────────────────────┐
   │   Impeccable Review     │ ← مراجعة كل مكون/صفحة جديدة
   └─────────┬───────────────┘
             │
             ▼
   ┌─────────────────────────┐
   │   Findings & Feedback   │ ← ملاحظات ومشاكل مكتشفة
   └─────────┬───────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │   Feed back into Design System      │ ← تحديث الرموز والمكونات
   │   (tokens, components, patterns)    │    بناءً على الملاحظات
   └─────────────────────────────────────┘
```

- **النتائج تُغذي النظام:** عندما يكتشف Impeccable نمطًا مشكلة متكرر (مثل: "خط Inter يُستخدم بدلًا من خط العلامة التجارية في 5 مكونات")، تُضاف قاعدة جديدة إلى نظام التصميم (design system) لمنع تكرار المشكلة.
- **الرموز (Tokens) محدثة:** إذا اكتُشف أن لون معين لا يحقق تباين كافٍ (contrast ratio) للنص العربي، يُحدَّث رمز اللون في النظام.
- **المكونات محسّنة:** إذا اكتُشف أن مكون زر معين لا يعمل بشكل صحيح في RTL، يُصلح المكون ويُضاف اختبار RTL.

### 4. قواعد مضادة للأنماط العامة (Anti-Slop Rules)
هذه القواعد تمنع الأنماط التصميمية العامة التي يولّدها الذكاء الاصطناعي بشكل متكرر ولا تتوافق مع هوية المشروع:

| القاعدة | الوصف | السبب |
|---|---|---|
| **لا تدرجات أرجوانية/زرقاء** | ممنوع استخدام تدرجات الألوان الأرجوانية والزرقاء الافتراضية التي يولّدها الذكاء الاصطناعي | لا تتوافق مع هوية العلامة التجارية، مظهر عام ومكرر |
| **لا تأثيرات زجاجية (No Glassmorphism)** | ممنوع التأثيرات الزجاجية (backdrop-blur + semi-transparent backgrounds) كنمط أساسي | يسبب مشاكل أداء، لا يعمل بشكل جيد مع النص العربي، صيحة مؤقتة |
| **لا تخطيطات إنجليزية أولًا (No English-first Layouts)** | كل التخطيطات يجب أن تُصمم RTL أولًا ثم تُدعم LTR كاختيار | المشروع عربي أولًا، التخطيط الإنجليزي أولًا يسبب مشاكل انعكاس |
| **لا خط Inter فقط (No Inter-only)** | ممنوع الاعتماد على خط Inter كخط وحيد للمشروع | لا يدعم العربية بشكل ممتاز، مظهر عام ومكرر، لا يعكس هوية المشروع |
| **لا Heros بتدرجات كبيرة (No Gradient Hero Sections)** | ممنوع أقسام البطل (hero sections) ذات التدرجات الكبيرة الملونة | مظهر عام ومكرر من قوالب الذكاء الاصطناعي، لا يتوافق مع هوية تعليمية رسمية |
| **لا أيقونات عامة مفرطة (No Generic Icon Overuse)** | ممنوع الإفراط في استخدام الأيقونات العامة بدون دلالة واضحة | يضيف ضوضاء بصرية، يقلل الوضوح، نمط شائع في المخرجات الآلية |
| **لا بطاقات متماثلة مفرطة (No Cookie-cutter Cards)** | ممنوع استخدام نفس نمط البطاقة لكل نوع محتوى | يقلل التمييز بين أنواع المحتوى، مظهر آلي |
| **لا نصوص Placeholder وهمية (No Lorem Ipsum)** | ممنوع النصوص الوهمية — يجب استخدام نصوص عربية حقيقية أو واقعية | لا يختبر التخطيط مع النص العربي الحقيقي، يخفي مشاكل RTL |

### 5. قيود إمكانية الوصول وRTL (Accessibility and RTL Constraints)
Impeccable يفحص التوافق مع معايير إمكانية الوصول والتصميم RTL، لكنه **ليس بديلًا عن اختبار إمكانية الوصول المتخصص**:

- **فحص التباين (Contrast Check):** Impeccable يتحقق من نسبة التباين بين النص والخلفية (WCAG AA كحد أدنى). لكن هذا لا يغطي كل جوانب التباين (مثل التباين في الرموز والأيقونات).
- **فحص اتجاه النص (RTL Check):** Impeccable يتحقق من أن التخطيط يتوافق مع RTL (اتجاه النص، محاذاة، ترتيب العناصر). لكنه لا يمكنه اختبار كل سيناريو تفاعلي.
- **فحص حجم اللمس (Touch Target Check):** Impeccable يتحقق من أن العناصر التفاعلية بحجم كافٍ (44×44px كحد أدنى). لكنه لا يختبر التجربة الفعلية على الأجهزة.

