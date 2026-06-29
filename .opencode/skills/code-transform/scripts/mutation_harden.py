#!/usr/bin/env python3
"""mutation_harden.py — Mutation-guided test hardening (Meta ACH pattern)."""
import argparse, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict, field

MUTATIONS = {
    "security": [
        {"name":"remove-validation","pattern":r"if\s+not\s+\w+\s*:","replacement":"if True:  # MUTANT"},
        {"name":"weaken-auth","pattern":r"return\s+\w+\s+is\s+not\s+None","replacement":"return True  # MUTANT"},
    ],
    "correctness": [
        {"name":"flip-plus","pattern":r"(\w+)\s*\+\s*(\w+)","replacement":r"\1 - \2  # MUTANT"},
        {"name":"remove-zero-check","pattern":r"if\s+\w+\s*==\s*0\s*:","replacement":"if False:  # MUTANT"},
    ],
    "performance": [
        {"name":"remove-cache","pattern":r"cache\.get\(([^)]+)\)","replacement":"None  # MUTANT"},
    ],
}

@dataclass
class Mutant:
    name: str; concern: str; killed: bool; kill_reason: str = ""

def run_tests(pdir, cmd):
    try:
        r = subprocess.run(cmd, cwd=str(pdir), shell=True, capture_output=True, text=True, timeout=120)
        return r.returncode == 0, r.stdout + r.stderr
    except Exception as e: return False, str(e)

def main():
    parser = argparse.ArgumentParser(description="Mutation-guided test hardening")
    parser.add_argument("--target",required=True); parser.add_argument("--concern",default="all",choices=["security","correctness","performance","all"])
    parser.add_argument("--tests",default="pytest"); parser.add_argument("--project-dir",default=".")
    parser.add_argument("--output"); args = parser.parse_args()
    target = Path(args.target).resolve(); project = Path(args.project_dir).resolve()
    print("="*60); print("  Mutation Hardening"); print("="*60)
    print(f"Target: {target}\nConcern: {args.concern}\n")
    if not target.exists(): print("ERROR: target not found"); return 1
    content = target.read_text(encoding="utf-8",errors="ignore")
    muts = []
    if args.concern == "all":
        for c, ms in MUTATIONS.items():
            for m in ms: muts.append((c, m))
    else: muts = [(args.concern, m) for m in MUTATIONS.get(args.concern, [])]
    print("Running tests on original...")
    orig_pass, _ = run_tests(project, args.tests)
    if not orig_pass: print("⚠️ Tests don't pass on original — aborting"); return 1
    print("✓ Original passes\n")
    mutants = []; killed = 0; survived = 0
    for concern, mut in muts:
        print(f"Mutant: {mut['name']} ({concern})...")
        pattern = mut["pattern"]; replacement = mut["replacement"]
        match = re.search(pattern, content)
        if not match: print("  ⚠️ Pattern not found — skipping"); continue
        mutated = content[:match.start()] + re.sub(pattern, replacement, content[match.start():match.end()], count=1) + content[match.end():]
        target.write_text(mutated)
        mutant_pass, _ = run_tests(project, args.tests)
        target.write_text(content)
        is_killed = not mutant_pass
        if is_killed: killed += 1; reason = "Tests failed (killed)"
        else: survived += 1; reason = "Tests passed (survived — gap!)"
        mutants.append(Mutant(mut["name"], concern, is_killed, reason))
        print(f"  {'✓ KILLED' if is_killed else '✗ SURVIVED'} — {reason}")
    total = len(mutants); score = killed/total if total else 0
    print(f"\n{'='*60}\n  Results\n{'='*60}")
    print(f"Total: {total}, Killed: {killed}, Survived: {survived}")
    print(f"Mutation score: {score:.2%}")
    if survived > 0:
        print(f"\n⚠️ {survived} survived — add tests:")
        for m in mutants:
            if not m.killed: print(f"  - {m.name}: {m.kill_reason}")
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps({"target":str(target),"concern":args.concern,"total_mutants":total,"killed":killed,"survived":survived,"mutation_score":score,"mutants":[asdict(m) for m in mutants]}, indent=2))
        print(f"\n✓ Report: {args.output}")
    return 0 if score >= 0.8 else 1

if __name__ == "__main__": sys.exit(main())
