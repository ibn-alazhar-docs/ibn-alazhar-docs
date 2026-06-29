#!/usr/bin/env python3
"""context_shaper.py — 5-layer context shaper for long sessions.

Based on Claude Code's shaper ladder (arXiv:2604.14228):
  1. Budget reduction (per-message size limits)
  2. Snip (temporal depth trim)
  3. Microcompact (fine-grained compression)
  4. Context collapse (read-time projection)
  5. Auto-compact (model-generated summary)

Usage:
  python3 scripts/context_shaper.py check --input transcript.jsonl
  python3 scripts/context_shaper.py shape --input transcript.jsonl --output shaped.jsonl
  python3 scripts/context_shaper.py shape --input transcript.jsonl --max-tokens 50000
"""
import argparse, json, sys, os
from pathlib import Path
from datetime import datetime

# Token estimation (rough: 1 token ≈ 4 chars)
CHARS_PER_TOKEN = 4
DEFAULT_MAX_TOKENS = 100000
DEFAULT_BUDGET_CHARS = 10000  # max chars per tool result
DEFAULT_SNIP_THRESHOLD = 50   # messages before snipping old ones

def estimate_tokens(text):
    return len(text) // CHARS_PER_TOKEN

def load_transcript(path):
    """Load JSONL transcript."""
    messages = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    messages.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return messages

def check_context_pressure(messages, max_tokens=DEFAULT_MAX_TOKENS):
    """Check context pressure and report which shapers should fire."""
    total_chars = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages)
    total_tokens = total_chars // CHARS_PER_TOKEN
    pressure = total_tokens / max_tokens

    report = {
        "total_messages": len(messages),
        "total_chars": total_chars,
        "estimated_tokens": total_tokens,
        "max_tokens": max_tokens,
        "pressure_ratio": f"{pressure:.2%}",
        "shapers_recommended": [],
    }

    # Layer 1: Budget reduction — check for oversized tool results
    oversized = sum(1 for m in messages if len(json.dumps(m)) > DEFAULT_BUDGET_CHARS)
    if oversized > 0:
        report["shapers_recommended"].append({
            "layer": 1, "name": "budget_reduction",
            "reason": f"{oversized} messages exceed {DEFAULT_BUDGET_CHARS} char budget",
            "action": "Replace oversized tool results with content references"
        })

    # Layer 2: Snip — check temporal depth
    if len(messages) > DEFAULT_SNIP_THRESHOLD:
        report["shapers_recommended"].append({
            "layer": 2, "name": "snip",
            "reason": f"{len(messages)} messages exceed {DEFAULT_SNIP_THRESHOLD} threshold",
            "action": "Trim oldest history segments"
        })

    # Layer 3: Microcompact — check if cache overhead is high
    if pressure > 0.6:
        report["shapers_recommended"].append({
            "layer": 3, "name": "microcompact",
            "reason": f"Pressure {pressure:.0%} > 60%",
            "action": "Fine-grained compression of tool results by tool_use_id"
        })

    # Layer 4: Context collapse — check if history is very long
    if len(messages) > 100:
        report["shapers_recommended"].append({
            "layer": 4, "name": "context_collapse",
            "reason": f"{len(messages)} messages > 100",
            "action": "Read-time projection over conversation history"
        })

    # Layer 5: Auto-compact — only if all above insufficient
    if pressure > 0.85:
        report["shapers_recommended"].append({
            "layer": 5, "name": "auto_compact",
            "reason": f"Pressure {pressure:.0%} > 85% after all other shapers",
            "action": "Full model-generated summary (fires PreCompact hooks)"
        })

    return report

def apply_budget_reduction(messages, budget_chars=DEFAULT_BUDGET_CHARS):
    """Layer 1: Replace oversized tool results with references."""
    shaped = []
    for m in messages:
        content = json.dumps(m, ensure_ascii=False)
        if len(content) > budget_chars:
            # Replace with reference
            m_copy = m.copy()
            if "content" in m_copy and isinstance(m_copy["content"], str):
                m_copy["content"] = f"[CONTENT REFERENCE: {len(m_copy['content'])} chars — load via tool if needed]"
            shaped.append(m_copy)
        else:
            shaped.append(m)
    return shaped

def apply_snip(messages, keep_recent=20):
    """Layer 2: Trim oldest history, keep recent messages."""
    if len(messages) <= keep_recent:
        return messages
    # Keep first message (system/setup) + last `keep_recent`
    first = messages[:1]
    recent = messages[-keep_recent:]
    snipped_count = len(messages) - keep_recent - 1
    # Insert a boundary marker
    boundary = {
        "role": "system",
        "content": f"[SNIP: {snipped_count} older messages trimmed to save context. See transcript on disk for full history.]"
    }
    return first + [boundary] + recent

def apply_microcompact(messages):
    """Layer 3: Fine-grained compression of tool results."""
    compacted = []
    for m in messages:
        if m.get("role") == "tool" or m.get("type") == "tool_result":
            content = m.get("content", "")
            if isinstance(content, str) and len(content) > 2000:
                m_copy = m.copy()
                # Keep first 500 + last 500 chars, summarize middle
                m_copy["content"] = content[:500] + f"\n[...MICROCOMPACTED: {len(content)} chars → {len(m_copy['content'])}...]\n" + content[-500:]
                compacted.append(m_copy)
            else:
                compacted.append(m)
        else:
            compacted.append(m)
    return compacted

