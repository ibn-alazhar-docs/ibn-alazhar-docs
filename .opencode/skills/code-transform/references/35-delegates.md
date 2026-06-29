# Sub-Skills — Built-in Project Manager Capabilities

> All 14 sub-skills have FULL content embedded in `skills/<name>/SKILL.md`. No external installation needed.
> Sources credited below; content adapted and integrated into our 9-phase workflow.

## Sub-Skill Catalog

### 1. using-code-transform (Bootstrap)
- **Path**: `skills/using-code-transform/SKILL.md`
- **Source**: ours (based on obra/superpowers pattern)
- **Invoked at**: Session start + after every compaction
- **What it does**: 1% rule, rationalization red flags, instruction priority, 9-phase summary

### 2. debug-entry (Systematic Debugging)
- **Path**: `skills/debug-entry/SKILL.md`
- **Source**: obra/superpowers `systematic-debugging`
- **Invoked at**: Phase 4 (bug/test failure trigger)
- **What it does**: 4-phase root cause analysis. Iron Law: no fix without RCA.

### 3. tdd (Test-Driven Development)
- **Path**: `skills/tdd/SKILL.md`
- **Source**: obra/superpowers `test-driven-development`
- **Invoked at**: Phase 4 (new code needed)
- **What it does**: Red-green-refactor. Iron Law: no production code without failing test.

### 4. review-gate (Code Review)
- **Path**: `skills/review-gate/SKILL.md`
- **Source**: obra/superpowers `requesting-code-review`
- **Invoked at**: Phase 5 (VERIFY)
- **What it does**: Dispatch reviewer subagent with git-SHA context. Severity-gated blocking.

### 5. frontend-bridge (Frontend Design)
- **Path**: `skills/frontend-bridge/SKILL.md`
- **Source**: anthropics `frontend-design`
- **Invoked at**: Phase 4 (UI redesign)
- **What it does**: Design-lead persona. Anti-AI-slop. Distinctive palettes, type, layout.

### 6. webapp-testing (Browser E2E)
- **Path**: `skills/webapp-testing/SKILL.md`
- **Source**: anthropics `webapp-testing`
- **Invoked at**: Phase 6 (E2E execution)
- **What it does**: Real-browser testing with Playwright. Screenshot, click, fill, assert.

### 7. containerize (Docker)
- **Path**: `skills/containerize/SKILL.md`
- **Source**: wrsmith108/claude-code-docker-skill
- **Invoked at**: Phase 4 (no Dockerfile)
- **What it does**: Dockerfile authoring, compose, .dockerignore, multi-stage builds.

### 8. ci-cd (CI/CD Pipelines)
- **Path**: `skills/ci-cd/SKILL.md`
- **Source**: ahmedasmar/devops-claude-skills
- **Invoked at**: Phase 8 (ROLLOUT)
- **What it does**: GitHub Actions / GitLab CI pipeline creation, analysis, optimization.

### 9. k8s (Kubernetes)
- **Path**: `skills/k8s/SKILL.md`
- **Source**: ahmedasmar/devops-claude-skills
- **Invoked at**: Phase 8 (K8s deployment)
- **What it does**: K8s troubleshooting, manifest authoring, namespace debugging.

### 10. monitoring (Observability Setup)
- **Path**: `skills/monitoring/SKILL.md`
- **Source**: ahmedasmar/devops-claude-skills
- **Invoked at**: Phase 7 (OBSERVABILITY)
- **What it does**: Prometheus, Grafana, alerting, dashboard setup.

### 11. db-design (Database/Postgres)
- **Path**: `skills/db-design/SKILL.md`
- **Source**: supabase/agent-skills
- **Invoked at**: Phase 4 (DB schema/migration)
- **What it does**: Postgres best practices: query perf, connection mgmt, schema, RLS, concurrency.

### 12. owasp-security (Deep Security)
- **Path**: `skills/owasp-security/SKILL.md`
- **Source**: agamm/claude-code-owasp
- **Invoked at**: Phase 2 Dim 4 (security depth)
- **What it does**: OWASP Top 10:2025, ASVS 5.0, LLM Top 10, Agentic AI security. 20+ languages.

### 13. mobile-router (Mobile/Expo)
- **Path**: `skills/mobile-router/SKILL.md`
- **Source**: expo/skills
- **Invoked at**: Phase 4 (mobile build)
- **What it does**: React Native/Expo: native UI, navigation, builds, store submission.

### 14. ship-router (Deployment Decision)
- **Path**: `skills/ship-router/SKILL.md`
- **Source**: ours
- **Invoked at**: Phase 8 (deployment routing)
- **What it does**: Decision tree: AWS→Terraform, K8s→manifests, Vercel→CLI, Docker→registry, Mobile→store.

### 15. api-contract (API Contract)
- **Path**: `skills/api-contract/SKILL.md`
- **Source**: ours
- **Invoked at**: Phase 4 (API contract missing)
- **What it does**: OpenAPI/GraphQL SDL generation, TypeScript types, contract testing.
