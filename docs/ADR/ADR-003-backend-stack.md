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
