# تقرير التدقيق الأمني — Security Reviewer Report

**التاريخ:** 2026-05-24  
**المراجِع:** Security-reviewer agent  
**المرحلة:** Phase 0 (توثيق وتخطيط)

---

## ملخص النتائج

| المستوى | العدد | التفاصيل |
|---------|-------|----------|
| 🔴 حرج (Critical) | 1 | SECURITY.md فارغ |
| 🟠 متوسط (Medium) | 3 | MinIO healthcheck معطل، latest tag، Redis بدون كلمة مرور |
| 🟡 خفيف (Low) | 2 | PostgreSQL مكشوف، .env.example غير مكتمل |
| 🟢 معلوماتي (Info) | 3 | لا Dockerfiles (Phase 0)، .gitignore جيد، خط الأساس الأمني موثق |

---

## 1. 🔴 SECURITY.md — فارغ (Critical)

**الملف:** `/SECURITY.md` (0 بايت)

**المشكلة:** ملف سياسة الأمان على جذر المستودع فارغ تماماً. هذا الملف مهم لأنه:
- يوجه من يكتشف ثغرة أمنية كيف يبلغ عنها
- مطلوب لمشاريع مفتوحة المصدر جادة (GitHub يظهره تلقائياً)
- غيابه قد يؤدي إلى تسريب ثغرات دون إبلاغ مناسب

**التوصية:** ملء الملف فوراً بسياسة إبلاغ عن الثغرات (coordinated disclosure policy).

---

## 2. 🟠 MinIO Healthcheck معطل (Medium)

**الملف:** `docker-compose.dev.yml:49-53`

```yaml
healthcheck:
  test: ["CMD", "mc", "ready", "local"]
```

**المشكلة:** صورة `minio/minio` لا تحتوي على أداة `mc` (MinIO Client). هذا يعني أن healthcheck سيفشل دائماً.

**التوصية:** استبدال بـ:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 3. 🟠 استخدام `latest` tag (Medium)

**الملف:** `docker-compose.dev.yml:37`

```yaml
image: minio/minio:latest
```

**المشكلة:** `latest` tag غير مستقر وقد يؤدي إلى كسر التوافق بعد تحديث غير متوقع.

**التوصية:** تثبيت الإصدار: `minio/minio:RELEASE.2024-12-01T00-00-00Z` أو أحدث إصدار مستقر.

---

## 4. 🟠 Redis بدون كلمة مرور (Medium)

**الملف:** `docker-compose.dev.yml:22-34`

**المشكلة:** Redis يعمل بدون كلمة مرور (لا `REDIS_PASSWORD`). هذا مقبول في بيئة التطوير المحلية لكن:
- لو تعرض port 6379 للشبكة الخارجية، يمكن لأي شخص الوصول إلى Redis
- يحتوي BullMQ queues التي قد تحتوي على بيانات حساسة

**التوصية:** إضافة `REDIS_PASSWORD` في `.env.example` وتفعيله في `docker-compose.dev.yml`:
```yaml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD:-dev_password}
```

---

## 5. 🟡 PostgreSQL مكشوف (Low)

**الملف:** `docker-compose.dev.yml:8-9`

```yaml
ports:
  - "5432:5432"
```

**المشكلة:** قاعدة البيانات مكشوفة على localhost فقط (وهو المعتاد للتطوير المحلي). لكن لا توجد شبكة Docker مخصصة تعزل الخدمات.

**التوصية:** إنشاء شبكة Docker داخلية للخدمات الخلفية:
```yaml
networks:
  internal:
    driver: bridge
```

---

## 6. 🟡 .env.example غير مكتمل (Low)

**الملف:** `.env.example`

**المفقود:** المتغيرات التالية غير موثقة:
- `CONVERTER_DPI` — من ADR-022 / spec 004
- `CONVERTER_MAX_PAGES` — من spec 004
- `CONVERTER_JOB_TIMEOUT_MS` — من spec 004
- `SURYA_MODEL_DIR` — من ADR-022
- `SURYA_LANG` — من ADR-022
- `NEXT_PUBLIC_APP_URL` — لتطبيق Next.js
- `DOCKER_DEFAULT_PLATFORM` — للتوافق

**التوصية:** إضافة هذه المتغيرات قبل Phase 1.

---

## 7. 🟢 نقاط إيجابية

| البند | الحالة |
|-------|--------|
| `.gitignore` | ✅ جيد — يغطي node_modules, .env, dist, next, coverage |
| `docs/08_SECURITY_PRIVACY.md` | ✅ وثيقة أمان شاملة موجودة |
| `ADR-010-security-baseline.md` | ✅ خط أساس أمني موثق |
| لا API keys في الكود | ✅ نظيف (مقبول لـ Phase 0) |
| `opencode.json` | ✅ لا secrets |
| `.aider.*` في `.gitignore` | ✅ متضمن |

---

## 8. التوصيات لـ Phase 1

| الأولوية | الإجراء | المبرر |
|----------|---------|--------|
| 🔴 عاجل | ملء SECURITY.md | مطلوب لمشروع مفتوح المصدر |
| 🔴 عاجل | إصلاح MinIO healthcheck | يمنع `docker:up` من الوصول لـ healthy |
| 🟠 ضروري | إضافة شبكة Docker داخلية | عزل الخدمات الخلفية |
| 🟠 ضروري | تثبيت إصدارات Docker | منع الكسر المفاجئ |
| 🟠 ضروري | إضافة Redis password | حماية queue data |
| 🟡 موصى به | إكمال .env.example | توثيق كل المتغيرات |
| 🟡 موصى به | إضافة secrets scanning | منع تسرب المفاتيح |

---

## التقييم العام

```
الدرجة: 65/100 — 🟠 مقبول مع تحفظات
الخلاصة: لا توجد ثغرات حرجة فورية (لأن المشروع في Phase 0).
          التحسينات المطلوبة بسيطة ويجب تطبيقها قبل بدء Phase 1.
```
