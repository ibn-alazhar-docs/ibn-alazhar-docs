# 📚 Documentation Index — مستندات المشروع

This index organizes all project documentation for **Ibn Al-Azhar Docs**.
For the developer-facing overview, start with the [root README](../README.md) and the
canonical architecture document [`ARCHITECTURE.md`](../ARCHITECTURE.md) (Arabic).

---

## 🏛️ Architecture & Design

| Document                                                               | Description                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md)                                | **Canonical** — system architecture, data flow, layered layout, and core design decisions (Arabic). |
| [`ARCHITECTURE_CURRENT.md`](ARCHITECTURE_CURRENT.md)                   | Current-state English architecture summary (pipeline, layers, security, testing).                   |
| [`reference/SYSTEM_ARCHITECTURE.md`](reference/SYSTEM_ARCHITECTURE.md) | Detailed system architecture reference.                                                             |
| [`reference/CODEBASE_STRUCTURE.md`](reference/CODEBASE_STRUCTURE.md)   | Source tree and module structure reference.                                                         |
| [`reference/ARCHITECTURE_REVIEW.md`](reference/ARCHITECTURE_REVIEW.md) | Independent architecture review.                                                                    |
| [`ARCHITECTURE_CODE_REVIEW.md`](ARCHITECTURE_CODE_REVIEW.md)           | Code-level architecture review findings.                                                            |
| [`DESIGN-AUDIT-REPORT.md`](DESIGN-AUDIT-REPORT.md)                     | Frontend / UX design audit report.                                                                  |
| [Architecture Decision Records (`ADR/`)](ADR/)                         | 24 ADRs covering stack, hosting, OCR, auth, security, RTL, and more.                                |
| [RFCs (`architecture/rfcs/`)](architecture/rfcs/)                      | Request-for-comments design proposals.                                                              |

## 🔐 Security

| Document                                                         | Description                                     |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [`SECURITY_AUDIT_LOG.md`](SECURITY_AUDIT_LOG.md)                 | Security hardening log and resolved findings.   |
| [`governance/SECURITY_POLICY.md`](governance/SECURITY_POLICY.md) | Security policy for agents and contributors.    |
| [`audit/`](audit/)                                               | Comprehensive audit and implementation reports. |

## 🚀 Deployment & Operations

| Document                                                                                       | Description                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [`deployment/HF_DEPLOYMENT_GUIDE.md`](deployment/HF_DEPLOYMENT_GUIDE.md)                       | Free hosting on HuggingFace Spaces (Neon + Upstash). |
| [`DEPLOYMENT_PLAN.md`](DEPLOYMENT_PLAN.md)                                                     | Deployment plan and environment matrix.              |
| [`production/RUNBOOK.md`](production/RUNBOOK.md)                                               | Incident response runbook.                           |
| [`production/ALERTING_RULES.md`](production/ALERTING_RULES.md)                                 | Prometheus alerting definitions.                     |
| [`production/SECRETS_POLICY.md`](production/SECRETS_POLICY.md)                                 | Secrets management policy.                           |
| [`production/PRODUCTION_READINESS_CHECKLIST.md`](production/PRODUCTION_READINESS_CHECKLIST.md) | Pre-release readiness checklist.                     |
| [`production/FINAL_REPORT.md`](production/FINAL_REPORT.md)                                     | Final production-readiness report.                   |

## 🧪 Quality, Performance & Process

| Document                                                             | Description                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| [`PERFORMANCE_AUDIT_2026-06-26.md`](PERFORMANCE_AUDIT_2026-06-26.md) | Performance audit and recommendations.               |
| [`RESTRUCTURING_REPORT.md`](RESTRUCTURING_REPORT.md)                 | Layered restructuring report.                        |
| [`reference/CODE_STYLE_GUIDE.md`](reference/CODE_STYLE_GUIDE.md)     | Coding standards and conventions.                    |
| [`SOFT_DELETE_POLICY.md`](SOFT_DELETE_POLICY.md)                     | Soft-delete and retention policy.                    |
| [`planning/`](planning/)                                             | Project planning, phase summaries, and action items. |

