#!/usr/bin/env bash
# duplicate_code_detector.sh — Detect duplicated code blocks.
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then echo "Usage: bash scripts/duplicate_code_detector.sh [project-root] [--min-tokens 50]"; exit 0; fi
cd "$(cd "${1:-.}" && pwd)"
echo "========================================"
echo "  Duplicate Code Detection"
echo "========================================"
if has jscpd 2>/dev/null; then jscpd --min-tokens=50 --ignore "**/node_modules/**,**/.venv/**,**/venv/**,**/__pycache__/**" . 2>&1 | tail -20 || true
elif has npx 2>/dev/null; then npx --yes jscpd --min-tokens=50 --ignore "**/node_modules/**,**/.venv/**,**/venv/**" . 2>&1 | tail -20 || true
else echo "  ⚠️ jscpd not installed (npm install -g jscpd)"; fi
echo "========================================"
echo "Next: extract shared functions for duplicates"
exit 0
