# Security Audit — OWASP, Auth, Validation, Secrets

> Read this during Dimension 4 (Security) of the AUDIT phase.

## Audit Checklist (OWASP Top 10 + More)

```
[ ] A01 Broken Access Control: are authz checks on every sensitive endpoint?
[ ] A02 Cryptographic Failures: are passwords hashed (bcrypt/argon2)? Is data encrypted at rest?
[ ] A03 Injection: are all SQL queries parameterized? No string concatenation?
[ ] A04 Insecure Design: is there a threat model? Security by design?
[ ] A05 Security Misconfiguration: are debug mode, default creds, verbose errors disabled in prod?
[ ] A06 Vulnerable Components: are dependencies scanned (Dependabot, Snyk)?
[ ] A07 Auth Failures: are login rates limited? Session management secure?
[ ] A08 Software/Data Integrity: are CI/CD pipelines secured? Code signed?
[ ] A09 Logging/Monitoring: are security events logged? Alerts set up?
[ ] A10 SSRF: are outbound URLs validated? No arbitrary user-controlled URLs?
```

## Auth & Authz Patterns

### Authentication (who are you?)

```
[ ] Passwords hashed with bcrypt (cost ≥10) or argon2?
[ ] Password reset tokens are single-use and expire?
[ ] Login rate-limited (prevent brute force)?
[ ] JWT tokens have expiry? Refresh tokens rotated?
[ ] Session IDs are random and long (≥128 bits)?
[ ] Cookies are httpOnly, secure, sameSite?
```

### Authorization (what can you do?)

```
[ ] Every sensitive endpoint checks authz, not just auth?
[ ] Authz checks use the resource owner (user_id), not just role?
[ ] IDOR (Insecure Direct Object Reference) prevented?
    GET /users/123 → can user 456 access this?
[ ] Role checks are centralized (middleware/decorator), not scattered?
```

### BAD (authz on only some endpoints)

```python
@app.route("/api/orders")
def list_orders():
    # No authz check! Anyone can see all orders.
    return Order.query.all()

@app.route("/api/orders/<id>")
def get_order(id):
    if not current_user.is_authenticated:
        return 401  # Authz here but not on list_orders
    return Order.query.get(id)
```

### GOOD (centralized authz)

```python
@app.route("/api/orders")
@auth_required  # decorator on EVERY route
def list_orders():
    return Order.query.filter_by(user_id=current_user.id).all()
```

## Input Validation

### At Boundaries Only

- Validate at the system boundary (HTTP handler, API client, CLI input)
- Internal code trusts validated data (no re-validation)

### BAD (validation scattered)

```python
def create_user(email):
    if "@" not in email: raise  # validated here
    ...

def update_email(email):
    if "@" not in email: raise  # validated AGAIN here
    ...

def send_email(email):
    if "@" not in email: raise  # validated AGAIN here
    ...
```

### GOOD (parse, don't validate — see type-driven refactoring)

```python
class Email:
    def __init__(self, value):
        if not EMAIL_PATTERN.match(value):
            raise InvalidEmail(value)
        self.value = value

# Boundary: parse once
def create_user(raw_email):
    email = Email(raw_email)  # raises if invalid
    # Internal: email is always valid, no re-checking
    ...
```

## SQL Injection

### BAD (string concatenation)

```python
query = f"SELECT * FROM users WHERE name = '{name}'"
db.execute(query)
# Input: name = "'; DROP TABLE users; --"
```

### GOOD (parameterized)

```python
db.execute("SELECT * FROM users WHERE name = ?", (name,))
```

## XSS (Cross-Site Scripting)

### BAD (unescaped output)

```python
return f"<div>{user_input}</div>"  # user_input could be <script>...
```

### GOOD (escape by default, use template engine)

```python
# Jinja2 auto-escapes by default
return render_template("user.html", name=user_input)

# Or explicit escape
from html import escape
return f"<div>{escape(user_input)}</div>"
```

## Secrets Detection

### Check for hardcoded secrets

```bash
git grep -n "password\s*=\s*['\"]" -- "*.py" "*.js" "*.ts"
git grep -n "api_key\s*=\s*['\"]" -- "*.py" "*.js" "*.ts"
git grep -n "secret\s*=\s*['\"]" -- "*.py" "*.js" "*.ts"
git grep -n "BEGIN.*PRIVATE KEY" -- "*.py" "*.js" "*.ts"
```

### Also check env files

```bash
git grep -n "password" -- ".env*"
git grep -n "api_key" -- ".env*"
```

### Tools

- **git-secrets**: prevents committing secrets
- **truffleHog**: scans git history for secrets
- **gitleaks**: fast secret scanner
- **Semgrep**: custom security rules

## Security Improvement Recipes

### SR1. Parameterize SQL

```python
# Before
db.execute(f"SELECT * FROM users WHERE id = {user_id}")

# After
db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

### SR2. Hash Passwords with bcrypt

```python
# Before (plaintext or MD5)
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()

# After (bcrypt)
import bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

### SR3. Add Authz Middleware

```python
# Before: authz scattered
@app.route("/api/orders/<id>")
def get_order(id):
    if not current_user.is_authenticated:
        return 401
    ...

# After: centralized decorator
def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            return 401
        return f(*args, **kwargs)
    return decorated

@app.route("/api/orders/<id>")
@auth_required
def get_order(id): ...
```

### SR4. Move Secrets to Environment

```python
# Before
API_KEY = "sk_live_abc123"

# After
API_KEY = os.environ["API_KEY"]  # fail fast if not set
```

### SR5. Add Rate Limiting

```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route("/login", methods=["POST"])
@limiter.limit("5 per minute")  # prevent brute force
def login(): ...
```

## Summary

- **OWASP Top 10**: check every item. Auth, crypto, injection, config, components, logging.
- **Auth**: bcrypt/argon2, rate limiting, secure sessions, JWT expiry.
- **Authz**: on EVERY sensitive endpoint. Centralized, not scattered. Check IDOR.
- **Input validation**: at boundaries only. Parse, don't validate.
- **SQL**: always parameterized. Never string concatenation.
- **XSS**: auto-escape by default. Use template engines.
- **Secrets**: never in code. Use env vars or secret manager. Scan with gitleaks/truffleHog.
- **Security fixes are `fix:` or `security:` commits**, not `refactor:`.
