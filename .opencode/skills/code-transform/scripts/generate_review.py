#!/usr/bin/env python3
"""generate_review.py — HTML report from benchmark.json."""
import argparse, json, sys
from pathlib import Path

HTML = """<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Eval Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0d1117;color:#c9d1d9;padding:20px}.c{max-width:1400px;margin:0 auto}h1{color:#58a6ff;margin-bottom:8px}.m{color:#8b949e;font-size:14px;margin-bottom:24px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:32px}.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px}.card h2{color:#58a6ff;font-size:16px;margin-bottom:12px}.s{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #21262d}.pass{color:#3fb950}.fail{color:#f85149}table{width:100%;border-collapse:collapse;margin-top:16px;background:#161b22;border-radius:8px;overflow:hidden}th{background:#21262d;color:#58a6ff;padding:12px;text-align:left;font-size:13px}td{padding:12px;border-bottom:1px solid #21262d;font-size:13px}.b{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}.bp{background:#1a3d1f;color:#3fb950}.bf{background:#3d1a1f;color:#f85149}</style></head>
<body><div class="c"><h1>Eval Report</h1><div class="m">{meta}</div>
<div class="g"><div class="card"><h2>With Skill</h2>{ws}</div><div class="card"><h2>Baseline</h2>{bl}</div><div class="card"><h2>Improvement</h2>{imp}</div></div>
<h2 style="color:#58a6ff;margin-bottom:16px">Case Results</h2><table><thead><tr><th>Case</th><th>Mode</th><th>Pass Rate</th><th>Assertions</th><th>Duration</th><th>Status</th></tr></thead><tbody>{rows}</tbody></table></div></body></html>"""

def fmt_stats(s):
    if not s: return '<div class="s"><span>No data</span></div>'
    pr = s.get("avg_pass_rate",0)
    return f'<div class="s"><span>Runs</span><span>{s.get("total_runs",0)}</span></div><div class="s"><span>Avg pass</span><span class="{"pass" if pr>=0.8 else "fail"}">{pr:.2%}</span></div><div class="s"><span>Passed</span><span>{s.get("total_passed",0)}/{s.get("total_assertions",0)}</span></div>'

def fmt_imp(i):
    if not i: return '<div class="s"><span>No data</span></div>'
    v = i.get("pass_rate_improvement_pct",0)
    return f'<div class="s"><span>Improvement</span><span class="{"pass" if v>0 else "fail"}">{v:+.2f}%</span></div>'

def fmt_rows(rs):
    h = ""
    for r in rs:
        pr = r.get("pass_rate",0); cls = "bp" if pr>=0.8 else "bf"
        h += f"<tr><td>{r.get('case_name','')}</td><td>{r.get('mode','')}</td><td>{pr:.2%}</td><td>{r.get('assertions_passed',0)}/{r.get('assertions_total',0)}</td><td>{r.get('duration_seconds',0):.2f}s</td><td><span class='b {cls}'>{'PASS' if pr>=0.8 else 'FAIL'}</span></td></tr>"
    return h

def main():
    parser = argparse.ArgumentParser(description="Generate HTML report")
    parser.add_argument("benchmark"); parser.add_argument("--output"); parser.add_argument("--open",action="store_true")
    args = parser.parse_args()
    bp = Path(args.benchmark)
    if not bp.exists(): print(f"ERROR: {bp} not found",file=sys.stderr); return 1
    data = json.loads(bp.read_text())
    s = data.get("summary",{})
    all_r = data.get("with_skill",[]) + data.get("baseline",[])
    out = Path(args.output) if args.output else bp.parent/"review.html"
    html = HTML.format(meta=f"Skill: {data.get('skill_name','')} v{data.get('skill_version','')} | Run: {data.get('run_at','')} | Cases: {data.get('total_cases',0)}",ws=fmt_stats(s.get("with_skill",{})),bl=fmt_stats(s.get("baseline",{})),imp=fmt_imp(s.get("improvement",{})),rows=fmt_rows(all_r))
    out.write_text(html)
    print(f"✓ HTML report: {out}")
    if args.open:
        import webbrowser; webbrowser.open(f"file://{out.resolve()}")
    return 0

if __name__ == "__main__": sys.exit(main())
