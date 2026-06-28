# Full-Stack Coordination Audit — API Contract, Type Safety

> Read this during Dimension 10 (Full-Stack Coordination) of the AUDIT phase.

## Audit Checklist

```
[ ] Is there a defined API contract (OpenAPI, GraphQL schema, tRPC router)?
[ ] Do frontend and backend share types (or are they duplicated)?
[ ] Are API changes backward-compatible (or versioned)?
[ ] Is there contract testing (Pact)?
[ ] Is the error format consistent across all endpoints?
[ ] Does the frontend handle all API error states?
[ ] Is there a BFF (Backend for Frontend) if needed?
[ ] Are API docs auto-generated?
```

## API Contract

### Schema-First Design
The API contract is defined BEFORE implementation. Both sides generate from it.

```
openapi.yaml (the contract)
  ↓ generates
  ├── backend types (server-side)
  ├── frontend types (client-side)
  ├── API documentation (Swagger UI)
  └── mock server (for testing)
```

### Type Sharing

**tRPC (TypeScript end-to-end)**:
```typescript
// server/router.ts
export const appRouter = t.router({
  getUser: t.procedure.input(z.string()).query(({ input }) => {
    return userRepo.get(input);  // returns User
  }),
});

// client.ts
const user = await trpc.getUser.query("123");  // typed as User
// TypeScript knows user.id, user.name, user.email — no manual types
```

**OpenAPI Codegen (any language)**:
```bash
# Generate TypeScript client from OpenAPI spec
npx openapi-typescript-codegen --input openapi.yaml --output src/api

# Generate Python client
openapi-python-client generate --url http://api.example.com/openapi.json
```

## Contract Testing

### Pact (Consumer-Driven)
```javascript
// Frontend (consumer) defines expectations
provider.addInteraction({
  uponReceiving: 'a request for user 123',
  withRequest: { method: 'GET', path: '/users/123' },
  willRespondWith: { status: 200, body: { id: '123', name: 'Alice' } },
});

// Backend (provider) verifies it meets expectations
// Run in CI: if contract breaks, CI fails
```

## Error Format Consistency

### BAD (inconsistent)
```json
// Endpoint 1
{ "error": "User not found" }

// Endpoint 2
{ "message": "Validation failed", "fields": ["email"] }

// Endpoint 3
{ "status": "error", "detail": "Unauthorized" }
```

### GOOD (consistent)
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "details": { "user_id": "123" },
    "trace_id": "abc-123"
  }
}
```

## Full-Stack Coordination Recipes

### FSR1. Introduce tRPC for Type Safety
```typescript
// Before: manual types, can drift
// backend
app.get("/users/:id", (req, res) => {
  res.json({ id: req.params.id, name: "Alice", email: "alice@example.com" });
});

// frontend
interface User { id: string; name: string; email: string; }  // ← manual, can drift
const user = await fetch(`/users/${id}`).then(r => r.json()) as User;

// After: tRPC, types flow automatically
// backend
const router = t.router({
  getUser: t.procedure.input(z.string()).query(({ input }) => {
    return { id: input, name: "Alice", email: "alice@example.com" };
  }),
});

// frontend
const user = await trpc.getUser.query(id);  // typed as { id: string; name: string; email: string }
// No manual types, can't drift
```

### FSR2. Generate OpenAPI Spec
```python
# Before: no API documentation
@app.route("/users/<id>")
def get_user(id):
    return jsonify(user_repo.get(id))

# After: OpenAPI spec auto-generated
from flask_openapi3 import OpenAPIView
class UserView(OpenAPIView):
    @doc(summary="Get user by ID")
    def get(self, id: str):
        """Get user by ID.
        ---
        responses:
          200: { description: User found, content: { application/json: { schema: UserSchema } } }
          404: { description: User not found }
        """
        return jsonify(user_repo.get(id))
```

### FSR3. Standardize Error Format
```python
# Before: inconsistent errors
@app.route("/users/<id>")
def get_user(id):
    user = repo.get(id)
    if not user:
        return jsonify({"error": "not found"}), 404  # one format

@app.route("/orders/<id>")
def get_order(id):
    order = repo.get(id)
    if not order:
        return jsonify({"message": "Order not found"}), 404  # different format!

# After: consistent error format
class ApiError(Exception):
    def __init__(self, code, message, status, details=None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details

@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify({"error": {
        "code": e.code,
        "message": e.message,
        "details": e.details,
        "trace_id": request.trace_id,
    }}), e.status

# Usage
if not user:
    raise ApiError("USER_NOT_FOUND", "User not found", 404, {"user_id": id})
```

## Summary

- **API contract**: schema-first. Both sides generate from it. Never duplicate types.
- **Type sharing**: tRPC (TS-to-TS), OpenAPI codegen (any language).
- **Contract testing**: Pact. Consumer defines expectations, provider verifies.
- **Error format**: consistent across ALL endpoints. Code + message + details + trace_id.
- **BFF**: if frontend and mobile have different needs, separate BFFs.
- **Full-stack improvements are `refactor:` or `feat:` commits** depending on whether behavior changes.