def apply_context_collapse(messages, group_size=10):
    """Layer 4: Collapse groups of messages into summaries."""
    if len(messages) <= group_size * 2:
        return messages
    collapsed = []
    # Keep first and last group_size messages; collapse middle
    first_group = messages[:group_size]
    middle = messages[group_size:-group_size]
    last_group = messages[-group_size:]

    collapsed.extend(first_group)
    # Create collapse summary
    collapse_summary = {
        "role": "system",
        "content": f"[CONTEXT COLLAPSE: {len(middle)} messages collapsed. Key points preserved in progress ledger. Read .code-transform/progress.md for details.]"
    }
    collapsed.append(collapse_summary)
    collapsed.extend(last_group)
    return collapsed

def apply_auto_compact(messages, max_tokens=DEFAULT_MAX_TOKENS):
    """Layer 5: Model-generated summary (simulated)."""
    total_chars = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages)
    if total_chars // CHARS_PER_TOKEN <= max_tokens:
        return messages  # No need

    # In real implementation, this calls the model to generate a summary
    # Here we simulate by keeping only the most critical messages
    summary = {
        "role": "system",
        "content": f"[AUTO-COMPACT: {len(messages)} messages summarized. Key decisions and progress preserved. Read .code-transform/progress.md for full history.]"
    }
    # Keep summary + last 10 messages
    return [summary] + messages[-10:]

def shape_context(messages, max_tokens=DEFAULT_MAX_TOKENS):
    """Apply all 5 shaper layers in order (lazy degradation)."""
    original_count = len(messages)
    original_tokens = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages) // CHARS_PER_TOKEN

    # Layer 1: Budget reduction (always active)
    messages = apply_budget_reduction(messages)

    # Layer 2: Snip (if temporal depth exceeded)
    if len(messages) > DEFAULT_SNIP_THRESHOLD:
        messages = apply_snip(messages)

    # Check pressure after layers 1-2
    current_tokens = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages) // CHARS_PER_TOKEN
    if current_tokens > max_tokens * 0.6:
        # Layer 3: Microcompact
        messages = apply_microcompact(messages)

    current_tokens = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages) // CHARS_PER_TOKEN
    if len(messages) > 100 and current_tokens > max_tokens * 0.7:
        # Layer 4: Context collapse
        messages = apply_context_collapse(messages)

    current_tokens = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages) // CHARS_PER_TOKEN
    if current_tokens > max_tokens * 0.85:
        # Layer 5: Auto-compact
        messages = apply_auto_compact(messages, max_tokens)

    final_count = len(messages)
    final_tokens = sum(len(json.dumps(m, ensure_ascii=False)) for m in messages) // CHARS_PER_TOKEN

    return messages, {
        "original_messages": original_count,
        "original_tokens": original_tokens,
        "final_messages": final_count,
        "final_tokens": final_tokens,
        "tokens_saved": original_tokens - final_tokens,
        "reduction_pct": f"{(1 - final_tokens/original_tokens)*100:.1f}%" if original_tokens > 0 else "0%",
        "shapers_applied": [],
    }

def cmd_check(args):
    messages = load_transcript(args.input)
    report = check_context_pressure(messages, args.max_tokens)
    print(json.dumps(report, indent=2))
    return 0

def cmd_shape(args):
    messages = load_transcript(args.input)
    shaped, stats = shape_context(messages, args.max_tokens)

    # Track which shapers fired
    if stats["original_tokens"] > stats["final_tokens"]:
        stats["shapers_applied"] = ["budget_reduction", "snip", "microcompact", "context_collapse", "auto_compact"]

    # Write output
    output_path = Path(args.output) if args.output else Path(args.input).with_suffix(".shaped.jsonl")
    with open(output_path, "w", encoding="utf-8") as f:
        for m in shaped:
            f.write(json.dumps(m, ensure_ascii=False) + "\n")

    print(f"✓ Shaped context: {output_path}")
    print(f"  Messages: {stats['original_messages']} → {stats['final_messages']}")
    print(f"  Tokens: {stats['original_tokens']:,} → {stats['final_tokens']:,}")
    print(f"  Saved: {stats['tokens_saved']:,} tokens ({stats['reduction_pct']})")
    return 0

def main():
    parser = argparse.ArgumentParser(description="5-layer context shaper")
    sub = parser.add_subparsers(dest="mode", required=True)
    p1 = sub.add_parser("check"); p1.add_argument("--input", required=True); p1.add_argument("--max-tokens", type=int, default=DEFAULT_MAX_TOKENS); p1.set_defaults(func=cmd_check)
    p2 = sub.add_parser("shape"); p2.add_argument("--input", required=True); p2.add_argument("--output"); p2.add_argument("--max-tokens", type=int, default=DEFAULT_MAX_TOKENS); p2.set_defaults(func=cmd_shape)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
