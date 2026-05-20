# Tooling Readiness Review — Ibn Al-Azhar Docs

## Review date

2026-05-18

## Decision

READY FOR GITHUB SETUP

## Scope of this review

This review covers tooling, repository governance, AI-agent workflow, local quality checks, and planned external integrations.

This review does not approve product implementation.

## Current branch

`001-bootstrap-spec-kit`

## Local checks

The following local checks must pass before GitHub setup:

```bash
pnpm secrets:scan
pnpm typecheck
pnpm tools:doctor
pnpm format:check

Current expected status:

Secrets scan: pass
TypeScript typecheck: pass
Tooling doctor: pass
Prettier format check: pass
Tooling status
Git

Status: configured locally.

Notes:

Repository initialized.
Branch-based workflow is being used.
Current tooling branch is separate from main.
Node.js

Status: configured.

Expected version:

Node.js 20.17.0
pnpm

Status: configured.

Expected version:

pnpm 10.33.4
Docker

Status: available locally.

Purpose:

Docker-first local development.
Future PostgreSQL, Redis, MinIO, app, and worker services.
Claude Code

Status: configured.

Purpose:

Primary AI coding and repository operation environment.

Rules:

Do not start product implementation before Phase 1 is locked.
Follow CLAUDE.md.
Use project skills intentionally.
Spec Kit

Status: integrated.

Purpose:

Spec-driven development.
Phase discipline.
Constitution-based governance.

Rules:

Specs/plans/tasks must remain source-of-truth before implementation.
Do not bypass Spec Kit for major product work.
Impeccable

Status: installed and integrated.

Purpose:

Design critique.
UI polish.
Visual quality.
Product/design alignment.

Rules:

Must respect PRODUCT.md.
Must respect DESIGN.md.
Must respect Arabic-first and RTL-first requirements.
Must not produce generic SaaS UI.
CodeRabbit

Status: configured, not connected yet.

Purpose:

Automated GitHub pull request review.

Current files:

.coderabbit.yaml
docs/tools/CODERABBIT_REVIEW_GUIDE.md
.github/pull_request_template/default.md

Activation requirement:

GitHub repository must exist.
CodeRabbit GitHub App must be installed for this repository.
TestSprite

Status: planned, not activated.

Purpose:

Future AI-assisted testing workflow.

Current file:

docs/tools/TESTSPRITE_SETUP.md

Activation requirements:

TestSprite account.
TestSprite API key.
Key stored outside Git.
Phase/testing boundaries documented.
MCP tools

Status: documented.

Current categories:

Playwright MCP
Context7 MCP
Sequential Thinking MCP
Planned TestSprite MCP

Rules:

Do not add unknown MCP servers without review.
Do not commit MCP secrets.
Prefer project-scoped configuration.
Source-of-truth map
CLAUDE.md: AI operating manual.
.specify/: Spec Kit workflow infrastructure.
PRODUCT.md: product strategy.
DESIGN.md: design direction.
.claude/skills/: Claude Code skill source of truth.
.coderabbit.yaml: CodeRabbit review source of truth.
docs/tools/: tooling documentation.
docs/: project documentation package.
Security posture

Current baseline:

Real secrets must not be committed.
.env.example is allowed with placeholders only.
.env and .env.* are ignored except .env.example.
pnpm secrets:scan checks staged diffs.
External API keys must be stored outside Git.

Known limitations:

Secret scanning is a lightweight staged-diff scan.
A full historical secret scanner may be added later after GitHub setup.
GitHub secret scanning may be enabled after repository creation.
Formatting and quality baseline

Current baseline:

Prettier configured.
TypeScript strict baseline configured.
pnpm workspace configured.
Local doctor script configured.
Tooling placeholder exists only to allow TypeScript validation before product implementation.

Rules:

Do not run broad formatting on external generated tool assets unless intentionally reviewed.
Keep formatting noise low.
Keep commits small and meaningful.
What is intentionally not activated yet
GitHub remote
CodeRabbit GitHub App
TestSprite MCP
Production hosting
CI/CD
Product implementation
Database migrations
Next.js app initialization
Prisma schema implementation
shadcn/ui installation
Playwright test suite
Sentry/PostHog analytics
Why these are not activated yet

They require one or more of:

Project email
GitHub account/repository
External API key
Phase 1 lock
Product implementation start
Hosting decision
CI policy decision
Before creating GitHub repository

Required:

Working tree clean.
Local checks pass.
No secrets staged.
Project email created.
Repository name decided.
Visibility decided.
License decision made.
GitHub username/organization decided.

Recommended repository name:

ibn-al-azhar-docs

Before first GitHub push

Run:

git status --short
pnpm secrets:scan
pnpm typecheck
pnpm tools:doctor
pnpm format:check

Expected:

Clean working tree.
All checks pass.
Before connecting CodeRabbit

Required:

Repository pushed to GitHub.
.coderabbit.yaml exists in default branch or PR branch.
PR template exists.
No secrets in repository.
Before activating TestSprite

Required:

TestSprite account exists.
API key created.
API key stored outside Git.
MCP command reviewed.
Smoke test prompt used first.
No product tests generated before Phase 1 boundaries are clear.
Final decision

The tooling foundation is ready for GitHub setup.

This is not approval to begin product implementation.

Next recommended step:
Create the project email, create the GitHub account/repository, push the repository, then connect CodeRabbit.
```
