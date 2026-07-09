#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

START_TIME=$(date +%s)
RESULTS=()
STAGE=""

# ── Argument parsing ──────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stage) STAGE="$2"; shift 2 ;;
    --stage=*) STAGE="${1#*=}"; shift ;;
    *) echo "Usage: $0 --stage <fast|pr|full>"; exit 1 ;;
  esac
done

if [[ -z "$STAGE" ]]; then
  echo "Error: --stage is required (fast|pr|full)"
  exit 1
fi

if [[ "$STAGE" != "fast" && "$STAGE" != "pr" && "$STAGE" != "full" ]]; then
  echo "Error: stage must be one of: fast, pr, full"
  exit 1
fi

echo "═══ CI Pipeline — Stage: $STAGE ═══"

# ── Cleanup trap ──────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "⚠️  Pipeline interrupted — cleaning up..."
  kill 0 2>/dev/null || true
  echo "Pipeline aborted."
  exit 1
}
trap cleanup SIGINT SIGTERM

# ── run_step: execute a step, track pass/fail, always continue ────────────
run_step() {
  local name="$1"
  shift
  echo ""
  echo "━━━ [$STAGE] $name ━━━"
  echo "→ $*"
  set +e
  "$@"
  local rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    echo "✓ $name passed"
    RESULTS+=("pass|$name")
  else
    echo "✗ $name failed (exit $rc)"
    RESULTS+=("fail|$name")
  fi
}

# ── check_coverage: parse vitest coverage JSON, enforce 80% gate ──────────
check_coverage() {
  local coverage_file="coverage/coverage-final.json"
  if [[ ! -f "$coverage_file" ]]; then
    echo "⚠️  Coverage file not found at $coverage_file"
    return 1
  fi

  node -e "
    const fs = require('fs');
    const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
    const entries = Object.entries(cov).filter(
      ([k, v]) => k !== 'total' && v && v.lines && v.lines.total > 0,
    );

    let tLines = 0, cLines = 0, tBranches = 0, cBranches = 0;
    for (const [, v] of entries) {
      tLines += v.lines.total;
      cLines += v.lines.covered;
      if (v.branches) {
        tBranches += v.branches.total;
        cBranches += v.branches.covered;
      }
    }

    const linePct = tLines > 0 ? (cLines / tLines) * 100 : 0;
    const branchPct = tBranches > 0 ? (cBranches / tBranches) * 100 : 100;

    const below = entries
      .map(([k, v]) => ({
        file: k,
        line: v.lines.total > 0 ? (v.lines.covered / v.lines.total) * 100 : 100,
        branch: v.branches && v.branches.total > 0
          ? (v.branches.covered / v.branches.total) * 100
          : 100,
      }))
      .filter((f) => f.line < 80 || f.branch < 80)
      .sort((a, b) => a.line - b.line);

    const cwd = process.cwd();
    console.log('');
    console.log('  Coverage Summary:');
    console.log(
      '    Lines:     ' +
        linePct.toFixed(2) + '%' + (linePct >= 80 ? '  ✓' : '  ✗'),
    );
    console.log(
      '    Branches:  ' +
        branchPct.toFixed(2) + '%' + (branchPct >= 80 ? '  ✓' : '  ✗'),
    );

    if (below.length > 0) {
      console.log('');
      console.log('  Files below 80% coverage:');
      console.log('  ' + '─'.repeat(90));
      var h = '  File';
      while (h.length < 68) h += ' ';
      h += 'Line %   Branch %';
      console.log(h);
      console.log('  ' + '─'.repeat(90));
      for (var i = 0; i < below.length; i++) {
        var f = below[i];
        var p = f.file;
        if (p.startsWith(cwd)) p = p.substring(cwd.length + 1);
        var row = '  ' + p;
        var lp = f.line.toFixed(2) + '%';
        var bp = f.branch.toFixed(2) + '%';
        while (row.length < 68) row += ' ';
        while (lp.length < 7) lp = ' ' + lp;
        while (bp.length < 7) bp = ' ' + bp;
        console.log(row + '  ' + lp + '   ' + bp);
      }
      console.log('  ' + '─'.repeat(90));
    }
    console.log('');

    if (linePct >= 80 && branchPct >= 80) {
      console.log('✓ Coverage gate passed (≥ 80% on lines and branches)');
      process.exit(0);
    } else {
      console.log('✗ Coverage gate failed — need ≥ 80%');
      process.exit(1);
    }
  "
}

# ── run_mutation: run stryker, extract score, warn if below 60% ───────────
run_mutation() {
  local output
  output=$(pnpm test:mutation 2>&1)
  local score
  score=$(echo "$output" | grep -oE "Mutation score: [0-9.]+" | grep -oE "[0-9.]+" | head -1 || echo "0")
  echo "$output" | tail -20
  echo ""
  echo "🧬 Mutation score: ${score}%"
  local score_int=${score%.*}
  score_int=${score_int:-0}
  if (( score_int < 60 )); then
    echo "⚠️  Mutation score ${score}% below 60% — warning only (not failing)"
  else
    echo "✓  Mutation score ≥ 60%"
  fi
}

# ── report: print pass/fail summary, exit 1 if any failure ───────────────
report() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  CI Pipeline Report — Stage: $STAGE"
  echo "  Total time: $(($(date +%s) - START_TIME))s"
  echo "═══════════════════════════════════════════════════════════════════"
  local fail=false
  for result in "${RESULTS[@]}"; do
    local s="${result%%|*}"
    local n="${result#*|}"
    if [[ "$s" == "pass" ]]; then
      echo "  ✓  $n"
    else
      echo "  ✗  $n"
      fail=true
    fi
  done
  echo "═══════════════════════════════════════════════════════════════════"
  if $fail; then
    echo "❌ Pipeline failed"
    exit 1
  else
    echo "✅ All checks passed"
  fi
}

# ── Stage execution ────────────────────────────────────────────────────────
case "$STAGE" in
  fast)
    run_step "format:check"  pnpm format:check
    run_step "lint"          pnpm lint
    run_step "typecheck"     pnpm typecheck
    run_step "test (unit)"   pnpm test
    run_step "secrets:scan"  pnpm secrets:scan
    ;;
  pr)
    run_step "format:check"  pnpm format:check
    run_step "lint"          pnpm lint
    run_step "typecheck"     pnpm typecheck
    run_step "test (unit)"   pnpm test
    run_step "secrets:scan"  pnpm secrets:scan
    run_step "coverage"      pnpm coverage
    run_step "coverage:gate" check_coverage
    run_step "test:api"      pnpm test:api
    run_step "test:e2e"      pnpm test:e2e
    ;;
  full)
    run_step "format:check"  pnpm format:check
    run_step "lint"          pnpm lint
    run_step "typecheck"     pnpm typecheck
    run_step "test (unit)"   pnpm test
    run_step "secrets:scan"  pnpm secrets:scan
    run_step "coverage"      pnpm coverage
    run_step "coverage:gate" check_coverage
    run_step "test:api"      pnpm test:api
    run_step "test:e2e"      pnpm test:e2e
    run_step "test:mutation" run_mutation
    ;;
esac

report
