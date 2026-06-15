# OpenCode Boot Sequence

## Startup Order

1. Load SYSTEM.md
2. Load governance/SOURCE_OF_TRUTH.md
3. Load governance/AI_AGENT_EXECUTION_CONTRACT.md
4. Load .opencode/context/runtime-source-of-truth.md
5. Load active phase context
6. Load active specs
7. Load MODEL_ROUTING.md
8. Load MCP_STACK.md
9. Load REVIEW_PIPELINE.md
10. Verify repository boundaries

## Active Phase

Current phase:
Phase 2C-2 — Tags

## Completed Phases

- Phase 1A–1D (Pipeline): ✅ OCR, cleanup, queue, export
- Phase 2A (Auth): ✅ NextAuth.js v5, JWT, roles
- Phase 2B-1 (Folders): ✅ 5-level hierarchy, soft-delete
- Phase 2B-2 (Document Org): ✅ Status lifecycle, listing, bulk
- Phase 2C-1 (Search): ✅ SQL full-text, suggestions

## Runtime Mode

- Spec-driven
- Docs-first
- RTL-first
- Docker-first
- Minimal-change policy
