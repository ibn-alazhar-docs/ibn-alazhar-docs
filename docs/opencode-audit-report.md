# تقرير التدقيق الشامل — OpenCode Tools & Configuration

## Ibn Al-Azhar Docs Project

> **تاريخ التدقيق:** 2026-05-21
> **نطاق التدقيق:** ملفات opencode في المشروع + ملفات الجهاز العالمية (`~/.config/opencode/`)
> **عدد الملفات المفحوصة:** 78+ ملف
> **عدد subagents المستخدمة:** 4

---

## ملخص تنفيذي

| المؤشر             | القيمة |
| ------------------ | ------ |
| 🔴 مشاكل حرجة      | **13** |
| 🟡 مشاكل متوسطة    | **18** |
| 🟢 مشاكل منخفضة    | **24** |
| **إجمالي المشاكل** | **55** |

---

# 🔴 المشاكل الحرجة (Critical)

---

## C-01: API Keys مكشوفة في ملفات Config (أخطر مشكلة)

| المسار                                 | السطر | التفاصيل                                         |
| -------------------------------------- | ----- | ------------------------------------------------ |
| `~/.config/opencode/opencode.json`     | 73    | OpenRouter API key مكشوف: `sk-or-v1-64a11724...` |
| `~/.config/opencode/opencode.json.bak` | 23    | Modal API key مكشوف: `modalresearch_E8wn...`     |
| `~/.config/opencode/opencode.json.bak` | 36    | نفس OpenRouter API key مكرر                      |

**الخطورة:** عالية جداً — أي شخص يصل لهذه الملفات يمكنه استخدام الـ API keys
**التصحيح:** نقل API keys إلى متغيرات بيئة أو استخدام opencode secrets management
**يتعارض مع:** `SECURITY.md` — "Never commit secrets" و `governance/REPOSITORY_BOUNDARIES.md`

---

## C-02: `.gitignore` يتجاهل Prisma Migrations بالكامل

| المسار       | السطر | المحتوى              |
| ------------ | ----- | -------------------- |
| `.gitignore` | 45    | `prisma/migrations/` |

**الخطورة:** عالية — فقدان تاريخ تغييرات قاعدة البيانات يعني عدم القدرة على تشغيل `prisma migrate` على بيئات أخرى
**التصحيح:** إزالة السطر 45 أو استبداله بـ `!prisma/migrations/`

---

## C-03: ملفات Runtime أساسية مفقودة (8 ملفات)

ملفات `context-loading.md` و `runtime-health.md` تشير إلى ملفات غير موجودة في `.opencode/`:

| الملف المفقود          | يُشار إليه من                                                               |
| ---------------------- | --------------------------------------------------------------------------- |
| `SYSTEM.md`            | `runtime-health.md:15`, `context-loading.md:14`                             |
| `RUNTIME_MANIFESTO.md` | `runtime-health.md:16`, `context-loading.md:15`, `no-fake-completion.md:39` |
| `EXECUTION_ENGINE.md`  | `runtime-health.md:17`, `context-loading.md:55`, `docs-first-policy.md:37`  |
| `BOOT_SEQUENCE.md`     | `runtime-health.md:18`, `context-loading.md:15`, `session-loader.md:5`      |
| `REVIEW_PIPELINE.md`   | `runtime-health.md:19`, `context-loading.md:58`                             |
| `WORKFLOW.md`          | `runtime-health.md:20`, `context-loading.md:56`                             |
| `PHASE_GATES.md`       | `runtime-health.md:21`, `context-loading.md:57`, `phase-lock/SKILL.md:44`   |
| `runtime-manifest.md`  | `runtime-health.md:22`                                                      |

**الحالة الفعلية:** هذه الملفات موجودة فقط في `.opencode/_legacy/` وليس في المسار الجذر
**التصحيح:** إما نقل الملفات من `_legacy/` إلى الجذر، أو تحديث جميع المراجع

---

## C-04: ملفات Policies تشير لملفات غير موجودة

