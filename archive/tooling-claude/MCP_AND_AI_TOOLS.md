# MCP and AI Tools — Ibn Al-Azhar Docs

## Purpose

This document tracks AI tools and MCP servers used by the project.

## Installed / configured

### Claude Code

Primary coding agent environment.

### Spec Kit

Used for spec-driven development and phase discipline.

### Impeccable

Used for design critique, polish, and product/design alignment.

### CodeRabbit

Prepared for GitHub pull request review using `.coderabbit.yaml`.

### Playwright MCP

Used for browser inspection and UI verification.

### Context7 MCP

Used for library/documentation lookup.

### Sequential Thinking MCP

Used for structured reasoning.

## Planned

### TestSprite MCP

Status: planned, not activated.

Purpose:

- AI-assisted test planning.
- Test generation.
- Test execution support.
- Structured testing feedback inside Claude Code.

Activation requirements:

- TestSprite account.
- TestSprite API key.
- Project has local tooling foundation.
- No API key committed to Git.

Expected Claude Code MCP command pattern:

```bash
claude mcp add TestSprite -- npx @testsprite/testsprite-mcp@latest

Environment:

API_KEY should be supplied securely, not committed.
Security rules
MCP tools can expand the agent attack surface.
Never add MCP servers from unknown sources without review.
Never paste API keys into committed files.
Prefer project-scoped MCP configuration when possible.
Review tool permissions before enabling automatic actions.
Do not give MCP tools write permissions unless needed.
Do not let testing tools create product code before Phase 1 is locked.
```
