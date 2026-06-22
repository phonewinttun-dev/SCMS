# SCMS.Mobile — Functional Testing (Flutter Integration Tests)

Functional tests live in `integration_test/` and run the full app on a device, emulator, or desktop target while talking to a real SCMS API.

## Prerequisites

1. **Flutter SDK** installed and on your `PATH` (`flutter doctor` should pass).
2. **SCMS API running** with seeded SQLite data:
   ```sh
   cd D:\Projects\SCMS
   dotnet run --project SCMS.Api
   ```
   API default: `http://localhost:5140`
3. **A Flutter device target** — Android emulator or Windows desktop (see Step 2).

## One-time setup

From the mobile project folder:

```sh
cd D:\Projects\SCMS\SCMS.Mobile
flutter pub get
```

## Step-by-step: run functional tests

### Step 1 — Start the API

In terminal 1:

```sh
cd D:\Projects\SCMS
dotnet run --project SCMS.Api
```

Wait until you see the API listening on port `5140`.

### Step 2 — Choose a device

List available targets:

```sh
flutter devices
```

**Supported targets for `integration_test`:**

| Target | Notes |
|--------|-------|
| Android emulator | Recommended — use `http://10.0.2.2:5140/` |
| iOS simulator (macOS) | Use `http://localhost:5140/` |
| Windows desktop | Requires Windows **Developer Mode** (for plugin symlinks) |

**Not supported:** Chrome/Edge web targets (`Web devices are not supported for integration tests yet`).

Start an Android emulator from Android Studio, or enable Developer Mode on Windows:

```sh
start ms-settings:developers
```

Examples:

| Target | Typical device id |
|--------|-------------------|
| Android emulator | `emulator-5554` |
| Windows desktop | `windows` |

### Step 3 — Set the API URL for your target

| Target | `API_BASE_URL` |
|--------|----------------|
| Android emulator | `http://10.0.2.2:5140/` |
| iOS simulator / Windows desktop | `http://localhost:5140/` |

### Step 4 — Run all functional tests

**Android emulator example:**

```sh
cd D:\Projects\SCMS\SCMS.Mobile
flutter test integration_test ^
  -d emulator-5554 ^
  --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

**Chrome example (widget tests only — not integration tests):**

```sh
flutter test -d chrome
```

**Windows desktop example (enable Developer Mode first):**

```sh
flutter test integration_test ^
  -d windows ^
  --dart-define=API_BASE_URL=http://localhost:5140/
```

### Step 5 — Run a single test file

Patient login flow only (Android emulator):

```sh
flutter test integration_test/login_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

Doctor shell navigation only (Android emulator):

```sh
flutter test integration_test/shell_navigation_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```

On Windows desktop, replace `-d emulator-5554` with `-d windows` and use `API_BASE_URL=http://localhost:5140/`.

### Step 6 — Override demo credentials (optional)

```sh
flutter test integration_test/login_flow_test.dart ^
  -d emulator-5554 ^
  --dart-define=API_BASE_URL=http://10.0.2.2:5140/ ^
  --dart-define=TEST_USER_EMAIL=aung.min@example.test ^
  --dart-define=TEST_USER_PASSWORD=password
```

## What is covered today

| Test file | Scenario |
|-----------|----------|
| `login_flow_test.dart` | Patient signs in and sees patient shell (`Home`, `Billing`; no `Medicines`) |
| `shell_navigation_test.dart` | Doctor signs in and sees staff shell (`Dashboard`, `Medicines`, `Diseases`) |

## Widget tests vs functional tests

| | `test/` (widget/unit) | `integration_test/` (functional) |
|--|----------------------|----------------------------------|
| API required | No (fakes/overrides) | Yes |
| Runs on | VM only | Real device/emulator/desktop |
| Command | `flutter test` | `flutter test integration_test -d <device>` |
| Speed | Fast | Slower |

Run widget tests locally without the API:

```sh
flutter test
```

## Troubleshooting

**Emulator window flashes and closes immediately**

This is usually a **corrupted Quick Boot snapshot** (`default_boot`). The emulator log shows errors like:

```text
Failed to load snapshot 'default_boot'
Failed to load virtio-blk:virtio
```

Fix (PowerShell):

```powershell
# Stop any running emulator first
Get-Process -Name "qemu-system*","emulator" -ErrorAction SilentlyContinue | Stop-Process -Force

# Delete corrupted snapshots for both AVDs
Remove-Item -Recurse -Force "$env:USERPROFILE\.android\avd\Pixel_6.avd\snapshots" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.android\avd\Pixel_4a.avd\snapshots" -ErrorAction SilentlyContinue

# Relaunch — first boot after wipe takes 1–2 minutes
flutter emulators --launch Pixel_6
```

One-off cold boot without deleting snapshots:

```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Pixel_6 -no-snapshot-load -no-snapshot-save
```

**`flutter emulators --launch` returns to the prompt right away**

That is normal — it starts the emulator in the background. Wait 1–2 minutes, then run `adb devices` until you see `emulator-5554 device`.

**Connection refused / login fails**

- Confirm the API is running (`http://localhost:5140/scalar` in a browser).
- Use `10.0.2.2` on Android emulator, not `localhost`.
- Reset local DB if needed: delete `SCMS.Api/scms.local.db` and restart the API.

**`pumpAndSettle` timed out**

- Increase settle duration in the test or check for infinite loading (API down or wrong URL).

**No devices found**

- Start an Android emulator (`flutter emulators --launch Pixel_6`) or enable Windows Developer Mode for `-d windows`.

**Secure storage on web**

- Web uses a different storage backend; login tests are most reliable on Android emulator or Windows desktop.

## CI example (GitHub Actions sketch)

```yaml
- name: Start API
  run: dotnet run --project SCMS.Api &
- name: Functional tests
  working-directory: SCMS.Mobile
  run: |
    flutter pub get
    flutter test integration_test -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5140/
```
