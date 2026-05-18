# AI Provider Strategy — Ibn Al-Azhar Docs

## Status

Tooling policy document.

This document defines how AI providers may be used while building Ibn Al-Azhar Docs.

## Provider lanes

### Lane A — Trusted production/repository automation

Use only trusted providers for tasks that can read or modify repository files.

Allowed:

- Official Anthropic access
- OpenRouter with a project-owned API key and strict spending limits
- Other explicitly approved Anthropic-compatible gateways after testing

Rules:

- No secrets in prompts.
- No user data in prompts.
- No private credentials in repository files.
- No automatic deployment.
- No production implementation before Phase 1 is locked.

### Lane B — Experimental non-Anthropic Claude Code backends

Purpose:
Use Claude Code's interface with non-Anthropic models for low-cost experimentation.

Examples:

- OpenRouter free or low-cost models
- OpenCode Zen / Z.AI compatible gateways
- Local Anthropic-compatible routers

Rules:

- Must be tested with read-only prompts first.
- Must pass tool-use smoke tests before file editing.
- Must not be used for final security decisions.
- Must not receive secrets.
- Must not be treated as Anthropic Claude.

### Lane C — Local/private fallback

Purpose:
Use local models for non-sensitive review and drafting.

Examples:

- Ollama
- LM Studio
- local coding models

Rules:

- Prefer for privacy-sensitive draft review.
- Do not assume Claude-level quality.
- Human review required.

## Required smoke tests

Before using any provider for repository work:

1. Connection test:
   - Ask the model to reply with a fixed short phrase.

2. Read-only repository test:
   - Read README.md only.
   - Summarize in 5 bullets.
   - Do not edit files.

3. Tool-use test:
   - Run `git status --short`.
   - Report output.
   - Do not edit files.

4. Minimal edit test:
   - Edit a temporary scratch file only.
   - Show diff.
   - Revert or delete scratch file.

## Recommended operating mode

- Documentation drafting: OpenRouter/Zen low-cost models are allowed after smoke tests.
- Architecture decisions: prefer strongest available model and human review.
- Security/privacy decisions: require human review and trusted provider.
- Phase 1 implementation: only after GO/CONDITIONAL GO decision.

## Forbidden

- Trial abuse or bypassing provider limits.
- Unknown free proxies for private repository work.
- Sending API keys, auth tokens, cookies, or credentials to any model.
- Committing provider secrets.
- Using non-Anthropic models while claiming they are Anthropic.
