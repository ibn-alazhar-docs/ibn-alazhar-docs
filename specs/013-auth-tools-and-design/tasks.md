# Tasks 013

**Input**: `specs/013-auth-tools-and-design/{spec.md,plan.md}` — تنفيذوكالتان متسلسلتان D1 ثم D2 (نفس `messages/*.json`).

## Phase 1: D1 — هدم الضيوف وبناء الداخلي

- [x] T010 [US1/US2] [FR-001,FR-002] حذف `(site)/tools/**` + `api/tools/guest/**` + `core/services/guest/**` + `domain/guest-tools.ts` + `shared/guest-route-response.ts` + `shared/tools/guest-limits.ts` + `ui/tools/guest-tool-client.tsx|tool-card.tsx|read-only-result.tsx` + `packages/pipeline/src/transcription/**` وتصديره
  ملف: commit 003a9b6 (44 ملفًا، −4027 سطرًا). فحص: `grep guest apps/web/src` = صفر؛ `grep transcription apps/web/src` = صفر؛ `pnpm check` exit 0؛ build ✓؛ test:unit 79/79 (1621 PASS).
- [x] T011 [FR-001] middleware: `/tools` يخرج من publicPagePrefixes + حذف استثناء `/api/tools/guest`؛ sitemap: حذف 5 روابط tools؛ public-header: حذف روابط الأدوات
  ملف: `middleware.ts` · `app/sitemap.ts` · `ui/layout/public-header.tsx` (003a9b6). فحص: `pnpm check` exit 0 بعد التعديل.
- [x] T012 [FR-003] `POST /api/tools/tashkeel` خلف الجلسة + صفحة `/dashboard/tools` بأداة تشكيل (نص ≤20k، متزامنة)
  ملف: `app/api/tools/tashkeel/route.ts` + `app/[locale]/(dashboard)/tools/page.tsx` + `tools-content.tsx`. فحص: build يعرض `ƒ /api/tools/tashkeel`؛ diacritize.test 40/40.
- [x] T013 [FR-004] messages ar/en: حذف `tools.*` الضيفي و`transcription`؛ eyebrow/footer بلا superlative؛ keys `dashboardTools.*`
  ملف: `messages/ar.json` · `en.json` (003a9b6؛ eyebrow/footer يكملهما T035). فحص: JSON parse OK ضمن pnpm check.
- [x] T014 [FR-002] tests/docs: حذف `guest-tools-api.test.ts` و`guest-text-path.test.ts` و`transcription.test.ts`؛ تحديث `openapi-spec.ts`/`openapi.yaml`/`IMPLEMENTATION_TOOLS.md §7`/`headers-config.test.ts` إن يلزم
  ملف: commit 003a9b6. فحص: spec-drift PASS + headers-config 30/30 ضمن test:unit.
- [ ] T020 [US1] اختبار بوابة: guest endpoint يعيد 401/404 و`/tools` يحوِّل للدخول (curl بعد النشر = T050)

## Phase 2: D2 — تصميم ومنطق

- [ ] T030 [FR-005] `route-progress.tsx` + استعماله بالروابط + loading skeletons للمجلدات
- [ ] T031 [FR-006] monotonic clamp لتقدم الرفع في `file-upload.tsx`
- [ ] T032 [FR-007] `conversion-status.tsx`: رقائق مراحل + «جارٍ التجهيز» + polling fallback + استعادة jobId بعد التنقل (keys `conversions.stages.*`)
- [ ] T033 [FR-008] حذف ناعم: قوائم الملفات تستبعد deletedAt ولا تطلب تحليل ملف محذوف
- [ ] T034 [FR-010] header: ترتيب أيقونة logout RTL + wordmark بلا قطع؛ فاتح: إزالة text-white/bg-white المكسورة؛ إعدادات: شبكة أعرض + بطاقة «حول المنصة»؛ هبوط: تعبئة فراغ الجوانب بشبكة ميزات، لا حليات AI
- [ ] T035 [FR-004] صياغة UX عربية نظيفة (ux-araby) لكل النصوص الجديدة/المعدّلة

## Phase 3: تحقق وتسليم

- [ ] T040 [FR-011] `pnpm check` + build + `pnpm test:unit` خضراء
- [ ] T050 [FR-001,FR-009] بعد push+sync-hf: curl — `/ar/tools` تحويل دخول، `/api/tools/guest/jobs` 401/404، `/brand/favicon-64.png` 200، `/ar` 200
- [ ] T060 spec_gate 013 + توثيق الأدلة هنا

## Notes (من المستخدم — تُنفَّذ أو تُوَثَّق)

- الأيقونات الحالية تُترك كما هي (طلب صريح).
- «الواحد لما بيخرج من صفحة بيرجع وسايب ملف مش بيلاقيها» → FR-007 استعادة الحالة.
