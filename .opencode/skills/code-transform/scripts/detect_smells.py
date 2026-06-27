#!/usr/bin/env python3
"""detect_smells.py — Detect code smells for refactoring triage.

Usage: python3 scripts/detect_smells.py <path> [--json] [--min-lines 30] [--max-nesting 3]
"""
import argparse, os, re, sys, json
from pathlib import Path

MIN_METHOD_LINES = 30; MAX_NESTING_DEPTH = 3; MIN_CLASS_LINES = 300; MIN_CLASS_METHODS = 10; MAGIC_NUMBER_THRESHOLD = 10

def detect_smells_in_file(filepath, min_lines, max_nesting):
    smells = []
    content = filepath.read_text(encoding="utf-8", errors="ignore")
    lines = content.splitlines()
    ext = filepath.suffix.lower()

    # C3: Commented-Out Code
    comment_prefix = {"py": "#", "rb": "#", "sh": "#", "yaml": "#"}.get(ext.lstrip("."), "//")
    commented_pattern = re.compile(r"^\s*" + re.escape(comment_prefix) + r"\s*(if|for|while|def|function|class|return|import|const|let|var|func)\b")
    for i, line in enumerate(lines, 1):
        if commented_pattern.match(line):
            smells.append((i, "Critical", "C3 Commented-Out Code", f"Line {i}: {line.strip()[:80]}"))

    # H1: Long Method
    if ext == ".py":
        method_pattern = re.compile(r"^(\s*)def\s+(\w+)\s*\(")
    elif ext in (".js", ".ts", ".jsx", ".tsx"):
        method_pattern = re.compile(r"^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(\s*)(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=")
    elif ext == ".go":
        method_pattern = re.compile(r"^(\s*)func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?(\w+)\s*\(")
    elif ext == ".rs":
        method_pattern = re.compile(r"^(\s*)(?:pub\s+)?fn\s+(\w+)\s*\(")
    else:
        method_pattern = None

    if method_pattern:
        for i, line in enumerate(lines):
            m = method_pattern.match(line)
            if m:
                base_indent = len(m.group(1))
                groups = m.groups()
                method_name = next((g for g in groups[1:] if g and g not in ("function", "async", "export", "const", "let", "var")), "anonymous")
                end_line = len(lines)
                for j in range(i + 1, len(lines)):
                    next_line = lines[j]
                    if next_line.strip() == "": continue
                    next_indent = len(next_line) - len(next_line.lstrip())
                    if next_indent <= base_indent and method_pattern.match(next_line):
                        end_line = j; break
                length = end_line - i
                if length >= min_lines:
                    sev = "High" if length >= 50 else "Medium"
                    smells.append((i+1, sev, "H1 Long Method", f"`{method_name}` is {length} lines"))

    # H3: Deep Nesting
    for i, line in enumerate(lines, 1):
        stripped = line.lstrip()
        if not stripped or stripped.startswith(("#", "//")): continue
        indent = len(line) - len(stripped)
        levels = indent // 4
        if levels >= max_nesting and re.search(r"\b(if|for|while|switch|match)\b", stripped):
            smells.append((i, "High", "H3 Deep Nesting", f"Nesting level {levels}"))

    # H4: Magic Numbers
    magic_pattern = re.compile(r"\b(\d{2,})\b")
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "//")): continue
        if re.match(r"^\s*(const|static|final|readonly|[A-Z_]+\s*=)", stripped): continue
        for match in magic_pattern.finditer(stripped):
            num = int(match.group(1))
            if num >= MAGIC_NUMBER_THRESHOLD and num not in (10, 100, 1000):
                if re.search(r"\[\s*\d+\s*\]", stripped): continue
                smells.append((i, "High", "H4 Magic Number", f"`{num}` at line {i}"))

    # H2: God Class
    if ext in (".py", ".js", ".ts", ".java", ".cs", ".go", ".rs"):
        if len(lines) >= MIN_CLASS_LINES and method_pattern:
            method_count = sum(1 for line in lines if method_pattern.match(line))
            if method_count >= MIN_CLASS_METHODS:
                smells.append((1, "High", "H2 God Class", f"File is {len(lines)} lines with ~{method_count} methods"))

    # ST4: Silent Data Loss (except: pass)
    if ext == ".py":
        for i, line in enumerate(lines, 1):
            if re.match(r"^\s*except\s*(Exception)?\s*:.*pass\s*$", line):
                smells.append((i, "High", "ST4 Silent Data Loss", f"Bare/broad except with pass"))

    return smells

def main():
    parser = argparse.ArgumentParser(description="Detect code smells.")
    parser.add_argument("path"); parser.add_argument("--json", action="store_true")
    parser.add_argument("--min-lines", type=int, default=MIN_METHOD_LINES)
    parser.add_argument("--max-nesting", type=int, default=MAX_NESTING_DEPTH)
    args = parser.parse_args()
    path = Path(args.path)
    if not path.exists(): print(f"Error: {path} not found", file=sys.stderr); sys.exit(2)

    files = [path] if path.is_file() else [
        Path(root) / f for root, _, filenames in os.walk(path)
        for f in filenames
        if (Path(root) / f).suffix.lower() in {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".java", ".cs"}
        and not any(d in root for d in {".git", "node_modules", "__pycache__", ".venv", "dist", "build", "target"})
    ]

    all_smells = []
    for filepath in sorted(files):
        for s in detect_smells_in_file(filepath, args.min_lines, args.max_nesting):
            all_smells.append((filepath, *s))

    sev_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    all_smells.sort(key=lambda x: (sev_order.get(x[2], 99), str(x[0]), x[1]))

    if args.json:
        print(json.dumps({"files_scanned": len(files), "smells_found": len(all_smells),
            "smells": [{"file": str(s[0]), "line": s[1], "severity": s[2], "type": s[3], "detail": s[4]} for s in all_smells]}, indent=2, default=str))
    else:
        print(f"# Smell Detection Report\n# Scanned: {len(files)} files\n# Smells: {len(all_smells)}\n")
        for s in all_smells: print(f"- `{s[0]}:{s[1]}` — {s[3]}: {s[4]}")

if __name__ == "__main__": main()
