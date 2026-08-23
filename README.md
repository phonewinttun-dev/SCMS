# 🏥 Smart Clinic Management System (SCMS)

SCMS is an enterprise-grade, modern clinic management platform designed to streamline clinical workflows, patient engagement, and operational analytics. It integrates real-time queue orchestration via SignalR, electronic medical records (EMR), automated FIFO pharmaceutical inventory tracking, a multi-profile patient portal, automated billing & payments, role-tailored workspaces, multi-language localization (i18n), and an AI-powered clinic assistant integrated via the Model Context Protocol (MCP).

---

## 🏗️ Architecture & Tech Stack

SCMS is built on a **Feature-based Organization** pattern, dividing business modules into cohesive feature folders that contain both the business logic services and the controllers. The repository supports multiple frontend clients interacting with a robust ASP.NET Core backend.

```
                  ┌─────────────────────────────────────────┐
                  │              SCMS Clients               │
                  └────┬───────────────────────────────┬────┘
                       │                               │
            (React / Vite WebApp)               (Flutter Mobile)
                       │                               │
                       ▼                               ▼
                  ┌─────────────────────────────────────────┐
                  │            SCMS.Api Backend             │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │            SCMS.Domain (Core)           │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       SCMS.Database (EF Core Layer)     │
                  └────────────┬───────────────────────┬────┘
                               │                       │
                               ▼                       ▼
                         (SQLite Dev)           (PostgreSQL Prod)
```

### 💻 Technology Breakdown

| Component              | Technology / Framework          | Key Libraries & Packages                                                        | Purpose                                                                                                   |
| :--------------------- | :------------------------------ | :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- |
| **Backend API**        | `.NET 8` (ASP.NET Core Web API) | EF Core 8, SignalR, JWT Bearer Auth, Scalar, Swashbuckle, Serilog, DinkToPdf    | Exposes RESTful endpoints, handles real-time queue updates, PDF report generation, and auth lifecycle.    |
| **Domain Logic**       | C# Class Library                | `Microsoft.AspNetCore.App`, Result Pattern, CloudinaryDotNet, Newtonsoft.Json   | Hosts feature services, validation logic, MCP tool handlers, and domain controllers.                      |
| **Database**           | Dual-Provider Setup             | `Microsoft.EntityFrameworkCore.Sqlite`, `Npgsql.EntityFrameworkCore.PostgreSQL` | SQLite for zero-config local development; PostgreSQL for production deployments.                          |
| **Shared Library**     | C# Class Library                | Result/Result\<T\> Pattern, Request/Response DTOs, Common Date Converters       | Distributes DTO contracts, pagination models, and standard response formats across layers.                |
| **Web Portal (React)** | `React 18` (Vite)               | Tailwind CSS, DaisyUI, Radix UI Icons, Axios, SweetAlert2, React Router v6      | Administrative, doctor, and patient portals with deep frosted modals, analytics charts, and i18n support. |
| **Mobile Client**      | `Flutter`                       | Riverpod, GoRouter, Dio, Flutter Secure Storage                                 | Cross-platform mobile application for patients and clinic staff.                                          |

---

## ✨ Comprehensive System Features

SCMS is packed with rich features designed to handle every facet of daily clinic management:

1. **📅 Appointment Management & Calendars**
   - Interactive daily, weekly, and monthly calendar views.
   - Filtering and state transition workflows for appointments (**Pending**, **Confirmed**, **Completed**, **Cancelled**).

2. **🩺 Electronic Medical Records (EMR)**
   - Unified patient history timeline documenting visits, diagnoses, prescriptions, and lab results.
   - Comprehensive vitals logging (BP, Weight, Temp, SpO2, BMI) with historical trend tracking.
   - Chronic condition registry, allergies database, and patient-family summaries.

3. **💊 Smart FIFO Inventory & Expiry Tracking**
   - Batch-level stock management (`Batch Number`, `Expiry Date`, `Manufacture Date`, `Quantity`).
   - Automated FIFO (First In, First Out) batch consumption during prescription issuance.
   - Real-time warning banners for low stock or nearing-expiry batches (within 30 days).
   - Automated background service (`InventoryMonitorService`) to quarantine expired batches.

4. **🧬 Disease & Template Management**
   - Soft-delete safe disease registry checking for active prescription references.
   - Custom reusable prescription templates mapped to specific diseases, enabling rapid prescribing.

5. **👥 Patient-Family Portal**
   - Manage multiple patient profiles under a single user portal account (self, child, spouse, parent).
   - One-click re-booking of historical appointments.
   - Downloadable medical summary, invoice, and prescription PDFs.

6. **💳 Automated Billing & Verification**
   - Direct gateway callback processing to auto-update payment records.
   - Manual transaction receipt upload queue for admin audit and verification.

7. **🗣️ AI Clinic Assistant (MCP Integrated)**
   - Conversational assistant powered by the Model Context Protocol (MCP).
   - Securely queries domain services for daily schedule summaries, low-stock warnings, and patient summaries without direct DB access.
   - Automated drafting of referral letters and creating follow-up reminders.

