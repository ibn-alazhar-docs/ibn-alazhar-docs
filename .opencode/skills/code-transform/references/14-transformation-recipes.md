# Transformation Recipes — 27 Fowler + Improvement Recipes

> Read this during Phase 3 (EXECUTE). For pure refactoring, the refactor skill has the full 27 Fowler recipes. This reference adds improvement recipes (bug fixes, test writing, security fixes, performance fixes).

## Table of Contents

1. [Refactoring Recipes (Behavior-Preserving)](#refactoring-recipes-behavior-preserving)
2. [Improvement Recipes (Behavior-Changing)](#improvement-recipes-behavior-changing)
3. [Commit Message Conventions](#commit-message-conventions)

---

## Refactoring Recipes (Behavior-Preserving)

For the full 27 Fowler recipes, see the `refactor` skill's `references/03-refactor-recipes.md`. Key ones:

| Recipe                                   | When                | Commit Prefix |
| ---------------------------------------- | ------------------- | ------------- |
| R1 Extract Method                        | Long method         | `refactor:`   |
| R6 Replace Magic Literal                 | Magic numbers       | `refactor:`   |
| R7 Replace Conditional with Polymorphism | Long if/elif chains | `refactor:`   |
| R8 Guard Clauses                         | Deep nesting        | `refactor:`   |
| R9 Extract Class                         | God class           | `refactor:`   |
| R13 Replace Primitive with Object        | Primitive obsession | `refactor:`   |
| R16 Extract Layer                        | Mixed concerns      | `refactor:`   |
| R17 Introduce Repository Interface       | Untestable service  | `refactor:`   |

---

## Improvement Recipes (Behavior-Changing)

These recipes intentionally change behavior (fix bugs, add tests, improve security/performance). Use appropriate commit prefixes.

### IR1. Fix Bug (Scientific Debugging)

**When**: a bug is identified and confirmed.
**Commit prefix**: `fix:`
**Workflow**: see `references/12-debugging-methodology.md`

```python
# Before (bug: off-by-one in bulk discount)
if quantity > 100:
    total *= 0.9

# After (fixed: >= 100)
if quantity >= 100:
    total *= 0.9
```

```
fix: correct bulk discount boundary from >100 to >=100

The bulk discount was not applied for quantity exactly 100.
Changed > to >=. Added boundary tests for quantities 99, 100, 101.
```

### IR2. Add Missing Test

**When**: a function has no test or missing edge case tests.
**Commit prefix**: `test:`

```python
# Before: no test for the error path
def test_create_user_success(): ...

# After: add error path test
def test_create_user_with_duplicate_email_raises():
    repo = InMemoryUserRepository()
    repo.save(User(email="existing@example.com"))
    service = UserService(repo)
    with pytest.raises(DuplicateEmail):
        service.create("new@example.com".replace("new", "existing"))
```

```
test: add test for duplicate email error path
```

### IR3. Fix Security Vulnerability

**When**: a security issue is found (SQL injection, XSS, missing auth).
**Commit prefix**: `security:` or `fix:`

```python
# Before (SQL injection)
query = f"SELECT * FROM users WHERE name = '{name}'"

# After (parameterized)
query = "SELECT * FROM users WHERE name = ?"
db.execute(query, (name,))
```

```
security: parameterize SQL query to prevent injection
```

### IR4. Improve Performance

**When**: a performance bottleneck is identified.
**Commit prefix**: `perf:`

```python
# Before (N+1 queries)
for user in users:
    user.orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id)

# After (single JOIN)
results = db.query("""
    SELECT u.*, o.id as order_id, o.total as order_total
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
""")
```

```
perf: fix N+1 query in user order loading with JOIN
```

### IR5. Add Accessibility

**When**: WCAG violations are found.
**Commit prefix**: `fix:` or `a11y:`

```tsx
// Before (no label)
<input type="text" placeholder="Search" />

// After (with label)
<label htmlFor="search">Search</label>
<input id="search" type="text" placeholder="Search" />
```

```
fix: add label to search input for WCAG compliance
```

### IR6. Add Documentation

**When**: missing README, ADR, or API docs.
**Commit prefix**: `docs:`

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status

Accepted

## Context

Need a relational database with strong consistency...

## Decision

Use PostgreSQL 16...

## Consequences

Positive: ACID compliance, JSON support, mature ecosystem
Negative: Vertical scaling limits, need connection pooling
```

```
docs: add ADR-001 for PostgreSQL database choice
```

### IR7. Improve CI/CD Pipeline

**When**: CI/CD is missing steps or could be improved.
**Commit prefix**: `ci:`

```yaml
# Before: only tests
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [test]

# After: lint + type-check + test + security scan
jobs:
  lint: ...
  typecheck: ...
  test: ...
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: snyk/actions/node@master
```

```
ci: add security scanning to CI pipeline
```

---

## Commit Message Conventions

| Prefix      | When                                  | Example                                  |
| ----------- | ------------------------------------- | ---------------------------------------- |
| `refactor:` | Behavior-preserving structural change | `refactor: extract shipping calculation` |
| `fix:`      | Bug fix (behavior change)             | `fix: correct bulk discount boundary`    |
| `test:`     | Adding or fixing tests                | `test: add boundary tests for pricing`   |
| `perf:`     | Performance improvement               | `perf: fix N+1 query with JOIN`          |
| `security:` | Security fix                          | `security: parameterize SQL query`       |
| `docs:`     | Documentation                         | `docs: add ADR-001 for database choice`  |
| `ci:`       | CI/CD changes                         | `ci: add security scanning`              |
| `chore:`    | Maintenance (deps, configs)           | `chore: update dependencies`             |
| `feat:`     | New feature                           | `feat: add order export to CSV`          |
| `a11y:`     | Accessibility fix                     | `a11y: add ARIA labels to buttons`       |

### Rules

1. **One change per commit** — never mix `refactor:` with `fix:` or `feat:`.
2. **Imperative mood** — "extract", not "extracted" or "extracting".
3. **Subject ≤72 chars** — body explains WHY.
4. **Body answers why**, not what — the diff shows what.
5. **Reference issue** if applicable — `Fixes #123`.

---

## Summary

- **Refactoring recipes**: see the `refactor` skill's 27 Fowler recipes. Commit as `refactor:`.
- **Improvement recipes**: bug fix (`fix:`), test (`test:`), security (`security:`), performance (`perf:`), docs (`docs:`), CI (`ci:`), accessibility (`a11y:`).
- **Never mix commit types** in one commit.
- **Imperative mood, ≤72 chars** subject line.
- **Body explains WHY**, not WHAT.
