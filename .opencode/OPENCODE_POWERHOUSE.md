# OpenCode Powerhouse — Current State

> **Last Updated:** 2026-06-14

## Active Configuration

| المكون            | الحالة                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Skills**        | 340+ في `~/.agents/skills/` — تُحمّل تلقائياً حسب المجال                                                                                                       |
| **Subagents**     | 9 agents في `.opencode/agents/` — architect, code-reviewer, docker-auditor, docs-sync, frontend-polish, qa-lead, rtl-auditor, security-reviewer, spec-guardian |
| **MCP Servers**   | 5 مفعلة — postgres, filesystem, sequential-thinking, memory, playwright                                                                                        |
| **System Prompt** | `prompts/system/runtime-system-prompt.md` — **المصدر الوحيد** لتعليمات التشغيل                                                                                 |
| **Boot Sequence** | `BOOT_SEQUENCE.md` — bootstrap منظم                                                                                                                            |
| **Auto-pilot**    | مفيش حاجة يدوية — agent يقرأ SYSTEM.md → يتبع runtime-system-prompt.md → ينفذ                                                                                  |

## الملفات الأساسية

```
~/.config/opencode/
├── AGENTS.md           ← قواعد عالمية + توجيه نماذج
├── opencode.json        ← MCP servers + permissions
├── plugins/             ← caveman, rtk, notification, smart-compaction

.opencode/
├── SYSTEM.md            ← مدخل runtime (اقرأني أولاً)
├── BOOT_SEQUENCE.md     ← bootstrap
├── AGENT_RULES.md       ← تنسيق الوكلاء
├── WORKFLOW.md          ← سير العمل
├── prompts/system/
│   └── runtime-system-prompt.md  ← سلوك agent (المصدر الوحيد)
├── agents/              ← 9 subagents (ملف واحد لكل agent)
├── memory/              ← project, decisions, brand
├── skills/              ← مهارات المشروع
├── policies/            ← 7 سياسات
├── workflows/           ← spec, review, release
└── templates/           ← قوالب
```

## سير العمل التلقائي

```
prompt → SYSTEM.md → runtime-system-prompt.md
  → load skill → use MCP → deploy subagents → verify → done
```

## Key Decisions

- **لا** slash commands — agent يقرر كل شيء تلقائياً
- **لا** نماذج hardcoded — النسخة المجانية تدير النماذج
- **كل agent في ملف واحد** — تم دمج agents/core/ في agents/
- **ممنوع التكرار** — كل معلومة في مكان واحد بالضبط
