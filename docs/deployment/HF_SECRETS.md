# HF Secrets — قائمة (بلا أسرار حقيقية)

ضعها في: **Space Settings → Variables and Secrets** — لا تُسلّم لسواها.

| المتغير | مثال |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` |
| `DATABASE_URL_DIRECT` | نفسها (للترحيل) |
| `REDIS_URL` | `rediss://:PASSWORD@HOST.upstash.io:6380` |
| `AUTH_SECRET` | `openssl rand -base64 64` |
| `APP_URL` | `https://<your-space>.hf.space` |
| `AUTH_URL` | `https://<your-space>.hf.space` |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-space>.hf.space` |
| `ADMIN_EMAIL` | `admin@example.com` |
| `ADMIN_PASSWORD` | `strong-password` |
| `PROMETHEUS_BEARER_TOKEN` | `secret-token-for-metrics` |
| `PORT` | `7860` |
| `GEMINI_API_KEY_N` | `gemini-keypool-slot` (اختياري) |

> لا تضع أسرارًا في أي ملف — اعمل بها يدويًا في Space.
