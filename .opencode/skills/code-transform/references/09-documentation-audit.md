# Documentation Audit — ADRs, API Docs, README, Inline

> Read this during Dimension 9 (Documentation) of the AUDIT phase.

## Audit Checklist

```
[ ] Is there a README that explains: what, how to run, how to test?
[ ] Are there ADRs for significant architectural decisions?
[ ] Is the API documented (OpenAPI/Swagger for REST, GraphQL schema)?
[ ] Are inline comments explaining WHY (not WHAT)?
[ ] Are architecture diagrams as code (Mermaid, PlantUML)?
[ ] Is there a CONTRIBUTING.md?
[ ] Is there a CHANGELOG?
[ ] Are deprecated features marked with deprecation notices?
```

## ADR (Architecture Decision Record)

### Template
```markdown
# ADR-[N]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-[N]]

## Context
[Why is this decision needed? What's the problem?]

## Decision
[What did we decide?]

## Consequences
[Positive: what benefits?]
[Negative: what costs/risks?]
[Neutral: what's neutral but notable?]

## Alternatives Considered
[What else was considered? Why was it rejected?]

## References
[Links to relevant resources, discussions, issues]
```

### When to Write an ADR
- Choosing a framework (React vs Vue, Django vs Flask)
- Choosing an architecture (monolith vs microservices)
- Choosing a data store (Postgres vs MongoDB)
- Introducing a new pattern (CQRS, event sourcing)
- Making a significant technology choice

## API Documentation

### OpenAPI (Swagger)
```yaml
# openapi.yaml
openapi: 3.0.0
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        '404':
          description: User not found
```

### Check
- API docs are auto-generated from schema (not manually written)
- Interactive docs available (Swagger UI, Redoc)
- Examples for every endpoint
- Error responses documented with error codes

## README Quality

A good README answers:
1. **What is this?** (1 paragraph)
2. **Why does it exist?** (1 paragraph)
3. **How do I run it?** (exact commands)
4. **How do I test it?** (exact commands)
5. **Where is the architecture documented?** (link to ADRs, diagrams)
6. **Who owns it?** (team, contact)
7. **How do I contribute?** (link to CONTRIBUTING.md)

## Inline Comments

### Good Comments (explain WHY)
```python
# NOTE: We skip empty items because the downstream API rejects them (see issue #1234)
items = [i for i in raw_items if i.valid]

# HACK: Stripe API returns 200 even on auth failure (bug report #5678)
if response.status_code == 200 and "error" in response.json():
    raise AuthError("Stripe auth failed despite 200")
```

### Bad Comments (explain WHAT — code should be self-explanatory)
```python
# Increment i by 1
i += 1

# Loop through users
for user in users:
    ...
```

## Summary

- **README**: what, why, run, test, architecture, owner, contribute
- **ADRs**: for every significant architectural decision. Template: Status, Context, Decision, Consequences, Alternatives.
- **API docs**: auto-generated from OpenAPI/GraphQL schema. Interactive (Swagger UI).
- **Inline comments**: WHY not WHAT. Delete WHAT comments. Keep WHY comments.
- **Diagrams**: as code (Mermaid, PlantUML), in the repo, version-controlled.
- **Documentation improvements are `docs:` commits**.
