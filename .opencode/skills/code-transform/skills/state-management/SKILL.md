---
name: state-management
description: "Pick the right state container: server state via React Query/SWR (never in Redux), global client state via Zustand (simple) or Redux Toolkit (complex), atomic state via Jotai, URL state via router params. Enforces immutability, normalization, selectors, optimistic updates with rollback. Triggers in Phase 4 (architecture audit), Phase 6 (state-touching commit), Phase 9 (flow acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# State Management

> Three kinds of state, three tools. Server state goes in React Query (cache, retry, invalidation). URL state goes in the router. Client state goes in Zustand or Redux Toolkit — and it's the smallest of the three.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 4 — AUDIT | Dimension 9 flags "Redux for everything" | Split server state out |
| Phase 6 — EXECUTE | Any commit touching store / hooks / data fetching | Re-run related flows |
| Phase 9 — ACCEPTANCE | "Cart updates instantly" AC | Prove optimistic update + rollback works |
| Bug report | "Stale data after mutation" | Likely React Query cache key mismatch |

**Do NOT use this sub-skill for:** form field state (use `form-validation`), UI state local to one component (use `useState`), or styling tokens (use `css-styling`). This sub-skill owns *cross-component state architecture*.

## What It Does

1. Inventories current state: scans for `redux`, `zustand`, `jotai`, `recoil`, `@tanstack/react-query`, `swr`, `Context`, `useState`/`useReducer` patterns
2. Classifies each piece of state as **server**, **URL**, or **client** — most projects over-use client state
3. Proposes migration: server data → React Query (default) or SWR; URL-synced → `useSearchParams` / `next/navigation`; client-only → Zustand
4. If Redux is in use: validates it's **Redux Toolkit** (not legacy Redux), with `createSlice` + RTK Query (and asks why not React Query)
5. Enforces immutability: Immer (built into RTK) or `immer` middleware for Zustand
6. Enforces normalization for collections (RTK Query `normalizedCache`, or `entityAdapter`)
7. Enforces selectors for derived state (Reselect / `useMemo` only for cheap derivations)
8. Adds optimistic update + rollback patterns for mutations
9. Generates a state diagram (which component reads what, which writes what) for `TRACEABILITY_MATRIX.md`

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - target: file|directory (required)
  - action: audit|migrate|wire-mutation|diagram (default audit)
  - preferred: react-query|zustand|redux-toolkit|jotai (optional)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "current": {"redux": true, "zustand": false, "react-query": false, "context": 4, "useState": 187},
    "classification": {
      "server_state": ["user", "orders", "products"],
      "url_state": ["filter", "sort", "page"],
      "client_state": ["cartDraft", "uiPrefs", "theme"]
    },
    "recommended": "react-query (server) + zustand (client) + useSearchParams (url)",
    "violations": [
      {"rule": "no-server-data-in-redux", "file": "userSlice.ts", "line": 8, "fix": "migrate to useUser() with React Query"}
    ],
    "diagram_path": "/tmp/ct-<uuid>/state-diagram.svg"
  }

SIDE EFFECTS:
  - May install @tanstack/react-query, zustand, immer
  - Modifies hooks, components, and store files
  - Writes the state diagram for review
```

## CLI

```bash
# Audit current state architecture
python3 scripts/frontend_agent.py state --action audit --target ./src

# Migrate server data out of Redux into React Query
python3 scripts/frontend_agent.py state --action migrate --target ./src/store/userSlice.ts --preferred react-query

# Wire an optimistic mutation with rollback
python3 scripts/frontend_agent.py state --action wire-mutation --target ./src/hooks/useUpdateProfile.ts

# Generate state diagram
python3 scripts/frontend_agent.py state --action diagram --target ./src --out /tmp/state.svg
```

## Decision Tree (autonomous)

```
Q: Is this state FROM the server (fetched, mutated, cached)?
  YES → React Query (default) or SWR. NEVER put it in Redux/Zustand.
        Reason: cache invalidation, retry, dedupe, background refetch, optimistic — all built-in.
  NO  → continue

Q: Is this state synced to the URL (filter, sort, page, modal open)?
  YES → useSearchParams / next/navigation / react-router search params
        Reason: shareable, back-button works, survives refresh.
  NO  → continue

Q: Is this state used by ONE component?
  YES → useState / useReducer (local). Don't pollute global stores.
  NO  → continue (it's used by 2+ components)

Q: Is it global client state (theme, auth session, cart draft, UI prefs)?
  YES → Q: How complex? (slices, derived state, middleware, time-travel)
          SIMPLE (1-3 pieces, few writes) → Zustand (no boilerplate, no Provider)
          COMPLEX (many slices, RTK middleware, devtools) → Redux Toolkit
          ATOMIC (independent units, fine-grained) → Jotai
  NO  → continue

Q: Is this state from a state machine (multi-step wizard, onboarding)?
  YES → XState (statecharts) — explicit, testable, no impossible transitions
  NO  → Context (last resort for truly cross-cutting concerns like theme/auth)
```

## Patterns

### Separate server from client
```ts
// ✅ Server state — React Query
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => api.getUser(userId) });

// ✅ Client state — Zustand
const useCart = create<Cart>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
}));

