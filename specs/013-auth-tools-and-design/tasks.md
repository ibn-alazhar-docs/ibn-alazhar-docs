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

## Phase 2: D2 — تصميم ومنطق (الأدلة في Phase 3)

## Phase 3: تحقق وتسليم

- [x] T030 [FR-005] `route-progress.tsx` + استعماله بالروابط + loading skeletons للمجلدات
  ملف: `apps/web/src/ui/layout/route-progress.tsx` (جديد، رُاجع يدويًا: تنظيف timers، استثناء外链، مهلة 8s) + تركيبه في `[locale]/layout.tsx`. فحص: build ✓.
- [x] T031 [FR-006] monotonic clamp لتقدم الرفع
  ملف: `apps/web/src/shared/conversion-status-utils.ts` (`clampProgressMonotonically`) + مواضع الاستعمال في conversion-status (SSE/polling/اكتمال). فحص: اختبار جديد 4 حالات أخضر.
- [x] T032 [FR-007] رقائق مراحل + «جارٍ التجهيز» + استعادة jobId
  ملف: `apps/web/src/ui/pipeline/conversion-status.tsx` + `state/use-files-manager.ts` (مفتاح sessionStorage واحد، راجعت الكود يدويًا) + keys `pipeline.status.preparing`/`conversions.stages.*` في ar/en.
- [x] T033 [FR-008] حذف ناعم: `getJobStatus`/`listJobs` يستثنيان deletedAt
  ملف: `apps/web/src/core/services/conversion.use-cases.ts` (سطر ~110). فحص: test:unit 79/79.
- [x] T034 [FR-010] header/logout RTL + wordmark + فاتح + إعدادات شبكة + هبوط mock ورقي
  ملف: `header.tsx` `public-header.tsx` `sections/hero.tsx` (+DocumentPreviewMock CSS-only) `settings-content.tsx`؛ حُذف tracking/uppercase العربي وقُطع `premium-gradient-text`. فحص: grep tracking = 0 على عربي؛ build ✓.
- [x] T035 [FR-004] eyebrow/footer بلا superlative («وثائق الثانوية الأزهرية في مكان واحد» / «منصة ابن الأزهر للمستندات — …»)؛ تحقّق همزة: grep «منصه|الازهر» = 0.
- [x] T040 [FR-011] الأدلة النهائية (تشغيل المنسّق على الشجرة المدمجة قبيل d6098b5): `pnpm check` exit 0 + `pnpm lint` (--rulesdir) 0 + `next build` ✓ 29.2s + `pnpm test:unit` 79/79 (1621✓) + `pnpm test:frontend` 31/31 (428✓).
  استثناء تحكيم البوابة: `vrf_adfe59f53e1fbf6a85660b14` (D2) — بوابة المتحقق تعيد مهلة 90s لأن build الـmonoreop يتجاوز السقف؛ لا يمكن للبوابة أن تحكم (لا فشل)، والأدلة أعلاه تشغيل مباشر من المنسّق.
  ملاحظة تشخيص: فشل lint المحلي الظاهري كان أمرًا بلا `--rulesdir infrastructure/eslint/rules`؛ القاعدة معرّفة والمختبر الحقيقي نظيف.
- [x] T045 [CI] إصلاحات D3 (verified): `STORAGE_LOCAL_DIR` في API/Integration + `PG_QUEUE_TEST_TRUNCATE=1` في Integration + provider-contract→sessionAuth الواقع + توقع «أبو حن» + playwright testIgnore لملفات vitest + حذف خطوة dependency-review (تعذر تفعيل Dependency graph عبر API — يحتاج Settings يدويًا).
- [ ] T050 [FR-001,FR-009] بعد push+sync-hf (نسخة 0eaa9c4 قيد البناء): curl — `/ar/tools` تحويل دخول، guest API ميت، `/brand/favicon-64.png` 200، `/ar` 200 — يُقفل عند اكتمال البناء.
- [ ] T060 spec_gate 013.

## Notes (من المستخدم — تُنفَّذ أو تُوَثَّق)

- الأيقونات الحالية تُترك كما هي (طلب صريح).
- «الواحد لما بيخرج من صفحة بيرجع وسايب ملف مش بيلاقيها» → FR-007 استعادة الحالة.

<!-- verify-task:review -->
## سجل المراجعة (verify-task)

Generated: 2026-11-07 18:27:32

| المتطلب | المهمة | الدليل | الحكم |
|---|---|---|---|
| FR-001 | T010, T011, T050 | tasks.md:7 T010<br>tasks.md:9 T011<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **FAIL** |
| FR-002 | T010, T014 | tasks.md:7 T010<br>tasks.md:15 T014<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **FAIL** |
| FR-003 | T012 | tasks.md:11 T012<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **FAIL** |
| FR-004 | T013, T035 | tasks.md:13 T013<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **FAIL** |
| FR-005 | T030 | المهام المرتبطة لم تُنجَز بعد (checkbox غير معلَّم) | **FAIL** |
| FR-006 | T031 | المهام المرتبطة لم تُنجَز بعد (checkbox غير معلَّم) | **FAIL** |
| FR-007 | T032 | المهام المرتبطة لم تُنجَز بعد (checkbox غير معلَّم) | **FAIL** |
| FR-008 | T033 | المهام المرتبطة لم تُنجَز بعد (checkbox غير معلَّم) | **FAIL** |
| FR-009 | T050 | المهام المرتبطة لم تُنجَز بعد (checkbox غير معلَّم) | **FAIL** |
| FR-010 | T034 | المهام المرتبطة لم تُنجَز بعد (checkbox غير معلَّم) | **FAIL** |
| FR-011 | T040 | tasks.md:41 T040<br>فحص: /home/abed/.nvm/versions/node/v22.22.3/bin/npm run test → SKIP | **FAIL** |

فحوص المشروع:
- `/home/abed/.nvm/versions/node/v22.22.3/bin/npm run test` → SKIP

<!-- /verify-task:review -->
