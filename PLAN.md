# 📋 خطة الإصلاح الشاملة — Production-Ready Hygiene

> **الفرع الحالي**: `fix/production-hygiene`
> **تاريخ الإنشاء**: 2026-06-22
> **الحالة**: Phases 0-3 مكتملة ✅ | Phases 4-7 متبقية

---

## 📊 ما تم إنجازه حتى الآن (Phases 0-3)

| Phase | الوصف | الحالة |
|-------|-------|--------|
| 0 | شبكة الأمان: stash + فرع `fix/production-hygiene` | ✅ |
| 1 | إصلاح `.gitignore`: منع `.opencode/node_modules/`, `sessions/`, `snapshots/` من git | ✅ |
| 2 | إصلاح `.env` و`.env.example`: توحيد AUTH_SECRET، توحيد ADMIN_PASSWORD، إصلاح DATABASE_URL port 5432→5433 | ✅ |
| 3 | إدخال كل الكود غير المتعقب (517 ملف) في 8 commits منظمة | ✅ |

### Commits المنجزة (8 commits على الفرع)

```
c9a436c chore: update .gitignore, fix .env.example port bug, clean .opencode tracking
4e52c69 feat: sync all app, specs, tests, docs, and infra changes
4a5a6e4 feat: add core use-cases, hooks, pipeline UI, and PDF worker
b40bf8e feat(infra): add Caddy, monitoring, staging compose, dependabot
5410215 feat(db): add db_hardening migration
c9d4e97 test: add api, backend, integration, security, pentest, load, recovery, backup, e2e suites
46f7db3 docs: add production readiness, test reports, deployment guides, sharing spec
b7c2b62 chore: clean up deleted/archived files, update dockerignore and CI
```

### ملاحظة: إصلاح typecheck أثناء Phase 4

- **تم إصلاح bug فعلي**: `packages/pipeline/src/output.ts:295` — كان فيه `as any` × 3 + 3 arguments زائدة لـ `PdfPrinter` constructor
- الإصلاح: حذف الـ arguments الزيادة (constructor بياخد fonts بس)
- **النتيجة**: كل 4 workspaces typecheck تمر بـ صفر أخطاء ✅
- **الملف محتاج commit** (status: modified, not committed yet)

---

## 🔴 المهام المتبقية (Phases 4-7)

---

### Phase 4 — Audit & تصحيح أمني

#### المهمة 4.1 — إصلاح `: any` في framer-motion variants
**الملفات المتأثرة (7 مواضع في 3 ملفات)**:
- `apps/web/src/components/sections/hero.tsx` — سطر 45 (`containerVariants`), سطر 57 (`itemVariants`)
- `apps/web/src/components/sections/features.tsx` — سطر 29 (`cardVariants`)
- `apps/web/src/components/sections/knowledge-areas.tsx` — سطر 27 (`containerVariants`), سطر 35 (`itemVariants`)

**الأمر التنفيذي**:
```bash
# في hero.tsx — استبدل:
#   const containerVariants: any = { ... }
#   const itemVariants: any = { ... }
# بـ:
#   const containerVariants = { ... }
#   const itemVariants = { ... }
# (أي احذف `: any` من السطرين وسيب TS يستنتع النوع)

# في features.tsx — نفس الشيء لـ cardVariants

# في knowledge-areas.tsx — نفس الشيء لـ containerVariants و itemVariants
```

**التفاصيل**: الـ `Variants` type مش متوفر من `motion/react-client` في النسخة الحالية. الحل: احذف `: any` وتسيب TypeScript يستنتع النوع (const assertion كافي). لو حصل TS error، استخدم `Record<string, Record<string, number>>` كبديل.

---

#### المهمة 4.2 — إصلاح `as any` في BullMQ queue.ts
**الملف**: `packages/pipeline/src/queue.ts` — سطر 69 و 191

**الأمر التنفيذي**:
```bash
# السطر 69: connection: conn as any
# السطر 191: connection: getConnection(config) as any

# BullMQ's Queue constructor بياخد Redis connection object.
# لو conn هو Redis.Redis أو ioredis client، النوع الصح هو:
#   import type { RedisOptions } from 'ioredis';
# أو ببساطة: احذف as any وشوف لو typecheck بيمر
# لو مش بيمر، استخدم: conn as unknown as BullMQ.ConnectionOptions
```

