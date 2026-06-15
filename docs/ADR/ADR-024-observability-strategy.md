# ADR-024: إستراتيجية المراقبة والرصد (Observability Strategy)

## الحالة (Status)

Proposed

## السياق (Context)

مع وجود عدة خدمات (Next.js, PostgreSQL, Redis, MinIO, Worker) نحتاج رصداً مركزياً. بيئة $6/month VPS تمنع استخدام حلول مراقبة ثقيلة (Datadog, New Relic).

## القرار (Decision)

### المكدس (Stack)

| المجال                    | الأداة                                        | السبب                           |
| ------------------------- | --------------------------------------------- | ------------------------------- |
| **سجلات (Logs)**          | Pino (Node.js) + Winston (Worker)             | خفيف، JSON logs، يدعم transport |
| **مقاييس (Metrics)**      | Prometheus client (Node.js)                   | خفيف جداً، متوافق مع Grafana    |
| **رسم بياني (Dashboard)** | Grafana (اختياري — فقط إذا توفرت ذاكرة كافية) | تصور المقاييس                   |
| **خطأ (Error Tracking)**  | Sentry (self-hosted أو SaaS مجاني)            | تتبع الأعطال مع stack traces    |
| **uptime**                | Uptime Kuma (حاوية منفصلة)                    | مراقبة توفر الخدمات             |
| **Healthchecks**          | Docker healthcheck + Express `/health`        | كشف فوري عن الخدمات المتوقفة    |

### السجلات الهيكلية (Structured Logging)

```json
{
  "level": "info",
  "timestamp": "2026-05-24T10:00:00Z",
  "service": "converter",
  "jobId": "abc123",
  "duration": 1234,
  "pagesProcessed": 5,
  "error": null
}
```

### المقاييس الأساسية

- `http_requests_total` — عدد الطلبات (مع tags: method, path, status)
- `http_request_duration_ms` — زمن الاستجابة (histogram)
- `conversion_jobs_total` — عدد مهام التحويل
- `conversion_job_duration_ms` — زمن التحويل
- `conversion_job_pages` — عدد الصفحات لكل تحويل
- `queue_depth` — عمق BullMQ queue
- `memory_usage_bytes` — استهلاك الذاكرة لكل خدمة

### نقاط النهاية (Endpoints)

| المسار          | الوصف                              | الخدمات      |
| --------------- | ---------------------------------- | ------------ |
| `/health`       | Health check بسيط (UP/DOWN)        | جميع الخدمات |
| `/health/ready` | Readiness check (DB, Redis, MinIO) | API + Worker |
| `/metrics`      | Prometheus metrics                 | API + Worker |

### الصحة (Healthchecks)

```
طبقة 1: Docker healthcheck — هل الحاوية حية؟
طبقة 2: /health endpoint — هل الخدمة جاهزة؟
طبقة 3: Uptime Kuma — هل كل شيء يعمل من الخارج؟
```

## البدائل المعتبرة

| الحل                       | التكلفة                   | الوزن | القرار     |
| -------------------------- | ------------------------- | ----- | ---------- |
| Datadog                    | عالية (مجاناً 1 host فقط) | ثقيل  | ❌ رفض     |
| Grafana Cloud              | مجاني محدود               | متوسط | 🟡 اختياري |
| Prometheus + Node exporter | مجاني                     | خفيف  | ✅ مختار   |
| Sentry                     | مجاني (3000 events/شهر)   | خفيف  | ✅ مختار   |

## العواقب

- **إيجابية:** تكلفة صفرية، متوافق مع VPS $6، يمكن البدء بـ Pino فقط ثم إضافة Prometheus لاحقاً
- **سلبية:** Prometheus + Grafana قد يستهلكان ~200MB RAM (قد لا يتسع في VPS) — الحل: البدء بـ Pino فقط، إضافة Prometheus عند الحاجة
- **مخاطر:** عدم وجود tracing كامل (Jaeger/Zipkin) — مقبول لـ MVP، يُضاف في Phase 3+

## المتابعة

- [ ] إعداد Pino في `apps/web/` مع تنسيق JSON
- [ ] إضافة `/health` endpoint لكل خدمة
- [ ] إعداد Prometheus client في الـ Worker
- [ ] إعداد Uptime Kuma حاوية منفصلة
- [ ] إعداد Sentry للـ Error Tracking
