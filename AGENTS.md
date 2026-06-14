# AGENTS.md

## Quick reference

```sh
# Build everything
dotnet build SCMS.sln

# Run the API (SQLite, auto-seeds on first run)
dotnet run --project SCMS.Api

# Run the Blazor WASM frontend (separate terminal)
dotnet run --project SCMS.Web

# Run tests (xUnit, in-memory SQLite)
dotnet test SCMS.Domain.Tests
```

API: `http://localhost:5140` — Scalar docs at `/scalar`.  
Web: default Blazor WASM port (typically `http://localhost:5214`).  
Both projects must run simultaneously; the `.slnLaunch.user` multi-startup profile does this in Visual Studio.

## Solution layout

| Project | Role |
|---------|------|
| `SCMS.Api` | ASP.NET Core 8 Web API — controllers, JWT auth, SignalR hubs, Swagger/Scalar |
| `SCMS.Domain` | Business logic, **controllers live here too** (loaded via `AddApplicationPart`) |
| `SCMS.Database` | EF Core `AppDbContext` and scaffolded `Tbl*` entity models |
| `SCMS.Shared` | `Result`/`Result<T>` pattern, pagination, **request/response DTOs** (`Contracts/`) |
| `SCMS.Web` | Blazor WebAssembly frontend using **Ant Design Blazor** (`AntDesign` 1.6) |
| `SCMS.Domain.Tests` | xUnit tests, mirror the `Features/` folder structure |

### Dependency graph

```
Api → Domain → Shared, Database
Web → Shared (only — communicates with Api over HTTP)
Domain.Tests → Domain
```

`Database` must **not** reference `Domain` (circular dependency was explicitly removed).

## Feature-based organisation (critical pattern)

All business features live under `SCMS.Domain/Features/{FeatureName}/`:

```
Features/
  Appointments/
    AppointmentsController.cs   ← [ApiController] lives in Domain, not Api
    AppointmentsService.cs
  Patients/
    PatientsController.cs
    PatientService.cs
  …12 feature folders total
```

- **Controllers are in `SCMS.Domain`**, not `SCMS.Api`. The API project loads them via `AddApplicationPart(typeof(FeatureManager).Assembly)`.
- **Request/Response DTOs are in `SCMS.Domain/DTOs/{FeatureName}/`**, not in Shared. (Note: Blazor WASM frontend will need to duplicate these or use a different mechanism).
- **Service registration**: every new service must be manually added to `FeatureManager.AddScmsFeatureServices()`.
- **Controller registration**: happens automatically via the assembly scan, no manual step needed.

### Adding a new feature checklist

1. Create `SCMS.Domain/Features/{Name}/{Name}Service.cs` and `{Name}Controller.cs`
2. Create DTOs in `SCMS.Domain/DTOs/{Name}/`
3. Register the service in `FeatureManager.AddScmsFeatureServices()`
4. Mirror the folder in `SCMS.Domain.Tests/{Name}/`

## Result pattern

All service methods return `Result` or `Result<T>` (from `SCMS.Shared`). Never throw for business-logic errors. Controllers translate `IsFailure` → `BadRequest(result)`, `IsSuccess` → `Ok(result)`.

## Database

- **Dual-provider**: SQLite (default local dev) or PostgreSQL (Docker / prod). Controlled by `Database:Provider` in appsettings.
- **No EF migrations** — SQLite uses `EnsureCreated()` + seeder; PostgreSQL uses `db.sql` + `seed.realworld.sql` mounted into Docker.
- Entity models are scaffold-generated in `SCMS.Database/Models/` with `Tbl` prefix (e.g. `TblPatient`). Don't rename them.
- The `AppDbContext` is large (~33 KB) and fully scaffolded — edit with care.
- SQLite DB file lands at `SCMS.Api/scms.local.db` — gitignored. Delete it to reset local data.

### Demo credentials (SQLite)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@scms.demo` | `password` |
| Patient | `user@scms.demo` | `password` |
| Real-world admin | `dr.thandar@scms.demo` | `password` |
| Real-world patient | `aung.min@example.test` | `password` |

## Auth

- JWT Bearer via `Microsoft.AspNetCore.Authentication.JwtBearer`.
- Token factory: `SCMS.Domain/Security/JwtTokenFactory.cs`. Signing key in `appsettings.json` `Jwt:SigningKey`.
- Current user extracted via `User.GetUserId()` / `User.IsStaff()` (extension in `Security/CurrentUserExtensions.cs`).
- Roles: `admin`, `doctor`, `user`. Protected endpoints use `[Authorize(Roles = "admin,doctor")]` etc.

## Realtime (SignalR)

Two hubs mapped in `Program.cs`:
- `/hubs/queue` → `QueueHub` (appointment queue)
- `/hubs/notifications` → `NotificationsHub`

SignalR auth: JWT sent via `access_token` query parameter for hub connections.

## Frontend (Blazor WASM)

- UI library: **Ant Design Blazor** — use `AntDesign` components, not raw HTML for UI consistency.
- API base address configurable via `ApiBaseAddress` in `wwwroot/appsettings.json` (defaults to `http://localhost:5140/`).
- `ApiClient.cs` is the single HTTP client wrapper for all API calls.
- Auth state managed by `ScmsAuthenticationStateProvider` + `TokenStore` (localStorage).

## Testing

- Framework: **xUnit** with `coverlet` for coverage.
- Tests use an **in-memory SQLite** database via `TestDatabase` helper (creates/disposes per test).
- Test folder structure mirrors `Features/` — e.g. `SCMS.Domain.Tests/Appointments/AppointmentsServiceTests.cs`.
- Shared test data in `TestSupport/TestData.cs`.
- No integration/E2E test suite — all tests are unit-level against services with the in-memory DB.

```sh
# Run a single test class
dotnet test SCMS.Domain.Tests --filter "FullyQualifiedName~AppointmentsServiceTests"
```

## Docker

```sh
docker compose up -d --build   # first time
docker compose up              # subsequent
```

Docker uses PostgreSQL (`Database__Provider=PostgreSql`). Schema from `db.sql`, seed from `seed.realworld.sql`.

## Conventions

- .NET 8, C# with nullable reference types enabled, implicit usings.
- No Mediator / CQRS — direct `Controller → Service → DbContext` calls.
- `SCMS.Domain` takes a `FrameworkReference` on `Microsoft.AspNetCore.App` so it can host controllers.
- PDF generation via `DinkToPdf` (native lib dependency — may need `libwkhtmltox` on Linux).
- Background service: `InventoryMonitorService` runs as a hosted service for stock alerts.
