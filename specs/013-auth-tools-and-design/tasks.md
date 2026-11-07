# Tasks 013

**Input**: `specs/013-auth-tools-and-design/{spec.md,plan.md}` — تنفيذوكالتان متسلسلتان D1 ثم D2 (نفس `messages/*.json`).

## Phase 1: D1 — هدم الضيوف وبناء الداخلي (commit 003a9b6)

- [x] T010 [US1/US2] [FR-001,FR-002] حذف أدوات الضيوف والتفريغ من كل الشجرة — ملفات مؤكدة الوجود بعد الحذف: `apps/web/src/app/api/tools/tashkeel/route.ts` `docs/openapi.yaml` `apps/web/src/ui/layout/public-header.tsx` — فحص: grep guest/transcription في apps/web/src = صفر؛ pnpm check exit 0؛ test:unit 79/79.
- [x] T011 [FR-001] middleware/sitemap/public-header أخرجت /tools العام — `apps/web/src/middleware.ts` `apps/web/src/app/sitemap.ts` — فحص: pnpm check exit 0 + curl حي (T050).
- [x] T012 [FR-003] أداة تشكيل داخلية خلف الجلسة — `apps/web/src/app/api/tools/tashkeel/route.ts` `apps/web/src/app/[locale]/(dashboard)/tools/page.tsx` — فحص: diacritize.test 40/40؛ build يعرض ƒ /api/tools/tashkeel.
- [x] T013 [FR-004] رسائل ar/en بلا أدوات ضيوف وبلا superlative — `apps/web/src/messages/ar.json` `apps/web/src/messages/en.json` — فحص: JSON parse OK؛ grep "منصه|الازهر" = 0.
- [x] T014 [FR-002] tests/docs نظّفت guest/transcription — `tests/api/openapi-spec.ts` `docs/IMPLEMENTATION_TOOLS.md` — فحص: spec-drift PASS ضمن test:unit.

## Phase 2/3: D2 تصميم + D3 CI + تحقق (commits d6098b5، 0418a55)

- [x] T030 [FR-005] شريط تقدم التنقل العلوي — `apps/web/src/ui/layout/route-progress.tsx` مركّب في `apps/web/src/app/[locale]/layout.tsx` — فحص: build ✓؛ العنصر حاضرا في HTML الحي (curl inset-x-0 top-0).
- [x] T031 [FR-006] monotonic clamp لتقدم الرفع — `apps/web/src/shared/conversion-status-utils.ts` — فحص: `tests/frontend/conversion-status.test.ts` 4 حالات أخضر ضمن test:frontend (428).
- [x] T032 [FR-007] رقائق مراحل + «جارٍ التجهيز» + استعادة jobId بعد التنقل — `apps/web/src/ui/pipeline/conversion-status.tsx` `apps/web/src/state/use-files-manager.ts` — فحص: test:frontend 31/31.
- [x] T033 [FR-008] حذف ناعم: حالة/قوائم لا تعرض محذوفًا — `apps/web/src/core/services/conversion.use-cases.ts` — فحص: test:unit 79/79 (1621).
- [x] T034 [FR-010] بلا tracking على عربي، logout RTL، wordmark كامل، فاتح سليم، إعدادات أعرض، هبوط mock ورقي — `apps/web/src/ui/layout/header.tsx` `apps/web/src/ui/sections/hero.tsx` `apps/web/src/ui/layout/public-header.tsx` `apps/web/src/app/[locale]/(dashboard)/settings/settings-content.tsx` `apps/web/src/styles/brand.css` — فحص: pnpm check exit 0؛ grep tracking على عربي = 0.
- [x] T035 [FR-004] نسخ صادق: eyebrow «وثائق الثانوية الأزهرية في مكان واحد»، positioning «منصة ابن الأزهر للمستندات — معالجة وتنظيم محتوى الثانوية الأزهرية» — `apps/web/src/ui/brand.ts` — فحص: curl حي على /ar: «أول منصة شاملة» = 0، الجديد حاضر.
- [x] T040 [FR-011] البوابة الكاملة قبل d6098b5: pnpm check exit 0 + lint (--rulesdir) 0 + build ✓29.2s + test:unit 1621✓ + test:frontend 428✓ — `playwright.config.ts` `package.json` — استثناء تحكيم بوابة-router للدفعة D2 (`vrf_adfe59f53e1fbf6a85660b14`): المتحكم يعيد مهلة 90s لأن بناء monorepo يتجاوزه؛ الدليل تشغيل المنسّق المباشر أعلاه. ملاحظة: فشل lint الظاهري محليًا كان أمرًا بلا `--rulesdir infrastructure/eslint/rules`.
- [x] T045 [CI] `STORAGE_LOCAL_DIR` في API/Integration و`PG_QUEUE_TEST_TRUNCATE=1` وprovider-contract→sessionAuth والتوقع «أبو حن» بالهمزة — `apps/web/src/app/api/upload/route.ts` (السبب: بوابة access) — فحص CI: Unit/Frontend/API/Integration/Security/Security Scan/Quality Gates = success في run 42394010356.

