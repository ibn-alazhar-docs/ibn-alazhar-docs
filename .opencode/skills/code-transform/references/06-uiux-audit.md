# UI/UX Code Audit — Components, Design System, Accessibility

> Read this during Dimension 6 (UI/UX) of the AUDIT phase.

## Audit Checklist

```
[ ] Are components <200 lines? (larger = extract)
[ ] Is there a design system (tokens, primitives, composites)?
[ ] Are colors/spacing from tokens, not hardcoded?
[ ] Is there prop drilling (>2 levels)?
[ ] Do components handle loading/error/success states?
[ ] Are there accessibility issues (WCAG)?
[ ] Is state management appropriate (server state vs client state)?
[ ] Are tests/styles co-located with components?
[ ] Are components reusable across features?
[ ] Is there a consistent file structure?
```

## Component Structure Assessment

### File Structure (Feature-Based)
```
BAD (type-based):
components/
  Button.tsx
  UserCard.tsx
  OrderList.tsx
hooks/
  useUser.ts
  useOrder.ts
styles/
  button.css
  user-card.css

GOOD (feature-based):
features/
  auth/
    components/
    hooks/
    services/
    types/
  orders/
    components/
    hooks/
    services/
    types/
shared/
  components/    (Button, Input — cross-feature)
  hooks/
  utils/
```

### Component Size
- **≤50 lines**: ideal
- **50-200 lines**: acceptable
- **>200 lines**: extract sub-components
- **>500 lines**: god component — must split

### Component Responsibilities
A component should do ONE of:
- **Render** (presentational): display data from props
- **Manage state** (container): fetch data, manage local state
- **Both** (with hooks): use custom hooks for logic, component for rendering

**BAD**: component that fetches data + transforms it + renders + handles errors + manages pagination
**GOOD**: component that renders + uses `useOrders()` hook for everything else

## Design System Compliance

### Design Tokens
```typescript
// tokens.ts — single source of truth
export const colors = {
  primary: '#007bff',
  danger: '#dc3545',
  success: '#28a745',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

export const typography = {
  body: '16px',
  heading: '24px',
  small: '12px',
};
```

### Check for Hardcoded Values
```bash
# Find hardcoded colors
git grep -n "#[0-9a-fA-F]\{6\}" -- "*.tsx" "*.jsx" "*.css"

# Find hardcoded spacing
git grep -n "padding.*[0-9]px\|margin.*[0-9]px" -- "*.tsx" "*.jsx" "*.css"
```

## Accessibility (WCAG)

### Checklist
```
[ ] All images have alt text (or alt="" for decorative)
[ ] All form inputs have labels
[ ] Color contrast ≥ 4.5:1 (normal text) or 3:1 (large text)
[ ] Keyboard navigation works (Tab, Enter, Escape)
[ ] Focus indicators visible
[ ] Semantic HTML (nav, main, section, article, not just div)
[ ] ARIA attributes used correctly (not overused)
[ ] Skip-to-content link present
```

### Automated Tools
- **axe-core**: browser extension + CI integration
- **Lighthouse**: Chrome DevTools → Lighthouse tab
- **jest-axe**: accessibility testing in Jest

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# In tests
import { axe } from 'jest-axe';
expect(await axe(container)).toHaveNoViolations();
```

## State Management

### Server State vs Client State
- **Server state**: use React Query / SWR (caching, invalidation, retry)
- **Client state (UI)**: use Context / Zustand / Redux
- **Form state**: use React Hook Form / Formik

**BAD**: putting server data in Redux
```typescript
// Don't do this
const [users, setUsers] = useState([]);
useEffect(() => {
    fetchUsers().then(setUsers);
}, []);
```

**GOOD**: React Query for server state
```typescript
const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
});
```

## UI/UX Improvement Recipes

### UIR1. Extract Sub-Component
```tsx
// Before: 300-line god component
function UserDashboard({ users, orders, stats }) {
    // 100 lines of user table
    // 100 lines of order list
    // 100 lines of stats chart
}

// After: extracted sub-components
function UserDashboard({ users, orders, stats }) {
    return (
        <>
            <UserTable users={users} />
            <OrderList orders={orders} />
            <StatsChart stats={stats} />
        </>
    );
}
```

### UIR2. Replace Prop Drilling with Context
```tsx
// Before: prop drilling through 3 levels
<App theme="dark">
  <Layout theme="dark">
    <Sidebar theme="dark">
      <Button theme="dark" />
    </Sidebar>
  </Layout>
</App>

// After: Context
const ThemeContext = createContext('light');

<App><ThemeContext.Provider value="dark">
  <Layout><Sidebar><Button /></Sidebar></Layout>
</ThemeContext.Provider></App>

// In Button:
const theme = useContext(ThemeContext);
```

### UIR3. Add Loading/Error States
```tsx
// Before: no loading state (blank screen while fetching)
function UserList() {
    const [users, setUsers] = useState([]);
    useEffect(() => { fetchUsers().then(setUsers); }, []);
    return users.map(u => <UserCard key={u.id} user={u} />);
}

// After: handle all 3 states
function UserList() {
    const { data: users, isLoading, error } = useQuery(['users'], fetchUsers);

    if (isLoading) return <UserListSkeleton />;
    if (error) return <ErrorMessage error={error} />;
    if (!users?.length) return <EmptyState />;

    return users.map(u => <UserCard key={u.id} user={u} />);
}
```

### UIR4. Extract Custom Hook
```tsx
// Before: logic mixed with rendering
function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetchUsers()
            .then(data => { setUsers(data); setLoading(false); })
            .catch(err => { setError(err); setLoading(false); });
    }, []);
    // ... 50 more lines of rendering
}

// After: logic in hook, rendering in component
function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetchUsers()
            .then(data => { setUsers(data); setLoading(false); })
            .catch(err => { setError(err); setLoading(false); });
    }, []);
    return { users, loading, error };
}

function UserList() {
    const { users, loading, error } = useUsers();
    // ... only rendering
}
```

## Summary

- **Structure**: feature-based folders, components <200 lines, co-locate tests/styles
- **Design system**: tokens for colors/spacing/typography. No hardcoded values.
- **Accessibility**: WCAG compliance. Use axe-core for automated checking.
- **State**: server state (React Query/SWR) vs client state (Context/Zustand). Don't mix.
- **Components**: handle loading/error/success. Extract hooks for logic. Extract sub-components for size.
- **UI improvements are `refactor:` (structural) or `fix:` (accessibility bugs)**.
