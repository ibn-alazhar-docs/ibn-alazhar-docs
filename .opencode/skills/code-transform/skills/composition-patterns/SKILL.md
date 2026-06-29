---
name: composition-patterns
description: "React composition patterns — compound components, hooks composition, render props, context, slots. Picks the right pattern for the use case, enforces atomic design direction (atoms→molecules→organisms→templates→pages), and forbids HOCs (use hooks). Triggers in Phase 4 (component architecture audit) and Phase 6 (new component commit)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# Composition Patterns

> Composition over inheritance, always. The right pattern depends on the use case: compound components for implicit state, hooks for reusable logic, context for cross-cutting concerns, slots for maximum flexibility. HOCs are forbidden — hooks do everything HOCs did, better.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 4 — AUDIT | Dimension 9 (Frontend Architecture) | Find god components, prop drilling, HOC nesting |
| Phase 6 — EXECUTE | New component or refactor | Pick the right composition pattern |
| Phase 6 — EXECUTE | "Extract this logic" | Hook vs render prop vs context decision |
| Phase 9 — ACCEPTANCE | "Component is reusable" AC | Verify the public API is composable |

**Do NOT use this sub-skill for:** styling (use `css-styling`), state architecture (use `state-management`), or design taste (use `frontend-bridge`). This sub-skill owns *component structure and reuse patterns*.

## What It Does

1. Inventories component patterns in use: compound, hooks, render props, HOCs, context, slots
2. Flags anti-patterns: HOCs (forbidden), prop drilling > 2 levels, god components (>300 lines), non-UI logic in components
3. Maps the dependency direction: atoms → molecules → organisms → templates → pages (atomic design)
4. For each new component, picks the pattern via the Decision Tree
5. Extracts reusable logic into hooks (testable, composable, no nesting tax)
6. Refactors HOCs to hooks (with `forwardRef` where needed)
7. Splits god components along responsibility boundaries
8. Generates Storybook stories for each component showcasing variants + composition

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - target: file|directory (required)
  - action: audit|extract-hook|refactor-hoc|split-component|pick-pattern (default audit)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "patterns_in_use": {"compound": 6, "hooks": 24, "render_props": 2, "hocs": 1, "context": 4, "slots": 3},
    "anti_patterns": [
      {"type": "hoc", "file": "withAuth.tsx", "line": 8, "fix": "convert to useAuth() hook"},
      {"type": "prop-drilling", "file": "Dashboard.tsx", "depth": 4, "fix": "use Context or lift state"},
      {"type": "god-component", "file": "UserTable.tsx", "lines": 480, "fix": "split into Table/Row/Cell/Pagination"}
    ],
    "dependency_violations": [
      {"from": "atom/Button.tsx", "to": "organisms/Header.tsx", "rule": "atoms cannot import organisms"}
    ],
    "recommended_pattern": "compound",
    "story_path": "src/components/Tabs/Tabs.stories.tsx"
  }

SIDE EFFECTS:
  - May refactor files (extract hooks, convert HOCs, split components)
  - Writes Storybook stories
  - Updates barrel exports (index.ts)
```

## CLI

```bash
# Audit composition patterns in the codebase
python3 scripts/frontend_agent.py composition --action audit --target ./src/components

# Pick the right pattern for a new component
python3 scripts/frontend_agent.py composition --action pick-pattern --brief "tabbed interface with shared state"

# Extract reusable logic into a hook
python3 scripts/frontend_agent.py composition --action extract-hook --target ./src/components/Search.tsx --logic "debounced-query"

# Refactor an HOC into a hook
python3 scripts/frontend_agent.py composition --action refactor-hoc --target ./src/hocs/withAuth.tsx

