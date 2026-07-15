# مشكلة اختفاء الملفات بعد إعادة التشغيل (Storage Persistence)

## المشكلة
الملفات المرفوعة تختفي بعد عمل restart/rebuild للتطبيق.

## السبب
يوجد وضعان للتخزين في المشروع:

### 1. **MinIO (S3-compatible) - الإعداد الافتراضي المُوصى به**
- ✅ **الملفات تُحفظ بشكل دائم** في Docker volume `miniodata`
- ✅ البيانات تبقى بعد `docker compose restart`
- ✅ البيانات تبقى بعد `docker compose down && docker compose up`
- ⚠️ البيانات تُحذف فقط مع `docker compose down -v` (حذف volumes)

### 2. **Local Storage - للتطوير فقط**
- ❌ **الملفات تُحذف** بعد rebuild/restart
- السبب: الملفات تُخزن داخل الـ container في `/data`
- المشكلة: Docker containers هي ephemeral (مؤقتة)

## الحل

### ✅ **الحل المُوصى به: استخدام MinIO (الافتراضي)**

تأكد أن إعداداتك في `.env` هي:

```bash
# لا تضع STORAGE_DRIVER أو اتركها فارغة
# STORAGE_DRIVER=  # محذوفة أو معلقة

# إعدادات MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=ibnalazhardocs
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

### 🔧 **إذا كنت تريد استخدام Local Storage (غير مُوصى به)**

أضف volume mapping في `docker-compose.yml`:

```yaml
services:
  web:
    volumes:
      - ./data:/data  # إضافة هذا السطر
```

**ملاحظة مهمة:** Local storage غير مُوصى به لأنه:
- لا يدعم horizontal scaling
- أبطأ من MinIO في العمليات المتزامنة
- لا يوجد له backup strategy سهلة

## التحقق من حالة التخزين الحالية

```bash
# تحقق من storage driver المستخدم
docker compose logs web | grep "Storage driver selected"

# تحقق من وجود بيانات في MinIO
docker compose exec minio mc ls local/ibnalazhardocs

# تحقق من volumes الموجودة
docker volume ls | grep ibn
```

## Backup للبيانات

### MinIO Backup (مُوصى به)
```bash
# Backup
docker run --rm -v ibn-al-azhar-docs_miniodata:/data -v $(pwd)/backups:/backup alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm -v ibn-al-azhar-docs_miniodata:/data -v $(pwd)/backups:/backup alpine sh -c "cd /data && tar xzf /backup/minio-backup-YYYYMMDD.tar.gz"
```

### PostgreSQL Backup (تلقائي)
- Backup تلقائي يومي عبر Ofelia scheduler
- الملفات تُحفظ في volume `pgdata`

## الأسئلة الشائعة

### Q: الملفات اختفت بعد `docker compose restart`
**A:** إذا كنت تستخدم MinIO (الافتراضي)، الملفات **لا** تختفي. تحقق:
```bash
docker volume ls | grep miniodata
docker compose exec minio ls /data
```

### Q: الملفات اختفت بعد `docker compose down`
**A:** `docker compose down` بدون `-v` **يحفظ** volumes. مع `-v` يحذفها.

### Q: كيف أنظف كل شي وأبدأ من جديد؟
```bash
# ⚠️ تحذير: هذا يحذف كل البيانات (database + files)!
docker compose down -v
docker compose up -d
```

### Q: كيف أنقل البيانات من server لآخر؟
```bash
# 1. Backup volumes
docker run --rm -v ibn-al-azhar-docs_miniodata:/data -v $(pwd):/backup alpine tar czf /backup/minio.tar.gz -C /data .
docker run --rm -v ibn-al-azhar-docs_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/postgres.tar.gz -C /data .

# 2. نقل الملفات للسيرفر الجديد

# 3. Restore volumes
docker run --rm -v ibn-al-azhar-docs_miniodata:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/minio.tar.gz"
docker run --rm -v ibn-al-azhar-docs_pgdata:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/postgres.tar.gz"
```

## ملخص

- ✅ **استخدم MinIO** (الافتراضي) - الملفات محفوظة بشكل دائم
- ❌ **تجنب local storage** - الملفات تُحذف مع restart
- 🔄 **`docker compose restart`** - لا يحذف volumes
- 🔄 **`docker compose down`** - لا يحذف volumes
- ⚠️ **`docker compose down -v`** - يحذف كل volumes (استخدم بحذر!)
