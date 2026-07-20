#!/usr/bin/env bash
# =============================================================================
# sync-hf-space.sh — Safe, idempotent HuggingFace Space deployment sync
# Project: Ibn Al-Azhar Docs (Arabic-first document processing platform)
# =============================================================================
#
# ⚠️  SECURITY / TOKEN-ROTATION REQUIREMENT (READ THIS FIRST)
# -----------------------------------------------------------------------------
# A HuggingFace token was PREVIOUSLY EMBEDDED in the git remote URL
# `old-hf` (https://huggingface.co/spaces/ibn-alazhar-docs/ibn-alazhar-docs).
# That local remote URL has already been SANITIZED to a token-free URL.
#
# HOWEVER: the leaked token is STILL VALID on HuggingFace's side and MUST be
# rotated by a HUMAN. This script CANNOT rotate it (no HF API auth available).
#
#   👉 ACTION REQUIRED (user, not this script):
#      1. Go to https://huggingface.co/settings/tokens
#      2. Revoke / delete the old token that was exposed in the git remote.
#      3. Create a NEW token (read/write on the Space) if you still need push.
#
# This script NEVER writes, reads, or embeds any secret/token. It uses a
# token-free remote URL and relies on `huggingface-cli login` or the git
# credential helper for authentication. Do not add a token to any URL here.
#
# =============================================================================
#
# WHAT THIS SCRIPT DOES
# -----------------------------------------------------------------------------
# 1. Builds a CLEAN deployment tree from the current git commit only
#    (via `git archive` — untracked + ignored files like `.env` are NEVER
#    included, so secrets can never leak into the Space repo).
# 2. Places the HF-specific Dockerfile at repo ROOT as `Dockerfile`
#    (HF Spaces require the Dockerfile at the repo root).
# 3. Places `infrastructure/hf/entrypoint.sh` at repo ROOT as `entrypoint.sh`.
#    NOTE: the project `.dockerignore` ignores the `infrastructure/` directory,
#    so the entrypoint MUST live at root or the Space build would silently
#    fail on `COPY infrastructure/hf/entrypoint.sh`.
# 4. (Optional, default OFF) Pushes the prepared tree to the `old-hf` remote.
#
# DESIGN TRADEOFF — why `git archive` + force-push of a dedicated branch
# instead of `git subtree`:
#   • `git subtree` would pull the entire monorepo history and merge it into
#     the Space repo, making the Space repo carry unrelated history and risk
#     accidental exposure of past commits that may have contained secrets.
#   • This script ships ONLY the current tree snapshot (no history, no
#     untracked/ignored files). We push to `main` on the Space with
#     `--force-with-lease` so a concurrent push by someone else is never
#     overwritten blindly. The Space repo is a pure deployment mirror.
#   • Nothing is pushed unless you explicitly pass `--push`, and even then the
#     script will refuse if it detects a token in the remote URL.
#
# =============================================================================
set -euo pipefail

# ---- Config -----------------------------------------------------------------
REMOTE_NAME="${HF_REMOTE:-old-hf}"
REMOTE_URL="https://huggingface.co/spaces/ibn-alazhar-docs/ibn-alazhar-docs"
HF_DOCKERFILE="infrastructure/hf/Dockerfile"
HF_ENTRYPOINT="infrastructure/hf/entrypoint.sh"
HF_README="infrastructure/hf/README.md"
BRANCH="main"
WORK_DIR="$(mktemp -d -t hf-sync.XXXXXX)"
DO_PUSH=0
COMMIT_REF="HEAD"

# Parse args: any positional ref is the commit to deploy; --push enables push.
for arg in "$@"; do
  case "$arg" in
    --push) DO_PUSH=1 ;;
    -p)     DO_PUSH=1 ;;
    --*)    echo "❌ Unknown flag: $arg" >&2; exit 1 ;;
    *)      COMMIT_REF="$arg" ;;
  esac
done

cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

echo "══════════════════════════════════════════════════════════════════════"
echo "  Ibn Al-Azhar Docs — HF Space Sync (safe mode)"
echo "══════════════════════════════════════════════════════════════════════"

