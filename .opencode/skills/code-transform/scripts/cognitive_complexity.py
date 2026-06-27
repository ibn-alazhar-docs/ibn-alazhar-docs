#!/usr/bin/env python3
"""cognitive_complexity.py — Calculate cognitive complexity for Python files.
Usage: python3 scripts/cognitive_complexity.py <file.py> [--threshold 15] [--json]
"""
import argparse, ast, sys, json
from pathlib import Path

class CognitiveComplexityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.functions = []; self._current = None; self._complexity = 0; self._nesting = 0
    def visit_FunctionDef(self, node):
        old = (self._current, self._complexity, self._nesting)
        self._current = node.name; self._complexity = 0; self._nesting = 0
        self.generic_visit(node)
        self.functions.append((node.name, self._complexity, node.lineno))
        self._current, self._complexity, self._nesting = old
    visit_AsyncFunctionDef = visit_FunctionDef
    def _add(self, base=1):
        if self._current: self._complexity += base + self._nesting
    def visit_If(self, node): self._add(); self._nesting += 1; self.generic_visit(node); self._nesting -= 1
    def visit_For(self, node): self._add(); self._nesting += 1; self.generic_visit(node); self._nesting -= 1
    visit_AsyncFor = visit_For
    def visit_While(self, node): self._add(); self._nesting += 1; self.generic_visit(node); self._nesting -= 1
    def visit_ExceptHandler(self, node): self._add(); self._nesting += 1; self.generic_visit(node); self._nesting -= 1
    def visit_BoolOp(self, node):
        if self._current: self._complexity += len(node.values) - 1
        self.generic_visit(node)
    def visit_comprehension(self, node):
        if self._current: self._complexity += 1
        self.generic_visit(node)

def calculate(filepath):
    try:
        tree = ast.parse(filepath.read_text(encoding="utf-8"), filename=str(filepath))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr); return []
    v = CognitiveComplexityVisitor(); v.visit(tree); return v.functions

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file"); parser.add_argument("--threshold", type=int, default=15)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    fp = Path(args.file)
    if not fp.exists() or fp.suffix != ".py": print("Error: not a Python file", file=sys.stderr); sys.exit(2)
    funcs = calculate(fp); funcs.sort(key=lambda x: x[1], reverse=True)
    if args.json:
        print(json.dumps({"file": str(fp), "threshold": args.threshold,
            "functions": [{"name": f[0], "complexity": f[1], "line": f[2], "over": f[1] > args.threshold} for f in funcs]}, indent=2))
    else:
        print(f"# Cognitive Complexity\n# File: {fp}\n# Threshold: {args.threshold}\n")
        for name, cx, line in funcs:
            print(f"  {name:<40} {cx:>5} (line {line}) {'✗ OVER' if cx > args.threshold else '✓ OK'}")
    sys.exit(1 if any(f[1] > args.threshold for f in funcs) else 0)

if __name__ == "__main__": main()
