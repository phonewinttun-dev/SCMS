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

SCMS provides an end-to-end suite of enterprise clinical and administrative capabilities designed for modern healthcare environments:

### 1. 👥 Multi-Role Tailored Workspaces

- **👑 Administrator & Clinic Owner Hub**:
  - Centralized operational oversight: daily appointment volume, live queue status, revenue intake, and pending verifications.
  - Staff management directory with granular role-based permissions (`owner`, `admin`, `doctor`, `user`).
  - Automated system audit logs and real-time operational notifications.
- **👨‍⚕️ Doctor Consultation Suite**:
  - Dedicated consultation workspace for rapid patient examination and queue handling.
  - One-click token calling with automated audio and visual announcements.
  - Diagnostic note unpacking, historical visit correlation, vital signs recording, and digital prescription issuance.
- **🏥 Patient & Family Portal**:
  - Multi-profile management: Manage dependent profiles (Self, Children, Spouse, Parents) under a single authenticated account.
  - Real-time queue tracker showing assigned token numbers, current token in consultation, and estimated waiting times.
  - Self-service appointment scheduling, historical records access, and downloadable PDF medical summaries and invoices.

---

### 2. 📅 Appointment Scheduling & Live Queue Orchestration

- **Interactive Calendar Views**: Multi-view scheduling interface (Daily, Weekly, Monthly) with doctor and status filtering.
- **Strict Booking Conflict Prevention**: Instant slot validation and lock mechanisms preventing double-booking across doctors and time slots.
- **State Transition Workflows**: Managed progression through `Pending` ➔ `Confirmed` ➔ `Completed` / `Cancelled` states, with cancelled appointments automatically excluded from active operational metrics.
- **SignalR Real-Time Queue Engine (`/hubs/queue`)**:
  - Live token synchronization across waiting room displays, doctor terminals, and patient mobile views.
  - Automated wait-time estimation engine calculating live delays based on current queue velocity.
  - Immediate audio chime and visual alerts upon doctor calling the next token.

---

### 3. 🩺 Electronic Medical Records (EMR) & Clinical History

- **Unified Patient Timeline**: Chronological clinical history consolidating past clinic visits, diagnoses, prescriptions, and lab orders into a cohesive timeline.
- **Vital Signs Tracking & Trend Visualization**:
  - Record core vitals during consultations: Blood Pressure (Systolic / Diastolic), Heart Rate, Body Temperature, SpO2, Height, Weight, and calculated BMI.
  - Trend analysis and abnormal reading highlights to support clinical decisions.
- **Patient Health Profile**:
  - Comprehensive chronic conditions registry and critical allergy warnings displayed prominently during consultation.
  - Past surgeries, family medical history, and clinical lifestyle notes.
- **One-Click Medical Summary Export**: Instant rendering and PDF generation of full patient health dossiers for referrals or patient records.

---

### 4. 💊 Smart FIFO Pharmaceutical Inventory & Expiry Tracking

- **Multi-Batch Stock Management**:
  - Track individual medication batches with `Batch Number`, `Manufacturing Date`, `Expiry Date`, `Unit Purchase Cost`, and `Available Quantity`.
- **Automated First-In, First-Out (FIFO) Consumption**:
  - Automatically identifies and dispenses medications from the oldest active, unexpired batch upon prescription issuance, reducing stock wastage.
- **Safety Expiry Quarantine Background Service (`InventoryMonitorService`)**:
  - Continuous background scanning automatically quarantining expired batches and preventing them from appearing in active prescribing dropdowns.
- **Low Stock & Near-Expiry Alerts**:
  - Real-time warning banners and badge indicators for medications dropping below minimum thresholds (< 20 units) or batches nearing expiry within 30 days.

---

### 5. 🧬 Disease Catalog & Reusable Prescription Templates

- **Standardized Disease Registry**:
  - Centralized diagnosis and disease catalog ensuring uniform medical terminology across clinical records.
  - Referential integrity protection: Soft-delete safeguards preventing the removal of diseases actively linked to historical patient records.
- **Custom Prescription Templates**:
  - Doctors can create and save standardized medication regimens linked to specific conditions.
  - Instant template loading pre-fills medications, dosages, administration routes, durations, and instructions into active consultations in one click.

---

### 6. 💳 Billing, Invoicing & Payment Verification

