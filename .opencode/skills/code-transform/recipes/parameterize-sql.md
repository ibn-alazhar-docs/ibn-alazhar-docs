# Recipe: Parameterize SQL Queries

## When to Use
- f-string SQL queries like `f"SELECT ... {var}"`
- Variable is user-controlled (SQL injection risk)

## Input Pattern
```python
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)
```

## Output Pattern
```python
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))
```

## Steps
1. Identify f-string SQL queries
2. Replace {var} with ? placeholder
3. Collect variables into tuple
4. Pass tuple as second arg to execute()
5. Verify with security_scan.sh

## Metadata
- Times applied: 1
- Success rate: 1.0