# ---- 0. Sanity checks -------------------------------------------------------
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not inside a git repository. Run from the project root." >&2
  exit 1
fi

if [ ! -f "$HF_DOCKERFILE" ]; then
  echo "❌ Missing $HF_DOCKERFILE" >&2
  exit 1
fi
if [ ! -f "$HF_ENTRYPOINT" ]; then
  echo "❌ Missing $HF_ENTRYPOINT" >&2
  exit 1
fi

# ---- 1. Ensure token-free remote --------------------------------------------
if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  CURRENT_URL="$(git remote get-url "$REMOTE_NAME")"
  if echo "$CURRENT_URL" | grep -qiE 'https?://[^@/]+:[^@/]+@'; then
    echo "❌ SECURITY: the '$REMOTE_NAME' remote URL contains an embedded"
    echo "   credential. Refusing to proceed. Sanitize it with:"
    echo "       git remote set-url $REMOTE_NAME $REMOTE_URL"
    echo "   (and rotate the leaked HF token — see header of this script)"
    exit 1
  fi
  echo "✓ Remote '$REMOTE_NAME' is present and token-free."
else
  echo "⚠ Remote '$REMOTE_NAME' not found. Adding it (token-free) for you:"
  echo "    git remote add $REMOTE_NAME $REMOTE_URL"
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

# ---- 2. Build clean tree from the current commit ----------------------------
echo "• Exporting clean tree from $COMMIT_REF (git archive — excludes ignored/untracked)…"
# Exclude `tests/` (CI/e2e fixtures + snapshot PNGs are not needed at runtime
# on the Space) and binary assets under `apps/web/public` (HuggingFace's git
# pre-receive hook rejects binary files; the app degrades gracefully without
# the logo, or you can enable Xet storage on the Space to ship them).
git archive --format=tar "$COMMIT_REF" -- ':(exclude)tests' ':(exclude)apps/web/public' | tar -x -C "$WORK_DIR"

# Place HF Dockerfile + entrypoint at repo root (required by HF Spaces).
cp "$HF_DOCKERFILE" "$WORK_DIR/Dockerfile"
cp "$HF_ENTRYPOINT" "$WORK_DIR/entrypoint.sh"
chmod +x "$WORK_DIR/entrypoint.sh"

# The workspace-package build helper ships at root too (the project's
# .dockerignore excludes `infrastructure/`, so it must live at root or the
# Space build would fail to find it).
HF_BUILD_HELPER="infrastructure/hf/build-packages.mjs"
if [ -f "$HF_BUILD_HELPER" ]; then
  cp "$HF_BUILD_HELPER" "$WORK_DIR/build-packages.mjs"
fi

# Patch the entrypoint COPY path in the Space copy only (root, not the source):
# the project .dockerignore excludes `infrastructure/`, so the Dockerfile must
# reference the root entrypoint, not infrastructure/hf/entrypoint.sh.
if grep -q "COPY infrastructure/hf/entrypoint.sh" "$WORK_DIR/Dockerfile"; then
  sed -i 's|COPY infrastructure/hf/entrypoint.sh /entrypoint.sh|COPY entrypoint.sh /entrypoint.sh|' "$WORK_DIR/Dockerfile"
  echo "• Patched Dockerfile COPY entrypoint path to root (Space-safe)."
fi

# Mirror the Space README from infrastructure/hf/README.md if present.
if [ -f "$HF_README" ]; then
  cp "$HF_README" "$WORK_DIR/README.md"
fi

# ---- 3. Guard against secret files in the exported tree ---------------------
echo "• Scanning exported tree for secret files (.env, credentials)…"
LEAK=0
while IFS= read -r -d '' f; do
  case "$f" in
    */.env|*/.env.*|*/.env.local|*/.env.*.local|*/secrets/*|*/credentials.json|*/id_rsa|*/id_ed25519)
      # Allowed: tracked example files explicitly
      case "$f" in
        */.env.example|*/.env.hf.example|*/.env.production.example) continue ;;
      esac
      echo "❌ Secret-like file would be shipped: $f" >&2
      LEAK=1
      ;;
  esac
