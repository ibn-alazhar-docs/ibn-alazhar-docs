# Tooling Stack — Ibn Al-Azhar Docs

## Current phase

Tooling and documentation setup only.

No product implementation should start until Phase 1 is explicitly locked.

## Core local tools

- Node.js 20.17.0
- pnpm 10.33.4
- Git
- Docker
- Docker Compose
- Python 3
- Claude Code
- Spec Kit
- Impeccable
- CodeRabbit configuration
- Playwright MCP
- Context7 MCP
- Sequential Thinking MCP

## Planned tools

- TestSprite MCP after account/API key is ready
- GitHub after project email is created
- CodeRabbit GitHub App after repository is pushed

## Source of truth

- `CLAUDE.md`: AI operating manual.
- `.specify/`: Spec Kit workflow infrastructure.
- `PRODUCT.md`: product strategy.
- `DESIGN.md`: visual/design direction.
- `.claude/skills/`: Claude Code skills source of truth.
- `.coderabbit.yaml`: CodeRabbit review configuration.
- `docs/tools/`: tooling documentation.

## Rules

- Do not commit secrets.
- Do not install random MCP servers without review.
- Prefer project-local configuration.
- Keep `.claude/skills` as Claude Code skill source of truth.
- Keep `.coderabbit.yaml` as CodeRabbit review source of truth.
- Keep `PRODUCT.md` and `DESIGN.md` as design/product source of truth.
- Do not start product implementation during tooling setup.
