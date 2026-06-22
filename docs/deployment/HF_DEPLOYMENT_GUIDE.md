# HF_DEPLOYMENT_GUIDE.md — HuggingFace Spaces Deployment

## الخطة المجانية بالكامل (بدون فيزا)

| الخدمة                 | الدور                               | السعر | التسجيل         |
| ---------------------- | ----------------------------------- | ----- | --------------- |
| **HuggingFace Spaces** | Hosting (Docker)                    | مجاني | email أو GitHub |
| **Neon.tech**          | PostgreSQL                          | مجاني | GitHub          |
| **Upstash**            | Redis                               | مجاني | GitHub          |
| **MinIO**              | Object Storage (داخل الـ container) | مجاني | —               |
| **Tesseract OCR**      | OCR (داخل الـ container)            | مجاني | —               |

**التكلفة: $0/شهر**

---

## الخطوة 1: Neon.tech (PostgreSQL مجاني)

1. روح على **[neon.tech](https://neon.tech)** → Sign up with **GitHub** (مفيش فيزا)
2. **Create Project** → اختار أقرب region (مثلاً `eu-central-1`)
3. هياخدك Connection string → انسخه
4. هيكون شكله كده:
   ```
   postgresql://username:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
5. **غيّر الـ database name** لـ `ibn_docs`:
   ```
   postgresql://username:password@ep-xxx.eu-central-1.aws.neon.tech/ibn_docs?sslmode=require
   ```
6. احفظ الـ connection string — هتحتاجه بعدين

**ملاحظة:** لو Neon عمل database باسم `neondb` بالـ default، ممكن تعمل database جديد بالاسم `ibn_docs` من الـ dashboard.

---

## الخطوة 2: Upstash (Redis مجاني)

1. روح على **[upstash.com](https://upstash.com)** → Sign up with **GitHub** (مفيش فيزا)
2. **Create Database** → Redis → اختار أقرب region
3. من الـ Details page → انسخ الـ **Connection String**
4. هيكون شكله كده:
   ```
   rediss://default:password@xxx.upstash.io:6380
   ```
5. احفظه — هتحتاجه بعدين

**ملاحظة:** الـ Free tier بيدك 10,000 commands/day و 256MB storage — كافي لـ 100 مستخدم.

---

## الخطوة 3: HuggingFace Space

1. روح على **[huggingface.co](https://huggingface.co)** → Sign up (email بس)
2. **New Space**:
   - Space name: `ibn-al-azhar` (أو أي اسم)
   - License: MIT
   - SDK: **Docker**
   - Hardware: **CPU basic (free)**
   - Private or Public: اختار
3. بعد ما يتعمل → **Settings** → **Variables and Secrets**:

### Secrets (add as Secret):

| Name                   | Value                                               |
| ---------------------- | --------------------------------------------------- |
| `AUTH_SECRET`          | `openssl rand -base64 64` (نفّذ الأمر ده على جهازك) |
| `ADMIN_PASSWORD`       | `openssl rand -base64 24`                           |
| `S3_ACCESS_KEY_ID`     | `openssl rand -hex 16`                              |
| `S3_SECRET_ACCESS_KEY` | `openssl rand -base64 32`                           |

### Variables (add as Variable):

| Name                  | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`        | الـ Neon connection string (من الخطوة 1) + `&connection_limit=25` |
| `DATABASE_URL_DIRECT` | نفس الـ DATABASE_URL (بدون connection_limit)                      |
| `REDIS_URL`           | الـ Upstash connection string (من الخطوة 2)                       |
| `ADMIN_EMAIL`         | `admin@ibnalazhar.app` (أو أي إيميل)                              |
| `S3_ENDPOINT`         | `http://localhost:9000`                                           |
| `S3_BUCKET`           | `ibn-al-azhar-docs`                                               |
| `S3_REGION`           | `us-east-1`                                                       |
| `APP_URL`             | `https://your-username-ibn-al-azhar.hf.space`                     |
| `APP_NAME`            | `Ibn Al-Azhar Docs`                                               |

---

## الخطوة 4: ارفع الكود للـ Space

### الطريقة 1: من الـ browser

1. في Space page → **Files** → **Add file** → **Upload files**
2. ارفع كل ملفات المشروع (أو استخدم Git)

### الطريقة 2: بـ Git (أفضل)

```bash
# Clone the Space repo
git clone https://huggingface.co/spaces/YOUR_USERNAME/ibn-al-azhar
cd ibn-al-azhar

# Copy project files
cp -r /path/to/ibn-al-azhar-docs/* .

# IMPORTANT: Copy the HF-specific Dockerfile to root
cp infrastructure/hf/Dockerfile ./Dockerfile

# Copy the HF README.md (with metadata) to root
cp infrastructure/hf/README.md ./README.md

# Copy entrypoint
cp infrastructure/hf/entrypoint.sh ./entrypoint.sh

# Remove production docker-compose files (not needed on HF)
rm -f docker-compose*.yml

# Commit and push
git add .
git commit -m "Deploy to HuggingFace Spaces"
git push
```

**HF هيبني الـ Docker image تلقائياً ويشغّله.**

---

## الخطوة 5: تأكد إنه شغال

1. روح على Space page → **Logs** tab
2. المفروض تشوف:
   ```
   ═══════════════════════════════════════════════════
     Ibn Al-Azhar Docs — HuggingFace Spaces
     Starting all services...
   ═══════════════════════════════════════════════════
   [1/5] Starting MinIO on :9000...
   [1/5] MinIO is ready ✓
   [2/5] Running database migrations...
   [2/5] Database ready ✓
   [3/5] Starting OCR Worker...
   [4/5] Starting Export Worker...
   [5/5] Starting Next.js on :7860...
   ```
3. افتح `https://your-username-ibn-al-azhar.hf.space`
4. سجّل دخول بـ Admin credentials
5. ارفع PDF → استنى OCR → شوف النتيجة

---

## الحدود المجانية

| المورد        | الحد                     | كافي لـ                 |
| ------------- | ------------------------ | ----------------------- |
| HF CPU        | 2 vCPU                   | ~50 مستخدم متزامن       |
| HF RAM        | 16GB                     | كتب حتى 500 صفحة        |
| HF Storage    | 50GB (مع Storage Bucket) | ~10,000 مستند           |
| Neon DB       | 0.5GB                    | ~5,000 مستند (metadata) |
| Upstash Redis | 10K cmd/day + 256MB      | ~100 مستخدم/يوم         |

---

## Troubleshooting

| المشكلة                        | الحل                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Space بيعمل restart كل 48 ساعة | طبيعي — HF free tier. البيانات محفوظة في `/data` لو Storage Bucket مفعّل |
| Migration فشل                  | تأكد إن DATABASE_URL صح وإن database `ibn_docs` موجودة                   |
| MinIO مش بيشتغل                | شوف الـ Logs — ممكن يكون الـ S3_ACCESS_KEY_ID فاضي                       |
| OCR بطيء                       | طبيعي على CPU — الكتاب الـ 100 صفحة ممكن ياخد 5-10 دقايق                 |
| الملفات بتختفي بعد restart     | فعّل Storage Bucket من Space Settings → `/data`                          |
| Redis بيوصل للـ limit          | قلل الـ rate limits أو رقية Upstash (free tier أعلى)                     |

---

## Storage Persistence

**مهم جداً:** فعّل Storage Bucket من Space Settings:

1. Settings → Storage → Add volume
2. Mount path: `/data`
3. Size: 20GB (أو أقل)

ده هيخلي الملفات (uploads, exports, MinIO data) محفوظة حتى لو الـ Space عمل restart.

**بدون Storage Bucket:** كل الملفات هتختفي لما الـ Space يعمل restart. الـ database (Neon) والـ Redis (Upstash) safe لأنهم external.
