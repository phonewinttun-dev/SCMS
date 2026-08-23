# SCMS Feature List

Smart Clinic Management System (SCMS) is organized into three role-based workspaces:

- **`/app`** — Owner / Admin / Staff back-office
- **`/doctor`** — Doctor clinical workspace
- **`/user`** — Patient / family self-service portal

Every backend endpoint is gated by a granular `Menu.Action` permission (e.g. `Patients.Create`,
`Appointments.UpdateStatus`) checked via `[HasPermission("...")]`. Roles are just named bundles of
these permissions — see [Feature 14](#14-user-accounts-roles--permissions) for how **Owner**,
**Admin**, **Doctor**, and **User** actually differ under the hood.

Features below are ordered by priority — roughly, how central each one is to running the clinic day
to day, from core clinical operations down to supporting/administrative capabilities.

---

## 1. Patient Records & Electronic Health Record (EHR)

**Roles:** Owner/Admin, Doctor, User

The clinic's master patient registry. Owner/Admin manage the full patient list with create, edit,
delete, and search. Every patient record opens into a tabbed **EHR modal** (Overview, Timeline,
Prescriptions, Demographics) showing longitudinal vitals history and a chronological visit
timeline, with a one-click "download summary PDF" export.

Doctors get their own patient view (`DoctorPatients`) focused on clinical lookup: search a patient
and open their history (past prescriptions and consultation records) directly from the queue,
without the administrative CRUD controls Owner/Admin has.

Patients themselves don't see a global registry — instead, on the User portal this same underlying
patient-record concept becomes **family/dependent profiles** (see Feature 8): each family member a
user registers is a real patient record, just scoped to that user's own household.

---

## 2. Appointment Scheduling & Live Queue Management

**Roles:** Owner/Admin, Doctor, User

The day-to-day heartbeat of the clinic. Owner/Admin get a full appointments list with search,
filtering, status badges (pending/confirmed/completed/cancelled/rejected), a "Call Next" queue
action, and per-row status changes (confirm, cancel, complete) — plus an embedded EMR consulting
modal that lets staff record a consult and save a prescription template inline, without leaving the
appointments screen.

The Doctor workspace centers this around a **live queue roster** (`DoctorDashboard`): patients are
shown in waiting / in-consultation / completed tabs with a "Call Next" action, auto-refreshing via
an internal `scms:refresh-queue` event so the doctor's screen updates without a manual reload.
`DoctorAppointments` gives the doctor a searchable, date-filterable view that's the entry point into
a full consultation.

On the User portal, appointments are **booked**, not managed: a multi-step booking modal (choose
reason → date/time → notes) validates the slot and generates an arrival/queue token. Booking is
gated on having at least one active family profile selected — you can't book for nobody.

Status lifecycle: **pending/requested → confirmed/active → completed**, with **cancelled** and
**rejected** as terminal negative states; once an appointment is completed or cancelled its
row actions for further status changes are disabled.

---

## 3. Doctor Consultation Workspace

**Roles:** Doctor

The richest single page in the system (`DoctorConsultation.jsx`). This is where an actual visit gets
recorded: vitals capture (weight/height with an auto-computed BMI), a diagnosis field, and an
itemized prescription builder (add/remove medicine line items with dosage, quantity, and
instructions). Doctors can load a saved prescription template to speed up common visits, and a
patient-history side panel keeps prior visits one click away while consulting. Clinical vitals are
validated before the consult can be saved.

This is a doctor-only feature by design — Owner/Admin can trigger a lightweight version of the same
save-a-consult flow from the Appointments page for administrative coverage, but the full clinical
authoring workspace lives here.

---

## 4. Prescriptions & Prescription Templates

**Roles:** Owner/Admin, Doctor, User

Prescriptions are authored during a consultation (Feature 3) and then live on as records everyone
can reference. Owner/Admin get a list/search view with a detail modal and PDF export.
Doctors get a tabbed view — **Prescriptions** (past prescriptions with PDF export) and **Templates**
(create, edit, and delete reusable prescription templates keyed to a disease, with the same
medicine/dosage/quantity/instruction line items used in a live consultation) — so a template built
once can be re-applied across many visits instead of rebuilding it from scratch. Patients get a
read-only list of their own prescriptions with per-prescription PDF download, so they can carry a
printable copy to a pharmacy.

---

## 5. Medicine Inventory & Batch Tracking

**Roles:** Owner/Admin, Doctor (view only)

Full CRUD for the medicine catalog (name, category, unit pricing) plus a linked **Batches** module
for lot-level inventory: each batch tracks its own manufacture date, expiry date (validated so
expiry can never precede manufacture), and quantity. A **"Quarantine Expired"** bulk action
isolates expired batches out of active/sellable stock in one click. Low-stock and
approaching-expiry conditions surface both here and via the Reports and AI Assistant tools
(`get_low_stock_medicines`, `get_expiring_batches`). Doctors have read access to medicine data
(to check availability while prescribing) but no create/edit/delete rights.

---

## 6. Billing & Payments

**Roles:** Owner/Admin, User

Handles the clinic's manual mobile-payment workflow rather than a live payment gateway. Owner/Admin
see a billing list with search, a **payment-proof verification modal** (view the uploaded transfer
screenshot/reference a patient submitted), an "Approve" action that settles the transaction, and
invoice PDF export. On the User portal, patients submit payment proof themselves — payment method
(e.g. KBZPay), screenshot URL, and transaction reference tied to a specific appointment/amount —
then download an invoice/receipt PDF once settled. Approving a payment and exporting its PDF are
separately permissioned (`Payments.Update` vs `Payments.ExportPdf`/`Payments.Create`), so
front-desk staff can be given one capability without the other.

---

## 7. Follow-Up Reminders

**Roles:** Owner/Admin, Doctor, User

A lightweight recall system tying a due date and clinical note/recommendation to a patient (and
optionally an appointment). Owner/Admin and Doctor can create, list, and mark follow-ups complete
(`DoctorFollowUps` adds all/pending/completed filtering for a doctor's own recall list). On the
User portal this becomes "Book Follow-Up Slot" — a thin wrapper into the same family-profile-scoped
booking flow used for regular appointments, so a recommended follow-up turns directly into a
bookable visit.

---

## 8. Family / Dependent Patient Profiles

**Roles:** User

The mechanism that makes the patient portal work for households, not just individuals. A logged-in
user can add family members as linked patient profiles ("Add Family Member" modal), view each
profile's detail, and download a per-profile medical summary PDF. This is a hard gate on the rest
of the portal: booking an appointment or a follow-up anywhere in `/user` is blocked until at least
one active family profile exists, since every booking needs a real patient record behind it.

---

## 9. Notifications

**Roles:** Owner/Admin (author), Doctor, User (recipients)

Owner/Admin can create notifications either targeted at a specific user or broadcast to everyone,
and see read/unread status across the system. Doctors and patients receive and mark-as-read their
own notifications as recipients. This is also the channel the MCP `get_unread_notifications` tool
surfaces through the AI Assistant, and the one appointment cancellation/reschedule tools write into
automatically when they affect a patient's booking.

---

## 10. Dashboards & Operational Analytics

**Roles:** Owner/Admin, Doctor, User

Each workspace gets a dashboard tuned to what that role needs at a glance. Owner/Admin's
`Dashboard.jsx` shows KPI stat cards (appointments, patients, revenue, stock) with an
appointment-detail modal and drill-down table, aggregated daily/weekly/monthly. The doctor's
dashboard is really the live queue roster described in Feature 2. The patient's `UserDashboard`
surfaces their own upcoming appointments and is also where the booking flow (Feature 2) begins.

---

## 11. Reports & PDF Exports

**Roles:** Owner/Admin, Doctor (subset)

A category-driven report generator: Financial & Revenue, Appointments Summary, Executive Overview,
Patient Demographics, Pharmacy & Stock Inventory, Patient Follow-Ups, and Prescriptions Log — each
with daily/weekly/monthly/custom-range timeframe pickers, an in-app preview (tables/breakdowns),
and PDF export. Doctors get view and export rights on reports relevant to their own clinical work;
the full report category set is an Owner/Admin capability.

---

## 12. AI Assistant & MCP Quick Actions

**Roles:** Owner/Admin, Doctor — **not available to User**

A Gemini-backed chat assistant plus a "Quick Actions" panel, both built on 22 backend MCP tools
(`get_dashboard_summary`, `get_today_appointments`, `get_patient_kyp_brief` — a "Know Your Patient"
clinical/behavioral brief — appointment status/reschedule/cancel tools, prescription-template
tools, stock/expiry lookups, and more). It's gated end-to-end: the controller-level
`Mcp.Access` permission is only granted to Owner, Admin, and Doctor roles — Patient/User accounts
have no access to it at all, by permission, not just by UI hiding.

Within the tools themselves there's a second layer of guardrails: the chat agent is **read-only by
design** — the 9 tools that mutate clinic data (cancel/reschedule/update-status/create/delete) are
never even declared to the model as callable functions, and a hard server-side check blocks
executing one even if a call for it somehow arrived. The system prompt also keeps the assistant
scoped to clinic topics only, declining unrelated requests. Any actual data change has to go through
the human-driven **Quick Actions** UI, which requires an explicit confirm click for anything
destructive or bulk (cancel-in-range, bulk status update, delete template, reschedule-in-range,
etc.), with guided forms (status pills, time quick-picks, repeatable item rows) instead of raw JSON.

---

## 13. Disease/Diagnosis Catalog & Protocol Templates

**Roles:** Owner/Admin, Doctor

A managed catalog of diagnoses with ICD-10 codes, plus a separate "Protocol Templates" modal for
standard treatment protocols tied to a disease. This is what powers the disease picker used when
authoring a prescription template (Feature 4) and consultation diagnosis field (Feature 3).

---

## 14. User Accounts, Roles & Permissions

**Roles:** Owner/Admin (manage), Doctor & User (assigned)

The access-control backbone everything above depends on. Permissions are fine-grained
`Menu.Action` strings, and roles are just named permission bundles, seeded in
`SCMS.Database/Seeding/DataSeeder.cs`:

- **Owner and Admin start with every permission in the system** — as seeded, they're functionally
  identical. The real difference is enforced in code, not in the permission set: the "Owner" role's
  permissions can never be edited or revoked (`RoleService.cs` hardcodes this), and no account
  holding the Owner role can be deleted (`UserService.cs`). Admin has neither protection — an
  Admin's permissions can be edited/revoked via the Roles UI, and an Admin account can be deleted.
  In short: **Owner is a permanent, un-editable super-admin; Admin is fully-capable but modifiable
  and removable.**
- **Doctor** gets a curated clinical subset: appointments (view/create/update/status/delete),
  patients (view/create/update/export), full prescription CRUD + PDF, medicine view, full
  follow-up CRUD, disease view/create/update, notifications, dashboard view, report view/export,
  and `Mcp.Access`.
- **User (Patient)** gets a deliberately narrow set: appointments (view/create only — no
  update/delete, so a patient can't unilaterally reschedule or cancel through those endpoints),
  patients (view/create/update — for managing family profiles), prescription view, payments
  (view/create, for submitting payment proof), notifications, and dashboard view. **No
  `Mcp.Access`.**

Public self-registration (`/register`, `AuthController.Register`) only ever creates a **Patient/User**
account — Owner, Admin, and Doctor accounts must be provisioned by an existing Owner/Admin through
the Users management screen, not through the public sign-up form.
