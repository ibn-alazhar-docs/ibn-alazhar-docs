# Testing Audit — Coverage, Pyramid, Quality

> Read this during Dimension 3 (Testing) of the AUDIT phase.

## Audit Checklist

```
[ ] What is the test coverage %? (aim for >70% on critical paths)
[ ] Is the test pyramid healthy? (70% unit / 20% integration / 10% E2E)
[ ] Are there flaky tests? (tests that pass/fail randomly)
[ ] Are tests testing behavior or implementation? (brittle tests break on refactor)
[ ] Is there at least one test per public function?
[ ] Are error paths tested? (not just happy path)
[ ] Are edge cases tested? (empty, null, boundary, large)
[ ] Is there a mutation testing score? (>80% = good test quality)
[ ] Do tests run fast? (<10s for unit tests)
[ ] Are tests independent? (no test depends on another's execution)
```

## Test Pyramid Health

### The Ideal Pyramid

```
        E2E (5-10%)        ← slow, fragile, few
       /          \
   Integration (15-20%)    ← medium speed, real dependencies
  /                    \
Unit Tests (70-80%)        ← fast, isolated, many
```

### The Ice Cream Cone (Anti-Pattern)

```
Unit Tests (few)           ← should be many
  \                    /
   Integration (some)
       \          /
        E2E (many)         ← too many slow, fragile tests
```

**Fix**: Move E2E tests down to integration or unit. E2E should only cover the top 5 user flows.

## Coverage Analysis

### What to Measure

- **Line coverage**: % of code lines executed by tests
- **Branch coverage**: % of branches (if/else) taken by tests
- **Function coverage**: % of functions called by tests
- **Mutation score**: % of mutations caught by tests (the gold standard)

### What Coverage Doesn't Tell You

- Whether the tests assert the RIGHT things
- Whether edge cases are tested
- Whether the tests are brittle (test implementation, not behavior)

### Tools

| Language | Coverage Tool                   | Mutation Tool |
| -------- | ------------------------------- | ------------- |
| Python   | pytest-cov, coverage.py         | mutmut        |
| JS/TS    | jest --coverage, nyc            | Stryker       |
| Go       | go test -cover                  | go-mutesting  |
| Rust     | cargo-tarpaulin, cargo-llvm-cov | cargo-mutants |
| Java     | JaCoCo                          | PIT           |

## Test Quality Assessment

### Brittle Tests (test implementation, not behavior)

```python
# BRITTLE: tests mock internals
def test_create_user():
    mock_db = Mock()
    mock_db.save.assert_called_once_with(user)  # breaks if save() renamed

# GOOD: tests behavior
def test_create_user_persists():
    repo = InMemoryUserRepository()
    service = UserService(repo)
    service.create("Alice", "alice@example.com")
    assert repo.find_by_email("alice@example.com") is not None
```

### Flaky Tests

- Tests that depend on: time, random, network, filesystem, test order
- **Fix**: mock the clock, seed the random, mock network, use tmp_path, isolate state

### Missing Edge Cases

For each function, check if these are tested:

- Empty input (`[]`, `""`, `None`)
- Single element (`[1]`)
- Boundary values (`0`, `-1`, `MAX_INT`)
- Null/undefined
- Very large input
- Invalid input (does it raise the right error?)

## Test Improvement Recipes

### TIR1. Add Missing Test for Error Path

```python
# Before: only happy path tested
def test_create_user_success(): ...

# After: add error paths
def test_create_user_with_duplicate_email_raises(): ...
def test_create_user_with_empty_name_raises(): ...
def test_create_user_with_invalid_email_raises(): ...
```

### TIR2. Replace Interaction Mocks with Fakes

```python
# Before: brittle interaction mock
mock_repo = Mock()
service.create(user)
mock_repo.save.assert_called_once_with(user)

# After: state-based fake
class FakeUserRepository:
    def __init__(self): self.users = {}
    def save(self, user): self.users[user.id] = user
    def get(self, id): return self.users.get(id)

repo = FakeUserRepository()
service.create(user)
assert repo.get(user.id) == user  # verify state, not interactions
```

### TIR3. Add Property-Based Test for Pure Functions

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_is_idempotent(items):
    assert sorted(sorted(items)) == sorted(items)

@given(st.lists(st.integers()))
def test_sort_preserves_length(items):
    assert len(sorted(items)) == len(items)
```

### TIR4. Fix Flaky Test

```python
# Before: flaky (depends on current time)
def test_order_created_today():
    order = create_order()
    assert order.created_at.date() == datetime.now().date()

# After: inject fixed clock
def test_order_created_at_provided_time(fixed_clock):
    order = create_order(clock=fixed_clock)
    assert order.created_at == fixed_clock.now()
```

## Summary

- **Pyramid**: 70% unit / 20% integration / 10% E2E. Ice cream cone = anti-pattern.
- **Coverage**: measure line + branch + function. Mutation score is the gold standard.
- **Test quality**: test behavior not implementation. Replace mocks with fakes. Fix flaky tests.
- **Edge cases**: empty, single, boundary, null, large, invalid — all must be tested.
- **Speed**: unit tests < 10s total. Slow tests kill productivity.
- **Independence**: no test depends on another. Each test sets up and tears down its own state.