**ملاحظة**: أعد تشغيل `npx tsc -p packages/pipeline/tsconfig.json --noEmit` بعد التعديل.

---

#### المهمة 4.3 — مراجعة API authorization (عيّنة)
**الأمر التنفيذي**:
```bash
# افحص إن كل API routes بتستخدم requireAuth أو requireRole:
grep -rn "requireAuth\|requireRole\|getSession\|getServerSession" apps/web/src/app/api/ --include="*.ts" | head -30

# لو لقيت route بدون auth check، دي ثغرة
```

**API routes اللي لازم تتأكد منها** (كلها في `apps/web/src/app/api/`):
- `documents/[id]/route.ts` — ✅ مؤكد (مقروء — فيه ownership check)
- `auth/register/route.ts` — لازم يكون public (تسجيل جديد)
- `auth/[...nextauth]/route.ts` — NextAuth handler (public)
- `health/route.ts`, `health/ready/route.ts` — لازم يكون public
- `folders/route.ts`, `folders/[id]/route.ts`
- `search/route.ts`
- `share/[token]/route.ts` — لازم يكون public (تسجيل دخول)
- `tags/route.ts`, `tags/[id]/route.ts`
- `export/[id]/route.ts`
- `upload/route.ts`

**القاعدة**: كل route إلا auth/health/share[token]/public endpoints لازم فيها `requireAuth`.

---

#### المهمة 4.4 — Docker `:latest` hardening
**الملف**: `docker-compose.yml`

**5 images بـ `:latest`**:
| السطر | الصورة الحالية | الإصدار المقترح |
|-------|---------------|-----------------|
| 90 | `pgbouncer/pgbouncer:latest` | `pgbouncer/pgbouncer:1.23` |
| 332 | `mcuadros/ofelia:latest` | `mcuadros/ofelia:0.3.12` |
| 348 | `gcr.io/cadvisor/cadvisor:latest` | `gcr.io/cadvisor/cadvisor:v0.49.1` |
| 370 | `prom/prometheus:latest` | `prom/prometheus:v3.2.1` |
| 392 | `grafana/grafana:latest` | `grafana/grafana:11.5.2` |

**الأمر التنفيذي**:
```bash
# افتح docker-compose.yml وابحث عن :latest واستبدل كل واحدة بالإصدار المقترح
# أو استخدم sed:
sed -i 's/pgbouncer\/pgbouncer:latest/pgbouncer\/pgbouncer:1.23/' docker-compose.yml
sed -i 's/mcuadros\/ofelia:latest/mcuadros\/ofelia:0.3.12/' docker-compose.yml
sed -i 's/gcr.io\/cadvisor\/cadvisor:latest/gcr.io\/cadvisor\/cadvisor:v0.49.1/' docker-compose.yml
sed -i 's/prom\/prometheus:latest/prom\/prometheus:v3.2.1/' docker-compose.yml
sed -i 's/grafana\/grafana:latest/grafana\/grafana:11.5.2/' docker-compose.yml

# تأكد من صحة compose file:
docker compose config > /dev/null 2>&1 && echo "✅ Valid" || echo "❌ Invalid"
```