# Split a god component
python3 scripts/frontend_agent.py composition --action split-component --target ./src/components/UserTable.tsx
```

## Decision Tree (autonomous)

```
Q: What's the use case?
  SHARED STATEFUL UI (tabs, accordion, dropdown, dialog)
    → COMPOUND COMPONENTS
      <Tabs><TabsList><TabsTrigger value="x"/></TabsList><TabsContent value="x"/></Tabs>
      Implicit state via Context; consumer doesn't pass activeTab prop.
  REUSABLE LOGIC (no UI, just behavior)
    → CUSTOM HOOK
      const { data, mutate } = useResource('user');
      Composable, testable, no nesting tax. Always preferred over HOC.
  RENDER-CUSTOMIZATION (consumer provides JSX for a slot)
    → SLOTS / CHILDREN-BASED COMPOSITION
      <Card>{children}</Card> with named slots via props (left, right, footer)
      Prefer this over render props unless you need to share internal state with the slot.
  CROSS-CUTTING STATE (theme, auth, locale)
    → CONTEXT (but only for low-frequency state)
      Theme, auth session, locale: fine.
      Cart, form state, frequent updates: NOT Context — use Zustand (see state-management).
  CONSUMER NEEDS INTERNAL STATE OF THE COMPONENT
    → RENDER PROPS (rare in modern React — hooks usually win)
      <List renderItem={(item, active) => <Row item={item} active={active}/>}/>
      Only when the consumer needs internals hooks can't expose.

Q: Are you about to write an HOC?
  YES → STOP. Convert to a hook. Hooks do everything HOCs did, without nesting tax or prop collisions.

Q: Are you about to prop-drill past 2 levels?
  YES → STOP. Use Context (if low-frequency) or Zustand (if high-frequency). Don't prop-drill.
```

## Patterns

### Compound components (shared state, flexible layout)
```tsx
const Tabs = ({ children, default_value }) => {
  const [active, setActive] = useState(default_value);
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
};
const TabsList = ({ children }) => <div role="tablist">{children}</div>;
const TabsTrigger = ({ value, children }) => {
  const { active, setActive } = useTabsContext();
  return <button role="tab" aria-selected={active === value} onClick={() => setActive(value)}>{children}</button>;
};
const TabsContent = ({ value, children }) => {
  const { active } = useTabsContext();
  return active === value ? <div role="tabpanel">{children}</div> : null;
};

// Consumer composes freely — no `active` prop drilling
<Tabs default_value="account">
  <TabsList><TabsTrigger value="account">Account</TabsTrigger><TabsTrigger value="billing">Billing</TabsTrigger></TabsList>
  <TabsContent value="account"><AccountForm/></TabsContent>
  <TabsContent value="billing"><BillingForm/></TabsContent>
</Tabs>
```

### Hooks composition (extract logic, testable)
```ts
// ✅ logic extracted — testable in isolation, composable
function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function useSearch() {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query);
  const { data, isFetching } = useQuery({ queryKey: ['search', debounced], queryFn: () => api.search(debounced), enabled: !!debounced });
  return { query, setQuery, results: data, isFetching };
}
```

### Slots / children-based composition (maximum flexibility)
```tsx
<Card>
  <Card.Header><h3>Title</h3></Card.Header>
  <Card.Body>{children}</Card.Body>
  <Card.Footer><Button>Save</Button></Card.Footer>
</Card>
```

### Context (cross-cutting, low-frequency)
```tsx
// Theme, auth, locale — changes rarely. Context is fine.
const ThemeContext = createContext<'light' | 'dark'>('light');
// Cart, form,实时 UI — changes often. Use Zustand, NOT Context.
```

### Render props (rare — when consumer needs internals)
```tsx
<List items={users} renderItem={(user, isActive) => <UserRow user={user} highlighted={isActive} />} />
```

## Anti-Patterns

| Anti-pattern | Why bad | Refactor to |
|--------------|---------|-------------|
| **HOCs** (`withAuth(Component)`) | Nesting tax, prop collisions, type nightmares, no hook rules | Hook (`useAuth()`) called inside the component |
| **Prop drilling > 2 levels** | Fragile, painful to refactor, every intermediary knows too much | Context (low-freq) or Zustand (high-freq) |
| **God components** (>300 lines) | Untestable, unreusable, unreviewable | Split by responsibility (Table → Table/Row/Cell/Pagination) |
| **Non-UI logic in components** | Untestable, duplicate-able | Extract to hook |
| **Inheritance** (`class Foo extends Bar`) | Rigid, hard to compose | Composition (props + hooks) |
| **Render props everywhere** | Pyramid of doom, hook rules awkward | Hooks (95% of cases) |

## Atomic Design Direction

```
atoms      → molecules  → organisms → templates  → pages
Button       FormField    Header       AuthLayout   LoginPage
Input        SearchBar    Sidebar      DashLayout   DashboardPage
Badge        MenuItem     DataTable                 CheckoutPage
Icon         Card         Modal
                          (no imports go UP)