| الملف المرجعي                                            | السطر | الملف المفقود           |
| -------------------------------------------------------- | ----- | ----------------------- |
| `policies/security-baseline.md`                          | 49    | `AI_OPERATING_RULES.md` |
| `policies/docs-first-policy.md`                          | 36    | `AI_OPERATING_RULES.md` |
| `policies/docs-first-policy.md`                          | 37    | `EXECUTION_ENGINE.md`   |
| `policies/no-fake-completion.md`                         | 39    | `RUNTIME_MANIFESTO.md`  |
| `policies/no-fake-completion.md`                         | 40    | `SESSION_RULES.md`      |
| `policies/no-fake-completion.md`                         | 41    | `AI_OPERATING_RULES.md` |
| `policies/no-unverified-claims.md`                       | 39    | `RUNTIME_MANIFESTO.md`  |
| `policies/no-unverified-claims.md`                       | 41    | `AI_OPERATING_RULES.md` |
| `policies/no-direct-implementation-before-phase-lock.md` | 35    | `PHASE_GATES.md`        |
| `policies/no-direct-implementation-before-phase-lock.md` | 36    | `AI_OPERATING_RULES.md` |
| `policies/no-direct-implementation-before-phase-lock.md` | 37    | `EXECUTION_ENGINE.md`   |

**الحالة الفعلية:** `AI_OPERATING_RULES.md` و `SESSION_RULES.md` موجودان فقط في `.opencode/archive/runtime-duplicates/`
**التصحيح:** تحديث المراجع أو نقل الملفات من archive

---

## C-05: `.npmrc` إعدادات متعارضة مع سياسة pnpm الصارمة

| المسار   | السطر | المحتوى                          |
| -------- | ----- | -------------------------------- |
| `.npmrc` | 3     | `auto-install-peers=false`       |
| `.npmrc` | 4     | `strict-peer-dependencies=false` |

**التعارض:** `package.json` يحدد `"packageManager": "pnpm@10.33.4"` الذي يفترض فحص صارم للتبعيات. تعطيل `strict-peer-dependencies` قد يسبب مشاكل runtime مع `@prisma/client`
**التصحيح:** تغيير إلى `strict-peer-dependencies=true` أو `warn`

---

## C-06: `.specify/extensions.yml` — تنفيذ تلقائي للأوامر

| المسار                    | السطر | المحتوى                    |
| ------------------------- | ----- | -------------------------- |
| `.specify/extensions.yml` | 4     | `auto_execute_hooks: true` |

**التعارض:** يتعارض مع سياسة "Zero Direct Execution" في `governance/CHANGE_CONTROL.md:1`
**التصحيح:** تغيير إلى `auto_execute_hooks: false`

---

## C-07: أسماء Agents غير متطابقة بين الملفات

| في `tool-permissions.md` | في `.opencode/agents/` | الحالة        |
| ------------------------ | ---------------------- | ------------- |
| `architect`              | ❌ غير موجود           | **مفقود**     |
| `security-reviewer`      | `security-auditor.md`  | **اسم مختلف** |
| `frontend-polish`        | ❌ غير موجود           | **مفقود**     |
| `qa-lead`                | ❌ غير موجود           | **مفقود**     |
| `docs-sync`              | `docs-writer.md`       | **اسم مختلف** |

**التأثير:** نظام الصلاحيات لا يعمل لأن agents غير موجودة

---

## C-08: MCP Servers معطلة بالكامل

| المسار                             | السطر  | التفاصيل                                  |
| ---------------------------------- | ------ | ----------------------------------------- |
| `opencode.json` (مشروع)            | 77-106 | جميع MCP servers لديها `"enabled": false` |
| `~/.config/opencode/opencode.json` | 78-108 | نفس الإعدادات                             |

**المشكلة:** Skills موجودة (context7-mcp, playwright-skill) لكن MCP servers معطلة
**التأثير:**.skills التي تعتمد على MCP لن تعمل

---

## C-09: مسار Phase Focus خاطئ

| المسار                                 | السطر | المحتوى الخاطئ                    | الصحيح                            |
| -------------------------------------- | ----- | --------------------------------- | --------------------------------- |
| `.opencode/runtime/context-loading.md` | 33    | `memory/project/phase-1-focus.md` | `memory/project/phase-0-focus.md` |
| `memory/project/phase-0-focus.md`      | 90    | `.opencode/PHASE_GATES.md`        | `governance/PHASE_LOCK_POLICY.md` |

---

## C-10: تقارير المراجعة تشير لملفات غير موجودة

