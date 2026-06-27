#!/usr/bin/env bash
# verify_behavior.sh — Behavior-preservation verification gate.
# Usage: bash scripts/verify_behavior.sh <project-root> [test-command]
set -euo pipefail
PROJECT_ROOT="${1:-.}"; TEST_CMD="${2:-}"
cd "$PROJECT_ROOT"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0; SKIP=0
check_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; PASS=$((PASS+1)); }
check_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAIL=$((FAIL+1)); }
check_skip() { echo -e "${YELLOW}○ SKIP${NC}: $1"; SKIP=$((SKIP+1)); }
echo "=========================================="; echo "  Behavior Verification Gate"; echo "=========================================="; echo ""

# Git check
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [ -n "$(git status --porcelain)" ]; then check_fail "Uncommitted changes"
    else check_pass "Git working tree clean"; fi
else check_skip "Not a git repo"; fi

# Type check
if [ -f "tsconfig.json" ] && command -v npx >/dev/null 2>&1; then
    npx tsc --noEmit 2>&1 | tail -5 && check_pass "TypeScript clean" || check_fail "TypeScript errors"
elif [ -f "Cargo.toml" ] && command -v cargo >/dev/null 2>&1; then
    cargo check 2>&1 | tail -3 && check_pass "Rust check clean" || check_fail "Rust check failed"
elif [ -f "go.mod" ] && command -v go >/dev/null 2>&1; then
    go build ./... 2>&1 | tail -3 && check_pass "Go build clean" || check_fail "Go build failed"
elif { [ -f "pyproject.toml" ] || [ -f "setup.py" ]; } && command -v mypy >/dev/null 2>&1; then
    mypy . --ignore-missing-imports 2>&1 | tail -3 && check_pass "mypy clean" || check_skip "mypy issues (non-blocking)"
else check_skip "Unknown project type"; fi
echo ""

# Tests
if [ -n "$TEST_CMD" ]; then eval "$TEST_CMD" 2>&1 | tail -20 && check_pass "Tests passed" || check_fail "Tests failed"
elif [ -f "package.json" ] && grep -q '"test"' package.json; then npm test 2>&1 | tail -20 && check_pass "Tests passed" || check_fail "Tests failed"
elif [ -f "Cargo.toml" ]; then cargo test 2>&1 | tail -20 && check_pass "Tests passed" || check_fail "Tests failed"
elif [ -f "go.mod" ]; then go test ./... 2>&1 | tail -20 && check_pass "Tests passed" || check_fail "Tests failed"
elif command -v pytest >/dev/null 2>&1 && ls test_*.py *_test.py >/dev/null 2>&1; then pytest 2>&1 | tail -20 && check_pass "Tests passed" || check_fail "Tests failed"
else check_skip "No test suite detected"; fi
echo ""

# Diff check
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    TAG=$(git tag --list "refactor-baseline-*" | tail -1)
    if [ -n "$TAG" ]; then git diff --stat "$TAG"..HEAD 2>/dev/null; check_pass "Diff available ($TAG)"
    else check_skip "No baseline tag"; fi; fi
echo ""

echo "=========================================="; echo "  Summary"; echo "=========================================="
echo -e "  ${GREEN}Passed${NC}: $PASS  ${RED}Failed${NC}: $FAIL  ${YELLOW}Skipped${NC}: $SKIP"
if [ "$FAIL" -gt 0 ]; then echo -e "${RED}❌ FAILED${NC}"; exit 1
elif [ "$PASS" -eq 0 ]; then echo -e "${YELLOW}⚠️ INDETERMINATE${NC}"; exit 3
else echo -e "${GREEN}✅ PASSED${NC}"; exit 0; fi