```

Rule: a file may only import from the same level or LOWER. `atoms/Button.tsx` importing `organisms/Header.tsx` is a circular-dependency risk and an architecture violation.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| HOC nesting crashes on hook rules | withAuth(withTheme(withLoading(C))) | Convert all three to hooks, call inside the component |
| Prop drilling makes refactor painful | 4 levels of intermediaries | Introduce Context or Zustand at the right level |
| Component can't be reused | Hardcoded content, no slots | Add `children` + named slots (Header/Body/Footer) |
| God component untestable | 500-line file with 5 responsibilities | Split by responsibility; extract hooks for logic |
| Re-renders cascade from Context | High-frequency state in Context | Move to Zustand; only theme/auth in Context |
| Storybook stories out of date | Component evolved, stories didn't | Regenerate stories after each refactor |

## Self-Healing Loop

When an anti-pattern is found:
1. Identify the type (HOC, prop-drilling, god-component, non-UI-logic, inheritance)
2. Apply the mechanical refactor (HOC → hook, extract hook, split along responsibility boundary)
3. Re-run tests (delegates to `webapp-testing`) + Storybook
4. If the refactor changes public API → route to `api-contract` for component API versioning
5. Max 3 self-heal attempts per file, then escalate (some splits need human design judgment)

## Quality Gates (enforced before "component ready")

- [ ] Zero HOCs in codebase (all converted to hooks)
- [ ] Zero prop drilling > 2 levels
- [ ] No component > 300 lines (split by responsibility)
- [ ] No non-UI logic in components (extracted to hooks)
- [ ] Dependency direction respected (atoms don't import organisms)
- [ ] Every reusable component has a Storybook story (variants + composition)
- [ ] Every public component has TypeScript types (props, ref, return)
- [ ] Compound components expose Context for advanced consumers
- [ ] Slots are named (Header/Body/Footer) not positional
- [ ] `forwardRef` used where ref needs to pass through

## Tools

- **React** — composition primitives (children, Context, hooks, render props)
- **TypeScript** — types for component APIs; `React.ComponentProps<>` for re-exporting
- **Storybook** — showcase patterns + variants; interaction tests for compound components
- **clsx / tailwind-merge** — conditional className composition (no manual string concat)
- **Radix UI** — compound-component reference (best-in-class API design)
- **shadcn/ui** — composition patterns to copy (uses Radix + Tailwind + slots)
- **React DevTools** — verify Context isn't re-rendering the whole tree
- **eslint-plugin-react-hooks** — enforces hooks rules (deps array, no conditional hooks)

## Hard Rules

1. **Never use HOCs.** `withAuth(Component)` → `useAuth()` inside the component. Hooks do everything HOCs did, without nesting tax or prop collisions.
2. **Never prop-drill past 2 levels.** If a prop traverses 3+ components, introduce Context (low-frequency state) or Zustand (high-frequency). Prop drilling is fragile and painful.
3. **Never put non-UI logic in components.** Data fetching, debouncing, formatting, business rules → extract to a hook. Components render; hooks compute.
4. **Always prefer composition over inheritance.** No `class Foo extends Bar`. Use props + hooks. Inheritance is rigid; composition is flexible.
5. **Always respect atomic design direction.** atoms → molecules → organisms → templates → pages. A file may only import same-level or lower. Reversed imports are architecture violations.
6. **Never write a component > 300 lines.** Split by responsibility. If it has 5 responsibilities, it's 5 components (or molecules).
7. **Always use slots / children for flexible composition.** `<Card><Card.Header/></Card>` not `<Card header={...} />`. Slots let consumers compose freely.
8. **Always expose a Context for compound components.** Advanced consumers need access to internal state (e.g. `useTabsContext()` for a custom trigger). Don't lock them out.
9. **Always write a Storybook story for reusable components.** Variants + composition examples. No story = no reuse contract.
10. **Always use `forwardRef` when a component wraps a DOM element.** Consumers need refs to underlying elements for measurement, focus, animation.
