#!/usr/bin/env python3
"""layer_violation_detector.py — Detect layer dependency violations.
Usage: python3 scripts/layer_violation_detector.py <project-root> [--json]
"""
import argparse, json, os, re, sys
from pathlib import Path

LAYER_PATTERNS = {
    "controller": ["controller", "controllers", "handler", "handlers", "route", "routes", "api", "endpoint"],
    "service": ["service", "services", "usecase", "usecases", "logic", "business"],
    "repository": ["repository", "repositories", "repo", "repos", "dao", "data", "store", "stores"],
    "client": ["client", "clients", "adapter", "adapters", "gateway", "gateways", "integration"],
    "model": ["model", "models", "entity", "entities", "domain", "types"],
    "transport": ["transport", "wire", "protocol", "http", "grpc", "websocket"],
    "config": ["config", "configuration", "settings", "wiring", "composition"],
    "middleware": ["middleware", "filter", "filters", "interceptor", "interceptors"],
    "shared": ["shared", "common", "util", "utils", "utility", "helpers"],
}

FORBIDDEN = {
    "service": ["controller", "transport"],
    "repository": ["service", "controller", "transport", "client"],
    "model": ["service", "controller", "repository", "client", "transport"],
    "client": ["service", "controller", "repository"],
    "shared": ["service", "controller", "repository", "client", "model", "transport", "config", "middleware"],
}

def detect_layer(filepath):
    for part in filepath.parts:
        pl = part.lower()
        for layer, patterns in LAYER_PATTERNS.items():
            if pl in patterns: return layer
    fn = filepath.stem.lower()
    for layer, patterns in LAYER_PATTERNS.items():
        for p in patterns:
            if p in fn: return layer
    return None

def extract_imports(filepath, content):
    imports = []
    ext = filepath.suffix.lower()
    if ext == ".py":
        for m in re.finditer(r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", content, re.MULTILINE):
            imports.append(m.group(1) or m.group(2))
    elif ext in (".js", ".ts", ".jsx", ".tsx"):
        for m in re.finditer(r"(?:import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]|require\(['\"]([^'\"]+)['\"]\))", content):
            imports.append(m.group(1) or m.group(2))
    elif ext == ".go":
        for m in re.finditer(r'"([^"]+)"', content): imports.append(m.group(1))
    elif ext == ".rs":
        for m in re.finditer(r"use\s+([\w:]+)", content): imports.append(m.group(1))
    elif ext in (".java", ".cs"):
        for m in re.finditer(r"(?:import|using)\s+([\w.]+);", content): imports.append(m.group(1))
    return imports

def resolve_layer(imp, root):
    norm = imp.replace(".", "/").replace("\\", "/")
    for part in norm.split("/"):
        pl = part.lower()
        for layer, patterns in LAYER_PATTERNS.items():
            if pl in patterns: return layer
    return None

def detect_violations(root):
    violations = []
    skip = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", "target", ".idea", ".vscode"}
    exts = {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".java", ".cs"}
    for r, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip]
        for f in files:
            fp = Path(r) / f
            if fp.suffix.lower() not in exts: continue
            src = detect_layer(fp)
            if not src: continue
            try: content = fp.read_text(encoding="utf-8", errors="ignore")
            except: continue
            for imp in extract_imports(fp, content):
                tgt = resolve_layer(imp, root)
                if tgt and tgt != src and tgt in FORBIDDEN.get(src, []):
                    violations.append({"file": str(fp.relative_to(root)), "source_layer": src,
                        "target_layer": tgt, "import": imp,
                        "rule": f"{src} must not import from {tgt}"})
    return violations

def main():
    p = argparse.ArgumentParser()
    p.add_argument("path"); p.add_argument("--json", action="store_true")
    args = p.parse_args()
    root = Path(args.path)
    if not root.is_dir(): print(f"Error: {root} not a dir", file=sys.stderr); sys.exit(2)
    v = detect_violations(root)
    if args.json: print(json.dumps({"violations": v, "count": len(v)}, indent=2))
    else:
        print(f"# Layer Violation Report\n# Violations: {len(v)}\n")
        for x in v: print(f"  {x['file']}: {x['rule']} (import: {x['import']})")
    sys.exit(1 if v else 0)

if __name__ == "__main__": main()
