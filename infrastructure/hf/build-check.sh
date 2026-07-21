#!/usr/bin/env bash
#
# Local HuggingFace Spaces build check
# ===========================================================================
# Reproduces the HuggingFace production build locally so the recurring build
# failures (a Node builtin / server package leaking into the browser bundle,
# OOM, mis-configured standalone output, etc.) are caught BEFORE pushing to HF.
#
# It mirrors infrastructure/hf/Dockerfile exactly:
#   - Webpack bundler (Turbopack disabled)  -> NEXT_DISABLE_TURBOPACK=1
#   - Single serial build worker + no memory-based worker count (set in
#     apps/web/next.config.ts -> experimental.cpus:1 / memoryBasedWorkersCount:false)
#   - Standalone output (set in apps/web/next.config.ts -> output:"standalone")
#   - Local storage driver (no network/S3 needed at build time)
#   - Sentry disabled, telemetry disabled
#
# Usage:
#   pnpm build:hf-check
#   # or, to override the heap cap (HF uses 3072):
#   NODE_OPTIONS="--max-old-space-size=8192" pnpm build:hf-check
#
set -euo pipefail

# Use Node 22 if nvm is available.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
  nvm use 22 >/dev/null 2>&1 || true
fi

# Resolve repo root (this file lives in infrastructure/hf/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "═══════════════════════════════════════════════════════════════"
echo "  Ibn Al-Azhar Docs — local HuggingFace build check"
echo "  (webpack + cpus:1 + standalone output, mirrors infrastructure/hf)"
echo "═══════════════════════════════════════════════════════════════"

# Mirror the exact env the HF Dockerfile uses for `next build`.
export NEXT_DISABLE_TURBOPACK=1
export DISABLE_SENTRY=1
export STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
export STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-/tmp}"
export AUTH_SECRET="${AUTH_SECRET:-local-build-placeholder}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-local-build-placeholder}"
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

echo "Running: next build --webpack (NODE_OPTIONS=$NODE_OPTIONS)"

cd apps/web
npx next build --webpack

echo ""
echo "✅ HF build check passed. If this succeeds locally, the HF build will too."
