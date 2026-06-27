#!/usr/bin/env bash
# audit_orchestrate.sh — Run all audit scripts and produce a unified report.
# Usage: bash scripts/audit_orchestrate.sh <project-root>
set -euo pipefail
PROJECT_ROOT="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Code Transform — Audit Orchestration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Codebase Census
echo -e "${BLUE}=== Step 1: Codebase Census ===${NC}"
bash "$SCRIPT_DIR/codebase_census.sh" "$PROJECT_ROOT" 2>&1 || true
echo ""

# Step 2: Smell Detection
echo -e "${BLUE}=== Step 2: Code Smell Detection ===${NC}"
python3 "$SCRIPT_DIR/detect_smells.py" . 2>&1 || true
echo ""

# Step 3: Cognitive Complexity (Python only)
echo -e "${BLUE}=== Step 3: Cognitive Complexity ===${NC}"
PY_FILES=$(find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/__pycache__/*" 2>/dev/null | head -10)
for f in $PY_FILES; do
    python3 "$SCRIPT_DIR/cognitive_complexity.py" "$f" --threshold 15 2>&1 | grep -E "OVER|OK" | head -5 || true
done
echo ""

# Step 4: Security Quick Scan
echo -e "${BLUE}=== Step 4: Security Quick Scan ===${NC}"
echo "Checking for SQL injection patterns..."
git grep -n "f\"SELECT\|f'SELECT\|+ .*SELECT" -- "*.py" "*.js" 2>/dev/null | head -10 || echo "  No SQL injection patterns found"
echo ""
echo "Checking for hardcoded secrets..."
git grep -n "password\s*=\s*['\"]\|api_key\s*=\s*['\"]" -- "*.py" "*.js" "*.ts" 2>/dev/null | head -10 || echo "  No hardcoded secrets found"
echo ""

# Step 5: Git Status
echo -e "${BLUE}=== Step 5: Git Status ===${NC}"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Branch: $(git branch --show-current)"
    echo "Status: $(git status --porcelain | wc -l) uncommitted files"
    TAG=$(git tag --list "refactor-baseline-*" | tail -1)
    [ -n "$TAG" ] && echo "Baseline: $TAG" || echo "No baseline tag"
else
    echo "Not a git repository"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Audit Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Next: review findings above, then create AUDIT_REPORT.md"
