#!/usr/bin/env bash
# behavior_snapshot.sh — Golden-master / characterization harness.
# Captures test output BEFORE transformation; diffs against AFTER.
# Usage:
#   bash scripts/behavior_snapshot.sh capture <project-root> [test-command]
#   bash scripts/behavior_snapshot.sh compare <baseline-snapshot> <current-snapshot>
set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    echo "Usage:"
    echo "  bash scripts/behavior_snapshot.sh capture <project-root> [test-command]"
    echo "  bash scripts/behavior_snapshot.sh compare <baseline-snapshot> <current-snapshot>"
    exit 0
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

if [ "$#" -lt 2 ]; then
    echo "Usage:"
    echo "  bash scripts/behavior_snapshot.sh capture <project-root> [test-command]"
    echo "  bash scripts/behavior_snapshot.sh compare <baseline> <current>"
    exit 2
fi

MODE="$1"

if [ "$MODE" = "capture" ]; then
    PROJECT_ROOT="${2:-.}"
    TEST_CMD="${3:-}"
    SNAP_FILE="/tmp/behavior_snapshot_$(date +%s).txt"

    cd "$PROJECT_ROOT"

    echo "Capturing behavior snapshot to $SNAP_FILE..."

    # Capture test output
    if [ -n "$TEST_CMD" ]; then
        echo "=== TEST OUTPUT ($TEST_CMD) ===" > "$SNAP_FILE"
        eval "$TEST_CMD" 2>&1 >> "$SNAP_FILE" || true
    elif [ -f "package.json" ] && grep -q '"test"' package.json; then
        echo "=== TEST OUTPUT (npm test) ===" > "$SNAP_FILE"
        npm test 2>&1 >> "$SNAP_FILE" || true
    elif [ -f "Cargo.toml" ]; then
        echo "=== TEST OUTPUT (cargo test) ===" > "$SNAP_FILE"
        cargo test 2>&1 >> "$SNAP_FILE" || true
    elif [ -f "go.mod" ]; then
        echo "=== TEST OUTPUT (go test) ===" > "$SNAP_FILE"
        go test ./... 2>&1 >> "$SNAP_FILE" || true
    elif command -v pytest >/dev/null 2>&1; then
        echo "=== TEST OUTPUT (pytest) ===" > "$SNAP_FILE"
        pytest 2>&1 >> "$SNAP_FILE" || true
    else
        echo "=== NO TEST SUITE DETECTED ===" > "$SNAP_FILE"
    fi

    # Capture type-check output
    echo "" >> "$SNAP_FILE"
    echo "=== TYPE CHECK ===" >> "$SNAP_FILE"
    if [ -f "tsconfig.json" ] && command -v npx >/dev/null 2>&1; then
        npx tsc --noEmit 2>&1 >> "$SNAP_FILE" || true
    elif [ -f "Cargo.toml" ] && command -v cargo >/dev/null 2>&1; then
        cargo check 2>&1 >> "$SNAP_FILE" || true
    elif command -v mypy >/dev/null 2>&1; then
        mypy . --ignore-missing-imports 2>&1 >> "$SNAP_FILE" || true
    else
        echo "No type checker available" >> "$SNAP_FILE"
    fi

    # Capture linter output
    echo "" >> "$SNAP_FILE"
    echo "=== LINT ===" >> "$SNAP_FILE"
    if command -v ruff >/dev/null 2>&1; then
        ruff check . 2>&1 >> "$SNAP_FILE" || true
    elif [ -f "package.json" ] && npx --no-install eslint --version >/dev/null 2>&1; then
        npx eslint . 2>&1 >> "$SNAP_FILE" || true
    else
        echo "No linter available" >> "$SNAP_FILE"
    fi

    echo -e "${GREEN}✓ Snapshot captured: $SNAP_FILE${NC}"
    echo "$SNAP_FILE"

elif [ "$MODE" = "compare" ]; then
    BASELINE="$2"
    CURRENT="$3"

    if [ ! -f "$BASELINE" ]; then
        echo "Error: baseline snapshot $BASELINE not found" >&2
        exit 2
    fi
    if [ ! -f "$CURRENT" ]; then
        echo "Error: current snapshot $CURRENT not found" >&2
        exit 2
    fi

    DIFF=$(diff "$BASELINE" "$CURRENT" || true)

    if [ -z "$DIFF" ]; then
        echo -e "${GREEN}✅ BEHAVIOR IDENTICAL — no changes in test/type-check/lint output${NC}"
        exit 0
    else
        echo -e "${RED}❌ BEHAVIOR CHANGED — diff detected:${NC}"
        echo "$DIFF"
        exit 1
    fi
else
    echo "Unknown mode: $MODE. Use 'capture' or 'compare'."
    exit 2
fi
