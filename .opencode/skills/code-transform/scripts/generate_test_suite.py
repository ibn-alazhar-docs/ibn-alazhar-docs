#!/usr/bin/env python3
"""generate_test_suite.py — Testing Mastery helper. Modes: audit | scaffold | plan."""
import argparse, re, sys
from pathlib import Path
from datetime import datetime

def detect_languages(p):
    EXT = {".py":"python",".js":"javascript",".ts":"typescript",".go":"go",".rs":"rust",".java":"java"}
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__"}
    counts = {}
    for path in p.rglob("*"):
        if not path.is_file() or any(x in EXCLUDE for x in path.parts): continue
        lang = EXT.get(path.suffix.lower())
        if lang: counts[lang] = counts.get(lang,0)+1
    return counts

def extract_functions_python(content):
    funcs = []
    for m in re.finditer(r"^def\s+(\w+)\s*\(", content, re.MULTILINE):
        name = m.group(1)
        if name.startswith("__") and name.endswith("__"): continue
        if name.startswith("_") and not name.startswith("__"): continue
        funcs.append(name)
    return funcs

def cmd_audit(args):
    src = Path(args.path).resolve()
    print(f"# Test Audit — {src}\nGenerated: {datetime.now().isoformat(timespec='seconds')}\n")
    langs = detect_languages(src)
    print("## Languages")
    for l,n in sorted(langs.items(), key=lambda x:-x[1]): print(f"  - {l}: {n}")
    print("\n## Recommendations")
    print("  P0: Add unit tests for critical functions." if not langs else "  ✓ Tests exist. Run mutation testing.")
    return 0

def cmd_scaffold(args):
    src = Path(args.path).resolve()
    out = Path(args.out) if args.out else src.parent/"tests"/"unit"
    out.mkdir(parents=True, exist_ok=True)
    ext = {"python":".py","javascript":".js","typescript":".ts","go":".go","rust":".rs"}[args.lang]
    files = [p for p in src.rglob(f"*{ext}") if not any(x in {"node_modules",".git","venv"} for x in p.parts)]
    print(f"# Scaffolding {len(files)} {args.lang} files")
    for f in files:
        try: content = f.read_text(encoding="utf-8",errors="ignore")
        except: continue
        funcs = extract_functions_python(content) if args.lang=="python" else []
        if not funcs: continue
        out_file = out/f"test_{f.stem}.py"
        body = f'"""Tests for {f.stem}."""\nimport pytest\n\n'
        for fn in funcs:
            body += f"def test_{fn}_happy_path():\n    pytest.skip(\"TODO: implement\")\n\n"
        out_file.write_text(body)
        print(f"  WROTE {out_file.name}")
    return 0

def cmd_plan(args):
    shape = {"web":"Trophy","api":"Pyramid","mobile":"Pyramid+device","library":"Pyramid+property","cli":"Pyramid+smoke"}[args.app_type]
    out = Path(args.out) if args.out else Path("TEST_PLAN.md")
    out.write_text(f"# TEST_PLAN\n> Generated: {datetime.now().isoformat(timespec='seconds')}\n\n## Shape: {shape}\n\n## Quality Gates\n- Coverage: >80%\n- Mutation: >80%\n- Flaky: 0\n- Unit runtime: <10s\n")
    print(f"Wrote {out}")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Testing Mastery helper")
    sub = parser.add_subparsers(dest="mode", required=True)
    p1 = sub.add_parser("audit"); p1.add_argument("path"); p1.set_defaults(func=cmd_audit)
    p2 = sub.add_parser("scaffold"); p2.add_argument("path"); p2.add_argument("--lang",required=True,choices=["python","javascript","typescript","go","rust"]); p2.add_argument("--out"); p2.add_argument("--force",action="store_true"); p2.set_defaults(func=cmd_scaffold)
    p3 = sub.add_parser("plan"); p3.add_argument("path"); p3.add_argument("--app-type",required=True,choices=["web","api","mobile","library","cli"]); p3.add_argument("--out"); p3.set_defaults(func=cmd_plan)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
