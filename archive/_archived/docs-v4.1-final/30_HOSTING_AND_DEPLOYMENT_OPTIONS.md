# ابن الأزهر دوكس — خيارات الاستضافة والنشر
# Ibn Al-Azhar Docs — Hosting & Deployment Options

> **الإصدار:** 4.1.0
> **التاريخ:** 2025-03-05
> **الحالة:** مرجع استراتيجي — يُراجع مع كل مرحلة مشروع
> **المرجع المرتبط:** `ADR-013-self-hosting-free-first.md` | `10_DEVOPS_DEPLOYMENT.md` | `11_COST_AND_OPERATIONS.md`

---

## جدول المحتويات

1. [مقدمة](#1-مقدمة)
2. [جدول مقارنة مزودي الاستضافة](#2-جدول-مقارنة-مزودي-الاستضافة-provider-comparison-table)
3. [تحليل خاص: Hugging Face Spaces](#3-تحليل-خاص-hugging-face-spaces)
4. [استراتيجية الاستضافة المحلية](#4-استراتيجية-الاستضافة-المحلية-local-development-hosting)
5. [متطلبات النطاق الفرعي](#5-متطلبات-النطاق-الفرعي-subdomain-requirements)
6. [قرار الاستضافة لـ MVP](#6-قرار-الاستضافة-لـ-mvp-mvp-hosting-decision)
7. [متغيرات البيئة للاستضافة](#7-متغيرات-البيئة-للاستضافة-hosting-environment-variables)
8. [توصيات المرحلة](#8-توصيات-المرحلة-phase-recommendations)

---

## 1. مقدمة

تهدف هذه الوثيقة إلى تقديم استراتيجية استضافة ونشر شاملة لمشروع **ابن الأزهر دوكس**، المنصة التعليمية لإدارة المستندات وتحويل OCR. تمثل مسألة الاستضافة قرارًا استراتيجيًا مؤثرًا على البنية التقنية بالكامل، وعلى تكلفة التشغيل، وعلى تجربة المستخدم النهائي، وعلى قدرة الفريق على التطوير والنشر بسرعة. لذلك حرصنا على توثيق كل خيار متاح بأسلوب واقعي ومحايد، بعيدًا عن الوعود التسويقية غير المُتحقّقة.

### فلسفة الاستضافة: مجاني أولًا (Free-First)

تعتمد فلسفة الاستضافة في هذا المشروع على مبدأ جوهري: **الوصول المجاني أولًا للمستخدم التعليمي ولا بطاقة ائتمان للتطوير المحلي**. هذا يعني أن أي مطوّر أو مؤسسة تعليمية يجب أن يتمكن من تشغيل المشروع محليًا دون الحاجة لدفع أي رسوم أو إدخال بطاقة ائتمان. المكونات الأساسية — PostgreSQL وRedis وMinIO وBullMQ — جميعها تعمل ضمن Docker Compose محليًا بتكلفة صفرية. لا نعتمد على خدمات سحابية مدفوعة (لا AWS، لا Supabase، لا PlanetScale) في المكدس الأساسي للبرمجيات.

لكن يجب أن نكون واقعيين: **الاستضافة المجانية إلى الأبد في بيئة إنتاجية عامة هي وهم**. أي خدمة سحابية "مجانية" لها حدود — سواء في الموارد أو في وقت التشغيل أو في التخزين أو في عدد الطلبات. لذلك نستخدم مصطلحات دقيقة في هذه الوثيقة:

| التصنيف | المعنى | مثال |
|---------|--------|------|
| `confirmed` | حقيقة مُتحقّق منها ومؤكدة | Docker Compose يعمل محليًا دون تكلفة |
| `needs-verification` | لم يُتحقّق منها بعد ويحتاج مراجعة | هل Render Free Tier يدعم Docker؟ |
| `not-suitable-for-production` | غير مناسب للإنتاج — مناسب فقط للنماذج الأولية | Hugging Face Spaces كمنصة إنتاج |
| `prototype-only` | مناسب فقط للعروض التوضيحية والنماذج الأولية | نشر Docker واحد على HF Spaces |
| `recommended-for-mvp` | الأنسب لمرحلة الحد الأدنى للمنتج القابل للتطبيق | VPS ذاتي الاستضافة مع Caddy |
| `recommended-for-production` | الأنسب لبيئة الإنتاج المستقرة | Dockerized VPS مع Caddy + مراقبة |

### متطلبات المشروع التقنية للاستضافة

مشروع ابن الأزهر دوكس ليس تطبيقًا ثابتًا (static) بسيطًا — إنه تطبيق متكامل يتطلب:

- **Next.js 16 full-stack**: تقديم من جانب الخادم (SSR) + مسارات API — لا يكفي استضافة ملفات ثابتة فقط
- **PostgreSQL 16**: قاعدة بيانات علائقية كاملة مع Prisma ORM
- **Redis 7**: طوابير BullMQ + تخزين مؤقت للجلسات
- **MinIO**: تخزين كائنات متوافق مع S3 لملفات المستخدمين الخاصة
- **BullMQ Workers**: عمليات خلفية للتحويل والمعالجة
- **Caddy**: وكيل عكسي مع HTTPS تلقائي
- **ملفات مستخدمين خاصة مستمرة**: لا يمكن استخدام تخزين مؤقت يُحذف عند إعادة النشر
- **مصادقة وجلسات بمعايار إنتاجية**: NextAuth.js مع JWT + bcrypt
- **Docker Compose للتطوير المحلي**: جميع الخدمات تعمل معًا بسهولة

هذه المتطلبات تُقصي تلقائيًا معظم خيارات الاستضافة المجانية البسيطة (مثل GitHub Pages أو Netlify Static)، وتجعل خيارات مثل Vercel وCloudflare Pages محدودة لأنها لا تدعم PostgreSQL وRedis وMinIO محليًا ضمن نفس البيئة. الفهم الواضح لهذه القيود هو أساس اتخاذ قرار استضافة صحيح.

---

## 2. جدول مقارنة مزودي الاستضافة (Provider Comparison Table)

يقدم هذا القسم مقارنة شاملة لمزودي الاستضافة المحتملين. الجدول مقسّم إلى ثلاث فئات: خيارات الواجهة الثابتة، وخيارات الحاوية الكاملة، وخيارات النماذج الأولية. كل حقل تم التحقق منه موسوم بـ `confirmed`، وكل حقل لم يُتحقق منه موسوم بـ `needs-verification`. ندعو بقوة إلى عدم اعتماد أي قرار على حقول `needs-verification` دون مراجعة مباشرة لموقع المزود.

### 2.1 خيارات الواجهة الثابتة / معاينة الواجهة الأمامية (Static / Frontend Preview)

هذه الخيارات مناسبة فقط لمعاينة واجهة المستخدم الثابتة أو SSR المحدود. **لا تناسب تشغيل التطبيق الكامل** لأنها لا توفر PostgreSQL وRedis وMinIO ضمن نفس البيئة.

| المزود | Free tier | بطاقة ائتمان مطلوبة؟ | نطاق فرعي مضمن؟ | يدعم Docker؟ | تخزين مستمر | دعم قاعدة البيانات | دعم Redis | نطاق مخصص | الاستخدام الأنسب | المخاطر | الحكم |
|--------|-----------|----------------------|-----------------|-------------|-------------|-------------------|-----------|-----------|----------------|---------|-------|
| **Cloudflare Pages** | 500 بناء/شهر، نطاق تردد غير محدود `confirmed` | لا `confirmed` | نعم (`*.pages.dev`) `confirmed` | لا (Functions فقط — Workers) `confirmed` | لا (ملفات ثابتة فقط) `confirmed` | لا (يحتاج D1 الخارجي — محدود) `confirmed` | لا `confirmed` | نعم `confirmed` | معاينة الواجهة + SSR محدود عبر Functions | لا يدعم Docker أو خدمات خلفية؛ Functions محدود بـ Workers runtime | `not-suitable-for-production` للتطبيق الكامل؛ مناسب لمعاينة الواجهة فقط |
| **Vercel** | Hobby: 100GB نقل/شهر،serverless functions `confirmed` | لا `confirmed` | نعم (`*.vercel.app`) `confirmed` | لا `confirmed` | لا (مؤقت — يُحذف مع كل نشر) `confirmed` | لا (يحتاج Vercel Postgres — محدود أو مدفوع) `needs-verification` | لا (يحتاج Upstash خارجي) `confirmed` | نعم `confirmed` | معاينة Next.js SSR + API Routes محدودة | Serverless cold starts؛ لا عمليات خلفية طويلة؛ حدود تنفيذ 10 ثوانٍ Hobby؛ لا Docker؛ تخزين مؤقت | `not-suitable-for-production` للتطبيق الكامل؛ مناسب لمعاينة الواجهة |
| **Netlify** | 100GB نقل/شهر، 300 دقيقة بناء/شهر `confirmed` | لا `confirmed` | نعم (`*.netlify.app`) `confirmed` | لا `confirmed` | لا (مؤقت) `confirmed` | لا (يحتاج Supabase خارجي) `confirmed` | لا `confirmed` | نعم `confirmed` | مواقع ثابتة + Functions بسيطة | لا يدعم Docker؛ Functions محدود؛ لا خدمات خلفية | `not-suitable-for-production` للتطبيق الكامل |
| **GitHub Pages** | غير محدود للمستودعات العامة `confirmed` | لا `confirmed` | نعم (`*.github.io`) `confirmed` | لا `confirmed` | لا (ملفات ثابتة فقط) `confirmed` | لا `confirmed` | لا `confirmed` | نعم `confirmed` | توثيق الموقع فقط | ثابت بالكامل؛ لا SSR؛ لا API؛ لا خدمات خلفية | `not-suitable-for-production` للتطبيق الكامل؛ مناسب فقط للتوثيق |

### 2.2 خيارات الحاوية الكاملة / الاستضافة الذاتية (Full-Stack / Container Options)

هذه الخيارات تدعم تشغيل Docker أو حاويات كاملة، مما يجعلها نظريًا قادرة على تشغيل المشروع بأكمله. لكن كل خيار له قيود مجانية مختلفة يجب فهمها بدقة.

| المزود | Free tier | بطاقة ائتمان مطلوبة؟ | نطاق فرعي مضمن؟ | يدعم Docker؟ | تخزين مستمر | دعم قاعدة البيانات | دعم Redis | نطاق مخصص | الاستخدام الأنسب | المخاطر | الحكم |
|--------|-----------|----------------------|-----------------|-------------|-------------|-------------------|-----------|-----------|----------------|---------|-------|
| **Render** | خدمة ويب واحدة مجانية (512MB RAM)، PostgreSQL مجاني 90 يومًا فقط `confirmed` | لا `confirmed` | نعم (`*.onrender.com`) `confirmed` | نعم (Dockerfile) `confirmed` | محدود (يُحذف بعد 90 يومًا لـ Free tier) `confirmed` | نعم (PostgreSQL مجاني 90 يومًا ثم يُحذف!) `confirmed` | لا (يحتاج Redis خارجي) `confirmed` | نعم `confirmed` | نموذج أولي محدود المدة | Free tier DB تُحذف بعد 90 يومًا!؛ خدمة واحدة فقط مجانًا؛ النوم بعد 15 دقيقة عدم نشاط؛ 512MB RAM لا تكفي للتطبيق الكامل | `not-suitable-for-production`؛ `prototype-only` مع وعي بحذف DB |
| **Fly.io** | 3 أجهزة مشتركة (256MB RAM لكل)، 3GB تخزين مستمر `needs-verification` | نعم (مطلوبة للتسجيل — حتى للخطة المجانية) `needs-verification` | نعم (`*.fly.dev`) `confirmed` | نعم (Dockerfile) `confirmed` | نعم (حجم مستمر — لكن محدود بـ 3GB في Free tier) `needs-verification` | نعم (PostgreSQL عبر Flex — لكن يستهلك من Free quota) `needs-verification` | نعم (Upstash Redis خارجي — مجاني محدود) `confirmed` | نعم `confirmed` | نموذج أولي مع تخزين مستمر | يتطلب بطاقة ائتمان!؛ 256MB RAM لكل آلة لا تكفي لـ Next.js + Postgres + Redis + MinIO معًا؛ سحب الأموال تلقائي عند تجاوز الحصة `needs-verification` | `prototype-only` إذا توفرت بطاقة ائتمان؛ `not-suitable-for-production` |
| **Railway** | خطة تجريبية $5 رصيد/شهر `confirmed` | لا (ولكن يتطلب تأكيد الحساب) `needs-verification` | نعم (`*.up.railway.app`) `confirmed` | نعم (Dockerfile) `confirmed` | نعم (حجم مستمر) `confirmed` | نعم (PostgreSQL مُدار) `confirmed` | نعم (Redis مُدار) `confirmed` | نعم `confirmed` | نموذج أولي مع خدمات مُدارة | $5/شهر تُستهلك بسرعة (خادم واحد ~$5 + DB ~$1 + Redis ~$1 = يتجاوز الرصيد!)؛ بعد استنفاد الرصيد يتوقف كل شيء؛ لا يناسب الإنتاج المستدام مجانًا | `prototype-only`؛ يتجاوز الحصة المجانية بسرعة |
| **Koyeb** | خدمة ويب واحدة (512MB RAM، 0.1 vCPU)، 0.5GB تخزين `needs-verification` | لا `needs-verification` | نعم (`*.koyeb.app`) `confirmed` | نعم (Dockerfile) `confirmed` | محدود (0.5GB في Free tier) `needs-verification` | لا (يحتاج خدمة خارجية) `needs-verification` | لا (يحتاج خدمة خارجية) `needs-verification` | نعم `confirmed` | نموذج أولي بسيط | 512MB RAM + 0.5GB تخزين لا يكفيان للتطبيق الكامل؛ خدمة واحدة فقط؛ لا DB/Redis مدمج | `prototype-only` بشدة محدود |
| **Oracle Cloud Free Tier** | 2 AMD VMs (1GB RAM كل) + 4 ARM VMs (إجمالي 24GB RAM) — دائم `confirmed` | نعم (مطلوبة للتسجيل) `confirmed` | لا (IP عام فقط — لا نطاق فرعي) `confirmed` | نعم (يمكن تثبيت Docker يدويًا) `confirmed` | نعم (حجم تمهيدي + أقراص إضافية) `confirmed` | نعم (تثبيت PostgreSQL في Docker) `confirmed` | نعم (تثبيت Redis في Docker) `confirmed` | نعم (مع DNS خارجي) `confirmed` | بيئة إنتاج حقيقية مجانية | يتطلب بطاقة ائتمان!؛ ARM Ampere قد لا يكون متاحًا دائمًا (قائمة انتظار) `needs-verification`؛ إعداد يدوي معقد؛ واجهة إدارة صعبة؛ دعم محدود؛ خطر إغلاق الحساب بدون تحذير واضح `needs-verification` | `recommended-for-mvp` إذا توفرت بطاقة ائتمان وVM متاحة؛ `needs-verification` لتوفر ARM |
| **VPS ذاتي الاستضافة** (Hetzner/Contabo/OVH) | لا — مدفوع (~5-16 يورو/شهر) `confirmed` | نعم `confirmed` | لا (IP عام فقط) `confirmed` | نعم (تثبيت Docker + Compose) `confirmed` | نعم (كامل — حسب حجم القرص) `confirmed` | نعم (PostgreSQL في Docker) `confirmed` | نعم (Redis في Docker) `confirmed` | نعم (مع DNS خارجي) `confirmed` | بيئة إنتاج حقيقية — التحكم الكامل | تكلفة شهرية ثابتة؛ مسؤولية صيانة كاملة؛ نقطة فشل واحدة إذا VPS واحد؛ يحتاج خبرة DevOps | `recommended-for-production` |

### 2.3 خيارات العروض التوضيحية / النماذج الأولية (Demo / Prototype Options)

| المزود | Free tier | بطاقة ائتمان مطلوبة؟ | نطاق فرعي مضمن؟ | يدعم Docker؟ | تخزين مستمر | دعم قاعدة البيانات | دعم Redis | نطاق مخصص | الاستخدام الأنسب | المخاطر | الحكم |
|--------|-----------|----------------------|-----------------|-------------|-------------|-------------------|-----------|-----------|----------------|---------|-------|
| **Hugging Face Spaces** | مساحة مجانية (2 vCPU، 16GB RAM، 50GB تخزين) `confirmed` | لا `confirmed` | نعم (`*-space.hf.space`) `confirmed` | نعم (Docker Spaces) `confirmed` | محدود (50GB — يُحذف عند عدم النشاط!) `needs-verification` | يمكن تثبيت PostgreSQL داخل الحاوية (غير مستقر) `not-suitable-for-production` | يمكن تثبيت Redis داخل الحاوية (غير مستقر) `not-suitable-for-production` | لا `needs-verification` | عرض توضيحي + تجارب OCR | لا خصوصية (الفضاء عام ما لم يكن Private — والخاص محدود)؛ تخزين غير مضمون؛ إعادة تشغيل الحاوية قد تحذف البيانات؛ لا يناسب ملفات مستخدمين خاصة؛ بنية أحادية بدون عزل بين الخدمات | `prototype-only` — تفصيل أكثر في القسم 3 |

### 2.4 ملخص الحكم السريع

```
┌─────────────────────────────────────────────────────────────────┐
│                    ملخص خيارات الاستضافة                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  معاينة الواجهة فقط:                                            │
│    ├─ Cloudflare Pages  → مناسب لمعاينة الواجهة الأمامية        │
│    ├─ Vercel             → مناسب لمعاينة Next.js SSR            │
│    ├─ Netlify            → مناسب للمواقع الثابتة                │
│    └─ GitHub Pages       → مناسب للتوثيق فقط                    │
│                                                                 │
│  نموذج أولي / عرض توضيحي:                                      │
│    ├─ Hugging Face Spaces → الأفضل للعروض + تجارب OCR           │
│    ├─ Render              → محدود (DB تُحذف بعد 90 يومًا!)       │
│    ├─ Railway             → $5 رصيد تُستهلك بسرعة                │
│    └─ Fly.io              → يتطلب بطاقة ائتمان                  │
│                                                                 │
│  مرشح لـ MVP:                                                   │
│    ├─ Oracle Cloud Free  → مجاني دائم لكن معقد + يتطلب CC      │
│    └─ VPS ذاتي (Hetzner) → ~5 يورو/شهر — الأكثر استقرارًا       │
│                                                                 │
│  الإنتاج الموصى به:                                              │
│    └─ VPS ذاتي + Caddy + Docker Compose → recommended-for-prod  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. تحليل خاص: Hugging Face Spaces

يستحق Hugging Face Spaces تحليلًا معمّقًا لأنه واحد من أكثر الخيارات المجانية جاذبية من حيث الموارد (16GB RAM، 2 vCPU)، لكنه في الوقت نفسه يحمل قيودًا جوهرية تجعله غير مناسب كمنصة إنتاج لمشروع كابن الأزهر دوكس. نوضح في هذا القسم بالتفصيل لماذا هو مناسب فقط كنموذج أولي (`prototype-only`) وليس للإنتاج.

### 3.1 ما هو Hugging Face Spaces؟

Hugging Face Spaces هي خدمة استضافة مجانية تقدمها منصة Hugging Face — المنصة الأكبر عالميًا لنماذج الذكاء الاصطناعي. تتيح Spaces استضافة تطبيقات Docker كاملة مجانًا، مع موارد سخية نسبيًا: حتى 2 vCPU و16GB RAM و50GB تخزين مؤقت. يُستخدم أساسًا لعرض نماذج التعلم الآلي والذكاء الاصطناعي التفاعلية (مثل Gradio وStreamlit)، لكنه يدعم أيضًا حاويات Docker المخصصة.

### 3.2 الموارد المتاحة (`confirmed`)

| المورد | الحصة المجانية | ملاحظات |
|--------|---------------|---------|
| **CPU** | 2 vCPU (مشتركة) | `confirmed` — كافية لتشغيل التطبيق |
| **RAM** | 16 GB | `confirmed` — كافية لجميع الخدمات معًا |
| **التخزين** | 50 GB | `confirmed` — لكنه مؤقت! |
| **الشبكة** | غير محدودة عمليًا | `confirmed` |
| **مدة التشغيل** | غير محدودة نظريًا | `needs-verification` — قد يتوقف بعد عدم النشاط |
| **Docker** | مدعوم (Docker Spaces) | `confirmed` |
| **GPU** | متاح مدفوعًا | لا نحتاجه |

### 3.3 لماذا لا يناسب الإنتاج؟ — تحليل القيود الجوهرية

رغم الموارد السخية، يواجه مشروع ابن الأزهر دوكس عدة قيود جوهرية تجعل HF Spaces غير مناسب كبيئة إنتاج. نشرح كل قيد بالتفصيل:

#### أ) تخزين غير مستقر (Ephemeral Storage)

HF Spaces يوفر 50GB من التخزين، لكن هذا التخزين **غير مضمون الاستمرار**. الحاوية قد تُعاد تشغيلها لأسباب عديدة (صيانة المنصة، عدم النشاط، تحديثات)، وعند إعادة التشغيل قد تُفقد البيانات المكتوبة بعد snapshot الأخير. هذا يعني أن ملفات المستخدمين في MinIO وقاعدة بيانات PostgreSQL معرضة للفقدان في أي لحظة. بالنسبة لمنصة تعليمية تتعامل مع ملفات مستخدمين خاصة ومستندات أكاديمية، هذا غير مقبول إطلاقًا. الملفات الخاصة المستمرة (persistent private files) هي متطلب أساسي ولا يمكن المخاطرة بفقدانها.

#### ب) بنية أحادية — جميع الخدمات في حاوية واحدة

مشروعنا يتطلب عدة خدمات تعمل معًا بشكل منسق: Next.js للتطبيق، PostgreSQL لقاعدة البيانات، Redis لطوابير BullMQ والتخزين المؤقت، MinIO لتخزين الملفات، وعمال BullMQ للمعالجة الخلفية. في HF Spaces، يجب تشغيل كل هذه الخدمات داخل **حاوية Docker واحدة** باستخدام supervisord أو entrypoint script مخصص. هذا يتعارض مع أفضل ممارسات Docker (حاوية واحدة لكل عملية)، ويجعل إدارة العمليات معقدة وهشّة. إذا تعطلت إحدى العمليات داخل الحاوية، قد لا يُستعاد بشكل صحيح، وقد تتأثر جميع الخدمات الأخرى.

#### ج) عدم وجود خصوصية حقيقية

HF Spaces مصمم بشكل أساسي ليكون عامًا (public). المساحات الخاصة (Private) متاحة `needs-verification`، لكن حتى المساحات الخاصة لا تضمن عزل الشبكة الكامل. ملفات المستخدمين التعليمية — التي قد تحتوي على أوراق امتحانات، أبحاث خاصة، أو مستندات مؤسسية — يجب أن تكون محمية بأعلى معايير الخصوصية. استضافة هذه الملفات على منصة طرف ثالث غير مخصصة للبيانات الخاصة يُعد مخاطرة أمنية غير مبررة.

#### د) لا مصادقة إنتاجية

مشروعنا يستخدم NextAuth.js مع JWT وbcrypt ومصادقة Google OAuth. هذا يتطلب إعداد `NEXTAUTH_URL` و`NEXTAUTH_SECRET` بشكل صحيح، بالإضافة إلى إعادة توجيه OAuth callback إلى عنوان URL ثابت وموثوق. في HF Spaces، عنوان URL قد يتغير أو لا يكون مستقرًا بما يكفي لضمان عمل OAuth بشكل موثوق في الإنتاج. كذلك، إدارة الجلسات مع Redis داخل نفس الحاوية تزيد التعقيد.

#### هـ) عمال BullMQ في نفس الحاوية

عمليات OCR الخلفية عبر BullMQ تحتاج أن تعمل بشكل مستمر ومستقل عن خادم الويب. في HF Spaces، يجب تشغيل عمال BullMQ كعملية خلفية داخل نفس الحاوية. إذا استهلك عامل OCR الكثير من الذاكرة أو المعالج، قد يتأثر خادم الويب بالكامل ويصبح التطبيق غير متاح للمستخدمين. في بيئة إنتاجية حقيقية، يجب فصل العمال عن خادم الويب لضمان الاستقرار.

#### و) حدود إعادة البناء والنشر

HF Spaces يبني الحاوية من Dockerfile عند كل تغيير. عملية البناء قد تستغرق وقتًا طويلًا (بناء Next.js + تثبيت PostgreSQL + Redis + MinIO)، وقد تفشل لأسباب متعلقة بحدود البناء `needs-verification`. هذا يُبطئ دورة التطوير والنشر بشكل كبير مقارنةً بمنصات CI/CD متكاملة.

### 3.4 متى يكون HF Spaces مناسبًا؟

رغم كل القيود المذكورة، HF Spaces ممتاز في الحالات التالية:

| حالة الاستخدام | المناسبة | السبب |
|---------------|---------|-------|
| **عرض توضيحي للعميل** | ✅ مناسب | يُظهر الوظائف الأساسية بدون تكلفة |
| **تجربة OCR** | ✅ مناسب | 16GB RAM تكفي لتشغيل Tesseract أو تجربة Google Drive API |
| **اختبار تكامل Docker** | ✅ مناسب | التأكد من أن Dockerfile يعمل في بيئة خارجية |
| **معاينة واجهة المستخدم** | ✅ مناسب | رابط عام يمكن مشاركته مع الفريق |
| **إنتاج حقيقي** | ❌ غير مناسب | القيود المذكورة أعلاه |
| **ملفات مستخدمين خاصة** | ❌ غير مناسب | التخزين غير مستقر + مخاطر الخصوصية |
| **مصادقة إنتاجية** | ❌ غير مناسب | عدم استقرار URL + تعقيد الإعداد |

### 3.5 إعداد HF Spaces كنموذج أولي (مرجعي)

إذا قرر الفريق استخدام HF Spaces كنموذج أولي، فهذا الإعداد المرجعي:

```dockerfile
# Dockerfile.hf-spaces (prototype-only)
FROM node:20-alpine

# تثبيت PostgreSQL وRedis وsupervisord
RUN apk add --no-cache postgresql redis supervisor

# إعداد supervisord لإدارة العمليات المتعددة
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# نسخ التطبيق
WORKDIR /app
COPY . .

# تثبيت التبعيات وبناء التطبيق
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate
RUN pnpm build

# إعداد قاعدة البيانات
RUN mkdir -p /run/postgresql && chown postgres:postgres /run/postgresql
RUN su postgres -c "initdb -D /var/lib/postgresql/data"
RUN su postgres -c "pg_ctl -D /var/lib/postgresql/data start; \
    createdb ibn_al_azhar_docs; \
    pg_ctl -D /var/lib/postgresql/data stop"

EXPOSE 7860

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

```ini
# supervisord.conf
[supervisord]
nodaemon=true

[program:postgresql]
command=su postgres -c "postgres -D /var/lib/postgresql/data"
autostart=true
autorestart=true

[program:redis]
command=redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
autostart=true
autorestart=true

[program:app]
command=node /app/.next/standalone/server.js
environment=NODE_ENV="production",PORT="7860",HOSTNAME="0.0.0.0"
autostart=true
autorestart=true
```

> **تحذير:** هذا الإعداد `prototype-only`. لا يستخدم MinIO (يستخدم نظام ملفات محلي بدلًا منه)، ولا يفصل العمال عن خادم الويب، ولا يوفر نسخًا احتياطيًا، ولا يضمن استمرارية البيانات. استخدمه فقط للعروض التوضيحية.

### 3.6 الحكم النهائي على HF Spaces

```
┌──────────────────────────────────────────────────────┐
│  Hugging Face Spaces — الحكم النهائي                  │
│                                                       │
│  التصنيف: prototype-only                              │
│                                                       │
│  ✅ مناسب لـ:                                         │
│     • عرض توضيحي للعميل أو المستثمر                   │
│     • تجربة OCR والتحويل                              │
│     • اختبار Dockerfile في بيئة خارجية                │
│     • معاينة سريعة لواجهة المستخدم                    │
│                                                       │
│  ❌ غير مناسب لـ:                                     │
│     • بيئة إنتاج حقيقية                               │
│     • تخزين ملفات مستخدمين خاصة                       │
│     • مصادقة إنتاجية مستقرة                           │
│     • تشغيل BullMQ workers بشكل موثوق                 │
│     • خصوصية البيانات                                 │
│     • استمرارية البيانات                              │
│                                                       │
│  السبب الجوهري: HF Spaces مصمم لعرض نماذج ML،         │
│  وليس لاستضافة تطبيقات إنتاجية متعددة الخدمات         │
│  مع تخزين مستمر وخصوصية صارمة.                        │
└──────────────────────────────────────────────────────┘
```

---

## 4. استراتيجية الاستضافة المحلية (Local Development Hosting)

الاستضافة المحلية عبر Docker Compose هي الركيزة الأساسية لاستراتيجية التطوير في مشروع ابن الأزهر دوكس. تضمن هذه الاستراتيجية أن أي مطوّر يمكنه تشغيل المشروع الكامل — بما في ذلك جميع الخدمات الخلفية — على جهازه الشخصي دون الحاجة لأي خدمة سحابية أو بطاقة ائتمان. هذا يتوافق مباشرة مع مبدأ "مجاني أولًا" ولا يُقاس بالتكلفة فحسب، بل بالاستقلالية الكاملة عن مزودي الخدمات السحابية. `confirmed`

### 4.1 هيكل ملفات Docker Compose

نستخدم ثلاثة ملفات Docker Compose لفصل المسؤوليات بين بيئات التطوير والإنتاج:

| الملف | الغرض | متى يُستخدم | الحالة |
|-------|--------|------------|--------|
| `compose.yaml` | تعريف الخدمات الأساسية المشتركة | جميع البيئات — الأساس | `confirmed` |
| `compose.dev.yaml` | تجاوزات بيئة التطوير (volumes، ports، hot reload) | التطوير المحلي فقط | `confirmed` |
| `compose.prod.example.yaml` | تجاوزات بيئة الإنتاج (Caddy، الموارد، الأمان) | الإنتاج — مثال مرجعي | `confirmed` |

### 4.2 الملف الأساسي: compose.yaml

```yaml
# compose.yaml — التعريف الأساسي المشترك لجميع البيئات
# confirmed — يُشغّل جميع الخدمات المطلوبة محليًا بدون تكلفة

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: postgresql://${POSTGRES_USER:-ibn_al_azhar_docs}:${POSTGRES_PASSWORD:-ibn_al_azhar_docs_dev_password}@db:5432/${POSTGRES_DB:-ibn_al_azhar_docs}
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin}
      S3_BUCKET: ${MINIO_BUCKET:-ibn-al-azhar-docs}
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}
      NEXTAUTH_SECRET: ${AUTH_SECRET:-dev-secret-change-in-production}
      MAX_UPLOAD_SIZE_MB: ${MAX_UPLOAD_SIZE_MB:-100}
      SHARE_TOKEN_BYTES: ${SHARE_TOKEN_BYTES:-32}
      OCR_PROVIDER: ${OCR_PROVIDER:-google-drive}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-ibn_al_azhar_docs}
      POSTGRES_USER: ${POSTGRES_USER:-ibn_al_azhar_docs}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ibn_al_azhar_docs_dev_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ibn_al_azhar_docs}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 $${MINIO_ROOT_USER:-minioadmin} $${MINIO_ROOT_PASSWORD:-minioadmin};
      mc mb --ignore-existing local/${MINIO_BUCKET:-ibn-al-azhar-docs};
      echo 'MinIO bucket initialized';
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 4.3 ملف التطوير: compose.dev.yaml

```yaml
# compose.dev.yaml — تجاوزات بيئة التطوير
# confirmed — يُفعّل hot reload ويعرّض المنافذ المحلية

services:
  app:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
      - "5555:5555"    # Prisma Studio
    environment:
      NODE_ENV: development
    command: pnpm dev

  db:
    ports:
      - "5432:5432"    # وصول مباشر من الأدوات المحلية

  redis:
    ports:
      - "6379:6379"    # وصول مباشر من redis-cli

  minio:
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # MinIO Console
```

طريقة التشغيل:
```bash
# تشغيل بيئة التطوير
docker compose -f compose.yaml -f compose.dev.yaml up -d

# تطبيق ترحيلات قاعدة البيانات
docker compose exec app pnpm prisma migrate dev

# فتح Prisma Studio
docker compose exec app pnpm prisma studio
# → http://localhost:5555

# عرض السجلات
docker compose logs -f app

# إيقاف كل شيء
docker compose -f compose.yaml -f compose.dev.yaml down
```

### 4.4 ملف الإنتاج المرجعي: compose.prod.example.yaml

```yaml
# compose.prod.example.yaml — تجاوزات بيئة الإنتاج (مثال مرجعي)
# confirmed — نسخ هذا الملف إلى compose.prod.yaml وقم بتعديله

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      app:
        condition: service_healthy
    networks:
      - ibn-al-azhar-docs-network

  app:
    build:
      target: production
    restart: unless-stopped
    environment:
      NODE_ENV: production
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    networks:
      - ibn-al-azhar-docs-network
    # لا يتم تعريض المنفذ في الإنتاج — Caddy يتولى الوكالة العكسية

  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      WORKER_MODE: "true"
    command: ["node", "dist/worker.js"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    networks:
      - ibn-al-azhar-docs-network

  db:
    restart: unless-stopped
    # لا يتم تعريض المنفذ في الإنتاج
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - ibn-al-azhar-docs-network

  redis:
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD:-}
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - ibn-al-azhar-docs-network

  minio:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - ibn-al-azhar-docs-network

volumes:
  caddy_data:
  caddy_config:

networks:
  ibn-al-azhar-docs-network:
    driver: bridge
```

### 4.5 أمر التشغيل الموحّد

لتبسيط تجربة المطور، نستخدم أمرًا موحّدًا عبر `Makefile` أو `package.json` scripts:

```bash
# التطوير المحلي (مجاني — لا بطاقة ائتمان) → confirmed
pnpm dev:docker
# يعادل: docker compose -f compose.yaml -f compose.dev.yaml up -d

# الإنتاج المحلي (اختبار قبل النشر الفعلي) → confirmed
pnpm prod:local
# يعادل: docker compose -f compose.yaml -f compose.prod.example.yaml up -d
```

### 4.6 ملخص موارد التطوير المحلي

| المورد | الاستهلاك التقديري | ملاحظات |
|--------|-------------------|---------|
| Next.js App | ~256-512 MB RAM | يعتمد على حجم التطبيق |
| PostgreSQL 16 | ~256 MB RAM | `shared_buffers=128MB` |
| Redis 7 | ~128 MB RAM | `maxmemory=256MB` + LRU |
| MinIO | ~256 MB RAM | يعتمد على حجم الملفات |
| العمال (BullMQ) | ~256 MB RAM | يعتمد على التزامن |
| **المجموع التقديري** | **~1.2-1.5 GB RAM** | `confirmed` — يعمل على أجهزة 8GB RAM |

---

## 5. متطلبات النطاق الفرعي (Subdomain Requirements)

النطاق الفرعي (subdomain) هو جزء أساسي من استضافة أي تطبيق ويب، ويؤثر بشكل مباشر على عدة جوانب تقنية: إعداد OAuth callback URLs، سياسة أمان المحتوى (CSP)، شهادات SSL/HTTPS، وتجربة المستخدم. في مشروع ابن الأزهر دوكس، نحتاج إلى توثيق واضح لمتطلبات النطاق الفرعي في كل بيئة من بيئات الاستضافة، لأن كل مزود يقدم نطاقات فرعية بتنسيقات مختلفة، وبعضها لا يوفر نطاقًا فرعيًا إطلاقًا.

### 5.1 النطاقات الفرعية حسب البيئة

| البيئة | النطاق المقترح | المزود | ملاحظات |
|--------|---------------|--------|---------|
| **التطوير المحلي** | `localhost:3000` | محلي | `confirmed` — لا يحتاج نطاق فرعي |
| **معاينة الواجهة (Cloudflare Pages)** | `ibn-al-azhar-docs.pages.dev` | Cloudflare | `confirmed` — نطاق فرعي مجاني |
| **معاينة الواجهة (Vercel)** | `ibn-al-azhar-docs.vercel.app` | Vercel | `confirmed` — نطاق فرعي مجاني |
| **نموذج أولي (HF Spaces)** | `ibn-al-azhar-docs.hf.space` | Hugging Face | `confirmed` — نطاق فرعي مجاني |
| **نموذج أولي (Render)** | `ibn-al-azhar-docs.onrender.com` | Render | `confirmed` — نطاق فرعي مجاني |
| **نموذج أولي (Railway)** | `ibn-al-azhar-docs.up.railway.app` | Railway | `confirmed` — نطاق فرعي مجاني |
| **Staging** | `staging.docs.ibnalazhar.com` | VPS مخصص | يحتاج نطاقًا مخصصًا |
| **الإنتاج** | `docs.ibnalazhar.com` أو `app.ibnalazhar.com` | VPS مخصص | يحتاج نطاقًا مخصصًا |

### 5.2 النطاقات الموصى بها للإنتاج

عند الانتقال إلى الإنتاج، يجب استخدام نطاق مخصص (custom domain) يعكس هوية المشروع. النطاقات الفرعية المجانية من المزودين (`*.vercel.app`، `*.pages.dev`) غير مناسبة للإنتاج لأسباب تتعلق بالاحترافية وثقة المستخدم وإعداد OAuth:

| النطاق المقترح | الغرض | الأولوية |
|---------------|--------|---------|
| `docs.ibnalazhar.com` | التطبيق الرئيسي — الإنتاج | أولوية قصوى إذا وُجد النطاق الأساسي |
| `app.ibnalazhar.com` | بديل — إذا كان `docs` مستخدمًا | أولوية ثانية |
| `ibnalazhar-docs.app` | نطاق مستقل إذا لم يتوفر النطاق الأساسي | `needs-verification` — يجب التحقق من التوفر |
| `ibn-al-azhar-docs.app` | بديل مع شرطات | `needs-verification` — يجب التحقق من التوفر |

### 5.3 تكلفة النطاق المخصص

| النطاق | السنة التقريبية | ملاحظات |
|--------|----------------|---------|
| `.com` | ~10-15$/سنة | الأكثر احترافية — إذا وُجد `ibnalazhar.com` |
| `.app` | ~12-20$/سنة | مناسب للتطبيقات — HTTPS إلزامي |
| `.dev` | ~12-20$/سنة | مناسب للمطورين — HTTPS إلزامي |
| `.edu` | متغير — غالبًا مقيد بالمؤسسات | قد لا يكون متاحًا |

### 5.4 تأثير النطاق على OAuth وCSP

تغيير النطاق يتطلب تحديث عدة إعدادات حرجة:

```bash
# يجب تحديث عند تغيير النطاق:
NEXTAUTH_URL=https://docs.ibnalazhar.com          # ← النطاق الجديد
AUTH_SECRET=<new-strong-secret>                     # ← إعادة توليد
GOOGLE_OAUTH_CALLBACK=https://docs.ibnalazhar.com/api/auth/callback/google

# في Google Cloud Console:
# → APIs & Services → Credentials → Authorized redirect URIs
# → أضف النطاق الجديد

# في Caddyfile:
docs.ibnalazhar.com {
    reverse_proxy app:3000
    # ... باقي الإعدادات
}
```

### 5.5 خارطة طريق النطاق

```
المرحلة 1 (التطوير):
  └─ localhost:3000 → confirmed — لا تكلفة

المرحلة 2 (النموذج الأولي):
  └─ ibn-al-azhar-docs.pages.dev → confirmed — مجاني
  └─ ibn-al-azhar-docs.hf.space → confirmed — مجاني

المرحلة 3 (MVP — إنتاج أولي):
  └─ docs.ibnalazhar.com → recommended-for-mvp
  └─ أو نطاق فرعي على VPS مع IP عام + Cloudflare DNS

المرحلة 4 (إنتاج مستقر):
  └─ docs.ibnalazhar.com → recommended-for-production
  └─ شهادة SSL عبر Caddy + Let's Encrypt → confirmed — مجاني
```

---

## 6. قرار الاستضافة لـ MVP (MVP Hosting Decision)

بعد تحليل جميع الخيارات في الأقسام السابقة، نصل الآن إلى القرار العملي: أين نستضيف كل بيئة من بيئات المشروع في مرحلة MVP؟ القرار ليس ثابتًا — يتطور مع نضج المشروع وزيادة عدد المستخدمين — لكن يجب أن يكون واضحًا ومحددًا في كل نقطة زمنية. نوضح هنا القرار الحالي مع التصنيفات الدقيقة لكل خيار.

### 6.1 قرارات الاستضافة الحالية

| البيئة | الخيار المختار | التصنيف | التكلفة | السبب |
|--------|---------------|---------|---------|-------|
| **التطوير المحلي** | Docker Compose (`compose.yaml` + `compose.dev.yaml`) | `confirmed` | 0$ | جميع الخدمات تعمل محليًا، لا اعتماد على الإنترنت، لا بطاقة ائتمان، تجربة مطور سلسة |
| **النموذج الأولي / العرض التوضيحي** | Hugging Face Spaces (Docker Space) | `prototype-only` | 0$ | موارد سخية (16GB RAM)، بدون بطاقة ائتمان، مناسب للعروض وتجارب OCR، لكن بقيود التخزين والخصوصية |
| **معاينة الواجهة الأمامية** | Cloudflare Pages أو Vercel | `needs-verification` | 0$ | مناسب لمعاينة SSR والواجهة، لكن لا يدعم الخدمات الخلفية — يجب ربطه بخادم خارجي أو استخدامه كواجهة فقط |
| **مرشح MVP كامل المكدس** | — (يُحدد بعد التحقق) | `needs-verification` | متغير | يجب التحقق من: (1) هل Oracle Cloud Free Tier VMs متاحة؟ (2) هل Fly.io لا يزال لا يتطلب بطاقة ائتمان؟ (3) هل Render Free Tier يُحذف بعد 90 يومًا فعلًا؟ |
| **إنتاج مستقر (موصى به)** | VPS ذاتي الاستضافة (Hetzner/Contabo) + Caddy + Docker Compose | `recommended-for-production` | ~5-16 يورو/شهر | التحكم الكامل، خصوصية البيانات، استقرار التخزين، فصل الخدمات، لا vendor lock-in |

### 6.2 تحليل قرار MVP الكامل

قرار استضافة MVP الكامل (التطبيق + قاعدة البيانات + Redis + MinIO + العمال) هو الأكثر تعقيدًا لأنه يتوازن بين ثلاثة عوامل: **التكلفة** (نريد مجاني أو شبه مجاني)، **الاستقرار** (نريد تخزين مستمر وخدمات موثوقة)، و**التعقيد** (نريد إعدادًا بسيطًا لا يحتاج خبرة DevOps عميقة).

الخياران المرشحان هما:

#### الخيار أ: Oracle Cloud Free Tier — مجاني دائم `needs-verification`

**المميزات:**
- 4 ARM Ampere VMs بإجمالي 24GB RAM — أكثر من كافٍ لجميع الخدمات
- دائم (لا تنتهي المدة التجريبية) — `confirmed` حسب وثائق Oracle
- يمكن تثبيت Docker + Docker Compose يدويًا
- IP عام + إمكانية نطاق مخصص عبر Cloudflare DNS

**العيوب:**
- **يتطلب بطاقة ائتمان** للتسجيل — `confirmed` — هذا يتعارض مع مبدأ "لا بطاقة ائتمان" لكنه مقبول للإنتاج (وليس للتطوير المحلي)
- **ARM VMs قد لا تكون متاحة فورًا** — قائمة انتظار `needs-verification`
- **إعداد يدوي معقد** — لا Docker Compose مُدار، يجب تثبيت كل شيء يدويًا
- **سمعة سيئة في دعم العملاء** — صعوبة في حل المشاكل `needs-verification`
- **خطر إغلاق الحساب** — تقارير عن إغلاق حسابات بدون تحذير واضح `needs-verification`

#### الخيار ب: VPS مدفوع (Hetzner CX22) — ~5 يورو/شهر `confirmed`

**المميزات:**
- تكلفة منخفضة وثابتة ومتوقعة
- إعداد Docker Compose مباشر — نفس بيئة التطوير المحلي
- أداء مستقر — لا مشاركة في الموارد (عكس Oracle ARM المشتركة)
- دعم فني سريع من Hetzner
- Caddy مع HTTPS تلقائي يعمل بشكل مثالي

**العيوب:**
- تكلفة شهرية (5 يورو = ~5.5$) — ليست مجانية
- نقطة فشل واحدة (VPS واحد)
- مسؤولية صيانة كاملة

### 6.3 القرار العملي

```
┌─────────────────────────────────────────────────────────────┐
│               قرار استضافة MVP — الحالي                      │
│                                                              │
│  1. التطوير المحلي:                                          │
│     └─ Docker Compose → confirmed → 0$                       │
│                                                              │
│  2. العرض التوضيحي / النموذج الأولي:                         │
│     └─ Hugging Face Spaces → prototype-only → 0$             │
│                                                              │
│  3. معاينة الواجهة:                                          │
│     └─ Cloudflare Pages → needs-verification → 0$            │
│     └─ (Vercel كبديل — needs-verification)                   │
│                                                              │
│  4. MVP كامل المكدس:                                         │
│     ├─ المرشح الأول: Oracle Cloud Free → needs-verification  │
│     │   (يتطلب: بطاقة ائتمان + توفر VM + إعداد يدوي)        │
│     └─ المرشح الثاني: Hetzner VPS → confirmed → 5 يورو/شهر  │
│         (يتطلب: بطاقة ائتمان + إعداد Docker Compose)         │
│                                                              │
│  5. الإنتاج المستقر:                                         │
│     └─ VPS + Caddy → recommended-for-production              │
│        (Hetzner CX32: ~9 يورو/شهر لـ 8GB RAM)               │
│                                                              │
│  ملاحظة: القرار النهائي لـ MVP الكامل يتطلب التحقق من:      │
│  □ هل Oracle Cloud ARM VMs متاحة بدون قائمة انتظار؟          │
│  □ هل Fly.io لا يزال يتطلب بطاقة ائتمان؟                    │
│  □ هل Render يحذف Free DB بعد 90 يومًا فعلًا؟               │
│  □ هل Koyeb Free tier مستقر بما يكفي لتشغيل Docker؟         │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. متغيرات البيئة للاستضافة (Hosting Environment Variables)

توحيد متغيرات البيئة عبر جميع بيئات الاستضافة هو أمر بالغ الأهمية لضمان اتساق سلوك التطبيق وتسهيل النقل بين البيئات. في هذا القسم نحدد المتغيرات المطلوبة للاستضافة مع قيمها الافتراضية للتطوير المحلي وملاحظات الأمان لكل متغير. الهدف هو أن يستطيع أي مطور نسخ `.env.example` وتشغيل المشروع فورًا، وأن يستطيع أي مشرف إعداد بيئة إنتاج بنفس المتغيرات مع قيم مختلفة.

### 7.1 متغيرات البيئة الموحدة

```bash
# ═══════════════════════════════════════════════════════════════
# ابن الأزهر دوكس — متغيرات البيئة الموحدة للاستضافة
# الإصدار: 4.1.0
# تنبيه: القيم أدناه هي أمثلة فقط — لا تستخدمها في الإنتاج!
# أنظر: 08_SECURITY_PRIVACY.md لسياسات الأسرار
# ═══════════════════════════════════════════════════════════════

# ── عام ──
APP_NAME="Ibn Al-Azhar Docs"
APP_URL="http://localhost:3000"              # NEXTAUTH_URL في بيئة الإنتاج
APP_VERSION="4.1.0"                          # يُحدّث تلقائيًا في CI

# ── قاعدة البيانات (PostgreSQL) ──
DATABASE_URL="postgresql://ibn_al_azhar_docs:ibn_al_azhar_docs_dev_password@db:5432/ibn_al_azhar_docs"
# ⚠️ مثال فقط — في الإنتاج استخدم كلمة مرور قوية ومتغيرة

# ── Redis ──
REDIS_URL="redis://redis:6379"
# في الإنتاج: redis://:strong-password@redis:6379

# ── MinIO (التخزين) ──
S3_ENDPOINT="http://minio:9000"
S3_ACCESS_KEY="minioadmin"                   # ⚠️ مثال فقط
S3_SECRET_KEY="minioadmin"                   # ⚠️ مثال فقط
S3_BUCKET="ibn-al-azhar-docs"

# ── المصادقة (NextAuth.js) ──
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""                           # ⚠️ توليد: openssl rand -hex 32
# ⚠️ مثال فقط — في الإنتاج استخدم سرًا قويًا وفريدًا

# ── حدود الرفع ──
MAX_UPLOAD_SIZE_MB=100

# ── روابط المشاركة ──
SHARE_TOKEN_BYTES=32

# ── مزود OCR ──
OCR_PROVIDER="google-drive"                  # google-drive | tesseract (V2)
```

### 7.2 متغيرات إضافية حسب البيئة

| المتغير | التطوير المحلي | HF Spaces (نموذج أولي) | VPS (إنتاج) |
|---------|---------------|----------------------|-------------|
| `APP_URL` | `http://localhost:3000` | `https://name-space.hf.space` | `https://docs.ibnalazhar.com` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://name-space.hf.space` | `https://docs.ibnalazhar.com` |
| `NEXTAUTH_SECRET` | (توليد محلي) | (توليد عشوائي) | (سر إنتاجي قوي + دوران) |
| `DATABASE_URL` | `...@db:5432/...` | `...@localhost:5432/...` | `...@db:5432/...` + كلمة مرور قوية |
| `REDIS_URL` | `redis://redis:6379` | `redis://localhost:6379` | `redis://:password@redis:6379` |
| `S3_ENDPOINT` | `http://minio:9000` | (نظام ملفات محلي) | `http://minio:9000` (داخلي) |
| `NODE_ENV` | `development` | `production` | `production` |
| `DOMAIN` | `localhost` | `name-space.hf.space` | `docs.ibnalazhar.com` |

### 7.3 متغيرات يجب عدم الالتزام بقيمها الافتراضية في الإنتاج

| المتغير | القيمة الافتراضية (تطوير) | لماذا يجب تغييرها في الإنتاج |
|---------|--------------------------|---------------------------|
| `NEXTAUTH_SECRET` | فارغ أو `dev-secret-change-in-production` | بدون سر قوي، يمكن تزوير جلسات المستخدمين |
| `DATABASE_URL` | كلمة مرور `ibn_al_azhar_docs_dev_password` | كلمة المرور الافتراضية معروفة ومُخترقة فورًا |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `minioadmin` / `minioadmin` | بيانات الدخول الافتراضية معروفة عالميًا |
| `REDIS_URL` | بدون كلمة مرور | Redis مفتوح يمكن الوصول إليه من أي مكان |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | كلمة المرور الافتراضية — اختراق مؤكد |

### 7.4 إدارة الأسرار في كل بيئة

| البيئة | الطريقة | مستوى الأمان | ملاحظات |
|--------|---------|-------------|---------|
| **التطوير المحلي** | ملف `.env` (في `.gitignore`) | أساسي | `confirmed` — مناسب للتطوير |
| **HF Spaces** | Repository Secrets | متوسط | `needs-verification` — مشفّر لكن على منصة طرف ثالث |
| **VPS (إنتاج)** | Docker Secrets أو `.env` مع صلاحيات مقيدة | عالي | `confirmed` — الملف يملكه root فقط (chmod 600) |
| **CI/CD** | GitHub Actions Secrets | عالي | `confirmed` — مشفّر ولا يظهر في السجلات |

---

## 8. توصيات المرحلة (Phase Recommendations)

استراتيجية الاستضافة يجب أن تتطور مع نضج المشروع. لا يمكننا استخدام نفس الحل في كل مرحلة — فما يناسب النموذج الأولي لا يناسب الإنتاج، وما يناسب 10 مستخدمين لا يناسب 1000. في هذا القسم نحدد توصيات محددة لكل مرحلة من مراحل المشروع، مع خطة انتقال واضحة بين المراحل. التوصيات مبنية على تحليل واقعي للإمكانيات والقيود، وليس على افتراضات مثالية.

### 8.1 المرحلة 1: التطوير والبناء (الأسابيع 1-4)

**الهدف:** بناء الميزات الأساسية محليًا، إثبات المفهوم التقني.

| الجانب | التوصية | التصنيف | التكلفة |
|--------|---------|---------|---------|
| بيئة التطوير | Docker Compose محليًا | `confirmed` | 0$ |
| قاعدة البيانات | PostgreSQL في Docker | `confirmed` | 0$ |
| التخزين | MinIO في Docker | `confirmed` | 0$ |
| الطوابير | Redis + BullMQ في Docker | `confirmed` | 0$ |
| المصادقة | NextAuth.js محلي + Google OAuth | `confirmed` | 0$ |
| التحكم بالإصدارات | GitHub (مستودع عام) | `confirmed` | 0$ |

**الإجراءات المطلوبة:**
- [ ] إعداد `compose.yaml` و`compose.dev.yaml` — `confirmed`
- [ ] تأكيد عمل جميع الخدمات معًا محليًا — `confirmed`
- [ ] إعداد Google Cloud Project لحصة OCR المجانية — `confirmed`
- [ ] كتابة `.env.example` مع قيم آمنة للتطوير — `confirmed`

### 8.2 المرحلة 2: النموذج الأولي والعرض التوضيحي (الأسابيع 5-6)

**الهدف:** عرض تطبيق يعمل لفريق المنتج وأصحاب المصلحة.

| الجانب | التوصية | التصنيف | التكلفة |
|--------|---------|---------|---------|
| العرض التوضيحي الكامل | Hugging Face Spaces (Docker Space) | `prototype-only` | 0$ |
| معاينة الواجهة فقط | Cloudflare Pages أو Vercel | `needs-verification` | 0$ |
| التطوير المستمر | Docker Compose محليًا | `confirmed` | 0$ |

**إجراءات الانتقال:**
- [ ] إنشاء Docker Space على HF Spaces — `confirmed`
- [ ] تعديل Dockerfile ليعمل على HF Spaces (supervisord) — `prototype-only`
- [ ] اختبار العرض التوضيحي من أجهزة مختلفة — `prototype-only`
- [ ] إعداد Cloudflare Pages للواجهة (إذا لزم) — `needs-verification`

### 8.3 المرحلة 3: MVP وإنتاج أولي (الأسابيع 7-10)

**الهدف:** إطلاق التطبيق لمجموعة أولية من المستخدمين الحقيقيين (10-50 مستخدم).

| الجانب | التوصية | التصنيف | التكلفة |
|--------|---------|---------|---------|
| الاستضافة | VPS (Hetzner CX22: 2 vCPU, 4GB RAM, 80GB SSD) | `recommended-for-mvp` | ~5 يورو/شهر |
| الوكيل العكسي | Caddy مع HTTPS تلقائي | `confirmed` | 0$ (ضمن VPS) |
| قاعدة البيانات | PostgreSQL في Docker على VPS | `confirmed` | 0$ (ضمن VPS) |
| التخزين | MinIO في Docker على VPS | `confirmed` | 0$ (ضمن VPS) |
| الطوابير | Redis + BullMQ في Docker على VPS | `confirmed` | 0$ (ضمن VPS) |
| النطاق | نطاق مخصص (`docs.ibnalazhar.com` أو بديل) | `recommended-for-mvp` | ~1-2$/شهر |
| DNS | Cloudflare Free DNS | `confirmed` | 0$ |
| المراقبة | UptimeRobot Free (50 monitor) | `confirmed` | 0$ |
| تتبع الأخطاء | Sentry Free (5K events/شهر) | `confirmed` | 0$ |
| CI/CD | GitHub Actions (مستودع عام) | `confirmed` | 0$ |
| النسخ الاحتياطي | `pg_dump` يومي + MinIO mc mirror | `confirmed` | 0$ (ضمن VPS) |

**إجراءات الانتقال:**
- [ ] شراء/إعداد VPS على Hetzner — `confirmed`
- [ ] إعداد نظام التشغيل (Ubuntu + Docker + firewall) — `confirmed`
- [ ] نسخ `compose.prod.example.yaml` إلى `compose.prod.yaml` — `confirmed`
- [ ] إعداد Caddy مع النطاق المخصص — `confirmed`
- [ ] نقل المتغيرات البيئية من التطوير إلى الإنتاج — `confirmed`
- [ ] إعداد النسخ الاحتياطي التلقائي — `confirmed`
- [ ] إعداد UptimeRobot للمراقبة — `confirmed`
- [ ] اختبار النشر الكامل من GitHub Actions — `needs-verification`

**التكلفة الإجمالية التقديرية للمرحلة 3:** ~6-7$/شهر

### 8.4 المرحلة 4: النمو الأولي (100-500 مستخدم)

**الهدف:** توسيع البنية لاستيعاب نمو القاعدة.

| الجانب | التوصية | التصنيف | التكلفة |
|--------|---------|---------|---------|
| الاستضافة | ترقية VPS (Hetzner CX32: 8GB RAM) | `recommended-for-production` | ~9 يورو/شهر |
| CDN | Cloudflare Free (تسريع المحتوى الثابت) | `confirmed` | 0$ |
| المراقبة المتقدمة | Grafana Loki (تجميع سجلات) على VPS | `needs-verification` | 0$ (ضمن VPS) |
| البريد الإلكتروني | Resend Free (100 email/يوم) | `confirmed` | 0$ |

**إجراءات الانتقال:**
- [ ] ترقية VPS أو الانتقال إلى VPS أكبر — `confirmed`
- [ ] إعداد Grafana + Loki + Prometheus — `needs-verification`
- [ ] إعداد Resend للبريد الإلكتروني — `needs-verification`
- [ ] مراجعة أداء PostgreSQL وتحسين الاستعلامات — `confirmed`

### 8.5 المرحلة 5: الإنتاج المتقدم (500+ مستخدم)

**الهدف:** بنية موزعة عالية التوفر.

| الجانب | التوصية | التصنيف | التكلفة |
|--------|---------|---------|---------|
| التطبيق | VPS مخصص للتطبيق | `recommended-for-production` | ~9 يورو/شهر |
| قاعدة البيانات | VPS مخصص لـ PostgreSQL أو Supabase Pro | `needs-verification` | 0-25$/شهر |
| العمال | VPS مخصص لـ BullMQ workers | `recommended-for-production` | ~5 يورو/شهر |
| التخزين | MinIO distributed أو Cloudflare R2 | `needs-verification` | متغير |
| البحث | Meilisearch مُستضاف ذاتيًا | `needs-verification` | 0$ (ضمن VPS) |
| OCR بديل | Tesseract + Arabic traineddata محليًا | `needs-verification` | 0$ (ضمن VPS) |

### 8.6 خارطة طريق الاستضافة المرئية

```
المرحلة 1                    المرحلة 2                  المرحلة 3
التطوير (0$)          النموذج الأولي (0$)          MVP (6$/شهر)
───────────────       ──────────────────          ─────────────────
│ Docker Compose │    │ HF Spaces       │         │ VPS Hetzner    │
│ localhost:3000 │    │ Docker Space     │         │ Caddy + HTTPS  │
│ PostgreSQL     │    │ prototype-only   │         │ PostgreSQL     │
│ Redis          │    │                  │         │ Redis          │
│ MinIO          │ ──▶│ معاينة واجهة     │  ──▶    │ MinIO          │
│ BullMQ         │    │ Cloudflare Pages │         │ BullMQ Workers │
│ .env محلي      │    │ أو Vercel        │         │ نطاق مخصص      │
│ Google OAuth   │    │ needs-verif      │         │ UptimeRobot    │
                  │    │                  │         │ Sentry Free    │
                  │    │                  │         │ GitHub Actions │
                  │
                  │    المرحلة 4                  المرحلة 5
                  │    النمو (~15$/شهر)          المتقدم (متغير)
                  │    ──────────────────          ─────────────────
                  └─▶  │ VPS أكبر         │   ──▶   │ VPS موزّع      │
                       │ Grafana Loki     │         │ DB مخصصة       │
                       │ Cloudflare CDN   │         │ عمال مخصصون    │
                       │ Resend Email     │         │ MinIO distrib  │
                       │ needs-verif      │         │ Meilisearch    │
                       │                  │         │ Tesseract OCR  │
```

### 8.7 مبادئ الانتقال بين المراحل

عند الانتقال من مرحلة إلى أخرى، نلتزم بالمبادئ التالية:

| المبدأ | الشرح |
|--------|-------|
| **لا قفزات مفاجئة** | كل انتقال يجب أن يكون تدريجيًا — لا ننتقل من Docker Compose محلي إلى Kubernetes مباشرة |
| **الحفاظ على التوافق** | `compose.yaml` الأساسي يجب أن يعمل في كل المراحل — التجاوزات فقط تختلف |
| **التحقق قبل الالتزام** | كل خيار `needs-verification` يجب التحقق منه عمليًا قبل الاعتماد عليه |
| **التكلفة مبررة** | كل دولار إضافي يجب أن يكون مبررًا بحاجة فعلية (مستخدمين أكثر، أداء أفضل، موثوقية أعلى) |
| **العودة ممكنة** | يجب أن نتمكن من العودة إلى المرحلة السابقة إذا فشل الانتقال |
| **التوثيق أولاً** | كل تغيير في الاستضافة يُوثّق في هذه الوثيقة مع التصنيف المناسب |

---

## ملحق أ: قائمة التحقق السريعة للاستضافة

استخدم هذه القائمة لتقييم أي خيار استضافة جديد:

- [ ] هل يتطلب بطاقة ائتمان للتسجيل؟ (يُفضل "لا" للتطوير)
- [ ] هل يدعم Docker/Docker Compose؟
- [ ] هل يوفر تخزينًا مستمرًا مضمونًا؟
- [ ] هل يمكن تشغيل PostgreSQL وRedis وMinIO ضمن نفس البيئة؟
- [ ] هل يدعم عمليات خلفية طويلة الأمد (BullMQ workers)؟
- [ ] هل يوفر نطاقًا فرعيًا مجانيًا أو يدعم نطاقًا مخصصًا؟
- [ ] هل يوفر HTTPS تلقائيًا (أو عبر Caddy/Nginx)؟
- [ ] ما هي حدود Free tier (RAM، CPU، تخزين، شبكة)؟
- [ ] هل البيانات آمنة وخاصة؟
- [ ] ما هي سياسة الحذف عند عدم النشاط؟
- [ ] هل يمكن الترقية بسلاسة عند الحاجة؟
- [ ] ما هي تكلفة الترقية؟

---

## ملحق ب: مراجع

| المرجع | الوصف |
|--------|-------|
| `ADR-013-self-hosting-free-first.md` | قرار الاستضافة الذاتية / المجانية أولًا |
| `10_DEVOPS_DEPLOYMENT.md` | التفاصيل التقنية الكاملة للنشر |
| `11_COST_AND_OPERATIONS.md` | تحليل التكاليف والعمليات |
| `08_SECURITY_PRIVACY.md` | سياسات الأسرار والأمان |
| `22_REPO_STRUCTURE.md` | هيكل المستودع وملفات Docker Compose |
| `13_PHASE_1_PLAN.md` | خطة المرحلة الأولى |

---

> **ملاحظة ختامية:** هذه الوثيقة وثيقة حيّة — تتطلب مراجعة وتحديثًا دوريًا مع كل تغيير في سياسات المزودين أو متطلبات المشروع. أي حقل موسوم بـ `needs-verification` يمثل فجوة معرفية يجب سدّها قبل اتخاذ قرار نهائي. لا تعتمد على معلومات غير مؤكدة في قرارات الإنتاج.
