#!/usr/bin/env bash
#
# layered-refactor.sh — Phase 1/2/4/5 mechanical moves for the Ibn Al-Azhar Docs
# layered-architecture refactor (apps/web).
#
# WHAT THIS SCRIPT DOES
#   * Uses `git mv` (content-preserving) to relocate folders/files into the
#     layered vocabulary: clients/ transport/ middleware/ shared/ api/ ui/ state/.
#   * Rewrites the @/ import aliases with `sed` (ordered: slash-variants first).
#   * Runs the verification gate (typecheck + lint + test) after EACH move and
#     commits per move with a descriptive message.
#   * Stops hard on any remaining stale alias (catches missed rewrites).
#
# WHAT THIS SCRIPT DOES NOT DO (manual phases — see bottom)
#   * Phase 3 (DIP): removing raw `prisma` from use-case signatures.
#   * Phase 4 dedup: consolidating the two divergent buildFolderTree() impls.
#   * Phase 6/7 (packages/*, workers/*): package-specific, requires per-package scan.
#
# PREREQUISITES
#   * Run from repo root. Working tree should be a GREEN BASELINE (Phase 0 done).
#   * `pnpm` available; `apps/web` has typecheck/lint/test scripts.
#   * Review this script before running. It is mechanical and behavior-preserving
#     for the moves it performs, but the manual phases still need your judgement.
#
# USAGE
#   bash scripts/layered-refactor.sh            # runs all mechanical phases
#   MECH_PHASES=1 bash scripts/layered-refactor.sh   # same
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$REPO_ROOT/apps/web/src"
cd "$REPO_ROOT"

# ── verification gate ────────────────────────────────────────────────────────
gate() {
  echo "──────── GATE: typecheck + lint + test ────────"
  ( cd "$REPO_ROOT/apps/web" && pnpm typecheck && pnpm lint && pnpm test )
}

# ── alias rewrite helper: rewrite <old-no-slash> <new-no-slash> ───────────────
# Applies `@/OLD` -> `@/NEW` across all ts/tsx under apps/web/src.
rewrite() {
  local old="$1" new="$2"
  echo "  rewrite @/$old -> @/$new"
  find "$APP" -type f \( -name '*.ts' -o -name '*.tsx' \) \
    -exec sed -i "s|@/$old|@/$new|g" {} +
}

# rewrite a directory-prefixed import first (slash variant), then bare file import
rewrite_dir_then_file() {
  rewrite "$1/" "$2/"
  rewrite "$1" "$2"
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

# ── ensure target dirs exist ──────────────────────────────────────────────────
mkdir -p "$APP/transport" "$APP/clients/redis" "$APP/middleware" \
         "$APP/shared" "$APP/api" "$APP/ui" "$APP/state"

echo "==================================================================="
echo "PHASE 1 — Decompose lib/backend into layers"
echo "==================================================================="

# 1.1 prisma client singleton -> transport/db.ts
git mv "$APP/lib/backend/prisma.ts" "$APP/transport/db.ts"
rewrite "lib/backend/prisma" "transport/db"
gate
commit_move "refactor(apps/web): move PrismaClient singleton to transport/db (Phase 1)"

# 1.2 rate-limit (file + dir) -> clients/redis
git mv "$APP/lib/backend/rate-limit" "$APP/clients/redis"
git mv "$APP/lib/backend/rate-limit.ts" "$APP/clients/redis/rate-limit.ts"
rewrite_dir_then_file "lib/backend/rate-limit" "clients/redis"
gate
commit_move "refactor(apps/web): move rate-limit to clients/redis (Phase 1)"

# 1.3 audit -> middleware
git mv "$APP/lib/backend/audit.ts" "$APP/middleware/audit.ts"
rewrite "lib/backend/audit" "middleware/audit"
gate
commit_move "refactor(apps/web): move audit to middleware (Phase 1)"

# 1.4 request-logger -> middleware
git mv "$APP/lib/backend/request-logger.ts" "$APP/middleware/request-logger.ts"
rewrite "lib/backend/request-logger" "middleware/request-logger"
gate
commit_move "refactor(apps/web): move request-logger to middleware (Phase 1)"

# 1.5 auth + auth-guards -> middleware
git mv "$APP/lib/backend/auth.ts" "$APP/middleware/auth.ts"
git mv "$APP/lib/backend/auth-guards.ts" "$APP/middleware/auth-guards.ts"
rewrite "lib/backend/auth-guards" "middleware/auth-guards"
rewrite "lib/backend/auth" "middleware/auth"
gate
commit_move "refactor(apps/web): move auth + auth-guards to middleware (Phase 1)"

# 1.6 business services -> core/services (Phase 2 move, folded in)
git mv "$APP/lib/backend/services/"*.ts "$APP/core/services/"
rewrite_dir_then_file "lib/backend/services" "core/services"
gate
commit_move "refactor(apps/web): move lib/backend/services to core/services (Phase 2)"

# 1.7 export helpers -> core/services/export (colocated w/ export use cases)
git mv "$APP/lib/backend/export" "$APP/core/services/export"
rewrite_dir_then_file "lib/backend/export" "core/services/export"
gate
commit_move "refactor(apps/web): move export helpers to core/services/export (Phase 1)"

# 1.8 static content -> shared/content
#   Route content.ts to shared/content/index.ts so the content/ dir nests cleanly.
git mv "$APP/lib/backend/content.ts" "$APP/shared/content/index.ts"
git mv "$APP/lib/backend/content" "$APP/shared/content"
rewrite_dir_then_file "lib/backend/content" "shared/content"
# after this, lib/backend should be empty
if [ -d "$APP/lib/backend" ]; then rmdir "$APP/lib/backend" 2>/dev/null || true; fi
gate
commit_move "refactor(apps/web): move static content to shared/content (Phase 1)"

echo "==================================================================="
echo "PHASE 4 (move part) — lib/shared -> shared"
echo "==================================================================="
git mv "$APP/lib/shared" "$APP/shared"
rewrite_dir_then_file "lib/shared" "shared"
gate
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
rewrite_dir_then_file "components" "ui"
gate
commit_move "refactor(apps/web): rename components/ to ui/ and flatten inner ui/ (Phase 5)"

# 5.2 hooks -> state
git mv "$APP/hooks" "$APP/state"
rewrite_dir_then_file "hooks" "state"
gate
commit_move "refactor(apps/web): rename hooks/ to state/ (Phase 5)"

# 5.3 api-client -> api/
git mv "$APP/lib/frontend/api-client.ts" "$APP/api/api-client.ts"
rewrite "lib/frontend/api-client" "api/api-client"
gate
commit_move "refactor(apps/web): move api-client to api/ (Phase 5)"

# 5.4 frontend hooks/use-queries -> state/
git mv "$APP/lib/frontend/hooks/use-queries.ts" "$APP/state/use-queries.ts"
rewrite_dir_then_file "lib/frontend/hooks" "state"
gate
commit_move "refactor(apps/web): move frontend hooks to state/ (Phase 5)"

# 5.5 frontend presentation utils -> ui/
for f in cn brand fonts metadata; do
  git mv "$APP/lib/frontend/$f.ts" "$APP/ui/$f.ts"
  rewrite "lib/frontend/$f" "ui/$f"
done
# remove now-empty lib/frontend if empty
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
