#!/usr/bin/env bash
# dead_code_detector.sh — Detect dead code.
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then echo "Usage: bash scripts/dead_code_detector.sh [project-root]"; exit 0; fi
cd "$(cd "${1:-.}" && pwd)"
has() { command -v "$1" >/dev/null 2>&1; }
echo "========================================"
echo "  Dead Code Detection"
echo "========================================"
if has vulture && find . -name "*.py" -not -path "*/venv/*" | head -1 | grep -q .; then
    echo "=== Python (vulture) ==="
    vulture . --min-confidence=80 --exclude="venv,.venv,__pycache__" 2>&1 | head -20 || true
else echo "  ⚠️ vulture not installed"; fi
if [ -f package.json ]; then
    echo "=== JS/TS (knip) ==="
    if has knip; then knip 2>&1 | head -20 || true
    elif has npx; then npx --yes knip 2>&1 | head -20 || true
    else echo "  ⚠️ knip not installed"; fi
fi
echo "========================================"
echo "Next: review findings; remove confirmed dead code"
exit 0