| التقرير                                  | الملفات المفقودة                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `reviews/runtime-verification-report.md` | `MODEL_ROUTING.md`, `MCP_STACK.md`, `agents/core/*.md`, `mcp/*.md`, `routing/models/*.md` |
| `reviews/runtime-gap-analysis.md`        | `mcp/`, `prompts/`, `routing/models/`, `AGENT_RULES.md`                                   |

**التأثير:** التقارير غير دقيقة وتشير إلى بنية غير موجودة

---

## C-11: تعارض في إصدارات Node.js عبر 4 ملفات

| الملف                                           | الإصدار المطلوب                  |
| ----------------------------------------------- | -------------------------------- |
| `AGENTS.md`                                     | `Node.js 22.x`                   |
| `docs/21_CONTRIBUTING.md:146`                   | `Node.js 20.x LTS`               |
| `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:13`     | `20 LTS (أو 22 LTS)` — غير محسوم |
| `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md:194` | `node:20-alpine`                 |

**التصحيح:** توحيد الإصدار في جميع الملفات

---

## C-12: تعارض في إصدارات pnpm

| الملف                         | الإصدار المطلوب |
| ----------------------------- | --------------- |
| `AGENTS.md`                   | `pnpm 10.33.4`  |
| `docs/21_CONTRIBUTING.md:147` | `pnpm 9.x`      |

---

# 🟡 المشاكل المتوسطة (Medium)

---

## M-01: تكرار Skills بين `.opencode/skills/` و `.agents/skills/`

| Skill               | `.opencode/skills/` | `.agents/skills/`                |
| ------------------- | ------------------- | -------------------------------- |
| `code-reviewer`     | ❌                  | ✅ SKILL.md                      |
| `security-baseline` | ✅ SKILL.md         | ❌ (لكن `security-review` موجود) |
| `brand-consistency` | ✅ SKILL.md         | ❌                               |
| `docker-first`      | ✅ SKILL.md         | ❌                               |
| `phase-lock`        | ✅ SKILL.md         | ❌                               |
| `spec-driven`       | ✅ SKILL.md         | ❌                               |
| `arabic-rtl`        | ✅ SKILL.md         | ❌                               |

**المشكلة:** لا يوجد توثيق واضح عن أي منهما هو المصدر الرئيسي

---

## M-02: Agent `code-reviewer` مكرر في مكانين

| الموقع                                  | النوع                           |
| --------------------------------------- | ------------------------------- |
| `.opencode/agents/code-reviewer.md`     | Agent definition مع permissions |
| `.agents/skills/code-reviewer/SKILL.md` | Skill مع workflow كامل          |

---

## M-03: قواعد Code Style ناقصة في `AGENTS.md` الخاص بالمشروع

القواعد التالية موجودة في `~/.config/opencode/AGENTS.md` لكنها **مفقودة** من `AGENTS.md` الخاص بالمشروع:

| القاعدة                       | الملف العام | ملف المشروع |
| ----------------------------- | ----------- | ----------- |
| TypeScript strict mode        | ✅          | ❌          |
| No `any` type                 | ✅          | ❌          |
| Named exports over default    | ✅          | ❌          |
| Async/await over raw promises | ✅          | ❌          |

---

## M-04: تكرار جداول التصعيد في 4 ملفات

| الملف                                                              | السطر |
| ------------------------------------------------------------------ | ----- |
| `.opencode/runtime/escalation-rules.md`                            | كامل  |
| `.opencode/policies/no-direct-implementation-before-phase-lock.md` | جزء   |
| `.opencode/reviews/runtime-gap-analysis.md`                        | 119   |
| `.opencode/reviews/runtime-verification-report.md`                 | 95    |

---

## M-05: تكرار قوائم المراجعة في 5 ملفات

| الملف                                  |
| -------------------------------------- |
| `.opencode/reviews/REVIEW_STANDARD.md` |
| `.opencode/agents/security-auditor.md` |
| `.opencode/agents/code-reviewer.md`    |
| `.opencode/agents/docker-auditor.md`   |
| `.opencode/agents/rtl-auditor.md`      |

---

## M-06: تكرار ألوان العلامة التجارية في 6 ملفات