## Phase 4: تحقق حي

- [x] T050 [FR-001,FR-009] نسخة HF bfce1e0 (curl 2026-11-07): `/ar` 200؛ `/ar/tools` بلا جلسة 307→login؛ `/api/tools/guest/jobs` 403؛ `/api/tools/tashkeel` بلا جلسة 403؛ `/brand/favicon-32.png` و`/brand/favicon-64.png` 200؛ health healthy؛ meta يحمل الوصف الجديد — `scripts/sync-hf-space.sh` (يضمّن public الآن).
- [ ] T060 spec_gate 013 أخضر + E2E CI أخضر.

## Notes (من المستخدم — منفَّذة)

- الأيقونات الحالية تُترك كما هي (طلب صريح) — لم تُمس.
- «بيرجع وسايب ملف مش بيلاقيه» → T032 استعادة jobId عبر sessionStorage.
- «يحذف ملف يفضل موجود» → T033 فلترة deletedAt في getJobStatus/listJobs.

<!-- verify-task:review -->
## سجل المراجعة (verify-task)

Generated: 2026-11-07 19:07:00

| المتطلب | المهمة | الدليل | الحكم |
|---|---|---|---|
| FR-001 | T010, T011, T050 | tasks.md:7 T010<br>tasks.md:8 T011<br>tasks.md:26 T050<br>ملف: apps/web/src/app/api/tools/tashkeel/route.ts<br>ملف: docs/openapi.yaml<br>ملف: apps/web/src/ui/layout/public-header.tsx<br>ملف: apps/web/src/middleware.ts<br>ملف: apps/web/src/app/sitemap.ts<br>ملف: scripts/sync-hf-space.sh<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-002 | T010, T014 | tasks.md:7 T010<br>tasks.md:11 T014<br>ملف: apps/web/src/app/api/tools/tashkeel/route.ts<br>ملف: docs/openapi.yaml<br>ملف: apps/web/src/ui/layout/public-header.tsx<br>ملف: tests/api/openapi-spec.ts<br>ملف: docs/IMPLEMENTATION_TOOLS.md<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-003 | T012 | tasks.md:9 T012<br>ملف: apps/web/src/app/api/tools/tashkeel/route.ts<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-004 | T013, T035 | tasks.md:10 T013<br>tasks.md:20 T035<br>ملف: apps/web/src/messages/ar.json<br>ملف: apps/web/src/messages/en.json<br>ملف: apps/web/src/ui/brand.ts<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-005 | T030 | tasks.md:15 T030<br>ملف: apps/web/src/ui/layout/route-progress.tsx<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-006 | T031 | tasks.md:16 T031<br>ملف: apps/web/src/shared/conversion-status-utils.ts<br>ملف: tests/frontend/conversion-status.test.ts<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-007 | T032 | tasks.md:17 T032<br>ملف: apps/web/src/ui/pipeline/conversion-status.tsx<br>ملف: apps/web/src/state/use-files-manager.ts<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-008 | T033 | tasks.md:18 T033<br>ملف: apps/web/src/core/services/conversion.use-cases.ts<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-009 | T050 | tasks.md:26 T050<br>ملف: scripts/sync-hf-space.sh<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-010 | T034 | tasks.md:19 T034<br>ملف: apps/web/src/ui/layout/header.tsx<br>ملف: apps/web/src/ui/sections/hero.tsx<br>ملف: apps/web/src/ui/layout/public-header.tsx<br>ملف: apps/web/src/styles/brand.css<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |
| FR-011 | T040 | tasks.md:21 T040<br>ملف: package.json<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **PASS** |

فحوص المشروع:
- `/home/abed/.nvm/versions/node/v22.22.3/bin/npm run test` → SKIP

<!-- /verify-task:review -->
