#!/bin/bash
# Install git hooks for Ibn Al-Azhar Docs
# Run this once after cloning: bash scripts/setup-hooks.sh

set -e

HOOKS_DIR=".git/hooks"
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

echo "🔗 Installing git hooks..."

# Install pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/bin/bash
bash "$(git rev-parse --show-toplevel)/tests/regression/pre-commit.sh"
HOOK
chmod +x "$HOOKS_DIR/pre-commit"

# Install pre-push hook
cat > "$HOOKS_DIR/pre-push" << 'HOOK'
#!/bin/bash
bash "$(git rev-parse --show-toplevel)/tests/regression/pre-push.sh"
HOOK
chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git hooks installed!"
echo "  - pre-commit: format + lint + typecheck + changed tests"
echo "  - pre-push: full test suite + integration + security + secrets"

# Warn about hook bypass
echo ""
echo "⚠️  To bypass hooks in emergency: git commit --no-verify"
echo "⚠️  To bypass pre-push: git push --no-verify"