// ✅ URL state — router
const [sort, setSort] = useSearchParams();
```

### Optimistic update + rollback
```ts
const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    onMutate: async (newProfile) => {
      await qc.cancelQueries({ queryKey: ['user'] });
      const prev = qc.getQueryData(['user']);
      qc.setQueryData(['user'], newProfile);     // optimistic
      return { prev };                             // context for rollback
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['user'], ctx?.prev),  // rollback
    onSettled: () => qc.invalidateQueries({ queryKey: ['user'] }),    // re-fetch truth
  });
};
```

### Selectors for derived state
```ts
// ✅ Zustand selector — only re-renders when count changes
const count = useCart((s) => s.items.length);

// ✅ RTK + Reselect — memoized
const selectCartTotal = createSelector([selectItems], (items) =>
  items.reduce((sum, i) => sum + i.price * i.qty, 0),
);

// ❌ DON'T derive in component body without memo — re-runs every render
const total = items.reduce(...);
```

### Normalization (for collections)
```ts
// RTK Query normalizedCache OR manual:
// { entities: { [id]: Item }, ids: string[] }
// not: Item[] (find O(n), update O(n))
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Stale data after mutation | Cache key mismatch | Use `qc.invalidateQueries({ queryKey: ['user'] })` in `onSettled` |
| Re-render storm | Selecting whole store: `useStore((s) => s)` | Select narrow slice: `useStore((s) => s.items.length)` |
| Cart empties on refresh | Cart in Redux (lost on reload) | Persist via `zustand/middleware persist` OR move to server |
| Optimistic update stuck | No rollback on error | Add `onError` with context rollback |
| Mutations fire twice (React 18 StrictMode) | Side effects in reducer | Move to `useEffect` / mutation callback |
| Race condition (switch user, see old user's data) | No query cancellation | `await qc.cancelQueries(...)` in `onMutate` |

## Self-Healing Loop

When a state violation is found:
1. Identify the rule (`no-server-in-redux`, `use-selector`, `optimistic-rollback`, `normalize-collections`)
2. Apply the mechanical fix (extract selector, add rollback, migrate slice to `useQuery`)
3. Re-run the related Playwright flow (delegated to `webapp-testing`)
4. If the fix changes user-visible behavior → screenshot before/after, route to `frontend-bridge`
5. Max 3 self-heal attempts per violation, then escalate

## Quality Gates (enforced before "state done")

- [ ] No server-derived data in Redux/Zustand (React Query owns it)
- [ ] No state in Context that changes more than once per session (perf killer)
- [ ] All mutations have optimistic update + rollback OR explicit loading state
- [ ] All store reads use selectors (not `useStore((s) => s)`)
- [ ] Collections normalized (entities + ids, not arrays) when lookup-by-id happens
- [ ] No direct mutation: `state.x = 1` is forbidden (Immer / RTK enforces)
- [ ] URL state survives refresh and back button
- [ ] DevTools wired (Redux DevTools / Zustand devtools) in dev only
- [ ] State diagram generated and reviewed

## Tools

- **React Query (@tanstack/react-query)** — server state, default. Cache, retry, dedupe, optimistic, devtools.
- **SWR** — alternative for server state (Vercel), lighter API.
- **Zustand** — global client state, default for new projects. Tiny, no Provider, works with Immer.
- **Redux Toolkit** — complex client state, legacy migrations, RTK Query for server.
- **Jotai** — atomic state, fine-grained, no boilerplate. Use when state is many independent atoms.
- **XState** — state machines for multi-step flows (wizards, onboarding, media players).
- **Reselect** — memoized selectors (built into RTK).
- **Immer** — immutable updates with mutable syntax (built into RTK, middleware for Zustand).
- **Redux DevTools / Zustand devtools** — time-travel debugging, dev only.

## Hard Rules

1. **Never put server data in a client store.** `user`, `orders`, `products` belong in React Query (cache, retry, invalidation). If it's in Redux, it's a bug.
2. **Never mutate state directly.** Use Immer (RTK or `zustand/middleware/immer`). `state.x = 1` outside an Immer recipe is a hard error.
3. **Never derive in the component without `useMemo`.** Selectors (Reselect or Zustand selectors) prevent re-renders and re-computation. Better: derive in the selector, not the component.
4. **Always provide optimistic update + rollback for mutations.** `onMutate` (optimistic), `onError` (rollback using context), `onSettled` (re-fetch truth).
5. **Never use Context for high-frequency state.** Context re-renders every consumer on every change. For theme/auth (changes rarely): fine. For cart (changes often): use Zustand.
6. **Always normalize collections** when you look up by id more than once. `entities: {[id]: T}` + `ids: string[]`, not `T[]`.
7. **Always use selectors for store reads.** `useStore((s) => s.items.length)` not `useStore((s) => s).items.length` — the latter re-renders on every state change.
8. **Never sync state to localStorage manually.** Use `zustand/middleware persist` or `redux-persist` — handles serialization, versioning, migrations.
9. **Always cancel in-flight queries before optimistic update.** `await qc.cancelQueries({ queryKey })` prevents races from overwriting your optimistic value.
10. **Never put form state in a global store.** Form fields belong in React Hook Form (see `form-validation`). The store only sees the submitted result.