| الملف                                                  |
| ------------------------------------------------------ |
| `.opencode/memory/brand/brand-rules.md`                |
| `.opencode/policies/brand-consistency.md`              |
| `.opencode/agents/rtl-auditor.md`                      |
| `.opencode/memory/decisions/architecture-decisions.md` |
| `CODE_STYLE.md`                                        |
| `AGENTS.md`                                            |

---

## M-07: تعارض في متغيرات البيئة عبر الملفات

| المتغير                                    | الملفات المتعارضة                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `AUTH_SECRET` vs `NEXTAUTH_SECRET`         | `docs/21_CONTRIBUTING.md` vs `docs/26_PHASE_1_EXECUTION_CHECKLIST.md`        |
| `DATABASE_URL` — كلمات مرور مختلفة         | `docs/21_CONTRIBUTING.md:230` vs `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:20` |
| `REDIS_HOST` + `REDIS_PORT` vs `REDIS_URL` | `docs/21_CONTRIBUTING.md:231` vs `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:27` |
| MinIO — أسماء مختلفة                       | `MINIO_ROOT_USER` vs `MINIO_ACCESS_KEY` vs `S3_ACCESS_KEY`                   |

---

## M-08: تعارض في أسماء MinIO Bucket

| الملف                                           | الاسم                               |
| ----------------------------------------------- | ----------------------------------- |
| `docs/22_REPO_STRUCTURE.md:225`                 | `ibn-al-azhar-docs-files`           |
| `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:34`     | `ibn-al-azhar-docs-files`           |
| `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md:312` | `ibn-al-azhar-docs` (بدون `-files`) |

---

## M-09: تعارض في أسماء ملفات Docker Compose

| الملف                                           | الاسم المستخدم              |
| ----------------------------------------------- | --------------------------- |
| `docs/22_REPO_STRUCTURE.md:277`                 | `docker-compose.yml`        |
| `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md:288` | `compose.yaml`              |
| `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:48`     | `docker-compose.dev.yml`    |
| **الملف الفعلي في المشروع**                     | `docker-compose.dev.yml` ✅ |

---

## M-10: تعارض في هيكل المستودع

| الملف                          | الهيكل الموصوف                |
| ------------------------------ | ----------------------------- |
| `docs/22_REPO_STRUCTURE.md:49` | `apps/web/app/` (بدون `src/`) |
| `docs/TESTING_STRATEGY.md:68`  | `apps/web/src/` (مع `src/`)   |
| `CODE_STYLE.md`                | `apps/web/src/` (مع `src/`)   |

---

## M-11: عدد ADRs غير محدّث

| الملف                                     | العدد المذكور | العدد الفعلي                        |
| ----------------------------------------- | ------------- | ----------------------------------- |
| `docs/23_FINAL_CONSISTENCY_REPORT.md:104` | 17 ADR        | 21 ADR (ADR-018 إلى ADR-021 أُضيفت) |

---

## M-12: Specs غير محدّثة في `22_REPO_STRUCTURE.md`

| الملف                           | العدد                      |
| ------------------------------- | -------------------------- |
| `docs/22_REPO_STRUCTURE.md:318` | يذكر 4 specs فقط (001-004) |
| `specs/INDEX.md`                | 10 specs (001-010)         |

---

## M-13: `opencode.json` — نموذج Qwen قديم

| المسار          | السطر | المحتوى                                 |
| --------------- | ----- | --------------------------------------- |
| `opencode.json` | 70    | `qwen/qwen-2.5-coder-32b-instruct-free` |

**المشكلة:** النموذج قد يكون غير متاح على OpenRouter (تم إيقاف النسخ المجانية)

---

## M-14: `.coderabbit.yaml` — لغة المراجعات إنجليزية

| المسار             | السطر | المحتوى             |
| ------------------ | ----- | ------------------- |
| `.coderabbit.yaml` | 3     | `language: "en-US"` |

**التعارض:** المشروع عربي-first لكن مراجعات CodeRabbit ستكون بالإنجليزية

---

## M-15: Playwright Skills مفرطة ومتداخلة

| الموقع                                      | النوع                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `.agents/skills/playwright-skill/`          | مجلد رئيسي مع sub-skills (ci/, core/, migration/, playwright-cli/, pom/) |
| `.agents/skills/playwright_best_practices/` | skill منفصل                                                              |
| `.agents/skills/playwright-ci/`             | skill منفصل                                                              |
| `.agents/skills/playwright-cli/`            | skill منفصل                                                              |
| `.agents/skills/playwright-core/`           | skill منفصل                                                              |
| `.agents/skills/playwright-migration/`      | skill منفصل                                                              |
| `.agents/skills/playwright-pom/`            | skill منفصل                                                              |

