#!/usr/bin/env bash
#
# layered-refactor.sh — Phase 1/2/4/5 mechanical moves for the Ibn Al-Azhar Docs
# layered-architecture refactor (apps/web).
#
# APPROACH
#   * `git mv` relocates folders/files (content-preserving).
#   * scripts/fix-imports.mjs rewrites BOTH `@/` alias imports AND relative
#     (./, ../) imports that resolve to a moved module, replacing them with the
#     new `@/` alias. Idempotent; safe to run after every move.
#   * Gate (typecheck + lint + test) runs after EACH move; the move is committed
#     only if the gate passes. A failed gate leaves the repo at the last good commit.
#   * guard_no_stale fails hard if any moved `@/` alias survives the rewrites.
#
# WHAT THIS SCRIPT DOES NOT DO (manual phases)
#   * Phase 3 (DIP): remove raw `prisma` from use-case signatures.
#   * Phase 4 dedup: consolidate the two divergent buildFolderTree() impls.
#   * Phase 6/7 (packages/*, workers/*).
#   * Phase 8 (docs).
#
# PREREQUISITES
#   * Run from the REPO ROOT. Working tree = GREEN BASELINE (typecheck+lint+test).
#   * `pnpm` available; typecheck/lint/test scripts live at the repo root.
#   * `node` available (used by fix-imports.mjs).
#
# USAGE
#   cd /path/to/repo
#   pnpm typecheck && pnpm lint && pnpm test   # establish green baseline
#   bash scripts/layered-refactor.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$REPO_ROOT/apps/web/src"
FIX="node $REPO_ROOT/scripts/fix-imports.mjs"
cd "$REPO_ROOT"

fix_imports() { $FIX --apply; }

# ── verification gate (repo-root scripts) ─────────────────────────────────────
gate() {
  echo "──────── GATE: typecheck + lint + test (repo root) ────────"
  pnpm typecheck && pnpm lint && pnpm test
}

commit_move() {
  git add -A
  git commit -m "$1"
  echo "  committed: $1"
}

# guard: fail if any stale alias from the *moved* prefixes remains
guard_no_stale() {
  local hits
  hits=$(grep -rn --include='*.ts' --include='*.tsx' -E \
    "@/(lib/backend|lib/shared|lib/frontend|components|hooks)(/|\"|')" "$APP" || true)
  if [[ -n "$hits" ]]; then
    echo "ERROR: stale alias still present after rewrites:" >&2
    echo "$hits" >&2
    exit 1
  fi
}

# ── ensure PARENT target dirs exist (leaf dirs are created by git mv) ──────────
mkdir -p "$APP/transport" "$APP/clients" "$APP/middleware" "$APP/shared"

echo "==== BASELINE GATE (must be GREEN before any move) ===="
gate

echo "==== BUILD import move-map from ORIGINAL tree ===="
$FIX --build

echo "==================================================================="
echo "PHASE 1 — Decompose lib/backend into layers"
echo "==================================================================="

# 1.1 prisma client singleton -> transport/db.ts  (already done in baseline commit)
# git mv "$APP/lib/backend/prisma.ts" "$APP/transport/db.ts"
# fix_imports; gate
# commit_move "refactor(apps/web): move PrismaClient singleton to transport/db (Phase 1)"

# 1.2 rate-limit (file + dir) -> clients/redis
git mv "$APP/lib/backend/rate-limit" "$APP/clients/redis"
git mv "$APP/lib/backend/rate-limit.ts" "$APP/clients/redis/rate-limit.ts"
fix_imports; gate
commit_move "refactor(apps/web): move rate-limit to clients/redis (Phase 1)"

# 1.3 audit -> middleware
git mv "$APP/lib/backend/audit.ts" "$APP/middleware/audit.ts"
fix_imports; gate
commit_move "refactor(apps/web): move audit to middleware (Phase 1)"

# 1.4 request-logger -> middleware
git mv "$APP/lib/backend/request-logger.ts" "$APP/middleware/request-logger.ts"
fix_imports; gate
commit_move "refactor(apps/web): move request-logger to middleware (Phase 1)"

# 1.5 auth + auth-guards -> middleware
git mv "$APP/lib/backend/auth.ts" "$APP/middleware/auth.ts"
git mv "$APP/lib/backend/auth-guards.ts" "$APP/middleware/auth-guards.ts"
fix_imports; gate
commit_move "refactor(apps/web): move auth + auth-guards to middleware (Phase 1)"

