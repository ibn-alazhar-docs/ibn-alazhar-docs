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