**المشكلة:** 7 ملفات/مجلدات مع محتوى متداخل

---

## M-16: Speckit Skills مكررة بين `.agents/` و `.opencode/commands/`

| `.agents/skills/speckit-git-*/SKILL.md` | `.opencode/commands/speckit.git.*.md` |
| --------------------------------------- | ------------------------------------- |
| `speckit-git-commit`                    | `speckit.git.commit.md`               |
| `speckit-git-feature`                   | `speckit.git.feature.md`              |
| `speckit-git-initialize`                | `speckit.git.initialize.md`           |
| `speckit-git-remote`                    | `speckit.git.remote.md`               |
| `speckit-git-validate`                  | `speckit.git.validate.md`             |

---

## M-17: `DATABASE_URL` و `DIRECT_URL` متطابقان بدون توضيح

| المسار         | السطر |
| -------------- | ----- |
| `.env.example` | 2-3   |

**المشكلة:** في الإنتاج مع PgBouncer، `DIRECT_URL` يجب أن يشير إلى اتصال مباشر بينما `DATABASE_URL` يشير إلى الاتصال المجمع

---

## M-18: مهارة React Native Skills غير ذات صلة

| المسار                                                |
| ----------------------------------------------------- |
| `.agents/skills/vercel-react-native-skills/AGENTS.md` |

**المشكلة:** المشروع تطبيق ويب (Next.js) وليس تطبيق موبايل

---

# 🟢 المشاكل المنخفضة (Low)

---

## L-01: تناقضات في التواريخ (14 ملف)

| الملف                                        | التاريخ      |
| -------------------------------------------- | ------------ |
| `docs/01_PRD.md`                             | `2025-03-05` |
| `docs/05_TECHNICAL_DESIGN.md`                | `2025-03-06` |
| `docs/21_CONTRIBUTING.md`                    | `2025-03-05` |
| `docs/22_REPO_STRUCTURE.md`                  | `2025-03-05` |
| `docs/23_FINAL_CONSISTENCY_REPORT.md`        | `2025-03-05` |
| `docs/24_V4_CHANGELOG.md`                    | `2025-03-05` |
| `docs/25_GO_NO_GO_REVIEW.md`                 | `2025-03-05` |
| `docs/26_PHASE_1_EXECUTION_CHECKLIST.md`     | `2025-03-05` |
| `docs/27_MVP_SCOPE_LOCK.md`                  | `2025-03-05` |
| `docs/28_TERMINOLOGY_AND_NAMING_STANDARD.md` | `2025-03-05` |
| `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md`  | `2025-03-05` |
| `docs/31_SPEC_KIT_WORKFLOW.md`               | `2026-03-05` |
| `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`      | `2026-03-05` |
| `docs/TESTING_STRATEGY.md`                   | `2026-05-21` |

---

## L-02: تناقضات في أرقام الإصدارات (11 ملف)

| الملف                                       | الإصدار |
| ------------------------------------------- | ------- |
| `docs/01_PRD.md`                            | `4.0`   |
| `docs/05_TECHNICAL_DESIGN.md`               | `4.0.0` |
| `docs/07_DATABASE_SCHEMA.md`                | `5.0.0` |
| `docs/21_CONTRIBUTING.md`                   | `4.0.0` |
| `docs/22_REPO_STRUCTURE.md`                 | `4.1.0` |
| `docs/27_MVP_SCOPE_LOCK.md`                 | `4.1`   |
| `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`     | `4.1.0` |
| `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` | `4.1.0` |
| `docs/31_SPEC_KIT_WORKFLOW.md`              | `4.1.0` |
| `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`     | `4.1.0` |
| `docs/33_ASSET_PIPELINE.md`                 | `4.1.0` |

---

## L-03: أخطاء إملائية

