# INTAKE.md — Project Intake & Context Capture

## 1. Project Identity
- **Project name**: [e.g., "Acme E-commerce Backend"]
- **Repository**: [git URL]
- **Date**: [YYYY-MM-DD]

## 2. Goal — What Does "Perfect" Mean Here?
**Primary goal** (pick ONE):
- [ ] Ship-ready — correctness + stability > elegance
- [ ] Maintainability — onboarding faster, reducing bug rate
- [ ] Scalability — preparing for 10x growth
- [ ] Security/compliance — passing audit (SOC2, PCI, HIPAA)
- [ ] Modernization — replacing legacy stack
- [ ] Cost reduction — efficiency focus
- [ ] Developer velocity — CI slow, tests flaky, deploys painful

**NON-goals**: [what we will NOT optimize for]

## 3. Constraints — What We Cannot Break
### Hard Constraints (violation = rollback + escalation)
- **Public API**: [e.g., "v1 API consumers depend on /users/{id} shape"]
- **Database**: [e.g., "expand/contract; no destructive migrations"]
- **Deployment window**: [e.g., "Tue-Thu 10am-2pm EST; no Friday"]
- **Release deadline**: [e.g., "launch 2025-03-15"]
- **Budget**: [e.g., "$X for new infra"]
- **Compliance**: [e.g., "PCI scope; SOC2 audit trails"]

### Soft Constraints
- [e.g., "prefer not to add new dependencies"]

→ All hard constraints mirrored in CONSTRAINTS.md.

## 4. Business Context
- **What does this system do?**: [1-2 sentences]
- **Who uses it?**: [user segments + volume]
- **Cost of downtime**: [e.g., "~$5k/hour"]
- **Critical paths** (3-5 journeys that MUST work):
  1. [e.g., "Customer places order → payment → confirmation"]
  2. [...]
- **Sensitive data**: [PII, PCI, etc.]

## 5. Team Context
- **Team size**: [e.g., "4 backend, 2 frontend, 1 SRE"]
- **Skill level**: [Junior / Mid / Senior / Mixed]
- **Test culture**: [e.g., "tests exist but no one trusts them"]

## 6. Current State
- **Tech stack**: [e.g., "Python 3.11 + FastAPI + SQLAlchemy + Postgres 15"]
- **Codebase size**: [N files, N lines]
- **Known pain points**:
  1. [e.g., "Tests are flaky"]
  2. [e.g., "Deploy takes 45 minutes"]

## 7. Success Criteria — How We Know We're Done
- [ ] Coverage: [e.g., ">80% on critical paths"]
- [ ] Mutation score: [e.g., ">70% on auth/payment"]
- [ ] Performance: [e.g., "p95 < 200ms"]
- [ ] Deploy time: [e.g., "< 10 minutes"]
- [ ] Flaky tests: [e.g., "0 in last 30 days"]
- [ ] Security: [e.g., "0 critical/high findings"]

## 8. Risk Tolerance
- [ ] **Conservative** — small, safe, incremental
- [ ] **Balanced** (default) — medium transforms, verify critical paths
- [ ] **Aggressive** — large refactors, faster progress

## Sign-Off
- [ ] User reviewed this intake
- [ ] Constraints accurate and complete
- [ ] Success criteria measurable
- [ ] Ready to proceed to CENSUS
