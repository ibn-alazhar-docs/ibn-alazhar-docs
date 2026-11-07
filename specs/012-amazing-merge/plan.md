# Implementation Plan: Amazing Merge

**Branch**: `012-amazing-merge` | **Date**: 2026-11-07 | **Spec**: `specs/012-amazing-merge/spec.md`

## Summary

دمج كامل لأدوات الضيوف الأربع (إغلاق فجوة tashkeel/transcription حيث يمكن) + الهوية البصرية (4 مفاتيح) + sidecar مهارة `arabic-pdf-to-book` + منطق من Zip `pdf-to-word`، دون استبدال المنصة الحالية (Next 16 + Prisma + Queue) — مع استضافة مجانية HF Spaces (Docker) + Neon + Upstash + R2.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) + Node 22.x / pnpm 10.33.4، Next.js 16 App Router + Turbopack.

**Primary Dependencies**: `@opennextjs/cloudflare 1.20.1` + `wrangler 4.105.0` للـ Worker، `prisma 6.5.0` + `@prisma/client 6.5.0`، `vitest 3.2.4` + `playwright 1.61`، Tailwind لـ UI، `zod 4.4.3`.

**Storage**: PostgreSQL 16 (Neon مجاني: 1GB/مشروع، 100 CU-hours) عبر Prisma؛ Redis/BullMQ افتراضي واختياري PostgreSQL queue عند `QUEUE_DRIVER=pg`؛ MinIO (S3) → R2 (10GB مجانًا) للملفات.

**Testing**: `pnpm check` (format:check + lint --max-warnings 0 + typecheck) قبل أي حفظ. `pnpm test` = كل مشاريع `vitest run` (unit: `tests/backend/**`، api/security/frontend، integration/recovery بطلاقة `singleFork: true`) — لا توازٍ في integration/recovery. `pnpm test:e2e` يحتاج تطبيقًا حيًا + postgres/redis.

**Target Platform**: HuggingFace Spaces (Docker) + Neon + Upstash + R2 كمجاني كامل بلا فيزا؛ Cloudflare Workers/Pages للواجهة اختياري (100k req/day، CPU 10ms/128MB — ضعيف لـ OCR).

**Project Type**: pnpm workspace monorepo (`apps/web` + `packages/pipeline|shared|database` + `workers/ocr-worker|export-worker`).

**Performance Goals**: إغلاق أدوات الضيوف ودمج الهوية بلا تعطل `pnpm check`؛ رفع→ناتج في محلي خلال دقائق؛ نسب نجاح كبيرة بنحو لا يوجد تعارضات بين الصفحات.

**Constraints**: مسارات شخصية ممنوعة (النمط الحالي مُباع داخل المستودع). `QUEUE_DRIVER` الافتراضي `redis` ولا يُعدَّل في prod/runtime config. لا secrets في الكود. لا أوزان/نماذج محلية ثقيلة. لا نسخ أي كود من `arabi.tools` (الترخيص: `Cargo.toml` يعلن MIT لكن لا يوجد `LICENSE` فعلي) — يُأخذ المبدأ/التصميم فقط.

**Scale/Scope**: 4 أدوات ضيوف + 4 صفوف هوية + sidecar واحد + 2 بطاقة استضافة (HF Docker + اختياري Cloudflare Worker).

## Constitution Check

- Gate: `rules strict` — material = Pass. Gates FAIL: لا صافي & التشكيل/الوثائق التشغيلية (INFRA، لا أعد التعريف استضافة من جديد).
- نتوزّع: 5 مهام تحتاج وكيلًا؛ البقية تصنع مباشرة.

## Project Structure

### Documentation (this feature)

```text
specs/012-amazing-merge/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── contracts/
└── quickstart.md
```

### Source Code (repository root)

```text
apps/web/src/
├── app/[locale]/(site)/tools/
│   ├── page.tsx
│   ├── pdf-to-word/page.tsx
│   ├── ocr/page.tsx
│   ├── tashkeel/page.tsx
│   └── transcription/page.tsx
├── app/api/tools/guest/
│   ├── jobs/route.ts
│   └── jobs/[id]/route.ts
├── shared/tools/guest-limits.ts
├── core/services/guest-jobs.service.ts
└── ui/tools/...

packages/pipeline/src/
├── output/pandoc.ts
├── output/docx*
├── queue/driver.ts
└── text/clean/unicode.ts

packages/pipeline/scripts/diacritics.py  # stub ميت — لا يُ لمَس

workers/ocr-worker/  workers/export-worker/
infrastructure/hf/  (بديل HF Spaces)
docs/  deployment/
specs/012-amazing-merge/
```

**Structure Decision**: الاحتفاظ بنفس بنية monorepo الحالية — التوسعة (فقط tokens الهوية + sidecar) فوق `apps/web` + `packages/*`؛ لا إنشاء خدمات جديدة.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Sidecar ثقيل (SKILL.md Python) | منطق مفيد جاهز | إعادة كتابة ناتج عربي هو جهوسلة |
| Double infra (HF + CF للواجهة) | سرعة/موثوقية | مجاني مجانيية مجانية ثانية هي ميزانيتكز |
