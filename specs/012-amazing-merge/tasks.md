# Tasks: Amazing Merge

**Input**: Design documents from `specs/012-amazing-merge/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: واجب ضمن كل قصة.

**Organization**: مهام مرقّمة مرتبطة بـ US1..US3 و FR-xxx، كل تنفيذ موكول لوكيل فرعي.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 [P] [US1] [FR-001] فتح `/tools/*` صفحة في `apps/web/src/app/[locale]/(site)/tools/page.tsx` + تحقق `pnpm check` baseline
- [x] T002 [P] [US2] [FR-002] نفّذ `BrandTokens` من `Visual_Identity/ai_studio_code.html` في `apps/web/src/styles/brand.css`

## Phase 2: US1 - أدوات الضيوف كاملة (P1 MVP)

**Goal**: إغلاق فجوة `tashkeel/transcription` أو تثبيت صياغتها، وايصاح `pdf-to-word/ocr`.

**Independent Test**: `pnpm test:unit -- tests/backend/guest*.test.ts` + `pnpm --filter @ibn-al-azhar-docs/web build`.

- [x] T010 [P] [US1] [FR-001] تحقق `pdf-to-word` + `ocr` يعملان دون تغيير ما لم يكسر في `apps/web/src/shared/tools/guest-limits.ts`
- [x] T011 [P] [US1] [FR-001] تفعيل `tashkeel` عبر `packages/pipeline/src/text/clean/diacritize.ts` وأداة `guest` في `apps/web/src/shared/tools/guest-limits.ts` (نص فقط)
- [x] T012 [P] [US1] [FR-001] تفعيل `transcription` عبر `packages/pipeline/src/transcription/gemini-transcribe.ts` وأنواع صوتية في `apps/web/src/shared/tools/guest-limits.ts`
- [x] T013 [US1] [FR-001] اختبار `GUEST_TOOLS_LIMITS` (ملف > 99MB يرفض) في `apps/web/src/shared/tools/guest-limits.ts`

**Checkpoint**: US1 تُكمل رفع/حالة/ناتج دون انفجار.

## Phase 3: US2 - الهوية البصرية (P2)

**Goal**: شعار ابن الأزهر + ألوان وخطوط Brand Book على كل صفحات الضيوف والعموم.

**Independent Test**: `pnpm --filter @ibn-al-azhar-docs/web build` + لقطة `/tools`.

- [x] T020 [P] [US2] [FR-002] حوّذ `public/logo.svg` من `Pasted image.png` في `apps/web/public/logo.svg` + احترام Clear Space 190px
- [x] T021 [P] [US2] [FR-002] `Almarai` + `thmanyah sans` عبر `next/font` على `apps/web/src/ui/fonts.ts`
- [x] T022 [US2] [FR-002] تطبيق tokens على `/tools` في `apps/web/src/app/[locale]/(site)/tools/page.tsx`

**Checkpoint**: US2 تُقدم الواجهة كاملة أم أكبر.

## Phase 4: US3 - Zip + SKILLS + arabi.tools (P3)

**Goal**: منطق Zip يندمج كـ sidecar؛ مهارة `arabic-pdf-to-book` عند توفر مفتاح؛ `arabi.tools` يبقى اقتراحًا.

**Independent Test**: `pnpm vitest run --project=unit` + مقارنة ناتج `pdf-to-word`.

- [x] T030 [P] [US3] [FR-003] قدّم `documentConverter.ts` + `docxExporter.ts` كمواد بيانات لا كخدمة في `packages/pipeline/src/output/pandoc.ts`
- [x] T031 [P] [US3] [FR-003] قدّم `arabicText.ts` (تشكيل + bidi `<w:bidi/>`) إلى `packages/pipeline/src/text/clean/unicode.ts`
- [x] T032 [P] [US3] [FR-003] وحّد قاعدة تصحيح القرآن في `docs/correction-rule-divergence.md` — درجة قصوى واحدة موحَّدة
- [x] T033 [P] [US3] [FR-004] اربط SKILL `arabic-pdf-to-book` عبر `~/.config/ocr/gemini_key` (`packages/pipeline/src/ocr-providers/gemini.ts`)
- [x] T034 [P] [US3] [FR-005] قدّم `arabi.tools` كصفحة استكشاف (UI احتياطي) في `apps/web/src/messages/ar.json`

**Checkpoint**: US3 تُدمج منطقًا دون كسر Queue/ORM.

## Phase 5: استضافة (HF Spaces مجانية بلا فيزا)

- [x] T040 [P] [FR-006] تحقق `infrastructure/hf/` + `docs/deployment/HF_DEPLOYMENT_GUIDE.md`
- [ ] T041 [P] [FR-006] نشر HF Spaces (Docker 2vCPU + 16GB RAM) + Neon + Upstash + R2 — يدوي بأسرار (غير منجز؛ التوثيق فقط)
- [x] T042 [P] [FR-006] الاختيار `QUEUE_DRIVER=pg` أو `redis` دون تغيير prod في `packages/pipeline/src/queue/driver.ts` — توثيق القرار في `docs/deployment/HOSTING_DECISION.md`
- [x] T043 [P] [FR-006] Runbook النشر اليدوي `docs/deployment/HF_RUNBOOK.md` (قائمة Secrets + smoke + البناء/الدفع HF)

## Phase 6: Polish

- [x] T050 [P] [FR-007] `pnpm check` + `pnpm ci:all` + `oc-verify .` — التأمين في `package.json`
- [x] T051 [P] [FR-007] مراجعة `clean-code-guard` + `test-guard` + `docs-guard` (§Delegation)
- [x] T052 [P] [FR-007] قائمة فحص PC: بلا Bidi ولا كتابة دخيلة ولا أرقام هندية في الأوامر; جدول `|` متوازن
- [x] T053 [P] [FR-007] إضافة `docs/LESSONS.md` عند الحاجة

## Delegation Log

| المهمة | النموذج (model) | النتيجة | مراجعة |
|---|---|---|---|
| T010+T013 (US1) | `opencode/crouton-alpha-free` (`@fast`) | تحقق فقط (موجود مسبقًا) | `pnpm check` + `vitest run tests/api/guest-tools-api.test.ts` → `Max (19) PASS` (مباشرة، 2026-11-07) |
| T030-T034+ T040-T042 (US3/hosting) | `implementer` | 11 ملفًا (diacritize.ts+transcribe+validate...) | `pnpm check → PASS` + `vitest run tests/backend/arabic-haraka-pattern.test.ts → 8 PASS` + gate `7 PASS` |
| T011 tashkeel | `implementer` (بعد عجز `@fast` عن الكتابة) | `diacritize.ts` + ربط الضيوف + اختبار | `vitest run tests/backend/diacritize-gemini-backend.test.ts → 2 PASS` (مباشرة) |
| T012 transcription | `implementer` (بعد عجز `@fast`) | `gemini-transcribe.ts` + أنواع صوتية + sniff | `vitest run tests/backend/transcription.test.ts → 9 PASS` (مباشرة بعد إصلاح `{{`) |
| Nav/hosting | `implementer` | header/footer + `HOSTING_DECISION.md` + تعليق wrangler | `pnpm check → PASS` (مباشرة) |
| Lease fix (T011/T012) | orchestrator مباشرة (بعد فشلين متتاليين) | `tashkeel=available` + `processGuestText` + `toolId` + `accept` صوتي | `vitest 4 files → 38 PASS` + `pnpm check → PASS` |

## FR → Tasks traceability

| FR | Tasks |
|---|---|
| FR-001 | T001, T010, T011, T012, T013 |
| FR-002 | T002, T020, T021, T022 |
| FR-003 | T030, T031, T032 |
| FR-004 | T033 |
| FR-005 | T034 |
| FR-006 | T040, T041, T042, T043 |
| FR-007 | T050, T051, T052, T053 |

### Deviation Log

- FR-005 (arabī.tools): لم يُنقل كود Rust (لا توجد `LICENSE` في المستودع الأصلي رغم إعلان MIT في `Cargo.toml`) — أُنجز مكافئ مبدئي بلا نسخ: `tashkeel` عبر `diacritizeArabic` (`packages/pipeline/src/text/clean/diacritize.ts`) و`transcription` عبر `transcribeAudio` (`packages/pipeline/src/transcription/gemini-transcribe.ts`) وكلاهما عبر Gemini (`loadGeminiKeys`).

## Dependencies & Execution Order

- Phase 1 (Setup) → Phase 2 (US1 P1 MVP) → Phase 3 (US2) → Phase 4 (US3) → Phase 5 (Hosting) → Phase 6 (Polish)
- US1 → US2 → US3 بترتيب الأولوية؛ يمكن US2/US3 بالتوازي بعد US1 إن تطابقت الملفات على نحو عدم التعارض.
- US1 أولوية إغلاق؛ US3 اختيارية إن جرى إعادة ترتيب.

## Implementation Strategy

MVP First: إغلاق US1 (GUEST_TOOLS) + US2 (هوية)؛ ثم استهدف US3 ومنطق Zip/skills وarabi.tools كتوسعة؛ ثم HF Spaces tmp أو `dev-infra` المحلي.

## Notes

- [P] tasks = ملفات مختلفة بلا اعتماديات.
- RegistryOrganizations: not merge `wrangler.jsonc` or replace `QUEUE_DRIVER` in prod.
- Commit بعد كل مهمة.
- السبل (harness-ops): `oc-verify .` بعد أي تعديل؛ لا `--no-verify`؛ لا اختبارات معطلة.
