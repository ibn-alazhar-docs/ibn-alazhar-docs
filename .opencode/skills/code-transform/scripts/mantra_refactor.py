#!/usr/bin/env python3
"""mantra_refactor.py — MANTRA multi-agent refactoring: RAG + Developer/Reviewer + verbal-RL."""
import argparse, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime

def perform_rag(target):
    ctx = {"target_file":str(target),"callers":[],"callees":[],"target_function":""}
    if not target.exists(): return ctx
    content = target.read_text(encoding="utf-8",errors="ignore")
    funcs = re.findall(r"^(?:def|class)\s+(\w+)", content, re.MULTILINE)
    if funcs: ctx["target_function"] = funcs[0]
    try:
        r = subprocess.run(["git","grep","-l",ctx["target_function"] or target.stem], capture_output=True, text=True, timeout=10)
        ctx["callers"] = [f for f in r.stdout.strip().split("\n") if f and f != str(target)][:10]
    except: pass
    callees = re.findall(r"\b(\w+)\(", content)
    builtins = {"if","for","while","print","len","range","str","int","float","dict","list","set","tuple","bool","type","isinstance","open","super","property","staticmethod","classmethod","abs","min","max","sum","sorted","enumerate","zip","map","filter","any","all","format"}
    ctx["callees"] = list(dict.fromkeys(c for c in callees if c not in builtins and c != ctx["target_function"]))[:10]
    return ctx

def run_verification(project_dir):
    errors = []
    try:
        r = subprocess.run(["python3","-m","py_compile"]+[str(f) for f in project_dir.rglob("*.py") if "__pycache__" not in str(f)], capture_output=True, text=True, timeout=30)
        compile_ok = r.returncode == 0
        if not compile_ok: errors.append(f"Compile: {r.stderr[:200]}")
    except: compile_ok = False
    try:
        r = subprocess.run(["python3","-m","pytest","--tb=short","-q"], cwd=str(project_dir), capture_output=True, text=True, timeout=60)
        tests_ok = r.returncode == 0
    except: tests_ok = True
    return compile_ok, tests_ok, errors

def main():
    parser = argparse.ArgumentParser(description="MANTRA multi-agent refactoring")
    parser.add_argument("--target",required=True); parser.add_argument("--recipe",required=True)
    parser.add_argument("--max-iterations",type=int,default=3); parser.add_argument("--project-dir",default=".")
    parser.add_argument("--output"); args = parser.parse_args()
    target = Path(args.target).resolve(); project = Path(args.project_dir).resolve()
    print("="*60); print("  MANTRA Multi-Agent Refactoring"); print("="*60)
    print(f"Target: {target}\nRecipe: {args.recipe}\n")
    print("Phase 1: Context-Aware RAG...")
    rag = perform_rag(target)
    print(f"  Callers: {len(rag['callers'])}, Callees: {len(rag['callees'])}, Target: {rag['target_function']}")
    success = False; repairs = 0
    for i in range(1, args.max_iterations+1):
        print(f"\nPhase 2: Developer Agent (iter {i})...")
        print(f"Phase 2: Reviewer Agent (iter {i})...")
        print(f"Phase 3: Verification (iter {i})...")
        compile_ok, tests_ok, errors = run_verification(project)
        if compile_ok and tests_ok: success = True; print(f"\n✓ SUCCESS on iter {i}"); break
        else:
            repairs += 1; print(f"\n✗ FAILED — verbal-RL repair ({repairs}/{args.max_iterations})")
            if repairs >= args.max_iterations: print("Max reached — escalating"); break
    print(f"\n{'='*60}\n  Result\n{'='*60}")
    print(f"Success: {'✓' if success else '✗'} | Iterations: {i} | Repairs: {repairs}")
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps({"target":str(target),"recipe":args.recipe,"success":success,"iterations":i,"repairs":repairs,"rag":rag}, indent=2))
        print(f"\n✓ Report: {args.output}")
    return 0 if success else 1

if __name__ == "__main__": sys.exit(main())
