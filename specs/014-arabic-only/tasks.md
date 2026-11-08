# Tasks 014 — عربية فقط

**Input**: `specs/014-arabic-only/{spec.md,plan.md}` — دفعة implementer واحدة ثم تحقق المنسّق.

## Phase 1: الاقتلاع

- [ ] T001 [FR-001] routing.ts → locales ["ar"]؛ middleware يحوّل `/en/*` → `/ar/*`
- [ ] T002 [FR-002] حذف `apps/web/src/messages/en.json` + تضييق `i18n/request.ts` على ar
- [ ] T003 [FR-003] حذف `ui/locale/locale-toggle.tsx` وكل مستعمليه + قسم اللغة في الإعدادات
- [ ] T004 [FR-004] sitemap/robots/manifest/layout alternates بلا en
- [ ] T005 [FR-005] git rm `apps/web/content/en/**` و`content/ar/talab-alilm/**`؛ إعادة كتابة i18n-data.ts/journeys-data.ts والمقالات المتبقية بوصف صادق لمنصة تحويل ملفات
- [ ] T006 [FR-006] تحديث/تقليم الاختبارات التي تلمس en (frontend/api/e2e) مع سطر سبب لكل حذف

## Phase 2: بوابة وتسليم

- [ ] T007 [FR-007] `pnpm check` + build + `test:unit` + `test:frontend` خضراء (تشغيل المنسّق)
- [ ] T008 [FR-001,FR-005] commit + push + sync-hf؛ حيًا: `/en` تحويل لـ`/ar`، لا EN في DOM، `/docs` بلا «طلب العلم»
- [ ] T009 spec_gate 014

## Notes

- بادئة `/ar` تبقى (قرار plan §2) — «من الجذور» تعني عدم بقاء أي أثر إنجليزي، لا هدم بنية locale.
- الصياغة وفق ux-araby: فصحى مبسطة، بلا عرنجة، بلا ادعاءات.
