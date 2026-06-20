# SCMS.Mobile — Dependency Injection

This document explains how dependency injection (DI) is implemented in the SCMS.Mobile Flutter project. Rather than using `get_it` + `injectable`, the project leverages **Riverpod's provider system** as both a DI container and reactive state manager.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concept](#core-concept)
3. [Provider Registration Files](#provider-registration-files)
4. [The Provider Dependency Graph](#the-provider-dependency-graph)
5. [Provider Types in Use](#provider-types-in-use)
6. [Infrastructure Providers (Core Layer)](#infrastructure-providers-core-layer)
7. [Feature Providers (Per-Feature)](#feature-providers-per-feature)
8. [Bootstrap & ProviderScope](#bootstrap--providerscope)
9. [Consuming Providers](#consuming-providers)
10. [Testing & Overrides](#testing--overrides)
11. [Adding a New Provider — Step by Step](#adding-a-new-provider--step-by-step)
12. [Design Decisions & Rationale](#design-decisions--rationale)
13. [Common Pitfalls](#common-pitfalls)

---

## Overview

The project uses **`flutter_riverpod` v3.3.1** for all dependency injection needs. Every injectable dependency (services, repositories, controllers, configuration) is exposed as a Riverpod `Provider`. There is no service locator, no code generation (`build_runner`), and no annotation-based registration.

Key properties of this approach:
- **Type-safe** — all providers are strongly typed
- **Compile-time checked** — no runtime registration failures
- **Reactive** — downstream providers automatically rebuild when upstream dependencies change
- **Testable** — any provider can be overridden in tests via `ProviderScope.overrides`
- **No singletons** — lifecycle is managed by Riverpod, not by manual singleton patterns

---

## Core Concept

In Riverpod-based DI, each dependency is defined as a **top-level `Provider`** declaration. Dependencies are resolved by reading other providers via the `ref` parameter:

```dart
// 1. Define a provider for the dependency
final myServiceProvider = Provider<MyService>((ref) {
  // 2. Resolve upstream dependencies
  final apiClient = ref.watch(apiClientProvider);
  // 3. Construct and return
  return MyService(apiClient: apiClient);
});
```

Consumers (widgets, other providers) access the dependency via `ref.watch()` or `ref.read()`.

---

## Provider Registration Files

Unlike `get_it`-based projects that centralise all registrations in a single file, this project **co-locates** each provider with the class it provides. The registration files are:

### Core Infrastructure

| File | Providers | Purpose |
|------|-----------|---------|
| [`app_config.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/core/config/app_config.dart) | `appConfigProvider` | Application configuration (API URL, flavor, timeouts) |
| [`app_providers.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/core/di/app_providers.dart) | `secureTokenStoreProvider`, `apiClientProvider` | Core infrastructure wiring |
| [`app_localizations.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/core/i18n/app_localizations.dart) | `appLocaleProvider`, `appStringsProvider` | i18n locale and string selection |

### Feature-Level

| File | Providers | Purpose |
|------|-----------|---------|
| [`auth_repository.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/auth/data/auth_repository.dart) | `authRepositoryProvider` | Auth API operations |
| [`auth_controller.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/auth/application/auth_controller.dart) | `authControllerProvider` | Auth state (sign in / out) |
| [`appointments_repository.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/appointments/data/appointments_repository.dart) | `appointmentsRepositoryProvider` | Appointments API operations |
| [`appointments_controller.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/appointments/application/appointments_controller.dart) | `appointmentsControllerProvider` | Appointments state + actions |
| [`dashboard_repository.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/dashboard/data/dashboard_repository.dart) | `dashboardRepositoryProvider` | Dashboard API operations |
| [`dashboard_controller.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/dashboard/application/dashboard_controller.dart) | `doctorDashboardProvider`, `patientDashboardProvider` | Dashboard data loading |
| [`patients_repository.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/patients/data/patients_repository.dart) | `patientsRepositoryProvider` | Patients API operations |
| [`patients_controller.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/features/patients/application/patients_controller.dart) | `selectedPatientIdProvider`, `patientsListProvider`, `patientDetailProvider`, `patientHistoryProvider`, `patientSummaryProvider` | Patient state + queries |
| [`app_router.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/app/router/app_router.dart) | `appRouterProvider` | GoRouter instance with auth redirect |

---

## The Provider Dependency Graph

```
appConfigProvider ◄─── (overridden in bootstrap)
    │
    ├──► apiClientProvider
    │        │
    │        ├──► authRepositoryProvider ──► authControllerProvider
    │        │                                      │
    │        │                               appRouterProvider (watches auth state)
    │        │
    │        ├──► appointmentsRepositoryProvider ──► appointmentsControllerProvider
    │        │
    │        ├──► dashboardRepositoryProvider ──► doctorDashboardProvider
    │        │                                ──► patientDashboardProvider
    │        │
    │        └──► patientsRepositoryProvider ──► patientsListProvider
    │                                       ──► patientDetailProvider
    │                                       ──► patientHistoryProvider
    │                                       ──► patientSummaryProvider
    │
    └──► (enableNetworkLogging → Dio LogInterceptor config)

secureTokenStoreProvider
    │
    ├──► apiClientProvider (AuthInterceptor uses it)
    └──► authRepositoryProvider (token read/write)

appLocaleProvider ──► appStringsProvider
```

### Dependency Chain Summary

```
Config / Storage (infrastructure)
    │
    ▼
ApiClient (network layer)
    │
    ▼
Repositories (data layer — one per feature)
    │
    ▼
Controllers / Notifiers (application layer — state management)
    │
    ▼
Widgets (presentation layer — ConsumerWidget / ConsumerStatefulWidget)
```

---

## Provider Types in Use

The project uses several Riverpod provider types, chosen based on the lifecycle and complexity needs:

### 1. `Provider<T>` — Synchronous Singleton

Used for dependencies that should live for the entire app lifecycle and are synchronously constructible.

```dart
// core/di/app_providers.dart
final secureTokenStoreProvider = Provider<SecureTokenStore>((ref) {
  return const SecureTokenStore();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    config: ref.watch(appConfigProvider),
    tokenStore: ref.watch(secureTokenStoreProvider),
  );
});
```

**When to use:** Services, repositories, configurations, routers — anything that is created once and reused.

### 2. `AsyncNotifierProvider<N, T>` — Complex Async State

Used when the state involves async initialisation (e.g., restoring a session) and has user-triggered mutations (sign in, sign out).

```dart
// features/auth/application/auth_controller.dart
final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSession?>(AuthController.new);

class AuthController extends AsyncNotifier<AuthSession?> {
  @override
  FutureOr<AuthSession?> build() {
    return ref.watch(authRepositoryProvider).restoreSession();
  }

  Future<void> signIn({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signIn(email: email, password: password),
    );
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = const AsyncData(null);
  }
}
```

**When to use:** Feature controllers that need both async initialisation and imperative methods.

### 3. `NotifierProvider.autoDispose<N, S>` — Rich Mutable State

Used for complex UI state objects with multiple fields and mutation methods.

```dart
// features/appointments/application/appointments_controller.dart
final appointmentsControllerProvider =
    NotifierProvider.autoDispose<AppointmentsNotifier, AppointmentsState>(
  AppointmentsNotifier.new,
);

class AppointmentsNotifier extends Notifier<AppointmentsState> {
  @override
  AppointmentsState build() {
    Future.microtask(fetchAppointments);
    return AppointmentsState.initial();
  }

  Future<void> fetchAppointments() async { /* ... */ }
  void changeStatus(String status) { /* ... */ }
  void changeRange(String range) { /* ... */ }
}
```

**When to use:** Screens with filters, pagination, or multiple user actions that modify local state.

### 4. `FutureProvider.autoDispose<T>` — Simple Async Read

Used for straightforward one-shot data fetching with no user mutations.

```dart
// features/dashboard/application/dashboard_controller.dart
final doctorDashboardProvider = FutureProvider.autoDispose<DoctorDashboardResponse>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  return repository.getDoctorDashboard();
});
```

**When to use:** Read-only data that should be fetched when the provider is first listened to and disposed when the listener goes away.

### 5. `FutureProvider.autoDispose.family<T, Arg>` — Parameterised Async Read

Used when the query depends on an external parameter (e.g., a patient ID).

```dart
// features/patients/application/patients_controller.dart
final patientDetailProvider = FutureProvider.autoDispose.family<PatientProfileResponse, int>((ref, id) async {
  final repository = ref.watch(patientsRepositoryProvider);
  return repository.getPatientProfileById(id);
});
```

**When to use:** Detail screens or queries parameterised by ID.

### 6. `StateProvider<T>` — Simple Value Holder

Used for small, primitive state values.

```dart
// features/patients/application/patients_controller.dart
final selectedPatientIdProvider = StateProvider<int?>((ref) => null);

// core/i18n/app_localizations.dart
final appLocaleProvider = StateProvider<AppLocale>((ref) => AppLocale.en);
```

**When to use:** Selections, toggles, current IDs — anything where you just need to read/write a single value.

---

## Infrastructure Providers (Core Layer)

These are defined in `lib/src/core/` and form the foundation of the dependency graph.

### `appConfigProvider`

```dart
// core/config/app_config.dart
final appConfigProvider = Provider<AppConfig>((ref) {
  return AppConfig.fromEnvironment();
});
```

Provides the app's configuration (API base URL, flavor, timeouts). **Overridden** in `bootstrap()` with a resolved instance, and in tests with test-specific values.

### `secureTokenStoreProvider`

```dart
// core/di/app_providers.dart
final secureTokenStoreProvider = Provider<SecureTokenStore>((ref) {
  return const SecureTokenStore();
});
```

Wraps `FlutterSecureStorage` for encrypted JWT token persistence. Provides methods: `readToken()`, `saveToken()`, `readRole()`, `saveRole()`, `clear()`, etc.

### `apiClientProvider`

```dart
// core/di/app_providers.dart
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    config: ref.watch(appConfigProvider),
    tokenStore: ref.watch(secureTokenStoreProvider),
  );
});
```

Creates a `Dio`-based HTTP client with:
- Base URL from `AppConfig`
- `AuthInterceptor` for automatic Bearer token injection
- Optional `LogInterceptor` when network logging is enabled

---

## Feature Providers (Per-Feature)

Each feature follows the pattern: **Repository Provider → Controller Provider**.

### Auth Feature

```
secureTokenStoreProvider ──┐
                           ▼
apiClientProvider ──► authRepositoryProvider ──► authControllerProvider
```

- `authRepositoryProvider` — `Provider<AuthRepository>` — HTTP sign-in/register/restore + token storage
- `authControllerProvider` — `AsyncNotifierProvider<AuthController, AuthSession?>` — manages auth state

### Appointments Feature

```
apiClientProvider ──► appointmentsRepositoryProvider ──► appointmentsControllerProvider
```

- `appointmentsRepositoryProvider` — `Provider<AppointmentsRepository>` — CRUD for appointments
- `appointmentsControllerProvider` — `NotifierProvider.autoDispose<AppointmentsNotifier, AppointmentsState>` — manages list state with filters

### Dashboard Feature

```
apiClientProvider ──► dashboardRepositoryProvider ──┬──► doctorDashboardProvider
                                                    └──► patientDashboardProvider
```

- `dashboardRepositoryProvider` — `Provider<DashboardRepository>` — doctor/patient dashboard + PDF + payments
- `doctorDashboardProvider` — `FutureProvider.autoDispose<DoctorDashboardResponse>`
- `patientDashboardProvider` — `FutureProvider.autoDispose<PatientDashboardResponse>`

### Patients Feature

```
apiClientProvider ──► patientsRepositoryProvider ──┬──► patientsListProvider
                                                   ├──► patientDetailProvider (family)
                                                   ├──► patientHistoryProvider (family)
                                                   └──► patientSummaryProvider (family)

selectedPatientIdProvider (standalone StateProvider)
```

---

## Bootstrap & ProviderScope

The app's dependency graph is initialised in [`bootstrap.dart`](file:///d:/Projects/SCMS/SCMS.Mobile/lib/src/app/bootstrap.dart):

```dart
Future<void> bootstrap({AppConfig? config}) async {
  final resolvedConfig = config ?? AppConfig.fromEnvironment();

  // Configure logging
  Logger.root.level = resolvedConfig.enableNetworkLogging ? Level.ALL : Level.INFO;
  Logger.root.onRecord.listen((record) {
    debugPrint('[${record.level.name}] ${record.loggerName}: ${record.message}');
  });

  // Run the app with the DI container
  runApp(
    ProviderScope(
      overrides: [appConfigProvider.overrideWithValue(resolvedConfig)],
      child: const ScmsApp(),
    ),
  );
}
```

### What happens at startup:

1. `AppConfig.fromEnvironment()` reads compile-time environment variables
2. Logging is configured based on the config
3. `ProviderScope` is created with `appConfigProvider` overridden to use the resolved config
4. When `ScmsApp` builds, it watches `appRouterProvider`
5. `appRouterProvider` watches `authControllerProvider`
6. `authControllerProvider.build()` calls `restoreSession()` — triggering the full provider chain down to `apiClientProvider` → `secureTokenStoreProvider`

---

## Consuming Providers

### In Widgets

Extend `ConsumerWidget` or `ConsumerStatefulWidget`:

```dart
class DashboardPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Reactive — rebuilds when data changes
    final dashData = ref.watch(doctorDashboardProvider);

    return dashData.when(
      data: (data) => _buildContent(data),
      loading: () => const CircularProgressIndicator(),
      error: (e, st) => Text(e.toString()),
    );
  }
}
```

### In Other Providers

Use `ref.watch()` for reactive dependencies and `ref.read()` for one-shot access:

```dart
final appointmentsRepositoryProvider = Provider<AppointmentsRepository>((ref) {
  return AppointmentsRepository(ref.watch(apiClientProvider)); // reactive
});
```

```dart
class AuthController extends AsyncNotifier<AuthSession?> {
  Future<void> signIn(...) async {
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signIn(...), // one-shot
    );
  }
}
```

### `ref.watch()` vs `ref.read()` — Guidelines

| Use | When |
|-----|------|
| `ref.watch()` | In `build()` methods, provider definitions — when you need reactive updates |
| `ref.read()` | In event handlers, callbacks, imperative methods — when you need a one-time value |

---

## Testing & Overrides

Riverpod's `ProviderScope.overrides` make it trivial to swap real implementations for fakes in tests:

```dart
// test/app_smoke_test.dart
class FakeTokenStore extends SecureTokenStore {
  const FakeTokenStore();

  @override
  Future<String?> readToken() async => null;

  @override
  Future<void> saveToken(String token) async {}

  @override
  Future<void> clear() async {}
}

void main() {
  testWidgets('shows login when no session', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              flavor: AppFlavor.development,
              apiBaseUrl: 'http://localhost:5140/',
              enableNetworkLogging: false,
            ),
          ),
          secureTokenStoreProvider.overrideWithValue(const FakeTokenStore()),
        ],
        child: const ScmsApp(),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('SCMS'), findsOneWidget);
  });
}
```

### Override Strategies

| Strategy | When |
|----------|------|
| `provider.overrideWithValue(instance)` | When you have a pre-built fake/mock |
| `provider.overrideWith((ref) => ...)` | When the fake itself needs other providers |

---

## Adding a New Provider — Step by Step

### Scenario: Adding an `InventoryService` and `InventoryRepository`

**Step 1.** Create domain models in `features/inventory/domain/inventory_models.dart`:

```dart
class InventoryItem {
  const InventoryItem({required this.id, required this.name, required this.quantity});

  factory InventoryItem.fromJson(Map<String, dynamic> json) { /* ... */ }

  final int id;
  final String name;
  final int quantity;
}
```

**Step 2.** Create the repository with its provider in `features/inventory/data/inventory_repository.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/app_providers.dart';
import '../domain/inventory_models.dart';

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  return InventoryRepository(ref.watch(apiClientProvider));
});

class InventoryRepository {
  const InventoryRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<InventoryItem>> getItems() async {
    final response = await _apiClient.get('/Inventory');
    // ... standard envelope parsing
  }
}
```

**Step 3.** Create the controller in `features/inventory/application/inventory_controller.dart`:

```dart
final inventoryListProvider = FutureProvider.autoDispose<List<InventoryItem>>((ref) async {
  return ref.watch(inventoryRepositoryProvider).getItems();
});
```

**Step 4.** Build the UI in `features/inventory/presentation/inventory_page.dart`:

```dart
class InventoryPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(inventoryListProvider);
    return items.when(
      data: (list) => ListView.builder(/* ... */),
      loading: () => const CircularProgressIndicator(),
      error: (e, st) => Text(e.toString()),
    );
  }
}
```

**Step 5.** Register the route in `app_router.dart`:

```dart
GoRoute(path: '/inventory', builder: (c, s) => const InventoryPage()),
```

> **Note:** There is no central registration file to update. The provider is automatically available because it's a top-level Dart declaration imported where needed.

---

## Design Decisions & Rationale

### Why Riverpod instead of `get_it` + `injectable`?

| Factor | Riverpod | get_it + injectable |
|--------|----------|-------------------|
| Reactive updates | ✅ Built-in | ❌ Manual streams/listeners |
| Compile-time safety | ✅ Type-checked | ⚠️ Runtime registration |
| Code generation | ❌ Not required | ✅ Required (`build_runner`) |
| Test overrides | ✅ `ProviderScope.overrides` | ⚠️ `get_it.registerSingleton` swap |
| State management | ✅ Unified with DI | ❌ Separate solution needed |
| Learning curve | Moderate | Lower |

### Why co-locate providers instead of a central DI file?

1. **Discoverability** — the provider is right next to the class it constructs
2. **Minimal imports** — only import what you need
3. **Feature isolation** — adding/removing a feature doesn't require editing a shared file
4. **No merge conflicts** — independent teams can work on features in parallel

### Why no code generation (`@riverpod` annotations)?

The project intentionally uses the **manual Riverpod API** instead of `riverpod_generator`:
- Fewer dev dependencies
- No `build_runner` step in the build pipeline
- Explicit provider definitions are easy to read and debug
- Simpler onboarding for new developers

---

## Common Pitfalls

### 1. Using `ref.watch()` in callbacks

```dart
// ❌ WRONG — causes rebuild on every change
onPressed: () {
  final repo = ref.watch(authRepositoryProvider); // Don't watch in callbacks!
}

// ✅ CORRECT — one-shot read
onPressed: () {
  final repo = ref.read(authRepositoryProvider);
}
```

### 2. Forgetting `.autoDispose`

```dart
// ⚠️ This provider will live forever once first read
final myProvider = FutureProvider<Data>((ref) async { ... });

// ✅ This provider is disposed when no widget is listening
final myProvider = FutureProvider.autoDispose<Data>((ref) async { ... });
```

Use `.autoDispose` for feature-level providers. Omit it only for providers that must survive navigation (like `authControllerProvider`).

### 3. Circular dependencies

If Provider A watches Provider B, and Provider B watches Provider A, Riverpod will throw a `ProviderException`. Design the graph as a DAG (directed acyclic graph):

```
Config → ApiClient → Repository → Controller → Widget
```

### 4. Watching in `Notifier` methods

```dart
class MyNotifier extends Notifier<MyState> {
  // ❌ WRONG — ref.watch() inside a method
  Future<void> fetchData() async {
    final repo = ref.watch(myRepoProvider); // Will cause issues
  }

  // ✅ CORRECT — use ref.read() for imperative actions
  Future<void> fetchData() async {
    final repo = ref.read(myRepoProvider);
  }
}
```

Use `ref.watch()` only in `build()`. Use `ref.read()` in all other methods.
