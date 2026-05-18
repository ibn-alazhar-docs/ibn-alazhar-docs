---
name: ibn-qa-check
description: Use this skill when reviewing feature completeness, acceptance criteria, tests, Playwright flows, unit tests, integration tests, and launch readiness.
---

# Ibn Al-Azhar Docs QA Check Skill

Generate and review test coverage from specs.

## Required states

Every user-facing feature must define:
- loading
- empty
- success
- error
- permission denied where relevant
- mobile behavior
- RTL behavior

## Test layers

- unit tests
- integration tests
- e2e tests
- accessibility checks
- smoke tests

## Output

Return:
- Acceptance criteria
- Test cases
- Missing states
- E2E flows
- Risks before GO
