# SCMS Web API Endpoints

**Base URL**: `http://localhost:5140`
**Interactive Scalar API Reference**: `http://localhost:5140/scalar`

---

## 1. Authentication (`/api/Auth`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/Auth/register` | Anonymous (Public) | Registers a new patient/user account |
| `POST` | `/api/Auth/login` | Anonymous (Public) | Authenticates credentials and returns JWT access & refresh tokens |
| `POST` | `/api/Auth/refresh` | Anonymous (Public) | Issues a new JWT access token using a valid refresh token |
| `POST` | `/api/Auth/logout` | Anonymous (Public) | Invalidates and revokes session refresh token (`LogoutRequest` -> `LogoutResponse`) |

---

## 2. Dashboards (`/api/Dashboards`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Dashboards/dashboard` | `owner`, `admin`, `doctor` | Retrieves clinical metrics, total income, monthly/weekly/daily breakdowns, doctor consultation fees, walk-in vs online patient counts, and queue status with query parameters (`?period=daily\|weekly\|monthly\|all&month=1..12&year=2026`) (`GetDoctorDashboardRequest` -> `DoctorDashboardResponse`) |
| `GET` | `/api/Dashboards/patient-dashboard` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves upcoming appointments, recent prescriptions, and medical stats for the logged-in patient |

---

## 3. Appointments (`/api/Appointments`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/Appointments` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Books a new appointment slot (`BookAppointmentRequest` -> `BookAppointmentResponse`) |
| `GET` | `/api/Appointments` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Lists appointments with pagination and filters (`GetAppointmentsRequest` -> `GetAppointmentsResponse`) |
| `PATCH` | `/api/Appointments/{id}/status` | `owner`, `admin`, `doctor` | Updates appointment status (`UpdateAppointmentStatusRequest` -> `UpdateAppointmentStatusResponse`) |
| `POST` | `/api/Appointments/{id}/reschedule` | `owner`, `admin`, `doctor` | Reschedules an appointment (`RescheduleAppointmentRequest` -> `RescheduleAppointmentResponse`) |
| `GET` | `/api/Appointments/{id}/queue-status` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves real-time queue position and estimated wait time |
| `POST` | `/api/Appointments/call-next` | `owner`, `admin`, `doctor` | Calls next queued patient in line (`CallNextPatientResponse`) |

---

## 4. Patients (`/api/Patients`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/Patients` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Creates a new patient profile (`CreatePatientProfileRequest` -> `CreatePatientProfileResponse`) |
| `PUT` | `/api/Patients/{id}` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Updates an existing patient profile (`UpdatePatientProfileRequest` -> `UpdatePatientProfileResponse`) |
| `GET` | `/api/Patients` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Lists patient profiles with pagination (`GetPatientProfilesRequest` -> `GetPatientProfilesResponse`) |
| `GET` | `/api/Patients/search` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Searches patient profiles by query keyword (`SearchPatientProfilesRequest` -> `SearchPatientProfilesResponse`) |
| `GET` | `/api/Patients/patients/{id}` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves detailed patient profile information by ID (`GetPatientProfileByIdResponse`) |
| `GET` | `/api/Patients/{id}/history` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves full clinic visit, consultation, and diagnosis history |
| `GET` | `/api/Patients/{id}/summary` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves comprehensive patient medical summary in JSON format |
| `GET` | `/api/Patients/{id}/summary/html` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Renders and returns formatted medical summary HTML |
| `GET` | `/api/Patients/{id}/summary/pdf` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Generates and downloads medical summary report as a PDF |
| `DELETE` | `/api/Patients/{id}` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Deletes / deactivates a patient profile |

---

## 5. Prescriptions (`/api/Prescriptions`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/Prescriptions` | `owner`, `admin`, `doctor` | Creates a prescription and dispenses medications (`CreatePrescriptionRequest` -> `CreatePrescriptionResponse`) |
| `GET` | `/api/Prescriptions` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Lists prescriptions with pagination (`GetPrescriptionsRequest` -> `GetPrescriptionsResponse`) |
| `GET` | `/api/Prescriptions/prescriptions/{id}` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves detailed prescription items and diagnosis (`GetPrescriptionDetailsResponse`) |
| `POST` | `/api/Prescriptions/templates` | `owner`, `admin`, `doctor` | Creates and saves a prescription template (`SaveTemplateRequest` -> `SaveTemplateResponse`) |
| `GET` | `/api/Prescriptions/templates` | `owner`, `admin`, `doctor` | Lists prescription templates with pagination (`GetTemplatesRequest` -> `GetTemplatesResponse`) |
| `DELETE` | `/api/Prescriptions/templates/{id}` | `owner`, `admin`, `doctor` | Deletes a saved prescription template |
| `GET` | `/api/Prescriptions/{id}/pdf` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Generates and downloads official prescription document as PDF |

