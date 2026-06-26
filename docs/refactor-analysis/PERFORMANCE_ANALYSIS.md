# PERFORMANCE_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Query performance, caching, bundle size, load handling
> **System:** Ibn Al-Azhar Docs

---

## 1. Query Performance

### 1.1 N+1 Query Risks

| Location                      | Pattern                         | Risk   | Fix                |
| ----------------------------- | ------------------------------- | ------ | ------------------ |
| `folder.use-cases.ts:70-78`   | Loads ALL user folders for tree | HIGH   | CTE or Redis cache |
| `export.use-cases.ts:67-78`   | Finds child folders recursively | MEDIUM | Single CTE query   |
| `search.use-cases.ts:104-166` | Dynamic SQL per query           | MEDIUM | Query builder      |

### 1.2 Missing Caching

| Hot Path           | Current               | Recommendation         |
| ------------------ | --------------------- | ---------------------- |
| Folder tree        | Query every time      | Redis cache (5min TTL) |
| Search suggestions | Query every keystroke | Debounce + cache       |
| User profile       | Query every request   | JWT claims             |
| Document metadata  | Query every preview   | Redis cache            |

### 1.3 Database Connection Pool

Prisma default pool size (num_physical_cpus \* 2 + 1) is reasonable for dev. Production may need tuning.

---

## 2. API Response Times

| Endpoint             | Expected   | Bottleneck       |
| -------------------- | ---------- | ---------------- |
| `GET /api/documents` | <100ms     | Indexed query    |
| `GET /api/folders`   | <50ms      | Simple query     |
| `POST /api/upload`   | <500ms     | MinIO upload     |
| `GET /api/search`    | <200ms     | Full-text search |
| `POST /api/export`   | <1s        | MinIO download   |
| `GET /api/stream`    | Persistent | SSE connection   |

---

## 3. Frontend Performance

| Metric             | Status | Notes                |
| ------------------ | ------ | -------------------- |
| Server Components  | ✅     | Reduced client JS    |
| Code Splitting     | ✅     | Next.js automatic    |
| Image Optimization | ✅     | Next.js Image        |
| Font Loading       | ✅     | Cairo font optimized |
| Bundle Size        | ⚠️     | Monitor growth       |
| LCP                | ⚠️     | Need measurement     |
| CLS                | ⚠️     | Need measurement     |

---

## 4. Worker Performance

| Worker     | Concurrency | Timeout | Issues      |
| ---------- | ----------- | ------- | ----------- |
| validation | 5           | 60s     | ✅          |
| splitting  | 2           | 10min   | ✅          |
| OCR        | 3           | 2hr     | ✅ but long |
| cleaning   | 5           | 3min    | ✅          |
| generation | 3           | 10min   | ✅          |
| export     | 3           | 5min    | ✅          |

---

## 5. Recommendations

| #   | Priority | Recommendation                              |
| --- | -------- | ------------------------------------------- |
| 1   | P1       | Add Redis caching for folder tree           |
| 2   | P1       | Optimize folder tree query with CTE         |
| 3   | P2       | Add debouncing to search suggestions        |
| 4   | P2       | Add response time monitoring                |
| 5   | P3       | Add database query logging for slow queries |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
