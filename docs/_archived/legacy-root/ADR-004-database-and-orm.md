# ADR-004: Database and ORM - PostgreSQL + Prisma

## الحالة (Status)
Accepted

## السياق (Context)
منصة مستند / DocEd تحتاج إلى قاعدة بيانات موثوقة تخزن: بيانات المستخدمين، بيانات الملفات والمستندات (metadata)، سجلات التحويل والمعالجة، إعدادات المشاركة، وسجلات المراجعة (audit logs). المشروع مكتوب بـ TypeScript، لذا نحتاج إلى تكامل قوي مع TypeScript لتقليل الأخطاء وتحسين تجربة المطور. المؤسسات التعليمية المستهدفة قد يكون لديها متطلبات خصوصية بيانات تحتم استضافة ذاتية لقاعدة البيانات. نحتاج أيضًا إلى دعم JSON fields لتخزين metadata المرنة، وfull-text search للبحث في المستندات.

## القرار (Decision)
اخترنا PostgreSQL 16 كقاعدة بيانات رئيسية مع Prisma 6 كـ ORM. PostgreSQL يوفر موثوقية عالية، دعم JSONB للبيانات المرنة، full-text search مدمج (بما فيها دعم العربية المحدود)، وextended features مثلRow Level Security. Prisma يوفر TypeScript type safety تلقائي، migrations مدارة، وPrisma Studio لاستعراض البيانات.

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

## العواقب (Consequences)
- **إيجابية:** تكامل TypeScript ممتاز يقلل أخطاء وقت التشغيل، schema واحد هو مصدر الحقيقة (single source of truth)، migrations مدارة تقلل مخاطر تغيير قاعدة البيانات، PostgreSQL موثوق ومجرب في الإنتاج، JSONB يوفر مرونة في تخزين metadata، إمكانية الترقية إلى ميزات PostgreSQL المتقدمة (RLS، partitioning، materialized views)
- **سلبية:** Prisma Engine يستهلك ذاكرة إضافية (~20-30MB)، بعض الاستعلامات المعقدة تحتاج $queryRaw وتفقد type safety، Prisma Client generation يبطئ عملية البناء، أداء Prisma أقل بقليل من raw SQL أو Drizzle في الاستعلامات البسيطة
- **مخاطر:** اعتمادنا على Prisma يعني أننا نتأثر بقرارات فريق Prisma (تغييرات في الترخيص، breaking changes). لكن Prisma مفتوح المصدر ويمكن الانتقال لـ Drizzle لاحقًا مع جهد معقول.

## المتابعة (Follow-up)
- تصميم database schema الأولي (users، files، conversions، shares، audit_logs)
- تحديد استراتيجية الـ migrations (development vs production)
- إعداد PostgreSQL instance للاستضافة الذاتية (انظر ADR-013)
- تكوين Prisma للاستخدام مع SQLite في التطوير المحلي و PostgreSQL في الإنتاج
- تقييم الحاجة لـ connection pooling (PgBouncer) مع Prisma
- دراسة دعم full-text search العربي في PostgreSQL وبدائله (Meilisearch)
