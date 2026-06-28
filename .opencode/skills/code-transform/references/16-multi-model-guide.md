# Multi-Model Guide — Claude, GPT, Qwen, GLM, DeepSeek, and More

> Read this when running the skill on non-Claude models. Skills are not model-portable for free — they need explicit guidance.

## Model-Specific Guidance

### Claude (Opus, Sonnet, Haiku)

- **Strong**: instruction following, long context (200k), code reasoning
- **Haiku note**: use Full Mode (not Lite); Haiku needs explicit checklists
- **Mode**: any mode works

### GPT-4 / GPT-4o / GPT-4o-mini (OpenAI)

- **Strong**: reasoning, code generation
- **GPT-4o-mini note**: like Haiku — needs explicit scaffolding
- **Mode**: any mode for GPT-4/4o; Full Mode for mini

### Qwen (Alibaba)

- **Strong**: Chinese-language code, good reasoning
- **Context**: 32k-128k. Be conservative with reference loading.
- **Note**: may interpret instructions differently. Re-run evals.
- **Mode**: Full Mode; load references one at a time

### DeepSeek (DeepSeek-V3, Coder)

- **Strong**: excellent code reasoning, competitive with GPT-4
- **Context**: 64k typically
- **Mode**: any mode

### GLM (Zhipu AI)

- **Strong**: multilingual, good code reasoning
- **Context**: 128k
- **Mode**: any mode. Viable cheaper alternative.

### Kimi (Moonshot)

- **Strong**: very long context (up to 2M)
- **Mode**: any mode; can load more references simultaneously

### Gemini (Google)

- **Strong**: multimodal, long context (1M+)
- **Mode**: any mode

### Llama (Meta, open-source)

- **Small models (7B-13B)**: need very explicit scaffolding. Full Mode only.
- **Large models (70B+)**: any mode
- **Note**: self-hosted; verify tool availability

### Weak Model General Rules

For any model under ~30B or "mini/haiku/flash" variant:

- **Always use Full Mode** (not Lite)
- **Load decision trees explicitly**
- **Use the Execution Checklist**
- **Prefer scripts** over judgment-based verification
- **Reduce Cognitive Load Budget** to 5 (not 8)
- **≤5-step procedures** — each step produces a verifiable artifact

## Tool Compatibility

| Tool           | Skill Location                 | Notes                 |
| -------------- | ------------------------------ | --------------------- |
| Claude Code    | `.claude/skills/`              | Full support          |
| Codex CLI      | `.codex/` or `.agents/skills/` | Uses AGENTS.md mirror |
| Cursor         | `.cursor/skills/`              | Full support          |
| GitHub Copilot | `.github/skills/`              | Via Copilot Chat      |
| Gemini CLI     | `.gemini/skills/`              | Full support          |
| Goose          | `.goose/skills/`               | Full support          |
| OpenCode       | `.opencode/skills/`            | Full support          |
| Others         | `.agents/skills/` (universal)  | Portable path         |

**Install**: `npx skills add <repo> --skill <name> --agent <tool>`

## CJK and Non-ASCII

- **Identifiers**: always ASCII (even if the language allows CJK)
- **Comments/strings**: can be CJK (UTF-8)
- **Line length**: CJK chars are "wide" (2 columns) — adjust limits
- **detect_smells.py**: handles CJK via Python 3 `\w` (Unicode-aware)
- **RTL (Arabic/Hebrew)**: put comments on their own lines to avoid misalignment

## AGENTS.md Mirror

For tools that prefer the flat format (Codex CLI, some Cursor configs), the `AGENTS.md` file provides a single-file summary. See `AGENTS.md` in the skill root.

## Summary

- **Skills are not model-portable for free**. Re-run evals on each target model.
- **Weak models**: Full Mode, explicit decision trees, scripts over judgment, 5-step procedures.
- **Tool compatibility**: 30+ tools support SKILL.md. Use `.agents/skills/` for portability.
- **CJK**: identifiers ASCII, comments can be CJK, adjust line length for wide chars.
- **AGENTS.md**: flat mirror for non-Claude tools.
