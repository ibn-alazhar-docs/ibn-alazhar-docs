#!/usr/bin/env python3
"""spec_generator.py — Generate spec.md, plan.md, tasks.md from any project.

Phase 0 of OmniProject AI v17.1. Runs BEFORE everything else.
Scans project → infers intent → produces BDD-style specification.

Usage:
  python3 scripts/spec_generator.py [project-root]
  python3 scripts/spec_generator.py . --json
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime


def scan_readme(root: Path) -> dict:
    """Extract project purpose from README."""
    info = {"name": root.name, "description": "", "purpose": ""}
    for fname in ["README.md", "README.rst", "README.txt", "README"]:
        f = root / fname
        if f.exists():
            content = f.read_text(encoding="utf-8", errors="ignore")
            # First paragraph after title
            lines = content.split("\n")
            for i, line in enumerate(lines[1:], 1):
                if line.strip() and not line.startswith("#"):
                    info["description"] = line.strip()
                    break
            info["purpose"] = content[:500]
            break
    if not info["description"]:
        info["description"] = "No README found — purpose inferred from code structure."
    return info


def scan_package(root: Path) -> dict:
    """Extract dependencies and scripts from package files."""
    deps = {"dependencies": [], "dev_dependencies": [], "scripts": []}
    
    # Node.js
    pkg = root / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text())
            deps["dependencies"] = list(data.get("dependencies", {}).keys())
            deps["dev_dependencies"] = list(data.get("devDependencies", {}).keys())
            deps["scripts"] = list(data.get("scripts", {}).keys())
        except: pass
    
    # Python
    for fname in ["requirements.txt", "pyproject.toml"]:
        f = root / fname
        if f.exists():
            content = f.read_text(encoding="utf-8", errors="ignore")
            for line in content.split("\n"):
                line = line.strip()
                if line and not line.startswith("#") and not line.startswith("["):
                    pkg_name = line.split("==")[0].split(">=")[0].split("<=")[0].split("!=")[0].split("~=")[0].strip()
                    if pkg_name:
                        deps["dependencies"].append(pkg_name)
    
    # Go
    gomod = root / "go.mod"
    if gomod.exists():
        content = gomod.read_text(encoding="utf-8", errors="ignore")
        for line in content.split("\n"):
            if line.strip().startswith("require"):
                parts = line.strip().split()
                if len(parts) >= 2:
                    deps["dependencies"].append(parts[1])
    
    # Rust
    cargo = root / "Cargo.toml"
    if cargo.exists():
        content = cargo.read_text(encoding="utf-8", errors="ignore")
        in_deps = False
        for line in content.split("\n"):
            if "[dependencies]" in line: in_deps = True; continue
            if line.startswith("[") and in_deps: in_deps = False
            if in_deps and "=" in line:
                deps["dependencies"].append(line.split("=")[0].strip())
    
    return deps


def scan_routes(root: Path) -> list:
    """Detect API routes/endpoints from code."""
    routes = []
    EXCLUDE = {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", "target"}
    
    # Python: @app.route / @app.get / @app.post / @router.get
    py_pattern = re.compile(r'@(?:app|router|blueprint)\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']')
    
    # JS/TS: app.get / router.get / fastify.get
    js_pattern = re.compile(r'\b(?:app|router|fastify)\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']')
    
    for f in root.rglob("*"):
        if not f.is_file() or any(x in f.parts for x in EXCLUDE):
            continue
        ext = f.suffix.lower()
        if ext not in [".py", ".js", ".ts", ".jsx", ".tsx"]:
            continue
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except:
            continue
        
        pattern = py_pattern if ext == ".py" else js_pattern
        for match in pattern.finditer(content):
            method = match.group(1).upper()
            path = match.group(2)
            routes.append({"method": method, "path": path, "file": str(f.relative_to(root))})
    
    return routes


def scan_models(root: Path) -> list:
    """Detect data models/entities from code."""
    models = []
    EXCLUDE = {"node_modules", ".git", "venv", ".venv", "__pycache__"}
    
    # Python: class X(models.Model) / class X(Base) / class X(db.Model)
    py_pattern = re.compile(r'^class\s+(\w+)\s*\((?:.*models\.Model|.*Base|.*db\.Model|.*Model)\)', re.MULTILINE)
    
    # JS/TS: class X extends Model / mongoose.Schema
    js_pattern = re.compile(r'(?:class\s+(\w+)\s+extends\s+\w*Model|new\s+mongoose\.Schema|new\s+Schema)\b')
    
    # Prisma: model X {
    prisma_pattern = re.compile(r'^model\s+(\w+)\s*\{', re.MULTILINE)
    
    for f in root.rglob("*"):
        if not f.is_file() or any(x in f.parts for x in EXCLUDE):
            continue
        ext = f.suffix.lower()
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except:
            continue
        
        if ext == ".py":
            for m in py_pattern.finditer(content):
                models.append({"name": m.group(1), "file": str(f.relative_to(root))})
        elif ext in [".js", ".ts"]:
            for m in js_pattern.finditer(content):
                if m.group(1):
                    models.append({"name": m.group(1), "file": str(f.relative_to(root))})
        elif ext == ".prisma":
            for m in prisma_pattern.finditer(content):
                models.append({"name": m.group(1), "file": str(f.relative_to(root))})
    
    return models


def scan_tests(root: Path) -> list:
    """Detect existing tests and infer behavior."""
    tests = []
    EXCLUDE = {"node_modules", ".git", "venv", ".venv", "__pycache__"}
    patterns = [r"^test_(\w+)", r"def test_(\w+)", r"it\(['\"](.+?)['\"]", r"describe\(['\"](.+?)['\"]"]
    
    for f in root.rglob("*"):
        if not f.is_file() or any(x in f.parts for x in EXCLUDE):
            continue
        name = f.name
        if not (name.startswith("test_") or name.endswith(".test.js") or name.endswith(".test.ts") or name.endswith("_test.go")):
            continue
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except:
            continue
        for pat in patterns:
            for m in re.finditer(pat, content, re.MULTILINE):
                tests.append({"name": m.group(1).replace("_", " "), "file": str(f.relative_to(root))})
    
    return tests


def generate_spec(root: Path) -> dict:
    """Full spec generation from project analysis."""
    readme = scan_readme(root)
    deps = scan_package(root)
    routes = scan_routes(root)
    models = scan_models(root)
    tests = scan_tests(root)
    
    # Infer user stories from routes
    user_stories = []
    sp_id = 1
    for route in routes[:20]:  # cap at 20
        method = route["method"]
        path = route["path"]
        if method == "GET" and ":" in path:
            action = "retrieve"
            resource = path.split("/")[-1].replace(":", "").replace("{", "").replace("}", "")
        elif method == "GET":
            action = "list"
            resource = path.split("/")[-1] if path != "/" else "root"
        elif method == "POST":
            action = "create"
            resource = path.split("/")[-1]
        elif method == "PUT" or method == "PATCH":
            action = "update"
            resource = path.split("/")[-1].replace(":", "").replace("{", "").replace("}", "")
        elif method == "DELETE":
            action = "delete"
            resource = path.split("/")[-1].replace(":", "").replace("{", "").replace("}", "")
        else:
            action = "access"
            resource = path
        
        story = {
            "id": f"US-{len(user_stories)+1}",
            "spec_id": f"SP-{sp_id}",
            "story": f"As a user, I want to {action} {resource}, so that I can manage {resource}.",
            "acceptance_criteria": [
                f"AC-1: Given a valid request, When I send {method} {path}, Then I get a 200/201 response",
                f"AC-2: Given an invalid request, When I send {method} {path}, Then I get a 4xx error with descriptive message",
            ],
            "method": method,
            "path": path,
        }
        user_stories.append(story)
        sp_id += 1
    
    # Infer from models
    for model in models[:10]:
        story = {
            "id": f"US-{len(user_stories)+1}",
            "spec_id": f"SP-{sp_id}",
            "story": f"As a system, I need a {model['name']} entity, so that data is persisted and queryable.",
            "acceptance_criteria": [
                f"AC-1: {model['name']} can be created with valid attributes",
                f"AC-2: {model['name']} can be retrieved by ID",
                f"AC-3: {model['name']} can be updated",
                f"AC-4: {model['name']} can be deleted",
            ],
            "model": model["name"],
        }
        user_stories.append(story)
        sp_id += 1
    
    # Functional requirements
    functional_reqs = []
    for i, us in enumerate(user_stories, 1):
        functional_reqs.append(f"FR-{i} ({us['spec_id']}): {us['story'].split(',')[0]}")
    
    # Non-functional requirements
    nfrs = [
        "NFR-1: p95 API latency < 200ms",
        "NFR-2: 99.9% availability (43.2 min/month downtime max)",
        "NFR-3: All endpoints require authentication (except login/register)",
        "NFR-4: HTTPS only (redirect HTTP)",
        "NFR-5: Structured JSON logging with trace_id",
    ]
    
    # Edge cases
    edge_cases = [
        "EC-1: Database unavailable → return 503 with retry-after header",
        "EC-2: Invalid authentication token → return 401 with error code INVALID_TOKEN",
        "EC-3: Rate limit exceeded → return 429 with Retry-After header",
        "EC-4: Request body validation fails → return 422 with field-level errors",
        "EC-5: External API timeout → return 504 with fallback if available",
    ]
    
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "project_name": readme["name"],
        "overview": readme["description"],
        "dependencies": deps["dependencies"],
        "routes": routes,
        "models": models,
        "existing_tests": tests,
        "user_stories": user_stories,
        "functional_requirements": functional_reqs,
        "non_functional_requirements": nfrs,
        "edge_cases": edge_cases,
        "spec_item_count": sp_id - 1,
    }


def write_spec_md(spec: dict, output_dir: Path):
    """Write spec.md."""
    md = f"""# {spec['project_name']} — Specification

