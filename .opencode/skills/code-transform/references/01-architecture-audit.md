# Architecture Audit — Layering, DDD, Dependency Rules

> Read this during Dimension 1 (Architecture) of the AUDIT phase. Check layering, dependency direction, DDD compliance, and boundary design.

## Table of Contents
1. [Audit Checklist](#audit-checklist)
2. [Layer Violation Detection](#layer-violation-detection)
3. [DDD Compliance](#ddd-compliance)
4. [Common Architecture Smells](#common-architecture-smells)
5. [Architecture Improvement Recipes](#architecture-improvement-recipes)

---

## Audit Checklist

For each file, answer these yes/no questions:

```
[ ] Does the domain/service layer import any I/O library (sqlite3, requests, fs, http)?
    → YES = layering violation (C1)
[ ] Does a service know about HTTP (Flask, Express, status codes)?
    → YES = layering violation (C1)
[ ] Does a repository contain business rules (if/else logic on domain data)?
    → YES = responsibility leak
[ ] Does a controller make DB calls directly?
    → YES = mixed concerns (C1)
[ ] Does a model/entity import from service/controller/repository?
    → YES = dependency direction violation
[ ] Is there a god class/module (>300 lines, >10 public methods)?
    → YES = H2 God Class
[ ] Are there circular dependencies (A imports B, B imports A)?
    → YES = architecture smell
[ ] Is config scattered (magic numbers/URLs in logic files)?
    → YES = ST6 Hard-Coded Config
[ ] Does shared/ import from any app layer?
    → YES = leaf violation (shared must be dependency-free)
[ ] Is there a separate domain/ layer when the app is simple?
    → YES = over-engineering (YAGNI)
```

## Layer Violation Detection

### The Dependency Rule (Clean Architecture)

```
Dependencies point INWARD:

controllers → services → repositories/clients → models
                                              ↑
                                    domain (if exists)

OUTER layers can import INNER layers.
INNER layers MUST NOT import OUTER layers.
```

### How to Check

1. **For each service file**: grep for I/O imports.
   ```bash
   git grep -n "import sqlite3\|import requests\|from flask\|require('express')" -- "services/**"
   ```
   Any match = violation.

2. **For each model/entity file**: grep for service/controller/repository imports.
   ```bash
   git grep -n "from.*service\|from.*controller\|from.*repository" -- "models/**"
   ```
   Any match = violation.

3. **For each controller file**: grep for direct DB calls.
   ```bash
   git grep -n "db\.execute\|db\.query\|SELECT\|INSERT\|UPDATE\|DELETE" -- "controllers/**"
   ```
   Any match = mixed concerns.

4. **Use the layer_violation_detector.py script**:
   ```bash
   python3 scripts/layer_violation_detector.py . 
   ```

---

## DDD Compliance

### Bounded Contexts

**Check**: Does the codebase have one "User" model used everywhere, or different User models for different contexts (auth, billing, profile)?

**BAD** (one model for everything):
```
models/user.py  →  used by auth, billing, profile, admin, notifications
```

**GOOD** (bounded contexts):
```
auth/context/user.py       →  User(id, email, password_hash)
billing/context/user.py    →  User(id, payment_method, balance)
profile/context/user.py    →  User(id, name, bio, avatar)
```

### Aggregate Design

**Check**: Are there consistency boundaries? Is there one aggregate modified per transaction?

**BAD** (modifying multiple aggregates in one transaction):
```python
def place_order(order):
    user_repo.save(user)          # modifying User aggregate
    order_repo.save(order)         # modifying Order aggregate
    inventory_repo.save(inventory) # modifying Inventory aggregate
    # 3 aggregates in one transaction = bad
```

**GOOD** (one aggregate per transaction, use events for the rest):
```python
def place_order(order):
    order_repo.save(order)  # only Order aggregate
    event_bus.publish(OrderPlaced(order))  # other aggregates updated via event handlers
```

### Value Objects

**Check**: Are domain concepts modeled as value objects (immutable, always valid)?

**BAD** (primitives):
```python
def charge(amount: float, currency: str): ...
```

**GOOD** (value objects):
```python
def charge(amount: Money): ...  # Money(amount, currency) — always valid
```

---

## Common Architecture Smells

### AS1. Anemic Domain Model
**Definition**: Domain models are just data bags with no behavior. All logic lives in services.

**Detection**: models/ directory has only data classes (fields, getters, setters). Services/ directory has all the logic.

**Fix**: Move business rules into the domain model. `Order.cancel()` instead of `OrderService.cancel(order)`.

### AS2. God Service
**Definition**: One service doing everything (CRUD + notifications + reports + payments).

**Detection**: Service file >300 lines or >10 public methods.

**Fix**: Split by responsibility. `UserService`, `NotificationService`, `ReportService`, `PaymentService`.

### AS3. Leaky Repository
**Definition**: Repository returns DB rows/ORM objects instead of domain models.

**Detection**: Repository methods return `Row`, `dict`, or ORM model objects. Callers access `.column_name` or `["column_name"]`.

**Fix**: Repository should hydrate to domain models at the boundary. Return `User` not `UserRow`.

### AS4. Shared Database Anti-Pattern
**Definition**: Multiple services read/write the same database tables.

**Detection**: Multiple services import the same repository or ORM models.

**Fix**: Each service owns its database. Communication via API contracts or events.

### AS5. Circular Dependencies
**Definition**: A imports B, B imports A (or longer cycles).

**Detection**: Run dependency analysis (`madge --circular .` for JS, `pydeps --show-cycles` for Python).

**Fix**: Extract shared code into a third module, or use dependency inversion (interface in a shared layer).

---

## Architecture Improvement Recipes

### AIR1. Extract Layer (Service → Repository)
**When**: service does DB access directly.

```python
# Before
class OrderService:
    def get(self, id):
        conn = sqlite3.connect("orders.db")
        return conn.execute("SELECT ...").fetchone()

# After
class OrderRepository(Protocol):
    def get(self, id) -> Order | None: ...

class SqliteOrderRepository:
    def get(self, id) -> Order | None:
        conn = sqlite3.connect("orders.db")
        row = conn.execute("SELECT ...").fetchone()
        return Order.hydrate(row) if row else None

class OrderService:
    def __init__(self, repo: OrderRepository):
        self._repo = repo
    def get(self, id):
        return self._repo.get(id)
```

### AIR2. Introduce Bounded Context
**When**: one User model used across auth, billing, profile.

```
# Before
models/user.py  (one giant User class with all fields)

# After
auth/models/user.py     (User: id, email, password_hash)
billing/models/user.py  (User: id, payment_method, balance)
profile/models/user.py  (User: id, name, bio, avatar)
```

### AIR3. Enrich Anemic Domain Model
**When**: domain models are just data; all logic in services.

```python
# Before (anemic)
class Order:
    status: str
    total: float

class OrderService:
    def cancel(self, order):
        if order.status == "shipped":
            raise CannotCancelShippedOrder()
        order.status = "cancelled"

# After (rich domain model)
class Order:
    _status: OrderStatus
    _total: Money

    def cancel(self):
        if self._status == OrderStatus.SHIPPED:
            raise CannotCancelShippedOrder(self.id)
        self._status = OrderStatus.CANCELLED
```

---

## Summary

- **Dependency rule**: dependencies point inward. Inner layers never import outer layers.
- **Check with grep**: `git grep` for I/O imports in services, domain imports in models.
- **DDD**: bounded contexts, one aggregate per transaction, value objects for domain concepts.
- **Common smells**: Anemic Domain Model, God Service, Leaky Repository, Shared Database, Circular Dependencies.
- **Use scripts/layer_violation_detector.py** for automated checking.
- **Fix with**: Extract Layer, Introduce Bounded Context, Enrich Anemic Domain Model.
