# Context Management — Handling Massive Codebases with Small Context Windows

> Read this when the codebase is >5 files or when the model has a small context window. The key insight: you don't need to read everything to transform something.

## Table of Contents

1. [The Progressive Disclosure Strategy](#the-progressive-disclosure-strategy)
2. [Sampling RECON](#sampling-recon)
3. [Grep-First Navigation](#grep-first-navigation)
4. [Context Summarization](#context-summarization)
5. [Artifact Persistence](#artifact-persistence)
6. [One Dimension Per Context Window](#one-dimension-per-context-window)

---

## The Progressive Disclosure Strategy

For a massive codebase (50+ files), never try to load everything. Use layered progressive disclosure:

```
Layer 0: Codebase Census (1 context window)
  → CODEBASE_PROFILE.md (files, lines, languages, framework)
  → Decides which dimensions to audit

Layer 1: Sampling RECON (1 context window per module)
  → Read entry points fully
  → Read signatures only of transitive code
  → Document what was NOT read

Layer 2: Dimension Audit (1 context window per dimension)
  → Load only files relevant to this dimension
  → Save findings to AUDIT_REPORT.md

Layer 3: Prioritization (1 context window)
  → Load AUDIT_REPORT.md (summaries, not full files)
  → Generate BLUEPRINT.md

Layer 4: Execution (1 context window per session)
  → Load BLUEPRINT.md + PROGRESS.md + target files only
  → Execute, verify, commit
  → Update PROGRESS.md
```

---

## Sampling RECON

For >5 files, don't read everything. Read strategically:

### What to Read Fully

- **Entry points**: the files the user asked about, or the main module being audited
- **Interfaces/protocols**: type definitions, API contracts
- **Configuration**: config files, env templates

### What to Read Signatures Only

- **Transitively-called functions**: read the signature + docstring, not the body
- **Helper utilities**: read the name + signature, not the implementation
- **Test files**: read the test names, not the assertions

### What to Skip (and Document)

- **Generated code**: ORM migrations, proto-generated code
- **Third-party code**: node_modules, vendor/, .venv
- **Unrelated features**: if auditing auth, skip the billing module

### Document What You Skipped

```markdown
## Sampling RECON — Read

- src/api/orders.py (full, 280 lines)
- src/services/order_service.py (signatures only, 12 methods)
- src/repositories/order_repo.py (signatures only, 8 methods)
- src/domain/order.py (full, 45 lines — domain models are small)

## Sampling RECON — Did NOT Read

- src/services/invoice_service.py (calls order_repo but unrelated to scope)
- src/utils/logger.py (called everywhere, no scope-specific logic)
- Tests (will read in testing audit dimension)
```

---

## Grep-First Navigation

Before reading any file, use `git grep` to find what you need:

### Find All Callers

```bash
# Who calls this function?
git grep -n "process_order\|placeOrder\|OrderService.place"
```

### Find All Imports of a Module

```bash
# Who imports the database module?
git grep -n "from.*db import\|import.*database\|require.*db"
```

### Find Security Patterns

```bash
# SQL injection risk: string concatenation in queries
git grep -n "f\"SELECT\|f'SELECT\|+ .*SELECT\|format.*SELECT"

# Secrets in code
git grep -n "password\s*=\s*['\"]\|api_key\s*=\s*['\"]"
```

### Find Layer Violations

```bash
# Services importing I/O
git grep -n "import sqlite3\|import requests\|from flask" -- "services/**"

# Models importing services
git grep -n "from.*service\|from.*controller" -- "models/**"
```

### Find Missing Error Handling

```bash
# Bare except / catch-all
git grep -n "except:\|except Exception"
```

**The principle**: one grep command can answer a question that would require reading 20 files. Always grep first.

---

## Context Summarization

After reading a file, summarize it in 3 sentences. Don't re-read it.

### Summarization Template

```
## File: src/services/order_service.py (287 lines)
Summary: OrderService is a god class with 8 responsibilities (CRUD, notifications,
reports, payments, sessions, discounts, address formatting, DB access).
Key finding: C1 Mixed Concerns — service does DB access directly (line 45),
sends emails (line 89), and calls Stripe API (line 134).
Action: Extract to OrderRepository + EmailClient + PaymentClient.
```

### When to Re-read

Only re-read if:

- You're about to modify the file (need exact line numbers)
- The summary is insufficient for the current task
- The file was modified since the summary was written

---

## Artifact Persistence

All findings, plans, and progress are saved to disk. The context window is for the CURRENT step, not the whole history.

### Artifacts

| Artifact              | When Created         | Purpose                                |
| --------------------- | -------------------- | -------------------------------------- |
| `CODEBASE_PROFILE.md` | Phase 0 (Census)     | Codebase overview                      |
| `AUDIT_REPORT.md`     | Phase 1 (Audit)      | Findings per dimension                 |
| `BLUEPRINT.md`        | Phase 2 (Prioritize) | Prioritized transformation plan        |
| `PROGRESS.md`         | Phase 3 (Execute)    | Session log (what's done, what's next) |
| `FINAL_REPORT.md`     | Phase 4 (Verify)     | Before/after comparison                |

### How to Use Artifacts

- **Start of session**: read `PROGRESS.md` and `BLUEPRINT.md` to know where you are
- **During session**: update `PROGRESS.md` after each transformation
- **End of session**: push artifacts to the repo; next session picks up from there

---

## One Dimension Per Context Window

Don't mix architecture audit with security audit with testing audit. Each dimension needs different files and different mental models.

### Per-Dimension File Loading

| Dimension     | Load These Files                                  | Don't Load                        |
| ------------- | ------------------------------------------------- | --------------------------------- |
| Architecture  | services/, repositories/, models/, controllers/   | tests/, frontend, scripts         |
| Database      | migrations/, schema files, repository files       | frontend, UI components           |
| Testing       | tests/, test config                               | production code (only signatures) |
| Security      | auth/, controllers/, middleware/, config          | frontend components               |
| Performance   | hot-path files, queries, bundle config            | tests, docs                       |
| UI/UX         | frontend components, styles, design tokens        | backend, database                 |
| Code Quality  | all source files (one at a time)                  | tests, docs, config               |
| DevOps        | .github/, Dockerfile, terraform/, docker-compose  | source code                       |
| Documentation | README, docs/, ADRs                               | source code                       |
| Full-Stack    | API contract, frontend API client, backend routes | internal implementation           |

---

## Weak Model Strategy

For models with small context windows (8K-32K tokens):

1. **Reduce scope per session**: instead of 8 transformations, do 3-5
2. **Load ONE reference at a time**: don't load all references
3. **Use scripts for mechanical work**: `detect_smells.py` instead of reading code to find smells
4. **Binary verification**: compiler pass/fail, test pass/fail — not "does this look good?"
5. **Decision trees**: every ambiguous decision is a yes/no tree
6. **PROGRESS.md is your memory**: it carries context the model can't hold

### If Context Window Fills Up

- Summarize current findings to `PROGRESS.md`
- Commit current work
- Start a new session (new context window)
- Read `PROGRESS.md` to resume

---

## Summary

- **Progressive disclosure**: census → sampling RECON → dimension audit → prioritize → execute
- **Sampling RECON**: read entry points fully, signatures only of transitive code, document what you skipped
- **Grep-first**: one grep answers questions that would require reading 20 files
- **Context summarization**: after reading a file, summarize in 3 sentences, don't re-read
- **Artifact persistence**: CODEBASE_PROFILE.md, AUDIT_REPORT.md, BLUEPRINT.md, PROGRESS.md, FINAL_REPORT.md
- **One dimension per context window**: don't mix architecture with security with testing
- **Weak models**: reduce scope, load one reference, use scripts, binary verification, decision trees
