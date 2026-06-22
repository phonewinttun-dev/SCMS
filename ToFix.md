# SCMS Functional Testing - Logical & Flow Flaws Analysis

This document outlines the logical flaws, code inconsistencies, and user flow problems identified in the SCMS application during recent functional testing. It serves as a guide for the engineering team to resolve these issues.

---

## 1. Patient Profile Creation Flow Blocker

### Issue
Staff users (Doctors/Admins) cannot create a new Patient Profile if the patient does not already have a registered User account (`TblUser`).

### Technical Root Cause
* **Backend Validation**: In [PatientService.cs:L46-65](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Patients/PatientService.cs#L46-L65), when a staff member creates a profile (`isStaff = true`), the code searches for an existing `TblUser` record matching the provided email or mobile number:
  ```csharp
  var owner = await _context.TblUsers
      .FirstOrDefaultAsync(u => u.DeleteFlag != true && ((u.Email != null && u.Email.ToLower() == email) || (u.MobileNo != null && u.MobileNo == mobile)));

  if (owner == null)
  {
      return Result<PatientProfileResponse>.Failure("Patient user account not found for the provided email or mobile number.");
  }
  ```
  If no matching user is found, creation fails.
* **Frontend Limitation**: In [PatientsPage.jsx](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.WebApp/src/pages/PatientsPage.jsx), the form allows staff to enter phone and email but has no mechanism to check for, create, or link to a parent user account.

> [!WARNING]
> This completely breaks the offline-to-online staff workflow: new walk-in patients without pre-registered user accounts cannot have EMR profile cards created by the clinic staff.

### Proposed Solutions
1. **Auto-registration of User Accounts (Recommended)**: If `owner` is null in [PatientService.cs](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Patients/PatientService.cs), automatically generate a placeholder `TblUser` account in the `user` (Patient) role.
2. **Frontend User Link/Create Indicator**: Update [PatientsPage.jsx](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.WebApp/src/pages/PatientsPage.jsx) to notify staff if the patient email/mobile is not registered, and allow them to trigger user account creation inline.

---

## 2. Prescription Medicine Custom Instructions Constraint

### Issue
Doctors cannot input custom administration instructions for prescribed medicines in the EMR workspace.

### Technical Root Cause
* **Backend Support**: The backend database model `TblPrescriptionItem` has an `Instruction` column (`string?`) which fully supports any custom text.
* **Frontend Constraint**: In [AppointmentsPage.jsx:L1078-1092](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.WebApp/src/pages/AppointmentsPage.jsx#L1078-L1092), the medicine instructions field is hardcoded as a select dropdown with exactly 5 pre-defined choices:
  ```jsx
  <select
    className="select select-bordered select-xs h-7 rounded w-full"
    value={item.instruction}
    onChange={(e) => updateItemField(item.medicineId, "instruction", e.target.value)}
  >
    <option value="After meal">After meal</option>
    <option value="Before meal">Before meal</option>
    <option value="With meal">With meal</option>
    <option value="Bedtime">Bedtime</option>
    <option value="Anytime / As needed">Anytime</option>
  </select>
  ```

> [!IMPORTANT]
> This forces doctors to select generic values and prevents them from outputting vital specific clinical advice (e.g. "Apply topically twice daily", "Dissolve in 200ml water").

### Proposed Solutions
1. **Dropdown with Text Input Fallback**: Add a "Custom..." option in the select dropdown. If selected, display a text input field for the doctor to type custom instructions.
2. **Combobox Input**: Replace the raw select element with a search-and-type combobox that permits free text entry.

---

## 3. Automatic Queue System - Cancelled Appointment Index Bias

### Issue
The queue system continues to include cancelled appointments when computing queue positions (Tokens) and wait times, occasionally causing the next-patient display to show wrong numbers.

### Technical Root Cause
* **Queue Index Calculation**: In [DashboardService.cs:L93-100](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Dashboards/DashboardService.cs#L93-L100), `GetTodayAppointmentsAsync` fetches today's appointments:
  ```csharp
  return await _context.TblAppointments
      .Include(a => a.Patient)
      .Where(a => a.Datetime >= start && a.Datetime < end)
      .OrderBy(a => a.Id)
      .ToListAsync();
  ```
  This query does **not** exclude `Status == "cancelled"`.
* **Token Offset**: The `GetUpcomingPatients` method uses `.IndexOf(a) + 1` to assign the `TokenNumber` from this unfiltered list. Cancelled appointments act as silent placeholders, skewing subsequent active patient tokens:
  ```csharp
  TokenNumber = todayAppointments.IndexOf(a) + 1
  ```
* **Status Updates**: In [AppointmentsService.cs:L384-389](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Appointments/AppointmentsService.cs#L384-L389), `CallNextPatientAsync` uses `todayQueue` which excludes cancelled appointments, but queue information helpers (`GetQueueInfoAsync` and `GetTokenNumberAsync`) index differently, introducing database-view mismatches.

### Proposed Solutions
1. **Filter Out Cancelled Status**: Modify `GetTodayAppointmentsAsync` in [DashboardService.cs](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Dashboards/DashboardService.cs) to exclude `a.Status == "cancelled"`.
2. **Align Queue Definitions**: Standardize queue status filtering uniformly across `AppointmentsService.cs` and `DashboardService.cs`.

---

## 4. Notifications Trapped in Page-Level SignalR Connection

### Issue
Users do not receive real-time notifications or alerts while browsing other pages (e.g. Dashboard, Billing) unless they have the Notifications page actively open.

### Technical Root Cause
* **Scope Restriction**: The SignalR connection to `/hubs/notifications` is established exclusively inside the `useEffect` block of [UserNotifications.jsx:L35-49](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.WebApp/src/pages/user/UserNotifications.jsx#L35-L49):
  ```javascript
  useEffect(() => {
    let disposed = false;
    const connection = createNotificationsConnection();
    connection.on("ReceiveNotification", (notification) => {
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification?.id)]);
      setLiveStatus("New notification received.");
    });
    // ...
    return () => {
      disposed = true;
      connection.stop(); // Stops connection when user leaves page
    };
  }, []);
  ```
  Once the component unmounts, the SignalR connection is closed, and incoming messages are ignored.

> [!CAUTION]
> If a doctor marks an appointment status as "Confirmed" or calls "It's Your Turn!", the patient will receive no sound, toast, or badge notification unless they are staring at the `/user/notifications` route.

### Proposed Solutions
1. **Move Connection to Global Shell**: Lift the `createNotificationsConnection` instantiation to [AppShell.jsx](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.WebApp/src/components/AppShell.jsx) or [AuthContext.jsx](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.WebApp/src/context/AuthContext.jsx).
2. **Introduce Toast Notification Provider**: Hook the global SignalR listener to a UI notification context that fires slide-in toast alerts (using a library or custom component) regardless of the active page.

---

## 5. Orphaned Prescription Templates on Disease Deactivation

### Issue
When a disease is soft-deleted, its associated prescription templates are not removed, resulting in orphaned templates referencing inactive diseases.

### Technical Root Cause
* **Soft Delete Logic**: In [DiseaseService.cs:L112-135](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Diseases/DiseaseService.cs#L112-L135), the deactivation checks if the disease is referenced in active patient prescriptions. If not, it soft-deletes the disease:
  ```csharp
  disease.DeleteFlag = true;
  disease.UpdatedAt = DateTime.UtcNow;
  await _context.SaveChangesAsync();
  ```
* **No Application Cascade**: The prescription templates (`TblPrescriptionTemplate` table) that link to this disease via `DiseaseId` are untouched. Since soft-delete is an application-level update, the database cascade rules are never triggered.

### Proposed Solutions
1. **Deactivate Templates on Disease Delete**: Update `DeactivateDiseaseAsync` in [DiseaseService.cs](file:///c:/Users/ryanm/Documents/GitHub/SCMS/SCMS.Domain/Features/Diseases/DiseaseService.cs) to explicitly locate and soft-delete associated templates:
   ```csharp
   var templates = await _context.TblPrescriptionTemplates
       .Include(t => t.TblPrescriptionTemplateItems)
       .Where(t => t.DiseaseId == id && t.DeleteFlag != true)
       .ToListAsync();

   foreach (var template in templates)
   {
       template.DeleteFlag = true;
       template.UpdatedAt = DateTime.UtcNow;
       foreach (var item in template.TblPrescriptionTemplateItems)
       {
           item.DeleteFlag = true;
       }
   }
   ```