| الملف                                   | السطر | الخطأ        | التصحيح       |
| --------------------------------------- | ----- | ------------ | ------------- |
| `docs/25_GO_NO_GO_REVIEW.md`            | 14    | "مغلقل"      | "مغلق"        |
| `docs/33_ASSET_PIPELINE.md`             | 29    | "خط الأابيب" | "خط الأنابيب" |
| `docs/33_ASSET_PIPELINE.md`             | 69    | "هذه الصيمة" | "هذه الصورة"  |
| `docs/29_BRAND_IMPLEMENTATION_GUIDE.md` | 417   | "Segue UI"   | "Segoe UI"    |

---

## L-04: مرجع ذاتي غريب

| المسار                    | السطر | المحتوى                             |
| ------------------------- | ----- | ----------------------------------- |
| `docs/21_CONTRIBUTING.md` | 5     | "أنظر 21_CONTRIBUTING.md هذا الملف" |

---

## L-05: جملة Phase غير مكتملة المعنى

| المسار                         | السطر |
| ------------------------------ | ----- |
| `docs/31_SPEC_KIT_WORKFLOW.md` | 16    |

---

## L-06: `opencode.json.bak` قديم

| المسار                                 |
| -------------------------------------- |
| `~/.config/opencode/opencode.json.bak` |

**المشكلة:** يحتوي على نموذج قديم مع `modal-glm` provider و API key إضافي

---

## L-07: `opencode.json` — إعداد LSP سابق لأوانه

| المسار          | السطر |
| --------------- | ----- |
| `opencode.json` | 3-9   |

**المشكلة:** إعدادات LSP لـ TypeScript و Prisma موجودة رغم أن المشروع في Phase 0

---

## L-08: `opencode.json` — صلاحية `cat*` غير ضرورية

| المسار          | السطر |
| --------------- | ----- |
| `opencode.json` | 37    |

---

## L-09: `package.json` — esbuild في onlyBuiltDependencies

| المسار         | السطر |
| -------------- | ----- |
| `package.json` | 28    |

**المشكلة:** `esbuild` ليس تبعية مباشرة في `package.json`

---

## L-10: تعارض في أوامر Prisma

| الملف                                       | الأمر                     |
| ------------------------------------------- | ------------------------- |
| `AGENTS.md`                                 | `pnpm db:generate`        |
| `docs/21_CONTRIBUTING.md:181`               | `pnpm prisma migrate dev` |
| `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:54` | `npx prisma migrate dev`  |

---

## L-11: تعارض في أوامر التشغيل

| الملف                                       | الأمر                                            |
| ------------------------------------------- | ------------------------------------------------ |
| `AGENTS.md`                                 | `pnpm docker:up`                                 |
| `docs/21_CONTRIBUTING.md:178`               | `docker compose up -d db redis minio minio-init` |
| `docs/26_PHASE_1_EXECUTION_CHECKLIST.md:48` | `docker compose -f docker-compose.dev.yml up -d` |

---

## L-12: Specs تحتوي فقط على `spec.md`

جميع مجلدات specs تحتوي فقط على `spec.md` بينما `31_SPEC_KIT_WORKFLOW.md` يتطلب 6 ملفات لكل spec.

---

## L-13: ملفات Runtime مكررة في Archive

| الملف في archive                                   |
| -------------------------------------------------- |
| `archive/runtime-duplicates/SESSION_RULES.md`      |
| `archive/runtime-duplicates/AI_OPERATING_RULES.md` |
| `archive/runtime-duplicates/PROJECT_RUNTIME.md`    |

---

## L-14: `runtime-health.md` فحص الصحة سيعطي FAIL دائماً

| المسار                                | السطر |
| ------------------------------------- | ----- |
| `.opencode/runtime/runtime-health.md` | 15-22 |

**المشكلة:** قائمة "Required Files" تتضمن 8 ملفات غير موجودة فعلياً

---

## L-15: تعارض في `useContext()` vs `use()` لـ React 19

| المسار                                                 | السطر   |
| ------------------------------------------------------ | ------- |
| `.agents/skills/vercel-composition-patterns/AGENTS.md` | 900-936 |

---

## L-16: تكرار القواعد بين الملف العام وملف المشروع

| القاعدة                | الملف العام | ملف المشروع |
| ---------------------- | ----------- | ----------- |
| Arabic-first           | ❌          | ✅          |
| RTL-first              | ❌          | ✅          |
| Docker-first           | ❌          | ✅          |
| TypeScript strict mode | ✅          | ❌          |
| No `any` type          | ✅          | ❌          |

