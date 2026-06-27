#!/usr/bin/env bash
# codebase_census.sh — Profile a codebase for Phase 0 (CENSUS).
# Usage: bash scripts/codebase_census.sh <project-root>
set -euo pipefail
PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "  Codebase Census"
echo "=========================================="
echo ""

# File count by language
echo "## Files by Language"
find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
  -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.cs" -o -name "*.swift" -o -name "*.kt" \
  -o -name "*.dart" -o -name "*.rb" -o -name "*.php" -o -name "*.c" -o -name "*.cpp" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/__pycache__/*" \
  -not -path "*/.venv/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/target/*" \
  2>/dev/null | sed 's/.*\.//' | sort | uniq -c | sort -rn
echo ""

# Total lines
echo "## Total Lines"
find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
  -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.cs" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/__pycache__/*" \
  -not -path "*/.venv/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/target/*" \
  2>/dev/null | xargs wc -l 2>/dev/null | tail -1
echo ""

# Test files
echo "## Test Files"
find . -type f \( -name "test_*.py" -o -name "*_test.py" -o -name "*.test.js" -o -name "*.test.ts" \
  -o -name "*.spec.js" -o -name "*.spec.ts" -o -name "*_test.go" -o -name "tests.rs" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" \
  2>/dev/null | wc -l
echo ""

# Framework detection
echo "## Framework Detection"
[ -f "package.json" ] && echo "  Node.js: $(node -e 'console.log(require("./package.json").name || "unknown")' 2>/dev/null || echo 'unknown')"
[ -f "requirements.txt" ] && echo "  Python: requirements.txt found"
[ -f "pyproject.toml" ] && echo "  Python: pyproject.toml found"
[ -f "Cargo.toml" ] && echo "  Rust: $(grep '^name' Cargo.toml | head -1 | cut -d'"' -f2)"
[ -f "go.mod" ] && echo "  Go: $(head -1 go.mod)"
[ -f "pubspec.yaml" ] && echo "  Flutter/Dart: pubspec.yaml found"
[ -f "Gemfile" ] && echo "  Ruby: Gemfile found"
echo ""

# Git history
echo "## Git History"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  Commits: $(git log --oneline 2>/dev/null | wc -l)"
    echo "  Contributors: $(git shortlog -sn 2>/dev/null | wc -l)"
    echo "  Last commit: $(git log -1 --format='%cd' --date=short 2>/dev/null)"
else
    echo "  Not a git repository"
fi
echo ""

# Largest files
echo "## Top 10 Largest Files"
find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
  -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.cs" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/__pycache__/*" \
  -not -path "*/.venv/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/target/*" \
  2>/dev/null | xargs wc -l 2>/dev/null | sort -rn | head -11 | tail -10
echo ""

echo "=========================================="
echo "  Census Complete"
echo "=========================================="