## 🤖 Agent Governance

| Document                                                                                 | Description                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| [`governance/SOURCE_OF_TRUTH.md`](governance/SOURCE_OF_TRUTH.md)                         | Single source of truth definition.         |
| [`governance/AGENT_POLICY.md`](governance/AGENT_POLICY.md)                               | Policy governing AI agent execution.       |
| [`governance/AGENT_REFERENCE.md`](governance/AGENT_REFERENCE.md)                         | Reference for agents working in this repo. |
| [`governance/REPOSITORY_BOUNDARIES.md`](governance/REPOSITORY_BOUNDARIES.md)             | Allowed repository boundaries.             |
| [`governance/REVIEW_PIPELINE.md`](governance/REVIEW_PIPELINE.md)                         | Code-review pipeline.                      |
| [`governance/CHANGE_CONTROL.md`](governance/CHANGE_CONTROL.md)                           | Change-control process.                    |
| [`governance/EXECUTION_RULES.md`](governance/EXECUTION_RULES.md)                         | Agent execution rules.                     |
| [`governance/PHASE_LOCK_POLICY.md`](governance/PHASE_LOCK_POLICY.md)                     | Phase-lock policy.                         |
| [`governance/SPEC_AUTHORITY.md`](governance/SPEC_AUTHORITY.md)                           | Specification authority.                   |
| [`governance/AI_AGENT_EXECUTION_CONTRACT.md`](governance/AI_AGENT_EXECUTION_CONTRACT.md) | Agent execution contract.                  |
| [`governance/OPENCODE_FRAMEWORK.md`](governance/OPENCODE_FRAMEWORK.md)                   | OpenCode framework notes.                  |

## 🔌 API Reference

| Document                       | Description                               |
| ------------------------------ | ----------------------------------------- |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3 specification for the REST API. |

## 📘 Conversion Playbook (Arabic · RTL)

Seventh-book documentation of the full pipeline that turns scanned Arabic PDFs into a
print-ready book: PDF → text (Gemini) → Markdown → Word/PDF, plus the `jamea` authoring
factory and its quality gates.

| Document                                                             | Description                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`conversion-playbook/README.md`](conversion-playbook/README.md)     | Index, chapter map, and the governing numbers.                                     |
| [`01-the-full-journey.md`](conversion-playbook/01-the-full-journey.md) | The whole journey: timeline, layers, what was lost and recovered.                 |
| [`02-pdf-to-text-pipeline.md`](conversion-playbook/02-pdf-to-text-pipeline.md) | PDF→text pipeline: model pool, verbatim prompt, chunking, quotas, quality gates. |
| [`03-docx-engine.md`](conversion-playbook/03-docx-engine.md)         | The Word engine: RTL, styles, boxes, poetry, TOC, and its known defects.           |
| [`04-jamea-factory.md`](conversion-playbook/04-jamea-factory.md)     | The `jamea` factory: stages, disk gates, resume, per-lesson settings.              |
| [`05-issue-log.md`](conversion-playbook/05-issue-log.md)             | Issue log: symptom · root cause · fix · source (58 issues).                        |
| [`06-decisions-and-lessons.md`](conversion-playbook/06-decisions-and-lessons.md) | Architectural decisions, governance failures, and 40 extracted lessons. |
| [`07-appendices.md`](conversion-playbook/07-appendices.md)           | Glossary · path maps · number tables · ready commands · environment limits.        |

> **Note:** This section is authored in Arabic (right-to-left) on purpose — it documents an
> Arabic-first pipeline, and the Arabic text is the source of truth. File names, commands and
> code identifiers stay in Latin script.

## 🗄️ Archive

| Document               | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| [`archive/`](archive/) | Historical analysis and planning reports retained for reference. |

---

> **Note:** Documentation is kept in English except the canonical
> [`ARCHITECTURE.md`](../ARCHITECTURE.md), which is authored in Arabic to serve
> Arabic-first contributors and AI agents.