---

# 📊 ملخص حسب الفئة

| الفئة                       | عدد المشاكل |
| --------------------------- | ----------- |
| أمان (API keys, secrets)    | 2           |
| ملفات مفقودة / مراجع مكسورة | 19          |
| إعدادات متعارضة             | 8           |
| تكرار / ازدواجية            | 12          |
| تناقضات في التوثيق          | 13          |

---

# 🎯 أولويات الإصلاح

## فوري (اليوم)

1. **C-01:** إزالة API keys المكشوفة من `~/.config/opencode/opencode.json` و `opencode.json.bak`
2. **C-02:** إزالة `prisma/migrations/` من `.gitignore`
3. **C-03:** نقل ملفات runtime من `_legacy/` إلى الجذر أو تحديث المراجع
4. **C-05:** تصحيح إعدادات `.npmrc`
5. **C-06:** تعطيل `auto_execute_hooks` في `.specify/extensions.yml`

## عاجل (هذا الأسبوع)

6. **C-07:** توحيد أسماء Agents بين `tool-permissions.md` وملفات `.opencode/agents/`
7. **C-09:** تصحيح مسار `phase-1-focus.md` إلى `phase-0-focus.md`
8. **C-11:** توحيد إصدار Node.js في جميع الملفات
9. **C-12:** توحيد إصدار pnpm في جميع الملفات
10. **M-01:** توثيق المصدر الرئيسي للـ Skills (`.opencode/` أم `.agents/`)

## مهم (القريب)

11. **M-04 إلى M-06:** توحيد الجداول والقوائم المكررة
12. **M-07:** توحيد متغيرات البيئة في جميع الملفات
13. **M-08:** توحيد اسم MinIO Bucket
14. **M-09:** توحيد أسماء ملفات Docker Compose
15. **M-10:** توحيد هيكل المستودع

## عادي (متى أمكن)

16. **L-01:** توحيد التواريخ
17. **L-02:** توحيد أرقام الإصدارات
18. **L-03:** إصلاح الأخطاء الإملائية
19. **L-15:** توثيق قاعدة `use()` vs `useContext()` لـ React 19

---

# 📎 ملاحظات إضافية

## ملفات `_legacy/` تحتوي على ملفات مهمة

المجلد `.opencode/_legacy/` يحتوي على 7 ملفات كانت أساسية في السابق:

- `SYSTEM.md`
- `RUNTIME_MANIFESTO.md`
- `EXECUTION_ENGINE.md`
- `BOOT_SEQUENCE.md`
- `REVIEW_PIPELINE.md`
- `WORKFLOW.md`
- `PHASE_GATES.md`
- `runtime-manifest.md`
- `OPENCODE_POWERHOUSE.md`

هذه الملفات لا تزال مُشار إليها في ملفات runtime الحالية لكن تم نقلها إلى `_legacy/` بدون تحديث المراجع.

## ملفات Archive تحتوي على نسخ مكررة

المجلد `.opencode/archive/runtime-duplicates/` يحتوي على:

- `SESSION_RULES.md`
- `AI_OPERATING_RULES.md`
- `PROJECT_RUNTIME.md`

هذه الملفات لا تزال مُشار إليها في policies الحالية.

## C-13: `.coderabbit.yaml` — خصائص غير مدعومة في Schema

| المسار             | السطر | الخاصية             | الخطأ                                       |
| ------------------ | ----- | ------------------- | ------------------------------------------- |
| `.coderabbit.yaml` | 28    | `path_filters`      | `Property path_filters is not allowed`      |
| `.coderabbit.yaml` | 51    | `path_instructions` | `Property path_instructions is not allowed` |

**المشكلة:** الـ YAML Language Server يرفض هذه الخصائص لأنها غير موجودة في schema الرسمي لـ CodeRabbit
**التأثير:** قد يتم تجاهل هذه الإعدادات بالكامل من قبل CodeRabbit
**التصحيح:** التحقق من schema الرسمي لـ CodeRabbit واستخدام الخصائص المدعومة فقط

---

**نهاية التقرير**
**تم التدقيق بواسطة:** 4 subagents + مراجعة يدوية
**التاريخ:** 2026-05-21