# 1.6 business services -> core/services (Phase 2 move, folded in)
git mv "$APP/lib/backend/services/"*.ts "$APP/core/services/"
fix_imports; gate
commit_move "refactor(apps/web): move lib/backend/services to core/services (Phase 2)"

# 1.7 export helpers -> core/services/export (colocated w/ export use cases)
git mv "$APP/lib/backend/export" "$APP/core/services/export"
fix_imports; gate
commit_move "refactor(apps/web): move export helpers to core/services/export (Phase 1)"

# 1.8 static content -> shared/content
git mv "$APP/lib/backend/content" "$APP/shared/content"
git mv "$APP/lib/backend/content.ts" "$APP/shared/content/index.ts"
fix_imports
if [ -d "$APP/lib/backend" ]; then rmdir "$APP/lib/backend" 2>/dev/null || true; fi
gate
commit_move "refactor(apps/web): move static content to shared/content (Phase 1)"

echo "==================================================================="
echo "PHASE 4 (move part) — lib/shared -> shared"
echo "==================================================================="
git mv "$APP/lib/shared/"* "$APP/shared/"
rmdir "$APP/lib/shared" 2>/dev/null || true
fix_imports; gate
commit_move "refactor(apps/web): promote lib/shared to top-level shared/ (Phase 4)"

echo "==================================================================="
echo "PHASE 5 — Frontend structure"
echo "==================================================================="

# 5.1 components -> ui  (then flatten the pre-existing inner components/ui)
git mv "$APP/components" "$APP/ui"
if [ -d "$APP/ui/ui" ]; then
  git mv "$APP/ui/ui/"* "$APP/ui/" 2>/dev/null || true
  rmdir "$APP/ui/ui" 2>/dev/null || true
fi
fix_imports; gate
commit_move "refactor(apps/web): rename components/ to ui/ and flatten inner ui/ (Phase 5)"

# 5.2 hooks -> state
git mv "$APP/hooks" "$APP/state"
fix_imports; gate
commit_move "refactor(apps/web): rename hooks/ to state/ (Phase 5)"

# 5.3 api-client -> api/
git mv "$APP/lib/frontend/api-client.ts" "$APP/api/api-client.ts"
fix_imports; gate
commit_move "refactor(apps/web): move api-client to api/ (Phase 5)"

# 5.4 frontend hooks/use-queries -> state/
git mv "$APP/lib/frontend/hooks/use-queries.ts" "$APP/state/use-queries.ts"
fix_imports; gate
commit_move "refactor(apps/web): move frontend hooks to state/ (Phase 5)"

# 5.5 frontend presentation utils -> ui/
for f in cn brand fonts metadata; do
  git mv "$APP/lib/frontend/$f.ts" "$APP/ui/$f.ts"
done
fix_imports
if [ -d "$APP/lib/frontend" ]; then rmdir "$APP/lib/frontend" 2>/dev/null || true; fi
gate
commit_move "refactor(apps/web): move frontend cn/brand/fonts/metadata to ui/ (Phase 5)"

# ── final stale-alias guard for everything we moved ──────────────────────────
guard_no_stale

echo "==================================================================="
echo "MECHANICAL PHASES COMPLETE."
echo "Remaining (MANUAL) work — NOT performed by this script:"
echo "  Phase 3 (DIP): in apps/web/src/core/composition-root.ts the use cases"
echo "    RegistrationUseCases & PasswordResetUseCases still receive raw"
echo "    'prisma'. Introduce repository interfaces for what they need and"
echo "    update their constructor signatures + the root wiring. The import"
echo "    path is already correct (@/transport/db). Verify with gate."
echo "  Phase 4 (dedup): two divergent buildFolderTree() exist:"
echo "    shared/build-folder-tree.ts  (1-arg, no sort)"
echo "    core/folder-tree.ts          (2-arg parentId + sort-by-order)"
echo "    Pick the canonical (parentId+sort) variant, delete the duplicate,"
echo "    and align callers. Pin current behavior with a characterization"
echo "    test BEFORE deleting the duplicate."
echo "  Phase 6 (packages/*) and Phase 7 (workers/*): apply the same boundary"
echo "    rules per package; requires a per-package scan (see plan)."
echo "  Phase 8: update ARCHITECTURE.md / CLAUDE.md / docs/wiki."
echo "==================================================================="