> Generated by OmniProject AI v17.1 spec_generator on {spec['generated_at']}
> This is the **single source of truth**. Code is its shadow.

## Overview
{spec['overview']}

## User Stories
"""
    for us in spec["user_stories"]:
        md += f"""
### {us['id']}: {us['story'].split(',')[0]}
**{us['story']}**

**Acceptance Criteria:**
"""
        for ac in us["acceptance_criteria"]:
            md += f"- {ac}\n"
        md += f"\n**Spec ID:** {us['spec_id']}\n"
    
    md += "\n## Functional Requirements\n"
    for fr in spec["functional_requirements"]:
        md += f"- {fr}\n"
    
    md += "\n## Non-Functional Requirements\n"
    for nfr in spec["non_functional_requirements"]:
        md += f"- {nfr}\n"
    
    md += "\n## Edge Cases\n"
    for ec in spec["edge_cases"]:
        md += f"- {ec}\n"
    
    md += f"\n## Dependencies\n"
    for dep in spec["dependencies"]:
        md += f"- {dep}\n"
    
    md += f"\n## Detected Routes ({len(spec['routes'])})\n"
    md += "| Method | Path | File |\n|--------|------|------|\n"
    for r in spec["routes"]:
        md += f"| {r['method']} | {r['path']} | {r['file']} |\n"
    
    md += f"\n## Detected Models ({len(spec['models'])})\n"
    for m in spec["models"]:
        md += f"- {m['name']} ({m['file']})\n"
    
    md += f"\n## Existing Tests ({len(spec['existing_tests'])})\n"
    for t in spec["existing_tests"]:
        md += f"- {t['name']} ({t['file']})\n"
    
    md += f"\n---\n**Total Spec Items:** {spec['spec_item_count']}\n"
    
    (output_dir / "spec.md").write_text(md, encoding="utf-8")


def write_plan_md(spec: dict, output_dir: Path):
    """Write plan.md."""
    md = f"""# {spec['project_name']} — Implementation Plan