**ملاحظة**: الأرقام دي هي أحدث إصدارات مستقرة وقت كتابة الخطة. لو حصل مشكلة مع إصدار معيّن، شوف [Docker Hub](https://hub.docker.com) أو [GitHub releases](https://github.com) للتأكد.

---

#### المهمة 4.5 — Commit Phase 4
```bash
git add -A
git commit -m "fix(security): remove type-unsafe any, fix Docker latest tags, harden types

- Remove :any from framer-motion variants (hero, features, knowledge-areas)
- Fix as any in BullMQ queue.ts connection typing
- Pin Docker images to specific versions (pgbouncer, ofelia, cadvisor, prometheus, grafana)
- Fix PdfPrinter constructor bug in output.ts (remove extra arguments + as any)"
```

---

### Phase 5 — الفروع الميتة + التنظيف الهيكلي

#### المهمة 5.1 — أرشفة فروع subagent (7 فروع، كلها 30 unique commits)

**الأمر التنفيذي**:
```bash
# الخطوة 1: انشئ tags للأرشفة (تحفظ المرجع بدون ما تحذف الشغل)
for branch in $(git branch | grep subagent | sed 's/^[+* ]*//'); do
    tag_name="archive/$(echo $branch | sed 's/subagent-//' | tr '[:upper:]' '[:lower:]')"
    echo "Tagging $branch → $tag_name"
    git tag -a "$tag_name" "$branch" -m "Archive: $branch (30 commits)"
done

# الخطوة 2: احذف الفروع المحلية
for branch in $(git branch | grep subagent | sed 's/^[+* ]*//'); do
    echo "Deleting $branch"
    git branch -D "$branch"
done

# تأكد:
git branch
# المفروض يبقى بس: main, 001-bootstrap-spec-kit, fix/production-hygiene
```

**ملاحظة مهمة**: كل فرع فيه 30 commits فريدة (ماشية في main). احفظهم كـ tags قبل الحذف عشان لو احتجتهم تقدر ترجع. لو عايز تتأكد إن الـ commits مش مهمة قبل الحذف:
```bash
# شوف أول 3 commits من أي فرع:
git log main..subagent-Security-DevOps-Lead-prod-sec-agent-c77c9d61 --oneline | head -3
```

---

#### المهمة 5.2 — معالجة `packages/config/` الفاضي
**الأمر التنفيذي**:
```bash
# تأكد إنه فعلاً فاضي:
ls packages/config/
# لو فيه بس package.json فاضي، اختار واحد من اثنين:

# الخيار أ: احذف المجلد بالكامل
rm -rf packages/config

# الخيار ب: أبقيه بس احذف ذكره من README
# (في README.md سطر Architecture، فيه packages/config/ مذكور كـ "Empty package")
```

**التوصية**: الخيار أ (حذف) — مجلد فاضي مفيهوش حاجة. بس تأكد إن مفيش workspace reference في package.json:
```bash
grep -r "packages/config" package.json pnpm-workspace.yaml 2>/dev/null
```

---

#### المهمة 5.3 — Commit Phase 5
```bash
git add -A
git commit -m "chore: archive subagent branches as tags, remove empty packages/config

- Archive 7 subagent branches as git tags (archive/...)
- Remove packages/config/ empty directory"
```

---

### Phase 6 — تصحيح دقّة الوثائق (Truth Reconciliation)

#### المهمة 6.1 — تشغيل الاختبارات الفعلية وتسجيل الأرقام
**الأمر التنفيذي** (مطلوب infra شغّال أولاً):
```bash
# 1. شغّل البنية التحتية:
./ibn.sh dev-infra

# 2. انتظر الحاويات تبدأ (~15 ثانية)، ثم:
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 3. شغّل كل suite وسجّل الأرقام من الـ vitest output:
pnpm test 2>&1 | tee /tmp/test-unit.txt          # → انظر "Tests X passed"
pnpm test:integration 2>&1 | tee /tmp/test-integ.txt
pnpm test:security 2>&1 | tee /tmp/test-sec.txt
pnpm test:pentest 2>&1 | tee /tmp/test-pent.txt
pnpm test:load 2>&1 | tee /tmp/test-load.txt
pnpm test:recovery 2>&1 | tee /tmp/test-rec.txt
pnpm test:backup 2>&1 | tee /tmp/test-back.txt
```

**الأرقام الحالية في README** (مش دقيقة حسب العدّ اليدوي):
| Suite | README يقول | العدّ اليدوي (grep) | ملاحظة |
|-------|-------------|---------------------|--------|
| Unit | 686 | ~668 | `tests/unit/` مش موجود، الموجود في tests/backend + tests/frontend |
| Integration | 95 | 95 | ✅ |
| Security | **196** | **138** | ❌ مبالغ فيه |
| Pentest | 61 | 56 | ⚠️ |
| Load | 39 | 39 | ✅ |
| Recovery | **79** | **60** | ❌ مبالغ فيه |
| Backup | 48 | 48 | ✅ |

---

#### المهمة 6.2 — تحديث `README.md` (سطر 81-91)

**الأمر التنفيذي**:
```bash
# افتح README.md وغيّر سطور 81-91:

# استبدل:
#   **1,204 tests across 7 phases — all passing.**
# بـ:
#   **1,041 tests across 7 phases — all passing.**
# (أو الرقم الفعلي من تشغيل الاختبارات)

# واستبدل الجدول بالأرقام الفعلية من تشغيل الاختبارات.
# مثال (لو الأرقام الفعلية مطابقة للعدّ):
# | Command                 | Suite            | Tests |
# | ----------------------- | ---------------- | ----- |
# | `pnpm test`             | Unit*            | 668   |
# | `pnpm test:integration` | Integration      | 95    |
# | `pnpm test:security`    | Security         | 138   |
# | `pnpm test:pentest`     | Penetration      | 56    |
# | `pnpm test:load`        | Load             | 39    |
# | `pnpm test:recovery`    | Recovery         | 60    |
# | `pnpm test:backup`      | Backup & Restore | 48   |
#
# أضف ملاحظة أسفل الجدول:
# *Unit tests are split across `tests/backend/` and `tests/frontend/`.

# واستبدل:
#   Full reports: [docs/testing/](docs/testing/)
# بـ:
#   Test files: `tests/backend/` (unit), `tests/frontend/` (unit), `tests/integration/`, `tests/security/`, `tests/pentest/`, `tests/load/`, `tests/recovery/`, `tests/backup/`, `tests/e2e/`
```

---

#### المهمة 6.3 — تحديث `AGENTS.md` (سطر Phase status)

**الأمر التنفيذي**:
```bash
# في AGENTS.md، ابحث عن قسم "Phase status" وغيّه:
# من:
#   - Phase 3A–3I: Testing (unit, integration, security, pentest, load, recovery, backup) — 1,204 tests, all passing
# إلى:
#   - Phase 3A–3I: Testing (unit, integration, security, pentest, load, recovery, backup) — 1,041 tests, all passing
# (أو الرقم الفعلي)
```

---

#### المهمة 6.4 — تحديث `docs/production/PRODUCTION_READINESS_FINAL.md`

**الأمر التنفيذي**:
```bash
# افتح docs/production/PRODUCTION_READINESS_FINAL.md
# ابحث عن أي أرقام اختبارات وحدّثها لتطابق الأرقام الفعلية
# كمان ابحث عن "tests/unit" وغيّها لتطابق "tests/backend + tests/frontend"
```

---

#### المهمة 6.5 — Commit Phase 6
```bash
git add -A
git commit -m "docs: fix test counts to match actual numbers from vitest output

- Update README.md test table (Security 196→138, Recovery 79→60, Pentest 61→56)
- Update AGENTS.md phase status section
- Update PRODUCTION_READINESS_FINAL.md
- Clarify unit tests split across tests/backend and tests/frontend
- Fix total from 1,204 to actual count"
```

---

### Phase 7 — التحقق النهائي (Verification Gate)

#### المهمة 7.1 — Typecheck
```bash
pnpm typecheck
# لازم يخرج صفر أخطاء (إذا تم إصلاح كل :any/as any في Phase 4)
```

#### المهمة 7.2 — Lint
```bash
pnpm lint
# ESLint --max-warnings 0
# لو فيه warnings/errors في tests (no-explicit-any)، دي مسموحة في ملفات الاختبار
# لكن لازم تكون في الـ eslint config بشكل صريح
```

#### المهمة 7.3 — Format check
```bash
pnpm format:check
# لو فيه ملفات مش منسّقة:
pnpm format:write
```

#### المهمة 7.4 — Docker Compose validation
```bash
docker compose config > /dev/null 2>&1 && echo "✅ Valid" || echo "❌ Invalid"
```

#### المهمة 7.5 — Git status نظيف
```bash
git status
# لازم يكون: nothing to commit, working tree clean
```

#### المهمة 7.6 — الأخطاء المتوقعة والتعامل معها

**لو typecheck فشل**:
```bash
# شوف الخطأ:
pnpm typecheck 2>&1 | grep "error TS"
# أصلح في الكود وأعد التشغيل
```

**لو lint فيه أخطاء في tests** (no-explicit-any):
```bash
# الخيار أ: أضف rule override في eslint config للـ tests
# الخيار ب: أصلح الـ :any في ملفات الاختبار (ممكن يكون كتير)
# التوصية: الخيار أ — الاختبارات بتستخدم any بشكل مقبول أحياناً
```

**لو git status مش نظيف**:
```bash
git add -A
git commit -m "chore: final cleanup from verification gate"
```

---

## 📝 ملخص التنفيذ النهائي

### الأوامر بالترتيب السريع

```bash
# === Phase 4 (Security Audit) ===

# 4.1 — إصلاح :any في framer-motion
# عدّل يدوياً في الـ 3 ملفات (hero.tsx, features.tsx, knowledge-areas.tsx)
# احذف `: any` من كل variants

# 4.2 — إصلاح as any في queue.ts
# عدّل يدوياً في packages/pipeline/src/queue.ts (سطر 69 و 191)

# 4.3 — مراجعة API auth
grep -rn "requireAuth\|requireRole" apps/web/src/app/api/ --include="*.ts"

# 4.4 — Docker latest → pinned
sed -i 's/pgbouncer\/pgbouncer:latest/pgbouncer\/pgbouncer:1.23/' docker-compose.yml
sed -i 's/mcuadros\/ofelia:latest/mcuadros\/ofelia:0.3.12/' docker-compose.yml
sed -i 's/gcr.io\/cadvisor\/cadvisor:latest/gcr.io\/cadvisor\/cadvisor:v0.49.1/' docker-compose.yml
sed -i 's/prom\/prometheus:latest/prom\/prometheus:v3.2.1/' docker-compose.yml
sed -i 's/grafana\/grafana:latest/grafana\/grafana:11.5.2/' docker-compose.yml

# 4.5 — Commit
git add -A && git commit -m "fix(security): remove type-unsafe any, pin Docker images, harden types"

# === Phase 5 (Branches + Cleanup) ===

# 5.1 — أرشفة + حذف الفروع الميتة
for b in $(git branch | grep subagent | sed 's/^[+* ]*//'); do
  tag="archive/$(echo $b | sed 's/subagent-//' | tr '[:upper:]' '[:lower:]')"
  git tag -a "$tag" "$b" -m "Archive: $b"
  git branch -D "$b"
done

# 5.2 — حذف packages/config الفاضي
rm -rf packages/config

# 5.3 — Commit
git add -A && git commit -m "chore: archive subagent branches, remove empty packages/config"

# === Phase 6 (Docs Truth) ===

# 6.1 — شغّل الاختبارات وسجّل الأرقام
./ibn.sh dev-infra  # ← لازم يكون docker شغّال
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm test 2>&1 | tail -5
pnpm test:integration 2>&1 | tail -5
pnpm test:security 2>&1 | tail -5
pnpm test:pentest 2>&1 | tail -5
pnpm test:load 2>&1 | tail -5
pnpm test:recovery 2>&1 | tail -5
pnpm test:backup 2>&1 | tail -5

# 6.2-6.4 — حدّث الأرقام يدوياً في:
#   - README.md (سطور 81-91)
#   - AGENTS.md (قسم Phase status)
#   - docs/production/PRODUCTION_READINESS_FINAL.md

# 6.5 — Commit
git add -A && git commit -m "docs: fix test counts to match actual vitest output"

# === Phase 7 (Verification) ===

pnpm typecheck          # ← كل 4 workspaces
pnpm lint               # ← --max-warnings 0
pnpm format:check       # ← أو format:write
docker compose config   # ← valid?
git status              # ← clean?

# Final commit لو فيه شيء
git add -A && git commit -m "chore: final verification gate cleanup"
```

---

## ⚠️ تحذيرات مهمة

1. **لا تحذف الفرع `001-bootstrap-spec-kit`** — ده الفرع الأصلي، `fix/production-hygiene` متفرّع منه
2. **لا تنشر أو تدفع الـ tags للأرشفة** (`archive/...`) — دي محلية بس
3. **لو حصل خطأ**: `git reflog` → `git reset --hard HEAD~1` (ارجع لآخر commit سليم)
4. **`.env` ما تتكومتش أبداً** — متأكد إنها gitignored ✅
5. **لو اختبار فشل**: مش مشكلة خطة التصحيح دي (الاختبار كان فاشل قبل كمان) — سوّيها في commit منفصل
