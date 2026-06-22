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
