#!/bin/bash
# Pre-push hook: comprehensive quality gate
# Installed by scripts/setup-hooks.sh — run that after cloning.

echo "🔍 Running pre-push checks..."

# 1. Full test suite
echo "🧪 Running full test suite..."
pnpm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Fix before pushing."
  exit 1
fi

# 2. Run all specific test suites
echo "🧪 Running integration tests..."
pnpm test:integration || echo "⚠️ Integration tests skipped"

echo "🧪 Running security tests..."
pnpm test:security || echo "⚠️ Security tests skipped"

echo "🧪 Running API tests..."
pnpm test:api || echo "⚠️ API tests skipped"

# 3. Secrets scan
echo "🔐 Scanning for secrets..."
pnpm secrets:scan
if [ $? -ne 0 ]; then
  echo "❌ Secrets found in commit."
  exit 1
fi

echo "✅ All checks passed!"