---

## 6. Medicines & Inventory (`/api/Medicines`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Medicines` | `owner`, `admin`, `doctor` | Lists medicines with pagination (`GetMedicinesRequest` -> `GetMedicinesResponse`) |
| `GET` | `/api/Medicines/search` | `owner`, `admin`, `doctor` | Searches medicines by keyword query (`SearchMedicinesRequest` -> `SearchMedicinesResponse`) |
| `POST` | `/api/Medicines` | `owner`, `admin`, `doctor` | Adds a new medicine entry with optional image upload (`CreateMedicineResponse`) |
| `PUT` | `/api/Medicines/{id}` | `owner`, `admin`, `doctor` | Updates medicine details, category, unit price, or image (`UpdateMedicineResponse`) |
| `DELETE` | `/api/Medicines/{id}` | `owner`, `admin`, `doctor` | Deletes a medicine from inventory |
| `GET` | `/api/Medicines/categories` | `owner`, `admin`, `doctor` | Retrieves all distinct medicine categories |
| `POST` | `/api/Medicines/quarantine-expired` | `owner`, `admin`, `doctor` | Automatically detects and moves expired batches to quarantined status |
| `GET` | `/api/Medicines/alerts` | `owner`, `admin`, `doctor` | Retrieves active inventory alerts for low-stock and expiring batches |
| `GET` | `/api/Medicines/batches` | `owner`, `admin`, `doctor` | Lists medicine batches with pagination (`GetBatchesRequest` -> `GetBatchesResponse`) |
| `GET` | `/api/Medicines/batches/search` | `owner`, `admin`, `doctor` | Searches medicine batches by query (`SearchBatchesRequest` -> `SearchBatchesResponse`) |
| `GET` | `/api/Medicines/batches/{id}` | `owner`, `admin`, `doctor` | Retrieves detailed information for a specific batch (`GetBatchByIdResponse`) |
| `POST` | `/api/Medicines/batches` | `owner`, `admin`, `doctor` | Adds a new stock batch (`CreateBatchResponse`) |
| `PUT` | `/api/Medicines/batches/{id}` | `owner`, `admin`, `doctor` | Updates batch quantity, expiry date, or price (`UpdateBatchResponse`) |
| `DELETE` | `/api/Medicines/batches/{id}` | `owner`, `admin`, `doctor` | Deletes a batch |

---

## 7. Diseases & Diagnoses (`/api/Diseases`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Diseases` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Lists diseases with pagination (`GetDiseasesRequest` -> `GetDiseasesResponse`) |
| `GET` | `/api/Diseases/search` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Searches diseases by keyword (`SearchDiseasesRequest` -> `SearchDiseasesResponse`) |
| `POST` | `/api/Diseases` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Creates a new disease diagnosis record (`CreateDiseaseResponse`) |
| `PUT` | `/api/Diseases` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Updates disease diagnosis details (`UpdateDiseaseResponse`) |
| `DELETE` | `/api/Diseases/{id}` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Deactivates / deletes a disease record |

---

## 8. Payments & Billing (`/api/Payments`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Payments` | `owner`, `admin`, `doctor` | Lists payment records with pagination (`GetPaymentsRequest` -> `GetPaymentsResponse`) |
| `GET` | `/api/Payments/search` | `owner`, `admin`, `doctor` | Searches payments by keyword query (`SearchPaymentsRequest` -> `SearchPaymentsResponse`) |
| `GET` | `/api/Payments/{id}` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Retrieves payment details by ID (`GetPaymentByIdResponse`) |
| `POST` | `/api/Payments/gateway-callback` | `owner`, `admin`, `doctor` | Handles webhook callbacks from external payment gateways (`ProcessPaymentCallbackResponse`) |
| `POST` | `/api/Payments/manual-proof` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Submits manual payment proof for review (`ManualPaymentProofResponse`) |
| `POST` | `/api/Payments/{id}/approve` | `owner`, `admin`, `doctor` | Approves a submitted manual payment (`ApprovePaymentResponse`) |
| `GET` | `/api/Payments/{id}/invoice/pdf` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Generates and downloads payment invoice as a PDF |

---

## 9. Users & Staff (`/api/Users`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Users` | `owner`, `admin` | Lists system users with pagination (`GetUsersRequest` -> `GetUsersResponse`) |
| `GET` | `/api/Users/search` | `owner`, `admin` | Searches users by name/email/mobile keyword (`SearchUsersRequest` -> `SearchUsersResponse`) |
| `GET` | `/api/Users/{id}` | `owner`, `admin` | Retrieves user details by ID (`GetUserByIdResponse`) |
| `POST` | `/api/Users/staff` | `owner`, `admin` | Creates a new staff user with assigned roles (`CreateStaffUserRequest` -> `CreateStaffUserResponse`) |
| `PUT` | `/api/Users/{id}/roles` | `owner`, `admin` | Updates assigned roles for a user (`UpdateUserRolesRequest` -> `UpdateUserRolesResponse`) |
| `DELETE` | `/api/Users/{id}` | `owner`, `admin` | Soft-deletes a user account |

