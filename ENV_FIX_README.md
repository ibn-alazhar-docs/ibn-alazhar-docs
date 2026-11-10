# 🔧 Environment Fix Tool

## المشكلة التي يحلها هذا الملف

عند استنساخ المشروع أو نشره، ملف `.env` قد يحتوي على قيم فارغة أو ضعيفة تسبب فشل التطبيق:

```bash
❌ REDIS_PASSWORD=
❌ GEMINI_API_KEY=
❌ AUTH_SECRET=weak_value
```

هذا يؤدي إلى أخطاء مثل:
- `error while interpolating x-common-env.REDIS_URL: required variable REDIS_PASSWORD is missing a value`
- `OCR failed: GEMINI_API_KEY is not configured`
- `Can't reach database server`

---

## ✅ الحل: `fix-env.sh`

Script تلقائي يفحص ويصلح جميع القيم المطلوبة في `.env`:

### كيفية الاستخدام

```bash
# 1. شغّل الـ script:
./fix-env.sh

# 2. اتبع التعليمات التي تظهر
```

---

## 📋 ما يقوم به الـ Script

### 1. يفحص القيم الفارغة
```bash
✅ REDIS_PASSWORD is set
⚠️  GEMINI_API_KEY is empty
✅ AUTH_SECRET is set
```

### 2. يصلح القيم تلقائياً

| المتغير | المشكلة | الحل |
|---------|---------|------|
| `REDIS_PASSWORD` | فارغ | يولّد قيمة قوية |
| `GEMINI_API_KEY` | فارغ | يضع placeholder + تنبيه |
| `AUTH_SECRET` | فارغ | يولّد secret عشوائي |
| `ADMIN_PASSWORD` | ضعيف/فارغ | يولّد password قوي |
| `MINIO_ACCESS_KEY` | فارغ | يضع `minioadmin` |
| `MINIO_SECRET_KEY` | فارغ | يضع `minioadmin` |
| `DATABASE_URL` | خطأ | يصلح الـ format |

### 3. يعطي تعليمات واضحة

```bash
⚠️  IMPORTANT:
1. Check .env and verify all values are correct
2. Replace GEMINI_API_KEY with your real API key
3. Save the ADMIN_PASSWORD shown above
```

---

## 🚨 قيم يجب تغييرها يدوياً

### 1. GEMINI_API_KEY

**الـ Script يضع placeholder:**
```bash
GEMINI_API_KEY=AIzaSyDummyKeyForDevelopment_REPLACE_ME
```

**يجب استبداله بـ API Key حقيقي:**

1. اذهب إلى: https://aistudio.google.com/app/apikey
2. أنشئ API Key جديد
3. انسخه واستبدله في `.env`:
   ```bash
   GEMINI_API_KEY=AIzaSyC_YOUR_REAL_KEY_HERE
   ```

### 2. ADMIN_PASSWORD

**الـ Script يولّد password قوي ويعرضه:**
```bash
⚠️  ADMIN_PASSWORD is weak or empty
   Generating strong password...
   ✅ Generated: xK7mP9qR4wN2vL5tZ8aC
   ⚠️  SAVE THIS PASSWORD!
```

**احفظ هذا الـ password!** ستحتاجه للدخول كـ ADMIN.

---

## 🔄 الاستخدام في سيناريوهات مختلفة

### Scenario 1: مشروع جديد (Clone)

```bash
# 1. Clone المشروع:
git clone https://github.com/ibn-alazhar-docs/ibn-alazhar-docs.git
cd ibn-alazhar-docs

# 2. أنشئ .env:
cp .env.example .env

# 3. شغّل fix script:
./fix-env.sh

# 4. احصل على Gemini API Key وضعه في .env

# 5. شغّل المشروع:
./ibn.sh dev-infra
pnpm --filter @ibn-al-azhar-docs/web dev
```

### Scenario 2: فشل Docker Compose

```bash
# المشكلة:
docker compose up
# error: required variable REDIS_PASSWORD is missing a value

# الحل:
./fix-env.sh
docker compose down
docker compose up -d
```

### Scenario 3: OCR لا يعمل

```bash
# المشكلة:
# OCR failed: GEMINI_API_KEY is not configured

# الحل:
./fix-env.sh
# ثم ضع Gemini API Key الحقيقي في .env
```

### Scenario 4: Deployment على Hugging Face

