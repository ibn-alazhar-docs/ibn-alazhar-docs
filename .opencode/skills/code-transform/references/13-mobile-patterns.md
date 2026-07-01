# Mobile App Patterns — iOS, Android, React Native, Flutter

> Read this when auditing or transforming mobile applications.

## Table of Contents

1. [Platform Detection](#platform-detection)
2. [iOS (SwiftUI)](#ios-swiftui)
3. [Android (Jetpack Compose)](#android-jetpack-compose)
4. [React Native](#react-native)
5. [Flutter](#flutter)
6. [Cross-Platform Decision](#cross-platform-decision)

---

## Platform Detection

| Indicator                                           | Platform         |
| --------------------------------------------------- | ---------------- |
| `*.swift`, `*.xcodeproj`, `Package.swift`           | iOS (Swift)      |
| `*.kt`, `*.xml` (Android), `build.gradle` (Android) | Android (Kotlin) |
| `react-native`, `*.tsx` + `metro.config.js`         | React Native     |
| `*.dart`, `pubspec.yaml`                            | Flutter          |

---

## iOS (SwiftUI)

### Recommended Architecture: MVVM + @Observable (Swift 5.9+)

```swift
// Model (domain)
struct Order: Identifiable {
    let id: UUID
    var status: OrderStatus
    var total: Decimal
}

// ViewModel (@Observable for SwiftUI)
@Observable
class OrderViewModel {
    var orders: [Order] = []
    var isLoading = false
    var error: String?

    func loadOrders() async {
        isLoading = true
        defer { isLoading = false }
        do {
            orders = try await orderRepository.fetchAll()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// View (SwiftUI)
struct OrderListView: View {
    @State private var viewModel = OrderViewModel()

    var body: some View {
        NavigationStack {
            List(viewModel.orders) { order in
                OrderRow(order: order)
            }
            .overlay {
                if viewModel.isLoading { ProgressView() }
            }
            .alert("Error", isPresented: .constant(viewModel.error != nil)) {
                Button("OK") { viewModel.error = nil }
            } message: {
                Text(viewModel.error ?? "")
            }
        }
        .task { await viewModel.loadOrders() }
    }
}
```

### iOS Checklist

```
[ ] ViewModels don't import UIKit/SwiftUI (testable)
[ ] @Observable used (not ObservableObject for new code)
[ ] async/await used (not completion handlers)
[ ] actor for shared mutable state (Swift 6 concurrency)
[ ] NavigationStack (not NavigationView — deprecated)
[ ] No force unwrapping (!) except IBOutlets
[ ] Error handling with Result or throws (not optional)
[ ] Dependency injection (not singletons)
```

### For Complex Apps: TCA (The Composable Architecture)

When MVVM becomes unwieldy (complex state, many side effects):

- Unidirectional data flow: State → Action → Reducer → Effect
- Fully testable
- Composable (features can be combined)
- See pointfreeco/swift-composable-architecture

---

## Android (Jetpack Compose)

### Recommended Architecture: Clean Architecture + MVVM

```
UI Layer (Compose + ViewModel)
  ↓
Domain Layer (Use Cases)
  ↓
Data Layer (Repositories)
```

```kotlin
// ViewModel
@HiltViewModel
class OrderViewModel @Inject constructor(
    private val getOrdersUseCase: GetOrdersUseCase
) : ViewModel() {
    private val _uiState = MutableStateFlow<OrderUiState>(OrderUiState.Loading)
    val uiState: StateFlow<OrderUiState> = _uiState.asStateFlow()

    init { loadOrders() }

    fun loadOrders() {
        viewModelScope.launch {
            _uiState.value = OrderUiState.Loading
            getOrdersUseCase()
                .onSuccess { _uiState.value = OrderUiState.Success(it) }
                .onFailure { _uiState.value = OrderUiState.Error(it.message) }
        }
    }
}

// Compose UI
@Composable
fun OrderScreen(viewModel: OrderViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    when (val state = uiState) {
        is OrderUiState.Loading -> CircularProgressIndicator()
        is OrderUiState.Success -> OrderList(orders = state.orders)
        is OrderUiState.Error -> ErrorMessage(state.message)
    }
}
```

### Android Checklist

```
[ ] ViewModel has no Android framework imports (testable)
[ ] StateFlow used (not LiveData for new code)
[ ] Hilt for DI (not manual or Dagger)
[ ] Coroutines + Flow (not RxJava for new code)
[ ] Compose (not XML views for new code)
[ ] Repository pattern (not direct DB access from ViewModel)
[ ] Navigation Compose (not Navigation component with fragments)
[ ] No GlobalScope (use viewModelScope / lifecycleScope)
```

---

## React Native

### Recommended Architecture: Hooks-Based

```typescript
// Custom hook for business logic
function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await api.getOrders();
            setOrders(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return { orders, loading, error, refresh: loadOrders };
}

// Component
function OrderScreen() {
    const { orders, loading, error, refresh } = useOrders();

    if (loading) return <ActivityIndicator />;
    if (error) return <ErrorMessage error={error} onRetry={refresh} />;

    return <FlatList data={orders} renderItem={renderOrder} />;
}
```

### React Native Checklist

```
[ ] Functional components with hooks (not class components)
[ ] Custom hooks for business logic
[ ] React Query/SWR for server state (not useState for API data)
[ ] Navigation: React Navigation 6+ (not legacy)
[ ] No inline styles (use StyleSheet)
[ ] Platform-specific code with Platform.OS (not conditional imports)
[ ] Hermes engine enabled (better performance)
[ ] New Architecture enabled (Fabric + TurboModules) if RN 0.74+
```

---

## Flutter

### Recommended Architecture: Clean Architecture + Riverpod

```dart
// Domain
abstract class OrderRepository {
  Future<List<Order>> getOrders();
}

// Data
class OrderRepositoryImpl implements OrderRepository {
  final ApiClient _api;
  OrderRepositoryImpl(this._api);

  @override
  Future<List<Order>> getOrders() async {
    final response = await _api.get('/orders');
    return response.map(Order.fromJson).toList();
  }
}

// Provider (Riverpod)
final orderProvider = FutureProvider<List<Order>>((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getOrders();
});

// Presentation
class OrderScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(orderProvider);

    return ordersAsync.when(
      loading: () => CircularProgressIndicator(),
      error: (err, stack) => Text('Error: $err'),
      data: (orders) => ListView(
        children: orders.map((o) => OrderTile(order: o)).toList(),
      ),
    );
  }
}
```

### Flutter Checklist

```
[ ] Business logic NOT in widgets (use controllers/providers)
[ ] Riverpod or Bloc for state (not setState for complex state)
[ ] Repository pattern (not direct API calls from widgets)
[ ] go_router for navigation (not Navigator 1.0)
[ ] No hardcoded strings (use l10n/intl)
[ ] const constructors where possible (performance)
[ ] ThemeData for styling (not hardcoded colors)
[ ] Error handling with Either/Result (not exceptions in widgets)
```

---

## Cross-Platform Decision

| Factor                                        | Choose                                       |
| --------------------------------------------- | -------------------------------------------- |
| Performance-critical (games, video, AR)       | Native (SwiftUI / Compose)                   |
| Deep platform integration (widgets, APIs)     | Native                                       |
| Rapid development, shared codebase            | RN or Flutter                                |
| Team has web expertise (React)                | React Native                                 |
| Team wants maximum code sharing               | Flutter                                      |
| Need to integrate with native code frequently | Flutter (better platform channels) or Native |

### Offline-First (All Platforms)

Mobile apps MUST work offline:

- Local database (CoreData / Room / SQLite / Realm / WatermelonDB)
- Sync when online (not blocking the UI)
- Conflict resolution strategy (last-write-wins, merge, CRDT)
- UI shows local data immediately, syncs in background

---

## Summary

- **iOS**: MVVM + @Observable (SwiftUI). TCA for complex apps. Swift 6 concurrency (actor).
- **Android**: Clean Architecture + MVVM + Compose. Hilt for DI. StateFlow + Coroutines.
- **React Native**: Hooks-based. Custom hooks for logic. React Query for server state.
- **Flutter**: Clean Architecture + Riverpod. Repository pattern. go_router.
- **All platforms**: ViewModels testable (no framework imports). DI (not singletons). Offline-first.
- **Choose native for performance, cross-platform for speed**.
