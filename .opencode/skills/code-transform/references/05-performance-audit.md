# Performance Audit — Hotspots, Queries, Bundle, Memory

> Read this during Dimension 5 (Performance) of the AUDIT phase.

## Audit Checklist

```
[ ] Are there N+1 queries? (query in a loop)
[ ] Are there missing database indexes?
[ ] Are there slow algorithms? (O(n²) where O(n) is possible)
[ ] Is the frontend bundle size >500KB? (should be <250KB gzipped)
[ ] Are there memory leaks? (growing memory over time)
[ ] Are there unnecessary re-renders (React)?
[ ] Is there caching where appropriate?
[ ] Are images optimized (WebP, lazy loading)?
[ ] Is there debouncing/throttling on rapid events?
[ ] Are DB connections pooled?
```

## Hotspot Identification

### CodeScene Method (churn × complexity)

- High-churn (frequently changed) × high-complexity = hotspot
- These files predict bugs. Refactor them first.
- See `references/15-metrics-and-hotspots.md` in the refactor skill.

### Profiling Tools

| Language | Profiler                        |
| -------- | ------------------------------- |
| Python   | cProfile, py-spy, line_profiler |
| JS/TS    | Chrome DevTools, clinic.js      |
| Go       | pprof                           |
| Rust     | cargo flamegraph, perf          |
| Java     | async-profiler, YourKit         |

## Query Performance

### EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;
-- Look for:
--   Seq Scan (bad — full table scan, needs index)
--   Index Scan (good — using index)
--   Nested Loop (can be bad for large datasets)
--   Hash Join (usually good)
```

### Common Query Issues

1. **Missing index**: `WHERE` column has no index → full table scan
2. **N+1 queries**: query in a loop → batch or JOIN
3. **SELECT \***: retrieves unnecessary columns → name columns
4. **No LIMIT**: returns millions of rows → paginate
5. **Cartesian product**: missing JOIN condition → add WHERE

## Frontend Performance

### Bundle Size

```bash
# Analyze bundle
npx webpack-bundle-analyzer dist/bundle.js

# Check gzipped size
gzip -c dist/bundle.js | wc -c
# Target: <250KB gzipped
```

### Common Frontend Issues

1. **Large dependencies**: moment.js (use date-fns), lodash (use individual functions)
2. **No code splitting**: everything in one bundle → lazy-load routes
3. **Unoptimized images**: PNG where WebP works → convert + lazy-load
4. **Render storms**: unnecessary re-renders → memoize, split context
5. **Blocking scripts**: synchronous scripts → defer/async

### React Performance

```tsx
// BAD: re-renders on every parent render
function UserList({ users }) {
  return users.map((u) => <UserCard user={u} />); // no memo
}

// GOOD: memoized
const UserCard = React.memo(({ user }) => <div>{user.name}</div>);

// BAD: new object reference every render
<UserCard style={{ color: "red" }} />; // new object → re-render

// GOOD: stable reference
const style = useMemo(() => ({ color: "red" }), []);
<UserCard style={style} />;
```

## Memory Leaks

### Detection

- Monitor memory over time: growing = leak
- Chrome DevTools → Memory tab → Heap snapshot comparison
- Python: `tracemalloc`, `memory_profiler`
- Node.js: `--inspect`, Chrome DevTools

### Common Causes

1. **Event listeners not removed**: `addEventListener` without `removeEventListener`
2. **Timers not cleared**: `setInterval` without `clearInterval`
3. **Closures holding references**: callback holds reference to large object
4. **Global caches growing**: cache with no eviction
5. **Detached DOM nodes**: removed from DOM but still referenced in JS

## Performance Improvement Recipes

### PR1. Add Missing Index

```sql
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
```

### PR2. Fix N+1 with Eager Loading

```python
# Before: N+1
users = User.query.all()
for u in users:
    print(u.orders)  # query per user

# After: eager load (SQLAlchemy)
users = User.query.options(joinedload(User.orders)).all()
for u in users:
    print(u.orders)  # no extra queries
```

### PR3. Add Caching

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_computation(input):
    # cached for 128 different inputs
    ...
```

### PR4. Debounce Rapid Events

```typescript
// Before: called on every keystroke
<input onChange={e => search(e.target.value)} />

// After: debounced (called after user stops typing)
const debouncedSearch = useMemo(() => debounce(search, 300), []);
<input onChange={e => debouncedSearch(e.target.value)} />
```

### PR5. Lazy-Load Routes

```typescript
// Before: all routes in one bundle
import Home from "./Home";
import About from "./About";
import Dashboard from "./Dashboard";

// After: lazy-loaded
const Home = lazy(() => import("./Home"));
const About = lazy(() => import("./About"));
const Dashboard = lazy(() => import("./Dashboard"));
```

## Summary

- **Hotspots**: churn × complexity. These predict bugs — refactor first.
- **Queries**: EXPLAIN ANALYZE. Look for Seq Scan (bad), Index Scan (good).
- **N+1**: always a bug. Use JOIN or eager loading.
- **Frontend**: bundle <250KB gzipped. Code-split. Lazy-load. Memoize.
- **Memory**: monitor over time. Common leaks: listeners, timers, closures, caches.
- **Performance fixes are `perf:` commits**, not `refactor:`.
