# TestSprite Setup — Ibn Al-Azhar Docs

## Status

Planned, not activated.

## Purpose

TestSprite will be used as an AI-assisted testing layer after local tooling is stable and before product implementation begins.

TestSprite must not be used to create product implementation code before Phase 1 is explicitly locked.

## Activation timing

Do not activate TestSprite until:

- TestSprite account exists.
- TestSprite API key is available.
- Local tooling foundation is committed.
- No secrets are staged.
- The project is ready for testing strategy work.
- Phase 1 testing boundaries are documented.

## Installation concept

TestSprite MCP Server is installed into Claude Code and requires a TestSprite API key.

## Claude Code installation pattern

```bash
claude mcp add TestSprite -- npx @testsprite/testsprite-mcp@latest
Environment variable

The MCP server expects an API key.

Use a local shell variable or Claude Code MCP environment configuration.

Example:

export TESTSPRITE_API_KEY="your-testsprite-api-key"

Do not commit this value.

Possible activation command
claude mcp add TestSprite --env API_KEY="$TESTSPRITE_API_KEY" -- npx @testsprite/testsprite-mcp@latest
First smoke prompt after activation

Inside Claude Code:

Use TestSprite to inspect this repository setup only. Do not create product tests yet. Do not modify files. Report whether the project is ready for future test planning.
Do not use yet for
Generating product tests
Running full E2E testing
Modifying source files
Creating implementation code
Expanding Phase 1 scope
Replacing local checks
Replacing human review
Future use cases

After Phase 1 is locked, TestSprite may help with:

Test planning.
Acceptance criteria validation.
UI flow testing ideas.
Regression test suggestions.
E2E scenario drafts.
QA coverage review.
Review rules

TestSprite output must be checked against:

CLAUDE.md
Spec Kit constitution
docs/tools/LOCAL_SETUP_CHECKLIST.md
docs/tools/SECRETS_POLICY.md
Phase 1 scope lock
Arabic-first requirements
RTL-first requirements
Docker-first local development
Security rules
Never commit the TestSprite API key.
Never paste the real API key into Markdown files.
Never put the real API key in .env.example.
Use local environment variables only.
Rotate the key if it is exposed.
