#!/usr/bin/env python3
"""metrics_diff.py — Capture and compare codebase metrics. Modes: snapshot | diff | report."""
import argparse, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime

def count_files(root):
    EXT = {".py":"python",".js":"javascript",".ts":"typescript",".go":"go",".rs":"rust",".java":"java",".cs":"csharp",".rb":"ruby",".php":"php"}
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__","dist","build","target"}
    counts = {}
    for p in root.rglob("*"):
        if not p.is_file() or any(x in EXCLUDE for x in p.parts): continue
        lang = EXT.get(p.suffix.lower())
        if lang: counts[lang] = counts.get(lang,0)+1
    return counts

def count_lines(root):
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__","dist","build","target"}
    EXTS = {".py",".js",".jsx",".ts",".tsx",".go",".rs",".java",".cs",".rb",".php",".c",".cpp",".h"}
    total = 0
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in EXTS or any(x in EXCLUDE for x in p.parts): continue
        try:
            with open(p, encoding="utf-8", errors="ignore") as f: total += sum(1 for l in f if l.strip())
        except: pass
    return total

def count_tests(root):
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__"}
    patterns = [r"^test_.*\.py$", r".*_test\.py$", r".*\.test\.[jt]sx?$", r".*_test\.go$"]
    total = 0
    for p in root.rglob("*"):
        if not p.is_file() or any(x in EXCLUDE for x in p.parts): continue
        for pat in patterns:
            if re.match(pat, p.name): total += 1; break
    return total

def get_git(root):
    info = {}
    try:
        r = subprocess.run(["git","-C",str(root),"rev-parse","HEAD"], capture_output=True, text=True, check=True)
        info["commit"] = r.stdout.strip()[:7]
        r = subprocess.run(["git","-C",str(root),"rev-list","--count","HEAD"], capture_output=True, text=True, check=True)
        info["total_commits"] = int(r.stdout.strip())
    except: pass
    return info

def cmd_snapshot(args):
    root = Path(args.path).resolve()
    label = args.label or "snapshot"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    metrics = {"label":label,"timestamp":datetime.now().isoformat(timespec="seconds"),"git":get_git(root),"files_by_language":count_files(root),"lines_of_code":count_lines(root),"test_files":count_tests(root)}
    out = root/f"METRICS_{label}_{ts}.json"
    out.write_text(json.dumps(metrics, indent=2))
    print(f"✓ Snapshot: {out}")
    print(f"  LOC: {metrics['lines_of_code']:,} | Source files: {sum(metrics['files_by_language'].values())} | Test files: {metrics['test_files']}")
    return 0

def cmd_diff(args):
    b = json.loads(Path(args.before).read_text()); a = json.loads(Path(args.after).read_text())
    print(f"=== Metrics Diff ===\nBefore: {b.get('label','?')}\nAfter:  {a.get('label','?')}\n")
    b_loc = b.get("lines_of_code",0); a_loc = a.get("lines_of_code",0)
    print(f"Lines of code: {b_loc:>8,} → {a_loc:>8,}   {a_loc-b_loc:+d}")
    b_f = sum(b.get("files_by_language",{}).values()); a_f = sum(a.get("files_by_language",{}).values())
    print(f"Source files:  {b_f:>8} → {a_f:>8}   {a_f-b_f:+d}")
    b_t = b.get("test_files",0); a_t = a.get("test_files",0)
    print(f"Test files:    {b_t:>8} → {a_t:>8}   {a_t-b_t:+d}")
    return 0

def cmd_report(args):
    b = json.loads(Path(args.before).read_text()); a = json.loads(Path(args.after).read_text())
    md = f"## Before/After Metrics\n\n| Metric | Before | After | Change |\n|--------|--------|-------|--------|\n| Lines of code | {b.get('lines_of_code',0):,} | {a.get('lines_of_code',0):,} | {a.get('lines_of_code',0)-b.get('lines_of_code',0):+d} |\n| Source files | {sum(b.get('files_by_language',{}).values())} | {sum(a.get('files_by_language',{}).values())} | {sum(a.get('files_by_language',{}).values())-sum(b.get('files_by_language',{}).values()):+d} |\n| Test files | {b.get('test_files',0)} | {a.get('test_files',0)} | {a.get('test_files',0)-b.get('test_files',0):+d} |\n"
    out = Path(args.output) if args.output else Path("FINAL_REPORT_metrics.md")
    out.write_text(md)
    print(f"✓ Report: {out}")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Codebase metrics")
    sub = parser.add_subparsers(dest="mode", required=True)
    p1 = sub.add_parser("snapshot"); p1.add_argument("path"); p1.add_argument("--label"); p1.set_defaults(func=cmd_snapshot)
    p2 = sub.add_parser("diff"); p2.add_argument("before"); p2.add_argument("after"); p2.set_defaults(func=cmd_diff)
    p3 = sub.add_parser("report"); p3.add_argument("before"); p3.add_argument("after"); p3.add_argument("--output"); p3.set_defaults(func=cmd_report)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