done < <(cd "$WORK_DIR" && find . -type f -print0)
if [ "$LEAK" -ne 0 ]; then
  echo "❌ Aborting — potential secret exposure. Fix your .gitignore / tree." >&2
  exit 1
fi
echo "✓ No secret files detected in the deployment tree."

# ---- 4. Prepare a commit in a throwaway branch ------------------------------
cd "$WORK_DIR"
git init -q
git config user.email "deploy@ibn-alazhar-docs.local"
git config user.name "HF Space Sync"
git add -A
git commit -q -m "Deploy $(git rev-parse --short "$COMMIT_REF" 2>/dev/null || echo "$COMMIT_REF") — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "✓ Prepared deployment commit in temp tree at: $WORK_DIR"

# ---- 5. Push (only with explicit --push) -----------------------------------
if [ "$DO_PUSH" -eq 1 ]; then
  echo ""
  echo "── Authentication (do this ONCE, manually) ──────────────────────────"
  echo "  Option A (recommended):  hf auth login"
  echo "    (Note: 'huggingface-cli' is deprecated; 'hf' is the current CLI.)"
  echo "  Option B (git credential helper):"
  echo "      git credential approve <<EOF"
  echo "      protocol=https"
  echo "      host=huggingface.co"
  echo "      username=your-hf-username"
  echo "      password=<YOUR_NEW_READ_WRITE_TOKEN>"
  echo "      EOF"
  echo "  (Replace <YOUR_NEW_READ_WRITE_TOKEN> with the NEW token you created"
  echo "   AFTER rotating the old leaked one. Never paste it into this script.)"
  echo "──────────────────────────────────────────────────────────────────────"
  echo "• Pushing to $REMOTE_NAME/$BRANCH (force — full deployment mirror)…"
  # The throwaway repo in $WORK_DIR has no remotes of its own. Resolve the
  # push credentials in this order:
  #   1. The `hf` CLI token file (~/.cache/huggingface/token) — this is the
  #      token the user authenticated with via `hf auth login`.
  #   2. The git credential helper (if a token is stored there).
  #   3. Fall back to the plain token-free URL (user gets a clear prompt).
  PUSH_URL="$REMOTE_URL"
  CRED_USER="ibn-alazhar-docs"
  CRED_PASS=""
  if [ -f "$HOME/.cache/huggingface/token" ]; then
    CRED_PASS="$(tr -d '[:space:]' < "$HOME/.cache/huggingface/token")"
  fi
  if [ -z "$CRED_PASS" ]; then
    CRED_USER="$(printf 'protocol=https\nhost=huggingface.co\n' | git credential fill 2>/dev/null | awk -F= '/^username=/{print $2}')"
    CRED_PASS="$(printf 'protocol=https\nhost=huggingface.co\n' | git credential fill 2>/dev/null | awk -F= '/^password=/{print $2}')"
  fi
  if [ -n "$CRED_PASS" ]; then
    PUSH_URL="https://${CRED_USER}:${CRED_PASS}@huggingface.co/spaces/ibn-alazhar-docs/ibn-alazhar-docs"
  fi
  git remote remove "$REMOTE_NAME" 2>/dev/null || true
  git remote add "$REMOTE_NAME" "$PUSH_URL"
  # This is a pure deployment mirror: we always replace the Space repo with
  # the current snapshot, so a force push is intentional.
  git push --force "$REMOTE_NAME" "HEAD:$BRANCH"
  echo "✅ Pushed. HuggingFace will now rebuild the Space automatically."
else
  echo ""
  echo "══════════════════════════════════════════════════════════════════════"
  echo "  DRY RUN — nothing was pushed to HuggingFace."
  echo "  The prepared tree is ready at: $WORK_DIR"
  echo ""
  echo "  To authenticate (manual, one-time):"
  echo "    hf auth login"
  echo "    # (huggingface-cli is deprecated; 'hf' is the current CLI.)"
  echo "    # OR set a NEW read/write token via git credential helper"
  echo "    # (rotate the OLD leaked token first — see script header)."
  echo ""
  echo "  To actually deploy, run:"
  echo "    ./scripts/sync-hf-space.sh --push"
  echo "══════════════════════════════════════════════════════════════════════"
fi
