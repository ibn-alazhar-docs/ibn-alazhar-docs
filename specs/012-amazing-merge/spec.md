# Feature Specification: Amazing Merge — دمج مصادر عربية خارق

**Feature Branch**: `012-amazing-merge`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "نأخذ كل مميزات SKILLS arabic-pdf-to-book و arabi.tools و pdf-to-word zip و Visual_Identity وندمجها في Ibn Al Azhar موقعاً خارقاً متكاملاً بلا مشاكل ولا تعارضات، مع استضافة مجانية مناسبة (Cloudflare وغيره) و agent team"

## User Scenarios & Testing

### User Story 1 - أدوات الضيوف تعمل كاملة (Priority: P1)

ضيف يرفع ملفًا ويحصل على ناتج عربي منسَّق بلا حساب (pdf-to-word / OCR / tashkeel / transcription).

**Why this priority**: جوهر القيمة — الفجوة الحالية (2 متاحان، و2 sidecar-pending) بحاجة إلى إغلاق.

**Independent Test**: رفع PDF موحَّد عبر `/tools/*` في `apps/web`.

**Acceptance Scenarios**:

1. **Given** زائر بلا حساب، **When** يرفع `doc.pdf` (≤ 99MB)، **Then** يحصل على `markdown + docx` من `pdf-to-word` و`/api/tools/guest/jobs` تُرجع حالة `available`.
2. **Given** صورة/ملف PDF عبر `/tools/ocr`، **When** يطلب استخراجًا، **Then** يحصل على نص عربي مُطهَّر وملف قابل للتنزيل.

---

### User Story 2 - الهوية البصرية الحقيقية على الواجهة (Priority: P2)

الواجهات تُعرض بألوان وخظوط وشعار من `Visual_Identity` (Brand Book: Classic Teal `#127E87`، Antique Gold `#DA9E2C`، Prussian Blue `#083B40`، خطوط `thmanyah sans` + `Almarai`).

**Why this priority**: العلامة معرَّفة بجاهزيتها في Zip — دمجها يحقق التميز الفوري.

**Independent Test**: افتح صفحات `/(site)/tools` و`/(site)/docs` بعرض الهاتف والديسكتوب؛ قارن بـ Brand Book (قيمة Clear Space 190px).

**Acceptance Scenarios**:

1. **Given** المستخدم على الجوال، **When** يفتح `/tools`، **Then** يظهر الشعار «ابن الأزهر» بخط ثلث أخضر مزرق وسطر «في بيت كل طالب أزهري» ذهبي والمعاناة `RTL` صحيحة.
2. **Given** أي صفحة عامة، **When** يُفتح عنصر واجهة، **Then** الأساسي (`Almarai`) والمكمل (`thmanyah sans`) يُطبقان عبر `next/font` لا `link` عائم.

---

### User Story 3 - وجود/نص كوبرا وجان منيب (Priority: P3)

سكربت `pdf-to-word-markdown-text-converter` (React+Vite+Express+Gemini) يُجلب منطقًا فقط (لا الخادم) ثم تطبَّق كمدخل/مخرج للمستخدم عبر قائمة `GUEST_TOOLS`.

**Why this priority**: قيمة إضافية (QA قرآني + `robust quranic` + تحويلات دقيقة) دون استبدال المنصة الحالية.

**Independent Test**: صفحة `pdf-to-word` عبر `/api/documents/[id]/export` تُرجع ناتج «مدقق قرآنيًا» (قواعد موحَّدة) كما في `docs/correction-rule-divergence.md`.

**Acceptance Scenarios**:

1. **Given** PDF قرآني، **When** يُحوَّل عبر `pdf-to-word`، **Then** ينجحم `calibration + quranic verification` (إشارة نائبة في المطابقة توحّد القواعد الثلاث المتصارعة).
2. **Given** `arabi.tools` (Rust): OCR + تشكيل + Wit — يبقى اختياريًا مشروطًا بالاعتماديات؛ إن غابت يظهر «غير متاح مؤقتًا» ولا يتعطل الباقي.

### Edge Cases

