#!/bin/bash
# Pre-commit hook: quality gate that prevents broken commits
# Installed by scripts/setup-hooks.sh — run that after cloning.

echo "🔍 Running pre-commit checks..."

# 1. Format check
echo "📐 Format check..."
pnpm format:check
if [ $? -ne 0 ]; then
  echo "❌ Format check failed. Run 'pnpm format:write' to fix."
  exit 1
fi

# 2. Lint
echo "🧹 Lint..."
pnpm lint
if [ $? -ne 0 ]; then
  echo "❌ Lint failed."
  exit 1
fi

# 3. Type check
echo "🔎 Type check..."
pnpm typecheck
if [ $? -ne 0 ]; then
  echo "❌ Type check failed."
  exit 1
fi

# 4. Run relevant tests for changed files
echo "🧪 Running tests for changed files..."
CHANGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$')
if [ -n "$CHANGED_TS" ]; then
  pnpm test -- --changed
fi

echo "✅ All checks passed!"