8. **🚨 Real-Time Queue & Notifications**
   - Live waiting queue status tracker using SignalR (`/hubs/queue`).
   - Patient-facing wait-time estimator ("3rd in queue - approx. 15 mins") with visual progress bar.
   - Audio and visual chimes when the doctor calls the next token.

---

## 🚀 Local Development Setup

To run SCMS locally, clone the repository and set up the components:

### 📋 Prerequisites

- **.NET SDK 8.0**
- **Node.js** (v18+) & **npm**
- **Flutter SDK** (for the mobile application)
- **Docker Desktop** (optional, for PostgreSQL setups)

### 1. Running Backend & Database

By default, the backend seeds an SQLite database (`scms.local.db` inside `SCMS.Api/`) on its first run.

```sh
# Navigate to the root directory
cd SCMS

# Build the entire solution
dotnet build SCMS.sln

# Run the API project
dotnet run --project SCMS.Api
```

The API launches at `http://localhost:5140`. You can explore the interactive documentation using Scalar at `http://localhost:5140/scalar`.

### 2. Running Frontend Clients

#### React Web Application (Vercel Target)

```sh
cd SCMS.WebApp
npm install
npm run dev
```

#### Blazor WebAssembly Application

```sh
# Run the Blazor client (launches on a separate local port)
dotnet run --project SCMS.Web
```

#### Flutter Mobile Client

```sh
cd SCMS.Mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:5140/
```

_(For Android Emulator, use `--dart-define=API_BASE_URL=http://10.0.2.2:5140/`)_

---

## 🐳 Docker Deployment

The application features a fully containerized Docker Compose architecture leveraging a PostgreSQL database.

### Initial Setup

Run the following from the root directory to build the container images and launch the services:

```sh
docker compose up -d --build
```

Fresh database volumes automatically ingest `db.sql` (schema) and `seed.realworld.sql` (clinical scenarios data).

### Control Commands

```sh
# Start services
docker compose up

# Check status
docker compose ps

# Force seed data to an existing database
docker compose exec scms_db psql -U postgres -d SCMS_db -f /docker-entrypoint-initdb.d/zz-seed.realworld.sql

# Stop services
docker compose down
```

---

## 🚀 Getting Started

### Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v18+ or v20+) & `npm`
- [PostgreSQL](https://www.postgresql.org/) _(Optional - SQLite is enabled by default for local dev)_

---

### 1. Backend Setup (`SCMS.Api`)

1. Navigate to the API folder:

   ```bash
   cd SCMS.Api
   ```

2. Restore dependencies and run database migrations/seeding:

   ```bash
   # Run with data seeding
   dotnet run --seed
   ```

3. Launch the API server:

   ```bash
   dotnet run
   ```

   - API will be accessible at: `http://localhost:5140`
   - Interactive Scalar API documentation: `http://localhost:5140/scalar`
   - Swagger OpenAPI Specification: `http://localhost:5140/openapi/v1.json`

---

### 2. Frontend Setup (`SCMS.WebApp`)

1. Navigate to the WebApp folder:

   ```bash
   cd SCMS.WebApp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

   - Web application will be running at: `http://localhost:5173`

---

## 📡 API Endpoints Overview

| Area              | Route                                | Key Functions                                                                   |
| :---------------- | :----------------------------------- | :------------------------------------------------------------------------------ |
| **Auth**          | `/api/Auth`                          | Register, Login, Refresh Token, Logout & Revocation                             |
| **Dashboards**    | `/api/Dashboards`                    | Doctor & Admin Operational Metrics, Patient Portal Dashboard                    |
| **Appointments**  | `/api/Appointments`                  | Book, Filter, Reschedule, Status Transition, Call Next Queue                    |
| **Patients**      | `/api/Patients`                      | CRUD Profiles, Clinical History, Medical Summary HTML/PDF                       |
| **Prescriptions** | `/api/Prescriptions`                 | Create & Dispense, Reusable Templates, PDF Prescription Downloads               |
| **Medicines**     | `/api/Medicines`                     | Inventory CRUD, Batch Management, Expiry Quarantine, Low-Stock Alerts           |
| **Diseases**      | `/api/Diseases`                      | Disease Registry, Diagnosis Management, Usage Validation                        |
| **Payments**      | `/api/Payments`                      | Gateway Webhooks, Manual Receipt Upload & Verification, Invoice PDFs            |
| **Users & Staff** | `/api/Users`                         | User Directory, Role Management (`owner`, `admin`, `doctor`, `user`)            |
| **Follow-ups**    | `/api/FollowUps`                     | Schedule Follow-ups, Mark Completed, Tracking                                   |
| **Reports**       | `/api/Reports`                       | JSON/PDF Reports for Revenue, Appointments, Stock, Follow-ups, Business Summary |
| **MCP / AI**      | `/api/mcp`                           | Tool Discovery, Direct Tool Calling, Multi-turn Chat Loop                       |
| **SignalR**       | `/hubs/queue`, `/hubs/notifications` | Real-time Queue Updates and Live In-App Alerts                                  |

_For complete endpoint specifications and sample payloads, refer to [endpoints.md](file:///d:/SCMS/endpoints.md)._

---
