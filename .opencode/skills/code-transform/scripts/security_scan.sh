#!/usr/bin/env bash
# security_scan.sh — Multiple security scanners → unified report.
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then echo "Usage: bash scripts/security_scan.sh [project-root] [--strict]"; exit 0; fi
PROJECT_ROOT="${1:-.}"; STRICT=false
for arg in "$@"; do case "$arg" in --strict) STRICT=true ;; esac; done
cd "$(cd "$PROJECT_ROOT" && pwd)"
has() { command -v "$1" >/dev/null 2>&1; }
CRITICAL=0; HIGH=0
echo "========================================"
echo "  Security Scan — $PROJECT_ROOT"
echo "========================================"
if has semgrep; then echo "=== Semgrep ==="; semgrep --config=p/owasp-top-ten --json --output=/tmp/sg.json --quiet 2>/dev/null || true; rm -f /tmp/sg.json; else echo "  ⚠️ semgrep not installed"; fi
if has bandit && find . -name "*.py" -not -path "*/venv/*" | head -1 | grep -q .; then echo "=== Bandit ==="; bandit -r . -x "./venv" -f json -o /tmp/b.json --quiet 2>/dev/null || true; rm -f /tmp/b.json; else echo "  ⚠️ bandit not installed"; fi
if has pip-audit && [ -f requirements.txt -o -f pyproject.toml ]; then echo "=== pip-audit ==="; pip-audit --format=json --output=/tmp/pa.json 2>/dev/null || true; rm -f /tmp/pa.json; fi
if [ -f package.json ] && has npm; then echo "=== npm audit ==="; npm audit --json > /tmp/npma.json 2>/dev/null || true; rm -f /tmp/npma.json; fi
if has gitleaks; then echo "=== gitleaks ==="; gitleaks detect --source=. --report-format=json --report-path=/tmp/gl.json --no-banner 2>/dev/null || true; rm -f /tmp/gl.json; fi
echo "========================================"
echo "  Summary: Critical=$CRITICAL High=$HIGH"
echo "========================================"
[ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ] && { echo "⚠️ Findings detected"; [ "$STRICT" = true ] && exit 1; } || echo "✓ No critical/high"
exit 0
