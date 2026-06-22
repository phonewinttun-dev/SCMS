# SCMS.Mobile

Flutter mobile client for SCMS. The folder name is `SCMS.Mobile`; the Dart package name is `scms_mobile` because pub package names cannot contain dots.

## Package choices

- `flutter_riverpod`: state management and dependency injection through providers.
- `go_router`: declarative routing with auth redirects.
- `dio`: API client with interceptors and timeouts.
- `flutter_secure_storage`: JWT/token storage.
- `logging` and `intl`: production-friendly diagnostics and localization/date formatting foundations.

## Environment

Configuration is read with `--dart-define` so builds can be promoted without source changes.

```sh
flutter run \
  --dart-define=APP_FLAVOR=development \
  --dart-define=API_BASE_URL=http://10.0.2.2:5140/ \
  --dart-define=ENABLE_NETWORK_LOGGING=true
```

Use `http://10.0.2.2:5140/` for the Android emulator to reach the local SCMS API. Use `http://localhost:5140/` for iOS simulator.

## Structure

```text
lib/
  main.dart
  src/
    app/                 App bootstrap, router, and theme.
    core/                Cross-cutting config, DI providers, networking, storage, errors, constants.
    shared/              Reusable widgets and extensions that are not owned by one feature.
    features/            Feature-first modules.
      auth/
        application/     Riverpod controllers/use-case orchestration.
        data/            Repositories, API/data-source adapters.
        domain/          Feature models and business objects.
        presentation/    Screens and widgets.
      appointments/
      dashboard/
      patients/
assets/
  icons/                 App and feature icons.
  images/                Static image assets.
test/                    Widget/unit tests, mirroring feature folders as coverage grows.
android/, ios/           Native Flutter project shells.
```

## Commands

```sh
flutter pub get
flutter analyze
flutter test
flutter run
```

## Functional testing (integration tests)

Functional tests live in `integration_test/` and require a running SCMS API. See [docs/functional_testing.md](docs/functional_testing.md) for step-by-step instructions.

Quick start (Android emulator + local API):

```sh
# Terminal 1 — API
dotnet run --project SCMS.Api

# Terminal 2 — functional tests (Android emulator)
cd SCMS.Mobile
flutter test integration_test -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

## Run In Browsers

Chrome and Edge are usually detected as Flutter web devices:

```sh
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:5140/
flutter run -d edge --dart-define=API_BASE_URL=http://localhost:5140/
```

Brave is not always registered as a Flutter device. The most reliable option is to run Flutter as a web server and open the URL in Brave, Chrome, or Edge:

```sh
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 5300 --dart-define=API_BASE_URL=http://localhost:5140/
```

Then open `http://127.0.0.1:5300` in whichever browser you prefer.