> Generated from spec.md on {spec['generated_at']}

## Architecture
```
[Inferred from project structure — update with actual diagram]
```

## Route Map
| Method | Path | Spec Ref |
|--------|------|----------|
"""
    for us in spec["user_stories"]:
        if "method" in us and "path" in us:
            md += f"| {us['method']} | {us['path']} | {us['spec_id']} |\n"
    
    md += "\n## Component Tree\n"
    md += "```\nsrc/\n"
    for m in spec["models"]:
        md += f"  {m['name'].lower()}/  # {m['name']} model\n"
    md += "```\n"
    
    (output_dir / "plan.md").write_text(md, encoding="utf-8")


def write_tasks_md(spec: dict, output_dir: Path):
    """Write tasks.md."""
    md = f"""# {spec['project_name']} — Tasks

> Generated from spec.md on {spec['generated_at']}
> Every task references a spec item (SP-N).

## Phase 1: Setup
- [ ] T1: Initialize project structure (S) [SP-0]
- [ ] T2: Set up Docker + compose (M) [SP-0] depends: T1
- [ ] T3: Configure CI/CD (M) [SP-0] depends: T2

## Phase 2: Models & Migrations
"""
    task_id = 4
    for us in spec["user_stories"]:
        if "model" in us:
            md += f"- [ ] T{task_id}: Create {us['model']} model + migration (S) [{us['spec_id']}] depends: T2\n"
            task_id += 1
    
    md += "\n## Phase 3: Services & API\n"
    for us in spec["user_stories"]:
        if "method" in us:
            md += f"- [ ] T{task_id}: Implement {us['method']} {us['path']} (M) [{us['spec_id']}] depends: T3\n"
            task_id += 1
    
    md += "\n## Phase 4: Tests\n"
    for us in spec["user_stories"]:
        md += f"- [ ] T{task_id}: Write tests for {us['spec_id']} (S) [{us['spec_id']}] depends: T{task_id-1}\n"
        task_id += 1
    
    md += f"\n## Phase 5: Documentation\n- [ ] T{task_id}: Generate API docs (M) [SP-0] depends: all\n"
    md += f"\n## Phase 6: Deployment\n- [ ] T{task_id+1}: Set up staging deploy (M) [SP-0] depends: all\n"
    
    (output_dir / "tasks.md").write_text(md, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Generate spec.md, plan.md, tasks.md from any project.")
    parser.add_argument("path", nargs="?", default=".", help="Project root path")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of files")
    args = parser.parse_args()
    
    root = Path(args.path).resolve()
    spec = generate_spec(root)
    
    if args.json:
        print(json.dumps(spec, indent=2))
        return 0
    
    # Write files
    write_spec_md(spec, root)
    write_plan_md(spec, root)
    write_tasks_md(spec, root)
    
    print(f"✓ Generated: spec.md, plan.md, tasks.md")
    print(f"  Project: {spec['project_name']}")
    print(f"  Spec items: {spec['spec_item_count']}")
    print(f"  User stories: {len(spec['user_stories'])}")
    print(f"  Routes detected: {len(spec['routes'])}")
    print(f"  Models detected: {len(spec['models'])}")
    print(f"  Existing tests: {len(spec['existing_tests'])}")
    print(f"  Dependencies: {len(spec['dependencies'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
