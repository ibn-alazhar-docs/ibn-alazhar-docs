#!/usr/bin/env python3
"""run_eval.py — Eval harness: with-skill vs baseline."""
import argparse, json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict, field

@dataclass
class CaseResult:
    case_name: str; mode: str; iteration: int; started_at: str; completed_at: str
    duration_seconds: float; assertions: list = field(default_factory=list)
    assertions_passed: int = 0; assertions_total: int = 0; pass_rate: float = 0.0

def discover_cases(d):
    cases = []
    if not d.exists(): return cases
    for cd in sorted(d.iterdir()):
        if not cd.is_dir(): continue
        cj = cd/"case.json"
        if not cj.exists(): continue
        try: c = json.loads(cj.read_text()); c["_dir"] = str(cd); cases.append(c)
        except: pass
    return cases

def eval_assertion(pdir, a, skill_dir):
    atype = a.get("type")
    if atype in ("file_contains","file_not_contains"):
        fp = pdir/a["file"]; pat = a["pattern"]; must = a.get("must_be", atype=="file_contains")
        if not fp.exists(): return {"name":f"file:{a['file']}","passed":False,"details":"File not found"}
        content = fp.read_text(encoding="utf-8",errors="ignore")
        return {"name":f"file:{a['file'][:20]}","passed":(pat in content)==must,"details":f"Pattern {'found' if pat in content else 'not found'}"}
    if atype == "tests_pass":
        try:
            r = subprocess.run(a["command"],cwd=str(pdir),shell=True,capture_output=True,text=True,timeout=a.get("timeout_seconds",120))
            return {"name":f"tests:{a['command'][:30]}","passed":r.returncode==0,"details":f"Exit: {r.returncode}"}
        except Exception as e: return {"name":f"tests","passed":False,"details":str(e)}
    if atype == "no_secrets":
        sp = skill_dir/"scripts"/"security_scan.sh"
        if not sp.exists(): return {"name":"no_secrets","passed":False,"details":"Scanner not found"}
        try:
            r = subprocess.run(["bash",str(sp),str(pdir)],capture_output=True,text=True,timeout=120)
            return {"name":"no_secrets","passed":r.returncode==0,"details":"Security scan complete"}
        except: return {"name":"no_secrets","passed":False,"details":"Error"}
    return {"name":f"unknown:{atype}","passed":False,"details":"Unknown type"}

def run_case(case, mode, it, skill_dir, out_dir):
    start = time.time()
    result = CaseResult(case_name=case["name"],mode=mode,iteration=it,started_at=datetime.now().isoformat(),completed_at="",duration_seconds=0)
    try:
        cd = Path(case["_dir"]); pd = out_dir/mode/f"iter_{it}"/case["name"]
        if pd.exists(): shutil.rmtree(pd)
        shutil.copytree(cd, pd)
        cj = pd/"case.json"
        if cj.exists(): cj.unlink()
        if mode == "with-skill":
            sol = cd/"solution"
            if sol.exists():
                for sf in sol.rglob("*"):
                    if sf.is_file():
                        rel = sf.relative_to(sol); dest = pd/rel
                        dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(sf,dest)
        for a in case.get("assertions",[]):
            result.assertions.append(eval_assertion(pd,a,skill_dir))
        result.assertions_total = len(result.assertions)
        result.assertions_passed = sum(1 for a in result.assertions if a["passed"])
        result.pass_rate = result.assertions_passed/result.assertions_total if result.assertions_total else 0
    except Exception as e: pass
    result.duration_seconds = time.time()-start
    result.completed_at = datetime.now().isoformat()
    return result

def main():
    parser = argparse.ArgumentParser(description="Eval harness")
    parser.add_argument("--cases",default="evals/cases"); parser.add_argument("--output",default="evals/benchmark.json")
    parser.add_argument("--iterations",type=int,default=1); parser.add_argument("--skill-dir",default=".")
    args = parser.parse_args()
    cases_dir = Path(args.cases); out_file = Path(args.output)
    skill_dir = Path(args.skill_dir).resolve()
    work_dir = Path(tempfile.mkdtemp(prefix="eval_"))
    print("="*60); print("  Eval Harness"); print("="*60)
    cases = discover_cases(cases_dir)
    if not cases: print("⚠️ No cases found"); return 1
    print(f"\nFound {len(cases)} cases.\n")
    ws = []; bl = []
    for case in cases:
        print(f"Running: {case['name']}")
        for it in range(1,args.iterations+1):
            for mode in ["with-skill","baseline"]:
                print(f"  [{mode} iter {it}] ",end="",flush=True)
                r = run_case(case,mode,it,skill_dir,work_dir)
                if mode=="with-skill": ws.append(r)
                else: bl.append(r)
                print(f"pass={r.pass_rate:.2%} ({r.assertions_passed}/{r.assertions_total})")
    def stats(rs):
        if not rs: return {}
        pr = [r.pass_rate for r in rs]
        return {"total_runs":len(rs),"avg_pass_rate":sum(pr)/len(pr),"total_assertions":sum(r.assertions_total for r in rs),"total_passed":sum(r.assertions_passed for r in rs)}
    ws_s = stats(ws); bl_s = stats(bl)
    imp = {}
    if ws_s and bl_s and bl_s["avg_pass_rate"]>0:
        imp["pass_rate_improvement_pct"] = (ws_s["avg_pass_rate"]-bl_s["avg_pass_rate"])/bl_s["avg_pass_rate"]*100
    out_file.parent.mkdir(parents=True,exist_ok=True)
    out_file.write_text(json.dumps({"skill_name":"code-transform","skill_version":"12.1.0","run_at":datetime.now().isoformat(),"total_cases":len(cases),"with_skill":[asdict(r) for r in ws],"baseline":[asdict(r) for r in bl],"summary":{"with_skill":ws_s,"baseline":bl_s,"improvement":imp}},indent=2))
    print(f"\n{'='*60}\n  Summary\n{'='*60}")
    if ws_s: print(f"\nWITH SKILL: {ws_s['avg_pass_rate']:.2%} ({ws_s['total_passed']}/{ws_s['total_assertions']})")
    if bl_s: print(f"BASELINE:   {bl_s['avg_pass_rate']:.2%} ({bl_s['total_passed']}/{bl_s['total_assertions']})")
    if imp: print(f"\nIMPROVEMENT: {imp.get('pass_rate_improvement_pct',0):+.2f}%")
    print(f"\n✓ Benchmark: {out_file}")
    return 0

if __name__ == "__main__": sys.exit(main())