- **Automated Fee Calculation**:
  - Automatically calculates consultation fees, medication costs based on batch prices, and clinic services.
- **Payment Processing Options**:
  - Gateway webhook callback processing for automated transaction settlement and instant receipting.
  - Manual bank transfer and mobile pay receipt upload queue for administrative review and audit.
- **Itemized PDF Invoices**:
  - Professional, print-ready PDF invoice generation reflecting detailed fee breakdowns, tax/discounts, and payment statuses.

---

### 7. 📊 Clinical Analytics & Executive Reports

- **Multi-Period Aggregation**:
  - Toggle between **Daily**, **Weekly** (auto-span 7 days), and **Monthly** analytic views with year and month selectors.
- **Financial & Operational Key Metrics**:
  - Revenue analytics: Doctor consultation earnings vs. medicine inventory sales.
  - Patient volume breakdown: Walk-in patients vs. online portal bookings.
  - Appointment fulfillment and cancellation rates.
- **In-Page Report Previews & PDF Generation (DinkToPdf)**:
  - Appointments Summary Report
  - Clinic Revenue & Financial Report
  - Medicine Stock & Inventory Valuation Report
  - Patient Registry & Demographics Report
  - Follow-up Compliance Report
  - Monthly Consolidated Executive Business Summary

---

### 8. 🗣️ AI Clinic Assistant (Model Context Protocol - MCP)

- **Safe, Tool-Augmented LLM Integration**:
  - Powered by Google Gemini and integrated via standard Model Context Protocol (MCP) endpoints (`/api/mcp`).
  - Securely interacts with domain services without providing raw database access.
- **Available MCP Tools & Workflows**:
  - `get_dashboard_summary`: Operational and financial statistics across daily, weekly, and monthly scopes.
  - `get_today_appointments` & `get_waiting_queue`: Real-time schedule and queue briefings.
  - `get_next_patient`: Instant clinical briefing ("Know Your Patient") before calling the next token.
  - `get_patient_profile`, `get_patient_medical_history`, `get_patient_summary`: Comprehensive clinical lookups.
  - `search_medicines` & `get_stock_alerts`: Instant stock checks and expiry warnings.
  - `draft_referral_letter`: Automated drafting of formal physician referral letters.
  - `schedule_follow_up`: Automated booking of post-consultation checkup reminders.

---

### 9. 🌐 Localization (i18n) & Accessibility (a11y)

- **Bilingual Interface**: Built-in language switching supporting **English** and **Myanmar (Burmese)** across portal headers, metrics, forms, and alerts.
- **Accessible UX System**:
  - Universal `ModalPortal` with deep frosted background blur, focus trapping, and global body scroll locks.
  - Custom accessible `Select` and `DropdownMenu` components compliant with WCAG standards.
  - Responsive design optimized for desktop clinic workstations, tablet rounds, and mobile patient views.

---

## 📁 Project Structure

```
d:\SCMS
├── SCMS.Api/                   # ASP.NET Core Web API Host & Configuration
│   ├── Controllers/            # API Controllers (Auth, Patients, Prescriptions, etc.)
│   ├── Middleware/             # Global Exception Handler & ProblemDetails
│   └── Program.cs              # Service Registration, Auth & SignalR Hubs
├── SCMS.Domain/                # Core Business Logic & Feature Services
│   ├── Features/               # Feature-based Folders (Appointments, Mcp, Reports, etc.)
│   ├── Realtime/               # SignalR Hub Implementations (QueueHub, NotificationsHub)
│   └── Common/                 # JSON Converters, Format Helpers, Result Pattern
├── SCMS.Database/              # EF Core Data Layer & Migrations
│   ├── Models/                 # Database Entity Models
│   └── Seeding/                # Mass Database Seeding & Mock Data Generators
├── SCMS.Shared/                # Shared Contracts, DTOs & Pagination Models
├── SCMS.WebApp/                # Modern React 18 / Vite Web Frontend
│   ├── src/pages/              # Main Dashboard, Reports, EMR, & Portal Pages
│   │   ├── doctor/             # Dedicated Doctor Consultation & Schedule Views
│   │   └── user/               # Dedicated Patient & Family Portal Views
│   ├── src/components/         # Reusable Accessible UI Components (Modals, Select, etc.)
│   └── src/translation.json    # Localization Strings (English / Myanmar)
└── SCMS.Mobile/                # Cross-Platform Flutter Client
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