- ما يحدث عند ملف > 99MB أو > 1000 صفحة أو > 4 كلي لـ IP — تُرفض بحدود `GUEST_TOOLS_LIMITS` (99MB/1000/4/3/1/TTL 30م).
- ما يحدث عند غياب `GEMINI_API_KEY` أو `GOOGLE_GENERATIVE_AI_API_KEY` — الواجهة تعمل والـ OCR يعطي رسالة قابلة للتوضيح لا تنهار.
- ما يحدث عند تعارض قواعد تصحيح القرآن بين 3 مصادر — تُحوَّل درجة قصوى واحدة موحَّدة (قرار في `plan.md`).
- ما يحدث عند `QUEUE_DRIVER=pg` في `wrangler.jsonc` — يُذكي الذي نريد رفضه في الإنتاج.

## Requirements

### Functional Requirements

- **FR-001**: النظام MUST يؤمِّن `pdf-to-word` و`ocr` كأدواتين `available` بلا إعادة كتابة (موجودان أصلًا) — ويرفع `tashkeel` و`transcription` حيث يمكن واقعيًا، وإلا يبقيان صريحين `sidecar-pending`.
- **FR-002**: النظام MUST يحمل بيانات الهوية البصرية من `Visual_Identity/ai_studio_code.html` + `_brand_book_by_pomelli.pdf` مع tokens في `tailwind` القائم وتحميل `Almarai` عبر `next/font`.
- **FR-003**: النظام MUST يستعيد منطق `documentConverter.ts` + `docxExporter.ts` + `arabicText.ts` من الـ zip كبيانات (لا نقل `server.ts` نفسه).
- **FR-004**: سكربت `arabic-pdf-to-book` (Gemini OCR + pdftotext تشخيص + QA) يُستخدم كـ **sidecar** مع مفتاح `~/.config/ocr/gemini_key`، ولا يُجلب أي وزن محلي ثقيل.
- **FR-005**: `arabi.tools` (Rust) يُعرض كـ **UI احتياطي**/اقتراح فقط؛ لا يتسنى دمجه زعمًا قبل وجود `LICENSE` فعلي — يبقى `pa ناخب داخلي` (اعتماديات: `WIT_TOKENS_AR`, `DRIVE_SERVICE_ACCOUNTS`).
- **FR-006**: الاستضافة: `HuggingFace Spaces (Docker) + Neon + Upstash + R2` كخيار مجاني كامل بلا فيزا؛ `Cloudflare` للواجهة فقط إن رُغِبت سرعة أعلى (تقييم في `plan.md`).
- **FR-007**: يجب لا تكسر `pnpm check` (`format:check` + `lint --max-warnings 0` + `typecheck`) وأي تغيير يعدَّل واجهات الضيوف أو الخدمة يعدَّل `oc-verify .`.

### Key Entities

- **GuestJob**: حالة مهمة الضيف (`/api/tools/guest/jobs/[id]`) — يشترك فيها `pdf-to-word/ocr/...`.
- **BrandTokens**: ألوان + خطوط + شعار من `Visual_Identity`.
- **Sidecar (SKILLS)**: `arabic-pdf-to-book` عبر `~/.config/ocr/gemini_key` + QA.

## Success Criteria

### Measurable Outcomes

- **SC-001**: صفحتا `/tools/pdf-to-word` و`/tools/ocr` تُكملان دورة رفع→ناتج في بيئة محلية (L4: أمر + خرج).
- **SC-002**: لا تحذير ESLint جديد (`pnpm lint` exit 0) ولا تراجع `typecheck` بعد الدمج.
- **SC-003**: `pnpm ci:all` يمر (format+lint+typecheck+test+secrets) في حدمه.
- **SC-004**: الشعار والخطوط تُطبَّق على 4 صفحات ضيوف نموذجية: `/tools` + `/tools/*` + `/docs` + `/(public)/share/[token]`.

## Assumptions

- طالب أزهري يستخدم الهاتف غالبًا (تجربة `mobile-native`).
- Gemini API (`GOOGLE_GENERATIVE_AI_API_KEY`) متاح ومذكور للمفتاح `~/.config/ocr/gemini_key` في `SKILLS`.
- نُقل منطق CSV/مامو بدل الاحتفاظ بـ `server.ts` Express — يبقى Next+Prisma+Queue المنصة الأساسية.
- لا استضافة تدفع بفيزا؛ HF Spaces + Neon + Upstash + R2 مجاني.
- لا يُسمَّح أبدًا بصيغة `main` بعدها ولم يتم تعديل `AGENTS.md` أو تعديل `opencode.json` ذاتيًا.