---

## 10. Follow-ups (`/api/FollowUps`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/FollowUps` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Lists scheduled follow-up visits with pagination |
| `POST` | `/api/FollowUps` | `owner`, `admin`, `doctor` | Schedules a follow-up consultation for a patient |
| `POST` | `/api/FollowUps/{id}/complete` | `owner`, `admin`, `doctor` | Marks a scheduled follow-up consultation as completed |

---

## 11. Notifications (`/api/Notifications`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Notifications` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Lists notifications (`GetNotificationsRequest` -> `GetNotificationsResponse`) |
| `POST` | `/api/Notifications/{id}/read` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Marks a notification as read |
| `POST` | `/api/Notifications` | `owner`, `admin`, `doctor` | Dispatches an in-app notification (`CreateNotificationRequest` -> `CreateNotificationResponse`) |

---

## 12. Reports & Analytics (`/api/Reports`)

*All report endpoints are restricted to staff roles (`owner`, `admin`, `doctor`).*

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/Reports/appointments` | `owner`, `admin`, `doctor` | Generates appointment summary data (JSON) — `?reportType=&date=&startDate=&endDate=&month=&year=` (`AppointmentReportRequest` -> `AppointmentReportResponse`) |
| `GET` | `/api/Reports/appointments/pdf` | `owner`, `admin`, `doctor` | Downloads appointment summary report as PDF |
| `GET` | `/api/Reports/revenue` | `owner`, `admin`, `doctor` | Generates clinic revenue analytics data (JSON) — `?reportType=&date=&startDate=&endDate=&month=&year=` (`RevenueReportRequest` -> `RevenueReportResponse`) |
| `GET` | `/api/Reports/revenue/pdf` | `owner`, `admin`, `doctor` | Downloads clinic revenue analytics report as PDF |
| `GET` | `/api/Reports/patients` | `owner`, `admin`, `doctor` | Generates patient demographic and registration report (JSON) |
| `GET` | `/api/Reports/patients/pdf` | `owner`, `admin`, `doctor` | Downloads patient registry report as PDF |
| `GET` | `/api/Reports/medicine-stock` | `owner`, `admin`, `doctor` | Generates medicine inventory and valuation report (JSON) |
| `GET` | `/api/Reports/medicine-stock/pdf` | `owner`, `admin`, `doctor` | Downloads medicine inventory report as PDF |
| `GET` | `/api/Reports/follow-ups` | `owner`, `admin`, `doctor` | Generates follow-up tracking report (JSON) — `?startDate=&endDate=&status=` |
| `GET` | `/api/Reports/follow-ups/pdf` | `owner`, `admin`, `doctor` | Downloads follow-up tracking report as PDF |
| `GET` | `/api/Reports/prescriptions` | `owner`, `admin`, `doctor` | Generates prescription dispensation report (JSON) |
| `GET` | `/api/Reports/prescriptions/pdf` | `owner`, `admin`, `doctor` | Downloads prescription dispensation report as PDF |
| `GET` | `/api/Reports/business-summary` | `owner`, `admin`, `doctor` | Generates comprehensive monthly business summary (JSON) — `?month=&year=` |
| `GET` | `/api/Reports/business-summary/pdf` | `owner`, `admin`, `doctor` | Downloads monthly business summary report as PDF |

---

## 13. Model Context Protocol / AI Assistant (`/api/mcp`)

*All MCP endpoints are restricted to staff roles (`owner`, `admin`, `doctor`).*

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/mcp/tools` | `owner`, `admin`, `doctor` | Lists available MCP tool definitions and schemas for AI tool calling |
| `POST` | `/api/mcp/tools/call` | `owner`, `admin`, `doctor` | Executes a specific MCP tool call directly against clinic business logic |
| `POST` | `/api/mcp/chat` | `owner`, `admin`, `doctor` | AI assistant conversational loop with automated multi-turn MCP tool calling |

---

## 14. Real-Time SignalR Hubs (`/hubs`)

*Requires JWT token passed via `access_token` query parameter.*

| Protocol | Route | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `WSS / WS` | `/hubs/queue` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Real-time queue event notifications (e.g., patient called, queue advanced) |
| `WSS / WS` | `/hubs/notifications` | Authenticated (`user`, `owner`, `admin`, `doctor`) | Real-time user alert and push notification broadcasting |

---

## 15. Dev & Health Endpoints

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Anonymous (Public) | ASP.NET Core health check probe for Render/Docker zero-downtime health monitoring |

