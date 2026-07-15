# ⚡ Quick Start - إبن الأزهر للمستندات

## 🚀 تشغيل المشروع في 3 خطوات

### 1. التثبيت
```bash
# Clone (إذا لم يتم)
git clone <repository-url>
cd Ibn_Al_Azhar_Docs

# Install dependencies
pnpm install
```

### 2. تشغيل البيئة المحلية
```bash
# Start infrastructure (PostgreSQL, Redis)
./ibn.sh dev-infra

# Start web app
pnpm --filter @ibn-al-azhar-docs/web dev
```

### 3. افتح المتصفح
```
http://localhost:3000
```

---

## 🔥 الإصلاحات الجديدة (يوليو 2026)

### ما تم إصلاحه:
✅ **أداء فوري** - القائمة الجانبية الآن تستجيب في أقل من 100ms (كانت 30 ثانية)  
✅ **أمان كامل** - 5 ثغرات أمنية حرجة تم إغلاقها  
✅ **فلترة المعالجة** - يمكنك الآن تصفية الملفات حسب الحالة  
✅ **إصلاح العدادات** - Dashboard الآن يعرض العدد الصحيح للملفات  
✅ **استمرارية الملفات** - الملفات لا تختفي بعد إعادة التشغيل  

### الأداء:
| المقياس | قبل | بعد |
|---------|-----|-----|
| سرعة القائمة | 30 ثانية | <0.1 ثانية |
| النقرات المطلوبة | 2-5 | 1 |
| استعلام قاعدة البيانات | ~200ms | ~50ms |

---

## 📚 الوثائق الكاملة

### للتشغيل:
- **[DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)** - دليل النشر الكامل

### للمطورين:
- **[AGENTS.md](./.kiro/steering/AGENTS.md)** - قواعد المشروع
- **[docs/FIXES_SUMMARY_JULY_2026.md](./docs/FIXES_SUMMARY_JULY_2026.md)** - ملخص كل الإصلاحات

### للتفاصيل التقنية:
- **[docs/SECURITY_FIXES_2025.md](./docs/SECURITY_FIXES_2025.md)** - الأمان
- **[docs/PERFORMANCE_FIXES_2025.md](./docs/PERFORMANCE_FIXES_2025.md)** - الأداء
- **[docs/DASHBOARD_FIXES_2025.md](./docs/DASHBOARD_FIXES_2025.md)** - Dashboard
- **[docs/STORAGE_PERSISTENCE.md](./docs/STORAGE_PERSISTENCE.md)** - التخزين

---

## 🧪 الاختبار

### اختبار سريع:
```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Tests
pnpm test
```

### اختبار شامل:
```bash
# Full pre-push baseline
pnpm ci:all
```

---

## 🆘 مشاكل شائعة

### المشكلة: القائمة الجانبية بطيئة
```bash
# امسح cache
rm -rf apps/web/.next
pnpm --filter @ibn-al-azhar-docs/web dev
```

### المشكلة: الملفات تختفي بعد Restart
```bash
# تحقق من Docker volume
docker-compose ps
docker volume ls | grep storage
```

### المشكلة: Database indexes مش موجودة
```bash
cd packages/database
pnpm prisma generate
pnpm prisma migrate deploy
```

---

## ✅ جاهز للإنتاج!

كل شيء جاهز الآن. اتبع **[DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)** للنشر.

**الحالة:** ✅ جاهز للتسليم للعميل  
**التاريخ:** 15 يوليو 2026
