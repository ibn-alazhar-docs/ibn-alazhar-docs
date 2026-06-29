#!/usr/bin/env python3
"""traceability_matrix.py — Generate and verify traceability matrix."""
import argparse, re, sys, subprocess, json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def parse_audit(p):
    if not p.exists(): return {}
    content = p.read_text(encoding="utf-8", errors="ignore")
    findings = {}
    for m in re.finditer(r"-\s+\*\*\[(D\d{1,2}-[CHML]\d+)\]\*\*\s+`?([^`\n]+?)`?\s*[—-]\s*(.+?)(?=\n-|\n\n|\Z)", content, re.DOTALL):
        fid = m.group(1); loc = m.group(2).strip(); desc = m.group(3).strip().split("\n")[0]
        id_m = re.match(r"D(\d{1,2})-([CHML])(\d+)", fid)
        if id_m:
            sev = {"C":"Critical","H":"High","M":"Medium","L":"Low"}[id_m.group(2)]
            findings[fid] = {"dimension":int(id_m.group(1)),"severity":sev,"location":loc,"description":desc[:200]}
    return findings

def parse_blueprint(p):
    if not p.exists(): return {}
    content = p.read_text(encoding="utf-8", errors="ignore")
    findings = {}
    for m in re.finditer(r"-\s+\[[ xX]\]\s+\*\*\[(D\d{1,2}-[CHML]\d+)\]\*\*\s+(.*?)(?=\n-\s+\[[ xX]\]|\n##|\Z)", content, re.DOTALL):
        fid = m.group(1); body = m.group(2)
        priority = "Unknown"
        before = content[:m.start()]
        prio_m = list(re.finditer(r"^##\s+(P[0-5])\s", before, re.MULTILINE))
        if prio_m: priority = prio_m[-1].group(1)
        commit_m = re.search(r"`([0-9a-f]{7,40})`", body)
        completed = m.group(0).startswith("- [x]") or m.group(0).startswith("- [X]")
        findings[fid] = {"priority":priority,"completed":completed,"commit_hash":commit_m.group(1) if commit_m else None}
    return findings

def cmd_generate(args):
    root = Path(args.path).resolve()
    audit = parse_audit(root/"AUDIT_REPORT.md")
    bp = parse_blueprint(root/"BLUEPRINT.md")
    if not audit: print("⚠️ No findings in AUDIT_REPORT.md"); return 1
    all_ids = set(audit) | set(bp)
    rows = []
    for fid in sorted(all_ids):
        a = audit.get(fid, {}); b = bp.get(fid, {})
        if b.get("completed") and b.get("commit_hash"): status = "🟢 Closed"; commit = b["commit_hash"]
        elif b: status = "🔴 Open"; commit = "—"
        else: status = "🔴 Open"; commit = "—"
        rows.append({"fid":fid,"severity":a.get("severity","?"),"priority":b.get("priority","?"),"location":a.get("location","?"),"description":a.get("description",""),"commit":commit,"status":status})
    closed = sum(1 for r in rows if "Closed" in r["status"])
    md = f"# TRACEABILITY_MATRIX\n\n> Generated: {datetime.now().isoformat(timespec='seconds')}\n\n## Summary\n\n| Status | Count |\n|--------|-------|\n| 🟢 Closed | {closed} |\n| 🔴 Open | {len(rows)-closed} |\n| **Total** | **{len(rows)}** |\n\n**Coverage**: {closed}/{len(rows)} = {closed/len(rows)*100 if rows else 0:.1f}%\n\n## Matrix\n\n| Finding | Severity | Priority | Location | Commit | Status |\n|---------|----------|----------|----------|--------|--------|\n"
    for r in rows: md += f"| {r['fid']} | {r['severity']} | {r['priority']} | `{r['location'][:30]}` | `{r['commit']}` | {r['status']} |\n"
    (root/"TRACEABILITY_MATRIX.md").write_text(md)
    print(f"✓ Wrote {root/'TRACEABILITY_MATRIX.md'}")
    print(f"  Total: {len(rows)}, Closed: {closed} ({closed/len(rows)*100 if rows else 0:.1f}%)")
    return 0

def cmd_completeness(args):
    root = Path(args.path).resolve()
    audit = parse_audit(root/"AUDIT_REPORT.md")
    bp = parse_blueprint(root/"BLUEPRINT.md")
    print("=== Completeness Check ===\n")
    print(f"Findings in AUDIT: {len(audit)}")
    print(f"Findings in BLUEPRINT: {len(bp)}")
    missing = set(audit) - set(bp)
    if missing: print(f"\n⚠️ {len(missing)} missing from BLUEPRINT: {sorted(missing)}")
    else: print("\n✓ All audit findings in BLUEPRINT")
    return 0

def cmd_drift(args):
    root = Path(args.path).resolve()
    prog = root/"PROGRESS.md"
    print("=== Drift Detection ===\n")
    if not prog.exists(): print("⚠️ PROGRESS.md not found"); return 1
    content = prog.read_text(encoding="utf-8", errors="ignore")
    commits = re.findall(r"`([0-9a-f]{7,40})`", content)
    if not commits: print("⚠️ No commits in PROGRESS.md"); return 1
    last = commits[-1]
    print(f"Last session commit: {last}")
    try:
        r = subprocess.run(["git","-C",str(root),"log",f"{last}..HEAD","--oneline"], capture_output=True, text=True, check=True)
        ext = [l for l in r.stdout.split("\n") if l]
        if not ext: print("✓ No drift"); return 0
        print(f"Commits since last: {len(ext)}")
        if len(ext)<=3: print("🟢 LOW drift")
        elif len(ext)<=10: print("🟡 MEDIUM drift")
        else: print("🔴 HIGH drift — re-audit recommended")
    except: print("⚠️ git not available")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Traceability matrix")
    sub = parser.add_subparsers(dest="mode", required=True)
    for name, func in [("generate",cmd_generate),("check-completeness",cmd_completeness),("check-drift",cmd_drift)]:
        p = sub.add_parser(name); p.add_argument("path"); p.set_defaults(func=func)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
