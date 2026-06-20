# SCMS.Mobile — Architecture

This document describes the architecture of the **SCMS.Mobile** Flutter application — the mobile client for the Smart Clinic Management System (SCMS). It explains the project structure, layer responsibilities, how components communicate, and the conventions that keep the codebase maintainable.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Project Structure](#project-structure)
3. [Layer Responsibilities](#layer-responsibilities)
4. [Feature Module Anatomy](#feature-module-anatomy)
5. [State Management](#state-management)
6. [Routing & Navigation](#routing--navigation)
7. [Networking & API Integration](#networking--api-integration)
8. [Authentication Flow](#authentication-flow)
9. [Theming & Design System](#theming--design-system)
10. [Internationalisation (i18n)](#internationalisation-i18n)
11. [Shared Widgets](#shared-widgets)
12. [Platform Utilities](#platform-utilities)
13. [Testing](#testing)
14. [Key Dependencies](#key-dependencies)
15. [Adding a New Feature — Checklist](#adding-a-new-feature--checklist)
16. [Relationship to the Backend](#relationship-to-the-backend)
17. [Best Practices & Conventions](#best-practices--conventions)

---

## High-Level Overview

```
┌──────────────────────────────────────────────────────────┐
│                   SCMS.Mobile (Flutter)                   │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │   Auth   │  │Dashboard │  │ Appoint- │  │Patients │  │
│  │ Feature  │  │ Feature  │  │  ments   │  │ Feature │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
│       │             │             │              │        │
│  ┌────▼─────────────▼─────────────▼──────────────▼────┐  │
│  │                 Core Infrastructure                 │  │
│  │   DI · ApiClient · TokenStore · Config · Theme      │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │ HTTP (Dio)                        │
└───────────────────────┼──────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   SCMS.Api (.NET 8)   │
            │  REST + JWT + SignalR  │
            └───────────────────────┘
```

The mobile app is a **pure Flutter** client that communicates with the SCMS backend exclusively over HTTP REST APIs. It uses **Riverpod** for state management and dependency injection, and **go_router** for declarative navigation.

---

## Project Structure

```
SCMS.Mobile/
├── assets/
│   ├── icons/                 # SVG/icon assets (gitkeep placeholder)
│   └── images/                # Image assets (gitkeep placeholder)
│
├── lib/
│   ├── main.dart              # Entry point → bootstrap()
│   └── src/
│       ├── app/               # App-level wiring
│       │   ├── app.dart       # Root MaterialApp.router widget (ScmsApp)
│       │   ├── bootstrap.dart # Initialises logging, ProviderScope, runs app
│       │   ├── router/
│       │   │   └── app_router.dart   # GoRouter config + auth redirect guard
│       │   └── theme/
│       │       └── app_theme.dart    # Material 3 light/dark ThemeData
│       │
│       ├── core/              # Cross-cutting infrastructure
│       │   ├── config/
│       │   │   └── app_config.dart        # AppConfig + AppFlavor (env-driven)
│       │   ├── constants/
│       │   │   └── app_constants.dart     # App-wide constants
│       │   ├── di/
│       │   │   └── app_providers.dart     # Core Riverpod providers
│       │   ├── errors/
│       │   │   └── app_exception.dart     # Unified error type
│       │   ├── i18n/
│       │   │   └── app_localizations.dart # EN/MM string tables + providers
│       │   ├── network/
│       │   │   ├── api_client.dart        # Dio wrapper (get/post/put/patch/delete)
│       │   │   └── auth_interceptor.dart  # Bearer token injection
│       │   ├── storage/
│       │   │   └── secure_token_store.dart # flutter_secure_storage wrapper
│       │   ├── utils/
│       │   │   ├── pdf_download_helper.dart  # Platform-conditional PDF save
│       │   │   ├── pdf_download_mobile.dart
│       │   │   ├── pdf_download_web.dart
│       │   │   └── pdf_download_stub.dart
│       │   └── widgets/
│       │       └── brand_logo.dart        # CustomPaint SCMS logo
│       │
│       ├── features/          # Feature modules (each self-contained)
│       │   ├── appointments/
│       │   │   ├── application/  → AppointmentsNotifier (Notifier<State>)
│       │   │   ├── data/         → AppointmentsRepository
│       │   │   ├── domain/       → AppointmentDetailsResponse, BookAppointmentRequest
│       │   │   └── presentation/ → AppointmentsPage
│       │   ├── auth/
│       │   │   ├── application/  → AuthController (AsyncNotifier<AuthSession?>)
│       │   │   ├── data/         → AuthRepository
│       │   │   ├── domain/       → AuthSession
│       │   │   └── presentation/ → LoginPage
│       │   ├── clinic/
│       │   │   └── domain/       → Mock data models and constants
│       │   ├── dashboard/
│       │   │   ├── application/  → FutureProviders (doctor/patient dashboard)
│       │   │   ├── data/         → DashboardRepository
│       │   │   ├── domain/       → DoctorDashboardResponse, PatientDashboardResponse, etc.
│       │   │   └── presentation/ → DashboardPage
│       │   └── patients/
│       │       ├── application/  → FutureProviders + StateProvider
│       │       ├── data/         → PatientsRepository
│       │       ├── domain/       → PatientProfileResponse, PatientProfileRequest
│       │       └── presentation/ → PatientsPage
│       │
│       └── shared/            # Reusable cross-feature components
│           ├── extensions/
│           │   └── context_extensions.dart  # BuildContext theme shortcuts
│           └── widgets/
│               ├── async_value_view.dart    # Generic AsyncValue → Widget mapper
│               ├── home_widgets.dart        # MetricCard, FeatureCard, StatusPill, etc.
│               └── scms_app_shell.dart      # Scaffold + bottom NavigationBar shell
│
├── test/
│   ├── app_smoke_test.dart    # Smoke test (renders login when no session)
│   └── features/
│       ├── appointments/
│       ├── auth/
│       └── patients/
│
├── pubspec.yaml
└── analysis_options.yaml
```

---

## Layer Responsibilities

The project follows a **feature-first clean architecture** pattern. Within each feature, code is organised into four layers:

### 1. Domain Layer (`domain/`)

Contains **pure Dart models** that represent the business entities for that feature. Models include `fromJson` factory constructors for deserialisation and `toJson` methods for serialisation. No framework imports — only Dart core.

**Examples:**
- `AuthSession` — holds access token, refresh token, user identity
- `AppointmentDetailsResponse` — appointment data from the API
- `PatientProfileResponse` / `PatientProfileRequest` — patient CRUD DTOs

### 2. Data Layer (`data/`)

Contains **repository classes** that encapsulate API communication. Each repository:
- Receives an `ApiClient` (or other dependencies) via constructor injection
- Makes HTTP calls, parses the SCMS standard response envelope (`{ isSuccess, data, message }`)
- Throws `AppException` on failure
- Has a companion Riverpod `Provider` definition at the top of the file

**Pattern:**
```dart
final appointmentsRepositoryProvider = Provider<AppointmentsRepository>((ref) {
  return AppointmentsRepository(ref.watch(apiClientProvider));
});

class AppointmentsRepository {
  const AppointmentsRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<AppointmentDetailsResponse>> getAppointments(...) async {
    final response = await _apiClient.get('/Appointments', ...);
    // parse → return
  }
}
```

### 3. Application Layer (`application/`)

Contains **Riverpod controllers/notifiers** that manage UI state and orchestrate data fetching. Three provider styles are used depending on complexity:

| Style | Used When | Example |
|-------|-----------|---------|
| `AsyncNotifier<T>` | Complex state + user actions (sign in/out) | `AuthController` |
| `Notifier<CustomState>` | Rich mutable state with filters/actions | `AppointmentsNotifier` |
| `FutureProvider.autoDispose` | Simple read-only async data | `doctorDashboardProvider` |
| `StateProvider` | Single primitive/value selection | `selectedPatientIdProvider` |

### 4. Presentation Layer (`presentation/`)

Contains **Flutter widgets** — pages and sub-components that build the UI. Pages are `ConsumerWidget` or `ConsumerStatefulWidget` that read from application-layer providers.

---

## Feature Module Anatomy

Every feature follows the same four-directory structure:

```
features/{feature_name}/
├── application/       # Riverpod controllers / notifiers / providers
├── data/              # Repository implementation + provider definition
├── domain/            # Data models (DTOs, entities)
└── presentation/      # Pages, widgets, UI components
```

### Current Features

| Feature | Description |
|---------|-------------|
| **auth** | Login, registration, session management (JWT) |
| **dashboard** | Doctor dashboard (today's stats, queue) and Patient dashboard (profiles, prescriptions, invoices) |
| **appointments** | List, book, reschedule, cancel, and filter appointments |
| **patients** | Patient profile list, detail view, medical history, summary |
| **clinic** | Static mock data for clinic entities (used for prototyping) |

---

## State Management

The project uses **flutter_riverpod** (v3.3.1) for both dependency injection and state management.

### Provider Hierarchy

```
appConfigProvider (Provider<AppConfig>)
    │
    ├── secureTokenStoreProvider (Provider<SecureTokenStore>)
    │       │
    │       ├── apiClientProvider (Provider<ApiClient>)
    │       │       │
    │       │       ├── authRepositoryProvider
    │       │       ├── appointmentsRepositoryProvider
    │       │       ├── dashboardRepositoryProvider
    │       │       └── patientsRepositoryProvider
    │       │               │
    │       │               ├── authControllerProvider (AsyncNotifier)
    │       │               ├── appointmentsControllerProvider (Notifier)
    │       │               ├── doctorDashboardProvider (FutureProvider)
    │       │               ├── patientDashboardProvider (FutureProvider)
    │       │               ├── patientsListProvider (FutureProvider)
    │       │               └── patientDetailProvider (FutureProvider.family)
    │       │
    │       └── authRepositoryProvider (for signOut token clearing)
    │
    └── appLocaleProvider (StateProvider<AppLocale>)
            │
            └── appStringsProvider (Provider<AppStrings>)
```

### Key Patterns

- **ProviderScope with overrides** — The `bootstrap()` function wraps the app in a `ProviderScope` and overrides `appConfigProvider` with the resolved configuration, enabling test overrides.
- **`ref.watch` vs `ref.read`** — Providers use `ref.watch` for reactive dependencies (rebuild when upstream changes). Controllers use `ref.read` for one-shot calls within methods.
- **AutoDispose** — Data-fetching providers use `.autoDispose` to free resources when the UI stops listening.

---

## Routing & Navigation

Routing is handled by **go_router** (v17.2.3), configured in `app_router.dart`.

### Route Table

| Path | Page | Auth Required |
|------|------|:------------:|
| `/login` | `LoginPage` | No |
| `/dashboard` | `DashboardPage` | Yes |
| `/appointments` | `AppointmentsPage` | Yes |
| `/patients` | `PatientsPage` | Yes |

### Auth Guard

The router uses a `redirect` callback that watches `authControllerProvider`:

1. If the session is still **loading**, no redirect (null) — the app shows a loading state.
2. If the user is **not signed in** and not already on `/login`, redirect → `/login`.
3. If the user **is signed in** and on `/login`, redirect → `/dashboard`.

```dart
redirect: (context, state) {
  if (loadingSession) return null;
  if (!isSignedIn && !signingIn) return '/login';
  if (isSignedIn && signingIn) return '/dashboard';
  return null;
}
```

### Shell Navigation

The `ScmsAppShell` widget provides a `NavigationBar` (Material 3 bottom bar) that switches between Dashboard, Appointments, and Patients using `context.go(...)`.

---

## Networking & API Integration

### ApiClient

`ApiClient` is a thin wrapper around **Dio** (v5.9.2) that provides type-safe HTTP methods:

| Method | Signature |
|--------|-----------|
| `get<T>` | `(path, {queryParameters})` |
| `post<T>` | `(path, {data})` |
| `put<T>` | `(path, {data})` |
| `patch<T>` | `(path, {data})` |
| `delete<T>` | `(path)` |
| `getBytes` | `(path) → Uint8List` |

All methods are wrapped in a `_guard()` method that catches `DioException` and rethrows as `AppException`.

### Response Envelope

The SCMS backend always returns a standard envelope:

```json
{
  "isSuccess": true,
  "message": "...",
  "data": { ... }
}
```

Every repository method parses this envelope, checks `isSuccess`, extracts `data`, and throws `AppException` with the server `message` on failure.

### Auth Interceptor

`AuthInterceptor` is a Dio `Interceptor` that reads the JWT from `SecureTokenStore` and attaches it as a `Bearer` token on every outgoing request.

### Configuration

`AppConfig` reads compile-time environment variables via `String.fromEnvironment`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_FLAVOR` | `development` | App flavor (development / staging / production) |
| `API_BASE_URL` | `http://10.0.2.2:5140/` | Backend base URL |
| `ENABLE_NETWORK_LOGGING` | `true` | Toggle Dio LogInterceptor |
| `CONNECT_TIMEOUT_SECONDS` | `60` | Dio connect timeout |
| `RECEIVE_TIMEOUT_SECONDS` | `60` | Dio receive timeout |

On Android, `localhost` in the API URL is automatically replaced with `10.0.2.2` (the host loopback from the emulator).

---

## Authentication Flow

```
┌─────────┐    signIn()    ┌────────────────┐   POST /Auth/login   ┌──────────┐
│ LoginPage├──────────────►│ AuthController  ├────────────────────►│ SCMS.Api │
│ (UI)     │               │ (AsyncNotifier) │                     │          │
└─────────┘               └────────┬───────┘                     └─────┬────┘
                                   │                                    │
                            state = AsyncLoading()                     │
                                   │                                    │
                            ◄──────┼────────────────────────────────────┘
                                   │  { accessToken, refreshToken, user }
                                   │
                            Save to SecureTokenStore
                            state = AsyncData(AuthSession)
                                   │
                            Router redirect → /dashboard
```

- **Login** — `AuthController.signIn()` calls `AuthRepository.signIn()` which POSTs to `/Auth/login`, persists tokens in `SecureTokenStore`, and returns an `AuthSession`.
- **Registration** — `AuthController.signUp()` calls `register()` then auto-signs in.
- **Session Restore** — On app start, `AuthController.build()` calls `restoreSession()` which reads tokens from secure storage.
- **Logout** — `AuthController.signOut()` clears all stored tokens and sets state to `null`, triggering a redirect to `/login`.

---

## Theming & Design System

The app uses **Material 3** with a custom indigo-based colour palette defined in `ScmsColors`:

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#4F46E5` (Indigo) | `#4F46E5` |
| Background | `#F9FAFB` | `#0F172A` |
| Card | `#FFFFFF` | `#1E293B` |
| Text | `#1F2937` | `#F3F4F6` |
| Muted | `#6B7280` | `#9CA3AF` |
| Border | `#E5E7EB` | `#334155` |
| Success | `#027A48` | — |
| Warning | `#B54708` | — |
| Danger | `#D92D20` | — |

`AppTheme.light()` and `AppTheme.dark()` produce full `ThemeData` with customised `CardTheme`, `InputDecorationTheme`, `FilledButtonTheme`, `OutlinedButtonTheme`, `TextButtonTheme`, and `DividerTheme`.

---

## Internationalisation (i18n)

The app supports **English** and **Myanmar (Burmese)** via a simple, Riverpod-based system:

- `AppLocale` — enum with `en` and `mm` values
- `AppStrings` — immutable class containing all translatable strings
- `appLocaleProvider` — `StateProvider<AppLocale>` (default: `en`)
- `appStringsProvider` — derived `Provider<AppStrings>` that returns the correct string table

No code generation or `.arb` files — just plain Dart constants matching the WebApp's `i18n.js` structure for cross-platform consistency.

---

## Shared Widgets

Located in `lib/src/shared/widgets/`:

| Widget | Purpose |
|--------|---------|
| `AsyncValueView<T>` | Generic widget that maps `AsyncValue<T>` to `data` / `loading` / `error` states |
| `ScmsAppShell` | Scaffold with Material 3 `NavigationBar` for bottom tab navigation |
| `SectionHeader` | Row with title + optional action button |
| `MetricCard` | Dashboard metric tile (icon, value, label, optional helper text) |
| `ResponsiveCardGrid` | Adaptive grid layout that calculates column count from available width |
| `FeatureCard` | List-style card with icon container, title, subtitle, optional trailing |
| `StatusPill` | Rounded status badge with tinted background |
| `QuickAction` | Tonal filled button with icon + label |
| `ProgressStrip` | Labelled linear progress indicator |

Located in `lib/src/core/widgets/`:

| Widget | Purpose |
|--------|---------|
| `BrandLogo` | CustomPaint rendering of the SCMS dual-ribbon logo |

---

## Platform Utilities

### PDF Download

The app supports downloading and saving PDFs (prescriptions, invoices) using conditional imports:

```dart
import 'pdf_download_stub.dart'
    if (dart.library.html) 'pdf_download_web.dart'
    if (dart.library.io) 'pdf_download_mobile.dart' as platform;
```

- **Mobile** (`pdf_download_mobile.dart`) — saves to filesystem and launches
- **Web** (`pdf_download_web.dart`) — triggers browser download
- **Stub** (`pdf_download_stub.dart`) — fallback for unsupported platforms

---

## Testing

Tests live under `test/` and mirror the feature folder structure:

```
test/
├── app_smoke_test.dart       # Verifies login screen renders with no session
└── features/
    ├── appointments/
    ├── auth/
    └── patients/
```

### Smoke Test Pattern

The smoke test overrides `appConfigProvider` and `secureTokenStoreProvider` with fakes to run in isolation:

```dart
ProviderScope(
  overrides: [
    appConfigProvider.overrideWithValue(testConfig),
    secureTokenStoreProvider.overrideWithValue(FakeTokenStore()),
  ],
  child: const ScmsApp(),
)
```

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `flutter_riverpod` | ^3.3.1 | State management & dependency injection |
| `go_router` | ^17.2.3 | Declarative routing with auth guards |
| `dio` | ^5.9.2 | HTTP client |
| `flutter_secure_storage` | ^10.3.1 | Encrypted token storage |
| `logging` | ^1.3.0 | Structured logging |
| `intl` | ^0.20.2 | Date/number formatting |
| `cupertino_icons` | ^1.0.8 | iOS-style icons |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `flutter_test` | SDK | Widget and unit testing |
| `flutter_lints` | ^6.0.0 | Lint rules |

---

## Adding a New Feature — Checklist

1. **Create the feature directory:**
   ```
   lib/src/features/{name}/
   ├── application/
   ├── data/
   ├── domain/
   └── presentation/
   ```

2. **Define domain models** in `domain/{name}_models.dart`:
   - Add `fromJson` factory constructors
   - Add `toJson()` methods for request models

3. **Create the repository** in `data/{name}_repository.dart`:
   - Define a `final {name}RepositoryProvider = Provider<{Name}Repository>((ref) { ... })` at the top
   - Inject `apiClientProvider` via `ref.watch`
   - Parse the standard response envelope

4. **Create the controller/provider** in `application/{name}_controller.dart`:
   - Use `FutureProvider.autoDispose` for simple reads
   - Use `Notifier<CustomState>` for complex state with actions
   - Watch the repository provider

5. **Build the UI** in `presentation/{name}_page.dart`:
   - Extend `ConsumerWidget` or `ConsumerStatefulWidget`
   - Wrap in `ScmsAppShell` if it's a top-level page

6. **Register the route** in `app_router.dart`:
   ```dart
   GoRoute(path: '/{name}', builder: (c, s) => const {Name}Page()),
   ```

7. **Add navigation** — update `ScmsAppShell` if adding a bottom tab

8. **Create test directory** at `test/features/{name}/`

---

## Relationship to the Backend

The Flutter app is one of three frontends in the SCMS ecosystem:

| Client | Technology | Shared Contract |
|--------|-----------|----------------|
| **SCMS.WebApp** | Blazor WASM | `SCMS.Shared/Contracts/` (C# DTOs) |
| **SCMS.Mobile** | Flutter | Domain models mirror the same API contracts |
| **SCMS.Api** | ASP.NET Core 8 | Source of truth for all endpoints |

All three consume the same REST API with JWT authentication. The mobile app's domain models (`fromJson` / `toJson`) are hand-written to match the C# DTOs in `SCMS.Shared/Contracts/`.

### API Endpoints Used

| Feature | Endpoints |
|---------|-----------|
| Auth | `POST /Auth/login`, `POST /Auth/register` |
| Dashboard | `GET /Dashboards/dashboard`, `GET /Dashboards/patient-dashboard` |
| Appointments | `GET /Appointments`, `POST /Appointments`, `PATCH /Appointments/{id}/status`, `POST /Appointments/{id}/reschedule`, `POST /Appointments/call-next` |
| Patients | `GET /Patients`, `GET /Patients/patients/{id}`, `POST /Patients`, `GET /Patients/{id}/history`, `GET /Patients/{id}/summary` |
| Payments | `POST /Payments/manual-proof`, `GET /Payments/{id}/invoice/pdf` |
| Prescriptions | `GET /Prescriptions/{id}/pdf` |

---

## Best Practices & Conventions

1. **Feature-first organisation** — all code for a feature lives together, not spread by type
2. **Provider co-location** — each repository/controller file defines its own Riverpod provider at the top
3. **Standard error handling** — repositories throw `AppException`; controllers use `AsyncValue.guard()`
4. **No code generation** — the project deliberately avoids `build_runner`, `freezed`, or `json_serializable` to keep the build simple
5. **Immutable state** — all state classes use `final` fields with `copyWith` methods
6. **Constructor injection** — dependencies are passed via constructors, then wired through Riverpod providers
7. **Theme tokens** — use `ScmsColors` constants and `Theme.of(context)` rather than hard-coded colours in widgets
8. **Platform-conditional imports** — used for PDF download to support both mobile and web targets
9. **Consistent response parsing** — every repository method follows the same envelope-check pattern
10. **Test isolation** — `ProviderScope.overrides` enable swapping real services for fakes
