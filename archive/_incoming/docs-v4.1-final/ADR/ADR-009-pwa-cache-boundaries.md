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
