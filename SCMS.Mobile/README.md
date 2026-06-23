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

| Target | `API_BASE_URL` |
|--------|----------------|
| Android emulator | `http://10.0.2.2:5140/` |
| Physical Android phone (same Wi‑Fi as PC) | `http://<PC-LAN-IP>:5140/` (e.g. `http://172.16.227.105:5140/`) |
| iOS simulator / Windows desktop / web | `http://localhost:5140/` |

Debug Android builds allow cleartext HTTP to the local API (`android/app/src/debug/AndroidManifest.xml`).

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
test/                    Widget/unit tests (no API required).
integration_test/        Functional tests on a real device/emulator/desktop.
android/, ios/           Native Flutter project shells.
```

## Commands

```sh
flutter pub get
flutter analyze
flutter test                    # widget/unit tests only
flutter run                     # interactive dev run
```

---

## Testing

### Widget tests vs integration tests

| | `test/` | `integration_test/` |
|--|---------|---------------------|
| API required | No (fakes/overrides) | Yes — running SCMS API |
| Runs on | Dart VM | Real device, emulator, or desktop |
| Speed | Fast | Slower (builds and installs the app) |
| Command | `flutter test` | `flutter test integration_test -d <device>` |

**Not supported for integration tests:** Chrome/Edge web targets.

### Prerequisites

1. Flutter SDK on your `PATH` (`flutter doctor` should pass for your target).
2. SCMS API running with seeded SQLite data (from repo root):

   ```sh
   dotnet run --project SCMS.Api
   ```

   API default: `http://localhost:5140` — confirm in a browser: `http://localhost:5140/scalar`

3. A device target: Android emulator (recommended), physical Android phone, or Windows desktop.

One-time setup:

```sh
cd SCMS.Mobile
flutter pub get
```

### Widget tests (no API)

```sh
flutter test
```

Run a single file:

```sh
flutter test test/path/to/some_test.dart
```

### Integration tests — quick start

**Terminal 1 — API**

```sh
dotnet run --project SCMS.Api
```

**Terminal 2 — emulator (if not already running)**

```sh
flutter emulators --launch Pixel_6
adb devices    # wait until you see: emulator-5554   device
```

Do **not** launch the emulator twice. If `adb devices` already shows `emulator-5554 device`, skip the launch step.

**Terminal 2 — run all functional tests**

```sh
cd SCMS.Mobile
flutter test integration_test -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

### Run a single integration test

Patient login flow:

```sh
flutter test integration_test/login_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

Doctor shell navigation:

```sh
flutter test integration_test/shell_navigation_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

Windows desktop (enable **Developer Mode** first: `start ms-settings:developers`):

```sh
flutter test integration_test -d windows --dart-define=API_BASE_URL=http://localhost:5140/
```

### Override demo credentials (optional)

Defaults match the SQLite seed in `AGENTS.md`:

| Role | Email | Password |
|------|-------|----------|
| Patient | `aung.min@example.test` | `password` |
| Doctor | `dr.thandar@scms.demo` | `password` |

```sh
flutter test integration_test/login_flow_test.dart \
  -d emulator-5554 \
  --dart-define=API_BASE_URL=http://10.0.2.2:5140/ \
  --dart-define=TEST_USER_EMAIL=aung.min@example.test \
  --dart-define=TEST_USER_PASSWORD=password
```

Doctor overrides use `TEST_DOCTOR_EMAIL` and `TEST_DOCTOR_PASSWORD`.

### What is covered today

| Test file | Scenario |
|-----------|----------|
| `integration_test/login_flow_test.dart` | Patient signs in and sees patient shell (`Home`, `Billing`; no `Medicines`) |
| `integration_test/shell_navigation_test.dart` | Doctor signs in and sees staff shell (`Dashboard`, `Medicines`, `Diseases`) |

Test helpers live in `integration_test/support/`:

- `test_config.dart` — API URL, timeouts, demo credentials via `--dart-define`
- `test_helpers.dart` — `pumpUntilFound()` (avoids hanging on the login loading spinner)

### Physical Android phone

1. Enable **USB debugging** on the phone and connect via USB (data cable).
2. Confirm: `adb devices` shows your device as `device` (not empty/offline).
3. Phone and PC must be on the **same Wi‑Fi**.
4. Find your PC LAN IP (`ipconfig` on Windows) and start the API bound to all interfaces:

   ```sh
   dotnet run --project SCMS.Api --urls "http://0.0.0.0:5140"
   ```

5. Run or test with your LAN IP:

   ```sh
   flutter run -d <device-id> --dart-define=API_BASE_URL=http://<PC-LAN-IP>:5140/
   ```

   ```sh
   flutter test integration_test -d <device-id> --dart-define=API_BASE_URL=http://<PC-LAN-IP>:5140/
   ```

### Run in browsers

Chrome and Edge are usually detected as Flutter web devices:

```sh
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:5140/
flutter run -d edge --dart-define=API_BASE_URL=http://localhost:5140/
```

Brave is not always registered as a Flutter device. Run as a web server and open the URL manually:

```sh
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 5300 --dart-define=API_BASE_URL=http://localhost:5140/
```

Then open `http://127.0.0.1:5300` in your browser. Login integration tests are most reliable on Android emulator or Windows desktop, not web.

---

## Troubleshooting

### Emulator: "exited with code 1 during startup"

Flutter reports this when the emulator process dies within the first few seconds. Common causes:

- **Second launch while one is already running** — check `adb devices` first; only launch if no emulator is listed.
- **Corrupted Quick Boot snapshot** — see fix below.
- **Stale lock from a crashed emulator** — stop all emulator processes, then relaunch.

Recovery (PowerShell):

```powershell
Get-Process -Name "qemu-system*","emulator" -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force "$env:USERPROFILE\.android\avd\Pixel_6.avd\snapshots" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.android\avd\Pixel_4a.avd\snapshots" -ErrorAction SilentlyContinue
flutter emulators --launch Pixel_6
adb devices   # wait for emulator-5554   device (1–2 min after snapshot wipe)
```

One-off cold boot without deleting snapshots:

```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Pixel_6 -no-snapshot-load -no-snapshot-save
```

`flutter emulators --launch` returning to the prompt immediately is normal — the emulator runs in the background.

### Connection refused / login hangs / ANR dialog

- Confirm the API is up: `http://localhost:5140/scalar`
- Android emulator must use `10.0.2.2`, not `localhost`
- Physical phone needs the PC LAN IP and API started with `--urls "http://0.0.0.0:5140"`
- Reset local DB if needed: delete `SCMS.Api/scms.local.db` and restart the API
- Integration tests use `pumpUntilFound()` instead of `pumpAndSettle()` after login to avoid hanging on the loading spinner when the API is unreachable

### No devices found

```sh
flutter devices
flutter emulators --launch Pixel_6
adb devices
```

For Windows desktop integration tests, enable Developer Mode: `start ms-settings:developers`

### More detail

See [docs/functional_testing.md](docs/functional_testing.md) for the full walkthrough and a CI example.
