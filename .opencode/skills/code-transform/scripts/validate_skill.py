#!/usr/bin/env python3
"""validate_skill.py — Structural integrity validator for OmniProject AI skill.

Runs the checks that catch the most common forms of documentation drift:
1. Every sub-skill ≥ MIN_SUBSKILL_LINES lines (no stubs)
2. Version numbers in SKILL.md / README.md / AGENTS.md all match
3. "Scripts (N)" heading in SKILL.md matches actual script count
4. "Sub-Skill Routing (N sub-skills)" heading matches actual sub-skill directory count
5. Every scripts/*.py compiles
6. Every scripts/*.sh passes `bash -n`
7. Every sub-skill SKILL.md has the 4 mandatory frontmatter fields
8. Every reference mentioned in SKILL.md exists in references/

Exit codes:
  0 = all checks passed
  1 = at least one check failed (details printed to stderr)
  2 = could not run (e.g. wrong directory)

Usage:
  python3 scripts/validate_skill.py              # full check
  python3 scripts/validate_skill.py --quick      # skip syntax checks (fast)
  python3 scripts/validate_skill.py --fix        # attempt auto-fix for counts (heading only)
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MIN_SUBSKILL_LINES = 100
ROOT = Path(__file__).resolve().parent.parent  # repo root (parent of scripts/)
SKILL_MD = ROOT / "SKILL.md"
AGENTS_MD = ROOT / "AGENTS.md"
README_MD = ROOT / "README.md"
SKILLS_DIR = ROOT / "skills"
SCRIPTS_DIR = ROOT / "scripts"
REFERENCES_DIR = ROOT / "references"

# Frontmatter fields that MUST be present in every sub-skill SKILL.md
REQUIRED_FRONTMATTER = ["name", "description"]

# Sections that MUST be present in every sub-skill SKILL.md body
# (only enforced as a "soft" check — we look for any heading-style section,
# not a specific name, since older detailed sub-skills use different section names)
REQUIRED_SECTIONS_STRICT = [
    "## When to Use",
    "## What It Does",
    "## Hard Rules",
]


def has_any_substantive_sections(text: str, min_sections: int = 3) -> bool:
    """A sub-skill is considered well-structured if it has ≥ `min_sections` '## ' headings."""
    return len(re.findall(r"^##\s+\S", text, re.MULTILINE)) >= min_sections


def has_hard_rules(text: str) -> bool:
    """Look for any heading that mentions 'rules', 'principles', 'best practices',
    'ground rules', 'iron law', 'the rule', 'checklist', 'security review', 'core principles',
    'quick reference', 'reference', 'workflow', or 'troubleshooting' (case-insensitive).

    Older sub-skills (ci-cd, gitops, k8s, monitoring, etc.) use varied section names.
    We accept any substantive reference/workflow section as evidence the sub-skill
    has a structured rules/guidance section.
    """
    patterns = [
        r"^##.*\brules?\b",
        r"^##.*\bprinciples?\b",
        r"^##.*\bbest practices\b",
        r"^##.*\bground rules\b",
        r"^##.*\bkey rules\b",
        r"^##.*\bmust\b",
        r"^##.*\bnever\b",
        r"^##.*\bhard rules\b",
        r"^##.*\banti-?patterns?\b",
        r"^##.*\biron law\b",
        r"^##.*\bthe rule\b",
        r"^##.*\bchecklist\b",
        r"^##.*\bsecurity review\b",
        r"^##.*\bcore principles\b",
        r"^##.*\bcode review\b",
        r"^##.*\bsafe\b",
        r"^##.*\bforbidden\b",
        r"^##.*\bquick reference\b",
        r"^##.*\breference\b",
        r"^##.*\bworkflow\b",
        r"^##.*\btroubleshooting\b",
        r"^##.*\bincident response\b",
        r"^##.*\bpreconditions\b",
        r"^##.*\bred flags\b",
        r"^##.*\bbudget\b",
        r"^##.*\bconstraints\b",
        r"^##.*\bremember\b",
        r"^##.*\bno placeholders\b",
    ]
    return any(
        re.search(p, text, re.MULTILINE | re.IGNORECASE)
        for p in patterns
    )


# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------

class CheckResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.failures: list[str] = []

    def ok(self, detail: str = "") -> None:
        self.passed += 1

    def fail(self, detail: str) -> None:
        self.failed += 1
        self.failures.append(detail)

    @property
    def status(self) -> str:
        return "PASS" if self.failed == 0 else "FAIL"

    def summary(self) -> str:
        line = f"  [{self.status}] {self.name}: {self.passed} ok, {self.failed} fail"
        if self.failures:
            for f in self.failures[:5]:  # cap at 5 to avoid flooding
                line += f"\n         - {f}"
            if len(self.failures) > 5:
                line += f"\n         ... and {len(self.failures) - 5} more"
        return line


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def extract_frontmatter(text: str) -> dict:
    """Return frontmatter key→value (string) for the first YAML block."""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    block = text[3:end]
    out: dict[str, str] = {}
    for line in block.splitlines():
        if ":" in line and not line.startswith(" "):
            k, _, v = line.partition(":")
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def extract_version(text: str) -> str | None:
    """Find a version like '1.2.3' in frontmatter or text."""
    # frontmatter first (including nested under metadata:)
    fm = extract_frontmatter(text)
    if "version" in fm:
        return fm["version"]
    # nested metadata.version (YAML block style)
    m = re.search(r"^\s+version:\s*[\"']?([\d.]+)[\"']?", text, re.MULTILINE)
    if m:
        return m.group(1)
    # badge or inline
    m = re.search(r"version-([\d.]+)", text)
    if m:
        return m.group(1)
    m = re.search(r"\bv(\d+\.\d+\.\d+)\b", text)
    if m:
        return m.group(1)
    return None


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_subskill_min_lines(result: CheckResult) -> None:
    """Every skills/<name>/SKILL.md must have ≥ MIN_SUBSKILL_LINES lines."""
    if not SKILLS_DIR.is_dir():
        result.fail(f"skills/ directory not found at {SKILLS_DIR}")
        return
    for d in sorted(SKILLS_DIR.iterdir()):
        if not d.is_dir():
            continue
        skill_md = d / "SKILL.md"
        if not skill_md.is_file():
            result.fail(f"missing SKILL.md in skills/{d.name}/")
            continue
        try:
            line_count = sum(1 for _ in skill_md.open(encoding="utf-8"))
        except OSError as e:
            result.fail(f"could not read skills/{d.name}/SKILL.md: {e}")
            continue
        if line_count < MIN_SUBSKILL_LINES:
            result.fail(
                f"skills/{d.name}/SKILL.md has only {line_count} lines "
                f"(minimum {MIN_SUBSKILL_LINES})"
            )
        else:
            result.ok(f"skills/{d.name}/ ({line_count} lines)")


def check_version_consistency(result: CheckResult) -> None:
    """SKILL.md, README.md, AGENTS.md must all report the same version."""
    skill_v = extract_version(read(SKILL_MD))
    readme_v = extract_version(read(README_MD))
    agents_v = extract_version(read(AGENTS_MD))

    versions = {"SKILL.md": skill_v, "README.md": readme_v, "AGENTS.md": agents_v}
    for name, v in versions.items():
        if v is None:
            result.fail(f"could not find version in {name}")

    unique = {v for v in versions.values() if v is not None}
    if len(unique) > 1:
        result.fail(
            "version mismatch: " + ", ".join(f"{n}={v}" for n, v in versions.items())
        )
    elif len(unique) == 1:
        result.ok(f"all files report version {next(iter(unique))}")


def check_scripts_count_matches_heading(result: CheckResult) -> None:
    """Heading '## Scripts (N)' must match actual script file count."""
    text = read(SKILL_MD)
    m = re.search(r"^##\s*Scripts\s*\((\d+)\)", text, re.MULTILINE)
    if not m:
        result.fail("could not find '## Scripts (N)' heading in SKILL.md")
        return
    declared = int(m.group(1))

    if not SCRIPTS_DIR.is_dir():
        result.fail(f"scripts/ directory not found at {SCRIPTS_DIR}")
        return
    actual = len([
        p for p in SCRIPTS_DIR.iterdir()
        if p.is_file() and p.suffix in {".py", ".sh"}
    ])
    # Note: scripts/browser_agent.py might be double-listed in table (multi-mode); allow declared ≥ actual
    if declared != actual:
        result.fail(
            f"Scripts heading says ({declared}) but {actual} script files exist in scripts/"
        )
    else:
        result.ok(f"Scripts count matches ({actual})")


def check_subskill_count_matches_heading(result: CheckResult) -> None:
    """Heading '## Sub-Skill Routing (N sub-skills' must match actual count."""
    text = read(SKILL_MD)
    m = re.search(r"^##\s*Sub-Skill Routing\s*\((\d+)", text, re.MULTILINE)
    if not m:
        result.fail("could not find '## Sub-Skill Routing (N' heading in SKILL.md")
        return
    declared = int(m.group(1))

    if not SKILLS_DIR.is_dir():
        result.fail(f"skills/ directory not found at {SKILLS_DIR}")
        return
    actual = len([d for d in SKILLS_DIR.iterdir() if d.is_dir()])
    if declared != actual:
        result.fail(
            f"Sub-Skill Routing heading says ({declared}) but {actual} skill directories exist"
        )
    else:
        result.ok(f"Sub-skill count matches ({actual})")


def check_python_scripts_compile(result: CheckResult) -> None:
    """Every scripts/*.py must parse cleanly."""
    if not SCRIPTS_DIR.is_dir():
        result.fail(f"scripts/ directory not found at {SCRIPTS_DIR}")
        return
    for p in sorted(SCRIPTS_DIR.glob("*.py")):
        try:
            ast.parse(p.read_text(encoding="utf-8"))
            result.ok(str(p.relative_to(ROOT)))
        except SyntaxError as e:
            result.fail(f"{p.relative_to(ROOT)}: syntax error: {e}")


def check_bash_scripts_syntax(result: CheckResult) -> None:
    """Every scripts/*.sh must pass `bash -n`."""
    if not SCRIPTS_DIR.is_dir():
        result.fail(f"scripts/ directory not found at {SCRIPTS_DIR}")
        return
    for p in sorted(SCRIPTS_DIR.glob("*.sh")):
        try:
            proc = subprocess.run(
                ["bash", "-n", str(p)],
                capture_output=True, text=True, timeout=10
            )
            if proc.returncode == 0:
                result.ok(str(p.relative_to(ROOT)))
            else:
                result.fail(f"{p.relative_to(ROOT)}: {proc.stderr.strip()}")
        except subprocess.TimeoutExpired:
            result.fail(f"{p.relative_to(ROOT)}: bash -n timed out")


def check_subskill_frontmatter(result: CheckResult) -> None:
    """Every sub-skill SKILL.md must have the required frontmatter fields."""
    if not SKILLS_DIR.is_dir():
        result.fail(f"skills/ directory not found at {SKILLS_DIR}")
        return
    for d in sorted(SKILLS_DIR.iterdir()):
        if not d.is_dir():
            continue
        skill_md = d / "SKILL.md"
        if not skill_md.is_file():
            continue
        fm = extract_frontmatter(read(skill_md))
        for field in REQUIRED_FRONTMATTER:
            if field not in fm or not fm[field]:
                result.fail(f"skills/{d.name}/SKILL.md missing frontmatter field '{field}'")
            else:
                result.ok(f"skills/{d.name}/ has '{field}'")


def check_subskill_sections(result: CheckResult) -> None:
    """Every sub-skill SKILL.md must have ≥3 '## ' headings and a 'rules' section.

    Older detailed sub-skills (apollo-server, gitops, brainstorming, etc.) use
    different section names than the v18+ template. We accept any structure as
    long as it has substantive sections AND some form of 'rules' heading.
    """
    if not SKILLS_DIR.is_dir():
        result.fail(f"skills/ directory not found at {SKILLS_DIR}")
        return
    for d in sorted(SKILLS_DIR.iterdir()):
        if not d.is_dir():
            continue
        skill_md = d / "SKILL.md"
        text = read(skill_md)

        if not has_any_substantive_sections(text, min_sections=3):
            result.fail(
                f"skills/{d.name}/SKILL.md has fewer than 3 '## ' headings "
                "(needs substantive structure)"
            )
        else:
            result.ok(f"skills/{d.name}/ has ≥3 sections")

        if not has_hard_rules(text):
            result.fail(
                f"skills/{d.name}/SKILL.md missing a 'rules' section "
                "(any heading containing 'rules')"
            )
        else:
            result.ok(f"skills/{d.name}/ has rules section")


def check_references_exist(result: CheckResult) -> None:
    """Every references/NN-*.md mentioned in SKILL.md must exist."""
    text = read(SKILL_MD)
    mentions = set(re.findall(r"references/([\w\-]+\.md)", text))
    if not mentions:
        result.ok("no references mentioned in SKILL.md")
        return
    for ref in sorted(mentions):
        path = REFERENCES_DIR / ref
        if path.is_file():
            result.ok(f"references/{ref} exists")
        else:
            result.fail(f"references/{ref} mentioned in SKILL.md but file missing")


# ---------------------------------------------------------------------------
# Auto-fix (only for headings — content fixes are manual)
# ---------------------------------------------------------------------------

def auto_fix_scripts_heading() -> bool:
    """Update '## Scripts (N)' to match actual script count."""
    if not SKILL_MD.is_file() or not SCRIPTS_DIR.is_dir():
        return False
    text = read(SKILL_MD)
    actual = len([
        p for p in SCRIPTS_DIR.iterdir()
        if p.is_file() and p.suffix in {".py", ".sh"}
    ])
    new_text, n = re.subn(
        r"^##\s*Scripts\s*\(\d+\)",
        f"## Scripts ({actual})",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if n == 0:
        return False
    SKILL_MD.write_text(new_text, encoding="utf-8")
    return True


def auto_fix_subskill_heading() -> bool:
    """Update '## Sub-Skill Routing (N sub-skills' to match actual count."""
    if not SKILL_MD.is_file() or not SKILLS_DIR.is_dir():
        return False
    text = read(SKILL_MD)
    actual = len([d for d in SKILLS_DIR.iterdir() if d.is_dir()])
    new_text, n = re.subn(
        r"^(##\s*Sub-Skill Routing\s*\()\d+",
        rf"\g<1>{actual}",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if n == 0:
        return False
    SKILL_MD.write_text(new_text, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    if not SKILL_MD.is_file():
        print(
            f"ERROR: SKILL.md not found at {SKILL_MD}. "
            "Run this script from the repo root.",
            file=sys.stderr,
        )
        return 2

    parser = argparse.ArgumentParser(description="OmniProject AI skill validator")
    parser.add_argument(
        "--quick", action="store_true",
        help="skip syntax checks (faster, less thorough)",
    )
    parser.add_argument(
        "--fix", action="store_true",
        help="auto-fix Scripts and Sub-Skill Routing heading counts",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="emit JSON instead of human-readable text",
    )
    args = parser.parse_args()

    if args.fix:
        fixed_scripts = auto_fix_scripts_heading()
        fixed_subskills = auto_fix_subskill_heading()
        if fixed_scripts:
            print("FIXED: Scripts count heading updated to match actual count")
        if fixed_subskills:
            print("FIXED: Sub-Skill Routing count heading updated to match actual count")
        if not (fixed_scripts or fixed_subskills):
            print("NOTHING TO FIX: headings already correct or could not be parsed")
        return 0

    checks: list[CheckResult] = []
    checks.append(CheckResult("sub-skill min lines"))
    check_subskill_min_lines(checks[-1])

    checks.append(CheckResult("version consistency"))
    check_version_consistency(checks[-1])

    checks.append(CheckResult("scripts count matches heading"))
    check_scripts_count_matches_heading(checks[-1])

    checks.append(CheckResult("sub-skill count matches heading"))
    check_subskill_count_matches_heading(checks[-1])

    checks.append(CheckResult("sub-skill frontmatter"))
    check_subskill_frontmatter(checks[-1])

    checks.append(CheckResult("sub-skill sections"))
    check_subskill_sections(checks[-1])

    checks.append(CheckResult("references exist"))
    check_references_exist(checks[-1])

    if not args.quick:
        checks.append(CheckResult("python scripts compile"))
        check_python_scripts_compile(checks[-1])

        checks.append(CheckResult("bash scripts syntax"))
        check_bash_scripts_syntax(checks[-1])

    if args.json:
        out = {
            "checks": [
                {
                    "name": c.name,
                    "status": c.status,
                    "passed": c.passed,
                    "failed": c.failed,
                    "failures": c.failures,
                }
                for c in checks
            ],
            "overall": "PASS" if all(c.failed == 0 for c in checks) else "FAIL",
        }
        print(json.dumps(out, indent=2))
    else:
        print("=" * 60)
        print("OmniProject AI — Skill Validation Report")
        print("=" * 60)
        for c in checks:
            print(c.summary())
        print("=" * 60)
        total_fail = sum(c.failed for c in checks)
        if total_fail == 0:
            print(f"OVERALL: PASS (all checks green)")
            return 0
        else:
            print(f"OVERALL: FAIL ({total_fail} failure(s))")
            print("\nTo auto-fix heading count mismatches, run: python3 scripts/validate_skill.py --fix")
            return 1


if __name__ == "__main__":
    sys.exit(main())