```bash
# قبل الرفع:
./fix-env.sh

# تحقق من .env:
cat .env | grep -E "^(REDIS_PASSWORD|GEMINI_API_KEY|AUTH_SECRET)="

# ثم ضع الـ Secrets في Hugging Face Space Settings
```

---

## 🧪 اختبار بعد الإصلاح

```bash
# 1. تحقق من القيم:
cat .env | grep -E "^(REDIS_PASSWORD|GEMINI_API_KEY|DATABASE_URL|AUTH_SECRET)="

# يجب أن ترى:
# DATABASE_URL="postgresql://ibn_docs:ibn_docs_password@localhost:5433/ibn_docs?schema=public"
# REDIS_PASSWORD=redis_strong_password_2026
# AUTH_SECRET=random_32_char_string
# GEMINI_API_KEY=AIzaSy... (your real key)

# 2. اختبر Docker Compose:
docker compose config

# يجب أن ينجح بدون أخطاء

# 3. شغّل التطبيق:
./ibn.sh dev-infra
pnpm --filter @ibn-al-azhar-docs/web dev

# يجب أن يشتغل على http://localhost:3000
```

---

## 🔒 الأمان (Security)

### ⚠️ ملاحظات مهمة:

1. **لا ترفع `.env` على Git:**
   ```bash
   # .gitignore يحتوي على:
   .env
   .env.local
   .env.production
   ```

2. **لا تشارك Secrets:**
   - `AUTH_SECRET`
   - `ADMIN_PASSWORD`
   - `GEMINI_API_KEY`
   - `REDIS_PASSWORD`

3. **في Production:**
   - استخدم secrets manager (Vault, AWS Secrets Manager)
   - أو متغيرات بيئة مشفرة (Hugging Face Secrets)

4. **غيّر Passwords الضعيفة:**
   ```bash
   # ❌ لا تستخدم:
   ADMIN_PASSWORD=Admin@123456
   REDIS_PASSWORD=123456
   
   # ✅ استخدم:
   ADMIN_PASSWORD=$(openssl rand -base64 24)
   REDIS_PASSWORD=$(openssl rand -base64 24)
   ```

---

## 📞 الدعم

### إذا واجهت مشكلة:

1. **راجع TROUBLESHOOTING.md:**
   ```bash
   cat TROUBLESHOOTING.md | grep -A 10 "REDIS_PASSWORD"
   ```

2. **شغّل fix script مرة أخرى:**
   ```bash
   ./fix-env.sh
   ```

3. **تحقق من الـ logs:**
   ```bash
   docker compose logs -f web
   ```

4. **افتح Issue على GitHub:**
   https://github.com/ibn-alazhar-docs/ibn-alazhar-docs/issues

---

## ✅ Checklist بعد الإصلاح

- [ ] `./fix-env.sh` تم تشغيله بنجاح
- [ ] `REDIS_PASSWORD` لديه قيمة
- [ ] `GEMINI_API_KEY` لديه API Key حقيقي (ليس placeholder)
- [ ] `AUTH_SECRET` لديه قيمة عشوائية
- [ ] `ADMIN_PASSWORD` تم حفظه (قوي)
- [ ] `DATABASE_URL` format صحيح
- [ ] `docker compose config` ينجح بدون أخطاء
- [ ] التطبيق يشتغل على `http://localhost:3000`

---

<div align="center">
  <h2>🎯 Quick Reference</h2>
  
  <table>
    <tr>
      <th>المشكلة</th>
      <th>الحل</th>
    </tr>
    <tr>
      <td>REDIS_PASSWORD is missing</td>
      <td><code>./fix-env.sh</code></td>
    </tr>
    <tr>
      <td>GEMINI_API_KEY empty</td>
      <td>Get from <a href="https://aistudio.google.com/app/apikey">Google AI Studio</a></td>
    </tr>
    <tr>
      <td>Database connection failed</td>
      <td><code>./fix-env.sh</code> + check DATABASE_URL</td>
    </tr>
    <tr>
      <td>Admin password weak</td>
      <td><code>./fix-env.sh</code> generates strong one</td>
    </tr>
  </table>
  
  <p><strong>For more issues, see: <a href="./TROUBLESHOOTING.md">TROUBLESHOOTING.md</a></strong></p>
</div>

---

**آخر تحديث:** 16 يوليو 2026  
**الإصدار:** 1.0.0
