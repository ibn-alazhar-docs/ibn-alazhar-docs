# Context Engineering — Managing the Context Window as a Public Good

> **Based on**: Anthropic "Effective Context Engineering for AI Agents" (Sep 2025) + Claude Code 5-layer shaper (arXiv:2604.14228).

## The Core Principle

> "Find the smallest set of high-signal tokens that maximize the likelihood of your desired outcome."

The context window is a **public good**. Your skill shares it with:

- System prompt
- Conversation history
- Other skills' metadata
- The actual request

## 3 Techniques for Long-Horizon Tasks

### 1. Compaction

Summarize conversation nearing context limit, reinitiate with summary + recent files.

**Tuning**: Maximize RECALL first (capture everything relevant), then iterate PRECISION (remove fluff).

**Lightest form**: tool result clearing (old tool outputs → references).

### 2. Structured Note-Taking (Agentic Memory)

Agent writes notes persisted OUTSIDE the context window (`NOTES.md`, `progress.md`, to-do list).

Pulled back into context at later times. After context resets, agent reads its own notes and continues.

### 3. Subagent Architectures

Specialized subagents handle focused tasks with clean context. Main agent coordinates; subagents explore (tens of thousands of tokens) but return only **1,000-2,000 token distilled summary**.

## Claude Code's 5-Layer Shaper Ladder

Runs before EVERY model call. Each layer at different cost-benefit; cheaper layers first.

| #   | Layer                | Trigger                        | What It Does                                                            |
| --- | -------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| 1   | **Budget reduction** | Always active                  | Per-message size limits on tool results; oversized → content references |
| 2   | **Snip**             | `HISTORY_SNIP` flag            | Lightweight trim of older history segments                              |
| 3   | **Microcompact**     | `CACHED_MICROCOMPACT`          | Fine-grained compression; time-based + cache-aware paths                |
| 4   | **Context collapse** | `CONTEXT_COLLAPSE`             | Read-time projection over history; does NOT mutate stored history       |
| 5   | **Auto-compact**     | After all 4 above insufficient | Full model-generated summary; fires PreCompact hooks                    |

**Lazy-degradation principle**: apply least disruptive compression first, escalate only when cheaper strategies prove insufficient.

**Compaction connection**: auto-compact fires `PreCompact` hooks, and the compaction event triggers `SessionStart` with matcher `compact`. This is why our bootstrap hook re-injects after compaction.

## Session Fork/Resume

- Transcripts are append-only JSONL files
- Compaction NEVER deletes old lines — only appends boundary/summary events
- Users can rewind, resume, or fork without losing prior work
- "Conversations Outlive Context" — transcript on disk records everything

## Sidechain Transcripts (Subagent Isolation)

```
.code-transform/sessions/<session-id>/
  ├── <subagent-id>/
  │   ├── transcript.jsonl    # full subagent conversation
  │   └── meta.json           # metadata
  └── parent.jsonl            # parent session (summary only from subagents)
```

- Each subagent writes its own transcript as separate file
- Parent sees ONLY the subagent's final response (1-2K tokens)
- Full subagent history NEVER enters parent's context
- Agent teams consume ~7× tokens of standard session — sidechain isolation is critical

## Just-in-Time Context Strategy

Maintain lightweight identifiers (file paths, stored queries, web links). Use them to dynamically load data at runtime via tools.

**Don't preload entire repos.** Use `head`/`tail`/`grep` to analyze large data without loading full objects.

## Right-Altitude Prompting

Goldilocks zone between:

- ❌ Hardcoded brittle if-else logic (too specific)
- ❌ Vague high-level guidance (too generic)
- ✅ Specific enough to guide behavior, flexible enough for model judgment

Use XML tags or Markdown headers to organize. Start with minimal prompt + best model, add instructions based on failure modes.

## Implementation in code-transform

### Context Shaper Script (`scripts/context_shaper.py`)

```bash
# Apply context shaping to a conversation transcript
python3 scripts/context_shaper.py shape --input transcript.jsonl --output shaped.jsonl

# Check context pressure
python3 scripts/context_shaper.py check --input transcript.jsonl
```

### Progress Ledger (compaction survival)

```
.code-transform/progress.md  ← append-only, survives compaction
```

### Subagent Dispatch

```bash
# Dispatch a subagent with sidechain transcript
python3 scripts/dispatch_subagent.py --task "audit security" --skill-phase 2 --output .code-transform/sessions/
```

## Anti-Patterns

1. ❌ Preloading entire codebase into context
2. ❌ Pasting subagent full history into parent
3. ❌ Relying on conversation memory after compaction
4. ❌ Single compaction step (no graduated compression)
5. ❌ No progress ledger (re-doing work after compaction)
6. ❌ Vague prompts at wrong altitude

## References

- Anthropic "Effective Context Engineering for AI Agents" (Sep 29, 2025)
- "Dive into Claude Code" (arXiv:2604.14228) — 5-layer shaper, sidechain transcripts
- `references/33-bootstrap-injection.md` — re-injection after compaction
- `scripts/context_shaper.py` — context shaping implementation
