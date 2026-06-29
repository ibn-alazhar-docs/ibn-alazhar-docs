#!/usr/bin/env python3
"""project_analyzer.py — Deep project analysis before any work begins.

Runs BEFORE Phase 1 CENSUS. Determines:
  - Project type (empty/web/api/mobile/cli/library/monorepo/fullstack)
  - Project size (trivial/small/medium/large/massive)
  - Tech stack (languages, frameworks, package managers, databases)
  - Health check (git? tests? docs? CI/CD? Docker? linting?)
  - Project age (new/mature/legacy/ancient)
  - Risk level (green/yellow/red)
  - Recommended starting phase

Usage:
  python3 scripts/project_analyzer.py [project-root]
  python3 scripts/project_analyzer.py . --json
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from datetime import datetime


def detect_project_type(root: Path) -> dict:
    """Detect what kind of project this is."""
    types = []

    # Empty?
    source_files = list(root.rglob("*"))
    source_files = [f for f in source_files if f.is_file()
                    and not any(x in f.parts for x in {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", "target"})]

    if len(source_files) <= 1:
        return {"type": "empty", "description": "Empty or near-empty project", "files": len(source_files)}

    # Web frontend
    if any((root / f).exists() for f in ["index.html", "public/index.html", "src/App.tsx", "src/App.jsx", "src/main.tsx"]):
        types.append("web-frontend")
    if any((root / f).exists() for f in ["next.config.js", "next.config.ts", "next.config.mjs"]):
        types.append("nextjs")
    if any((root / f).exists() for f in ["vue.config.js", "nuxt.config.js"]):
        types.append("vue")
    if (root / "angular.json").exists():
        types.append("angular")
    if (root / "svelte.config.js").exists():
        types.append("svelte")

    # Backend API
    if any((root / f).exists() for f in ["manage.py", "app.py", "main.py", "wsgi.py", "asgi.py"]):
        types.append("python-api")
    if any((root / f).exists() for f in ["package.json"]) and any((root / f).exists() for f in ["server.js", "app.js", "src/server.ts"]):
        types.append("node-api")
    if (root / "go.mod").exists() and any((root / f).exists() for f in ["main.go", "cmd"]):
        types.append("go-api")
    if (root / "Cargo.toml").exists() and any((root / f).exists() for f in ["src/main.rs"]):
        types.append("rust-api")

    # Mobile
    if (root / "app.json").exists() and "expo" in (root / "app.json").read_text(encoding="utf-8", errors="ignore").lower():
        types.append("expo-mobile")
    if (root / "android").is_dir() and (root / "ios").is_dir():
        types.append("react-native")
    if (root / "pubspec.yaml").exists():
        types.append("flutter")
    if (root / "Package.swift").exists():
        types.append("ios")
    if (root / "build.gradle").exists() or (root / "build.gradle.kts").exists():
        if not (root / "android").is_dir():
            types.append("android-native")

    # CLI
    if any((root / f).exists() for f in ["cli.py", "cli.js", "cmd/main.go", "src/cli.rs"]):
        types.append("cli")

    # Library
    if any((root / f).exists() for f in ["setup.py", "pyproject.toml"]) and not types:
        types.append("python-library")
    if (root / "Cargo.toml").exists() and "lib" in (root / "Cargo.toml").read_text(encoding="utf-8", errors="ignore"):
        types.append("rust-library")

    # Monorepo
    if (root / "lerna.json").exists() or (root / "nx.json").exists() or (root / "turbo.json").exists():
        types.append("monorepo")
    if (root / "pnpm-workspace.yaml").exists():
        types.append("monorepo")
    workspaces = []
    if (root / "package.json").exists():
        try:
            pkg = json.loads((root / "package.json").read_text())
            workspaces = pkg.get("workspaces", [])
        except: pass
    if workspaces:
        types.append("monorepo")

    # Full-stack (multiple surfaces)
    has_frontend = any(t in types for t in ["web-frontend", "nextjs", "vue", "angular", "svelte"])
    has_backend = any(t in types for t in ["python-api", "node-api", "go-api", "rust-api"])
    has_mobile = any(t in types for t in ["expo-mobile", "react-native", "flutter"])
    if (has_frontend and has_backend) or (has_backend and has_mobile) or (has_frontend and has_mobile):
        types.append("full-stack")

    # Docker
    if (root / "Dockerfile").exists() or (root / "docker-compose.yml").exists():
        types.append("dockerized")

    # Fallback
    if not types:
        py_files = list(root.rglob("*.py"))
        js_files = list(root.rglob("*.js")) + list(root.rglob("*.ts"))
        if py_files and not js_files:
            types.append("python-unknown")
        elif js_files and not py_files:
            types.append("javascript-unknown")
        else:
            types.append("unknown")

    return {"type": types[0] if len(types) == 1 else "full-stack", "all_types": types, "description": " + ".join(types)}


def detect_project_size(root: Path) -> dict:
    """Size the project."""
    EXCLUDE = {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", "target", ".next"}
    EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".kt", ".cs", ".rb", ".php", ".c", ".cpp", ".h", ".swift", ".m", ".dart"}
    total_files = 0
    total_lines = 0
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in EXTS:
            continue
        if any(x in p.parts for x in EXCLUDE):
            continue
        total_files += 1
        try:
            with open(p, encoding="utf-8", errors="ignore") as f:
                total_lines += sum(1 for _ in f)
        except: pass

    if total_files == 0:
        size = "empty"
    elif total_files <= 5:
        size = "trivial"
    elif total_files <= 20:
        size = "small"
    elif total_files <= 100:
        size = "medium"
    elif total_files <= 500:
        size = "large"
    else:
        size = "massive"

    return {"size": size, "source_files": total_files, "source_lines": total_lines}


def detect_stack(root: Path) -> dict:
    """Detect tech stack."""
    stack = {"languages": [], "frameworks": [], "package_managers": [], "databases": [], "tools": []}

    # Languages
    EXT_LANG = {".py": "Python", ".js": "JavaScript", ".ts": "TypeScript", ".go": "Go", ".rs": "Rust", ".java": "Java", ".cs": "C#", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift", ".dart": "Dart", ".cpp": "C++", ".c": "C"}
    EXCLUDE = {"node_modules", ".git", "venv", ".venv", "__pycache__"}
    lang_counts = {}
    for p in root.rglob("*"):
        if not p.is_file() or any(x in p.parts for x in EXCLUDE):
            continue
        lang = EXT_LANG.get(p.suffix.lower())
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1
    stack["languages"] = sorted(lang_counts.keys(), key=lambda x: -lang_counts[x])

    # Frameworks
    if (root / "package.json").exists():
        try:
            pkg = json.loads((root / "package.json").read_text())
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "next" in deps: stack["frameworks"].append("Next.js")
            if "react" in deps: stack["frameworks"].append("React")
            if "vue" in deps: stack["frameworks"].append("Vue")
            if "express" in deps: stack["frameworks"].append("Express")
            if "fastify" in deps: stack["frameworks"].append("Fastify")
            if "nestjs" in deps or "@nestjs/core" in deps: stack["frameworks"].append("NestJS")
            if "playwright" in deps: stack["frameworks"].append("Playwright")
            if "jest" in deps or "vitest" in deps: stack["frameworks"].append("Jest/Vitest")
            if "tailwindcss" in deps: stack["frameworks"].append("Tailwind CSS")
        except: pass
    if (root / "requirements.txt").exists() or (root / "pyproject.toml").exists():
        try:
            txt = ""
            for f in ["requirements.txt", "pyproject.toml"]:
                if (root / f).exists():
                    txt += (root / f).read_text(encoding="utf-8", errors="ignore")
            if "fastapi" in txt.lower(): stack["frameworks"].append("FastAPI")
            if "flask" in txt.lower(): stack["frameworks"].append("Flask")
            if "django" in txt.lower(): stack["frameworks"].append("Django")
            if "sqlalchemy" in txt.lower(): stack["frameworks"].append("SQLAlchemy")
            if "pytest" in txt.lower(): stack["frameworks"].append("pytest")
        except: pass

    # Package managers
    if (root / "package.json").exists():
        if (root / "pnpm-lock.yaml").exists(): stack["package_managers"].append("pnpm")
        elif (root / "yarn.lock").exists(): stack["package_managers"].append("yarn")
        else: stack["package_managers"].append("npm")
    if (root / "requirements.txt").exists() or (root / "pyproject.toml").exists():
        stack["package_managers"].append("pip")
    if (root / "go.mod").exists(): stack["package_managers"].append("go mod")
    if (root / "Cargo.toml").exists(): stack["package_managers"].append("cargo")
    if (root / "Gemfile").exists(): stack["package_managers"].append("bundler")
    if (root / "composer.json").exists(): stack["package_managers"].append("composer")

    # Databases
    for f in root.rglob("*"):
        if not f.is_file() or any(x in f.parts for x in EXCLUDE):
            continue
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")[:5000]
            if "postgresql" in content.lower() or "psycopg" in content.lower(): stack["databases"].append("PostgreSQL")
            if "mysql" in content.lower() or "pymysql" in content.lower(): stack["databases"].append("MySQL")
            if "mongodb" in content.lower() or "pymongo" in content.lower(): stack["databases"].append("MongoDB")
            if "sqlite" in content.lower(): stack["databases"].append("SQLite")
            if "redis" in content.lower(): stack["databases"].append("Redis")
        except: pass
    stack["databases"] = list(dict.fromkeys(stack["databases"]))

    # Tools
    if (root / "Dockerfile").exists(): stack["tools"].append("Docker")
    if (root / "docker-compose.yml").exists() or (root / "docker-compose.yaml").exists(): stack["tools"].append("Docker Compose")
    if (root / ".github" / "workflows").is_dir(): stack["tools"].append("GitHub Actions")
    if (root / ".gitlab-ci.yml").exists(): stack["tools"].append("GitLab CI")
    if (root / "terraform").is_dir() or any(f.suffix == ".tf" for f in root.rglob("*.tf")): stack["tools"].append("Terraform")
    if (root / "k8s").is_dir() or any(f.name.endswith(".yaml") and "kind:" in f.read_text(encoding="utf-8", errors="ignore")[:200] for f in root.rglob("*.yaml")): stack["tools"].append("Kubernetes")

    return stack


def health_check(root: Path) -> dict:
    """Check project health across 8 dimensions."""
    health = {}

    # Git
    try:
        r = subprocess.run(["git", "-C", str(root), "rev-parse", "--is-inside-work-tree"], capture_output=True, text=True, timeout=5)
        if r.returncode == 0:
            r2 = subprocess.run(["git", "-C", str(root), "log", "--oneline", "-1"], capture_output=True, text=True, timeout=5)
            r3 = subprocess.run(["git", "-C", str(root), "rev-list", "--count", "HEAD"], capture_output=True, text=True, timeout=5)
            health["git"] = {"status": "ok", "commits": int(r3.stdout.strip()) if r3.stdout.strip().isdigit() else 0}
        else:
            health["git"] = {"status": "missing", "recommendation": "Initialize: git init"}
    except:
        health["git"] = {"status": "missing", "recommendation": "Initialize: git init"}

    # Tests
    EXCLUDE = {"node_modules", ".git", "venv", ".venv", "__pycache__"}
    test_patterns = [r"^test_.*\.py$", r".*_test\.py$", r".*\.test\.[jt]sx?$", r".*\.spec\.[jt]sx?$", r".*_test\.go$", r".*Test\.java$"]
    test_files = []
    for p in root.rglob("*"):
        if not p.is_file() or any(x in p.parts for x in EXCLUDE):
            continue
        for pat in test_patterns:
            if re.match(pat, p.name):
                test_files.append(str(p))
                break
    if test_files:
        health["tests"] = {"status": "ok", "count": len(test_files)}
    else:
        health["tests"] = {"status": "missing", "recommendation": "No test files found. Phase 6 will generate tests."}

    # Documentation
    docs = []
    for name in ["README.md", "README.rst", "README.txt", "docs", "doc", "CONTRIBUTING.md", "CHANGELOG.md", "ARCHITECTURE.md"]:
        if (root / name).exists():
            docs.append(name)
    if docs:
        health["documentation"] = {"status": "ok", "files": docs}
    else:
        health["documentation"] = {"status": "missing", "recommendation": "No documentation. Phase 2 Dim 9 will flag this."}

    # CI/CD
    ci = []
    if (root / ".github" / "workflows").is_dir(): ci.append("GitHub Actions")
    if (root / ".gitlab-ci.yml").exists(): ci.append("GitLab CI")
    if (root / "Jenkinsfile").exists(): ci.append("Jenkins")
    if (root / ".circleci").is_dir(): ci.append("CircleCI")
    health["ci_cd"] = {"status": "ok" if ci else "missing", "tools": ci} if ci else {"status": "missing", "recommendation": "No CI/CD. Phase 8 will set up pipelines."}

    # Docker
    has_docker = (root / "Dockerfile").exists()
    has_compose = (root / "docker-compose.yml").exists() or (root / "docker-compose.yaml").exists()
    if has_docker or has_compose:
        health["docker"] = {"status": "ok", "dockerfile": has_docker, "compose": has_compose}
    else:
        health["docker"] = {"status": "missing", "recommendation": "No Docker. containerize sub-skill can create."}

    # Linting
    linting = []
    for f in [".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", "eslint.config.js", ".prettierrc", "ruff.toml", "pyproject.toml", ".flake8", ".rubocop.yml", ".golangci.yml"]:
        if (root / f).exists():
            linting.append(f)
    health["linting"] = {"status": "ok" if linting else "missing", "files": linting} if linting else {"status": "missing", "recommendation": "No linter config. Will be added in Phase 4."}

    # Security
    security_files = []
    if (root / ".env.example").exists(): security_files.append(".env.example")
    if any((root / f".env{x}").exists() for x in ["", ".local", ".production"]):
        health["security"] = {"status": "warn", "note": ".env file present — check if committed to git"}
    else:
        health["security"] = {"status": "ok" if security_files else "unknown", "note": "Run security_scan.sh for deep check"}

    # Dependencies
    dep_files = []
    for f in ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Cargo.toml", "Gemfile"]:
        if (root / f).exists():
            dep_files.append(f)
    health["dependencies"] = {"status": "ok" if dep_files else "missing", "files": dep_files} if dep_files else {"status": "missing", "recommendation": "No dependency file found."}

    return health


def detect_project_age(root: Path) -> dict:
    """Estimate project age from git history."""
    try:
        r = subprocess.run(["git", "-C", str(root), "log", "--format=%ai", "--reverse"], capture_output=True, text=True, timeout=10)
        if r.returncode != 0 or not r.stdout.strip():
            return {"age": "unknown", "first_commit": None, "last_commit": None}

        lines = r.stdout.strip().split("\n")
        first = lines[0].split()[0] if lines else None
        last = lines[-1].split()[0] if lines else None
        commits = len(lines)

        if commits <= 5:
            age = "new"
        elif commits <= 50:
            age = "young"
        elif commits <= 500:
            age = "mature"
        elif commits <= 2000:
            age = "established"
        else:
            age = "legacy"

        return {"age": age, "first_commit": first, "last_commit": last, "total_commits": commits}
    except:
        return {"age": "unknown", "first_commit": None, "last_commit": None, "total_commits": 0}


def assess_risk(health: dict, size: dict, age: dict) -> dict:
    """Assess overall project risk."""
    risk_score = 0
    reasons = []

    if health.get("git", {}).get("status") == "missing":
        risk_score += 30; reasons.append("No git repo")
    if health.get("tests", {}).get("status") == "missing":
        risk_score += 25; reasons.append("No tests")
    if health.get("documentation", {}).get("status") == "missing":
        risk_score += 15; reasons.append("No documentation")
    if health.get("ci_cd", {}).get("status") == "missing":
        risk_score += 15; reasons.append("No CI/CD")
    if health.get("docker", {}).get("status") == "missing":
        risk_score += 5; reasons.append("No Docker")
    if health.get("linting", {}).get("status") == "missing":
        risk_score += 5; reasons.append("No linter")
    if age.get("age") == "legacy":
        risk_score += 10; reasons.append("Legacy project (2000+ commits)")
    if size.get("size") in ["large", "massive"]:
        risk_score += 5; reasons.append(f"Large project ({size.get('source_files', 0)} files)")
    if health.get("security", {}).get("status") == "warn":
        risk_score += 10; reasons.append("Security concern (.env in repo?)")

    if risk_score >= 50:
        level = "red"
    elif risk_score >= 25:
        level = "yellow"
    else:
        level = "green"

    return {"level": level, "score": risk_score, "reasons": reasons}


def recommend_starting_phase(project_type: dict, health: dict, risk: dict, size: dict) -> dict:
    """Recommend where to start based on project state."""
    if project_type["type"] == "empty":
        return {
            "phase": "Phase 0 (INTAKE)",
            "reason": "Empty project — need to understand what we're building before anything else",
            "skip": ["Phase 1 CENSUS", "Phase 2 AUDIT"],
            "first_action": "Ask user: what are we building? What stack? What's the goal?"
        }

    if risk["level"] == "red":
        return {
            "phase": "Phase 0 (INTAKE) → Phase 1 (CENSUS) → Phase 2 (AUDIT)",
            "reason": f"High-risk project ({', '.join(risk['reasons'][:3])}). Need full assessment before any changes.",
            "skip": [],
            "first_action": "Initialize git if missing. Then full audit. Do NOT make changes until audit complete."
        }

    if size["size"] == "massive":
        return {
            "phase": "Phase 1 (CENSUS) → scope down",
            "reason": f"Massive project ({size['source_files']} files). Cannot transform everything at once.",
            "skip": [],
            "first_action": "Identify the highest-priority module. Ask user: which module causes the most pain?"
        }

    if health.get("tests", {}).get("status") == "missing" and health.get("git", {}).get("status") == "missing":
        return {
            "phase": "Emergency setup first",
            "reason": "No git AND no tests — this is a disaster waiting to happen",
            "skip": [],
            "first_action": "1. git init + initial commit (safety net). 2. Write characterization tests (golden master). 3. Then proceed to audit."
        }

    return {
        "phase": "Phase 0 (INTAKE) → Phase 1 (CENSUS) → Phase 2 (AUDIT)",
        "reason": "Standard flow — project has basics in place",
        "skip": [],
        "first_action": "Run INTAKE to capture goals and constraints"
    }


def analyze_project(root: Path) -> dict:
    """Full project analysis."""
    project_type = detect_project_type(root)
    size = detect_project_size(root)
    stack = detect_stack(root)
    health = health_check(root)
    age = detect_project_age(root)
    risk = assess_risk(health, size, age)
    recommendation = recommend_starting_phase(project_type, health, risk, size)

    return {
        "analyzed_at": datetime.now().isoformat(timespec="seconds"),
        "project_type": project_type,
        "size": size,
        "stack": stack,
        "health": health,
        "age": age,
        "risk": risk,
        "recommendation": recommendation,
    }


def main():
    parser = argparse.ArgumentParser(description="Deep project analysis before any work begins.")
    parser.add_argument("path", nargs="?", default=".", help="Project root path")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    result = analyze_project(root)

    if args.json:
        print(json.dumps(result, indent=2))
        return 0

    # Human-readable
    print("=" * 60)
    print("  Project Analysis")
    print("=" * 60)
    print(f"\n📊 Type: {result['project_type']['description']}")
    print(f"📏 Size: {result['size']['size']} ({result['size']['source_files']} files, {result['size']['source_lines']:,} lines)")
    print(f"🔤 Languages: {', '.join(result['stack']['languages']) or 'none detected'}")
    print(f"⚙️  Frameworks: {', '.join(result['stack']['frameworks']) or 'none detected'}")
    print(f"📦 Package managers: {', '.join(result['stack']['package_managers']) or 'none'}")
    print(f"🗄️  Databases: {', '.join(result['stack']['databases']) or 'none detected'}")
    print(f"🛠️  Tools: {', '.join(result['stack']['tools']) or 'none'}")
    print(f"📅 Age: {result['age']['age']} ({result['age'].get('total_commits', 0)} commits)")

    print(f"\n{'─' * 40}")
    print("HEALTH CHECK:")
    for key, val in result["health"].items():
        status = val.get("status", "unknown")
        icon = {"ok": "✅", "missing": "❌", "warn": "⚠️", "unknown": "❓"}.get(status, "❓")
        detail = ""
        if "count" in val: detail = f" ({val['count']} files)"
        elif "files" in val: detail = f" ({', '.join(val['files'])})"
        elif "recommendation" in val: detail = f" → {val['recommendation']}"
        elif "note" in val: detail = f" → {val['note']}"
        print(f"  {icon} {key}: {status}{detail}")

    print(f"\n{'─' * 40}")
    risk = result["risk"]
    icon = {"green": "🟢", "yellow": "🟡", "red": "🔴"}.get(risk["level"], "❓")
    print(f"RISK: {icon} {risk['level'].upper()} (score: {risk['score']})")
    for r in risk["reasons"]:
        print(f"  • {r}")

    print(f"\n{'─' * 40}")
    rec = result["recommendation"]
    print(f"📋 RECOMMENDED START: {rec['phase']}")
    print(f"   Reason: {rec['reason']}")
    if rec.get("skip"):
        print(f"   Skip: {', '.join(rec['skip'])}")
    print(f"   First action: {rec['first_action']}")

    print(f"\n{'=' * 60}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
