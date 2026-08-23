using System;
using System.Collections.Generic;
using System.Linq;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SCMS.Database.Models;
using SCMS.Domain.Common;
using SCMS.Shared;
using SCMS.Domain.Features.Mcp.Models;
using SCMS.Domain.Features.Prescriptions.Models;
using SCMS.Domain.Features.Dashboards;

namespace SCMS.Domain.Features.Mcp
{
    public class McpService : IMcpService
    {
        private const string DateFormat = FormatHelper.DateFormat;
        private const string TimeFormat = FormatHelper.TimeFormat;
        private const string DateTimeFormat = FormatHelper.DateTimeFormat;

        /// <summary>Total active units below which a medicine is reported as critically low.</summary>
        private const int LowStockThreshold = 20;

        /// <summary>Default look-ahead window for the expiring-batches tool.</summary>
        private const int DefaultExpiryWindowDays = 30;

        /// <summary>Upper bound on how many appointments a single bulk tool call may mutate.</summary>
        private const int BulkMutationLimit = 100;

        /// <summary>How many historical records the patient-history tools return.</summary>
        private const int VisitHistoryLimit = 10;
        private const int PrescriptionHistoryLimit = 5;
        private const int NotificationLimit = 10;

        private static readonly string[] ValidAppointmentStatuses = { "pending", "confirmed", "cancelled", "completed" };

        private readonly AppDbContext _context;
        private readonly IDashboardService _dashboardService;
        private readonly ILogger<McpService>? _logger;

        public McpService(AppDbContext context, IDashboardService dashboardService, ILogger<McpService>? logger = null)
        {
            _context = context;
            _dashboardService = dashboardService;
            _logger = logger;
        }

        /// <summary>
        /// Marker for a tool that ran but could not do what was asked. Returning one of these
        /// (rather than an anonymous object with an "error" member) is what lets CallToolAsync
        /// set isError on the response, so both the UI and the model can tell success from failure.
        /// </summary>
        private sealed class ToolError
        {
            public ToolError(string message) => Message = message;

            public string Message { get; }

            public bool Error => true;
        }

        private static ToolError Fail(string message) => new(message);

        /// <summary>Format a stored UTC instant as a clinic-local date: 24/06/2026.</summary>
        private static string ClinicDate(DateTime utc) =>
            ClinicClock.ToClinic(utc).ToString(DateFormat, CultureInfo.InvariantCulture);

        /// <summary>Format a stored UTC instant as a clinic-local 24-hour time: 14:30.</summary>
        private static string ClinicTime(DateTime utc) =>
            ClinicClock.ToClinic(utc).ToString(TimeFormat, CultureInfo.InvariantCulture);

        /// <summary>Format a stored UTC instant as a clinic-local date and time: 24/06/2026 14:30.</summary>
        private static string ClinicDateTime(DateTime utc) =>
            ClinicClock.ToClinic(utc).ToString(DateTimeFormat, CultureInfo.InvariantCulture);

        /// <summary>Format a calendar date (no instant, so no conversion): 24/06/2026.</summary>
        private static string CalendarDate(DateOnly date) =>
            date.ToString(DateFormat, CultureInfo.InvariantCulture);

        /// <summary>
        /// Tools that write to clinic data. Kept out of the AI chat agent's hands entirely - see
        /// <see cref="McpToolDefinition.IsMutating"/> - so the agent can only ever look things up.
        /// Declared before <see cref="ToolDefinitions"/> since that field's initializer reads it.
        /// </summary>
        private static readonly HashSet<string> MutatingToolNames = new(StringComparer.Ordinal)
        {
            "create_follow_up_reminder",
            "update_appointment_status",
            "cancel_appointments_in_range",
            "reschedule_appointments_in_range",
            "update_appointment_status_by_patient_name",
            "reschedule_today_appointments",
            "create_prescription_template",
            "delete_prescription_template",
            "bulk_update_today_appointments_status",
        };

        /// <summary>
        /// The advertised tool catalogue. Built once; every name here must have a matching
        /// arm in the CallToolAsync switch, which <see cref="KnownTools"/> enforces at dispatch.
        /// </summary>
        private static readonly List<McpToolDefinition> ToolDefinitions = BuildToolDefinitions();

        private static readonly HashSet<string> KnownTools =
            new(ToolDefinitions.Select(t => t.Name), StringComparer.Ordinal);

        public List<McpToolDefinition> GetAvailableTools() => ToolDefinitions;

        private static List<McpToolDefinition> BuildToolDefinitions()
        {
            var definitions = BuildToolDefinitionsCore();
            foreach (var def in definitions)
            {
                def.IsMutating = MutatingToolNames.Contains(def.Name);
            }
            return definitions;
        }

        private static List<McpToolDefinition> BuildToolDefinitionsCore()
        {
            return new List<McpToolDefinition>
            {
                new()
                {
                    Name = "get_dashboard_summary",
                    Description = "Retrieve clinic operational, financial, and clinical dashboard summary (total income, consultation fees, walk-in vs online patient counts, active queue tokens, stock alerts). Supports period: 'daily', 'weekly', 'monthly'.",
                    InputSchema = SchemaGenerator.FromClass<PeriodInput>()
                },
                new()
                {
                    Name = "get_today_appointments",
                    Description = "Retrieve scheduled appointments and details for today's briefing.",
                    InputSchema = SchemaGenerator.FromClass<EmptyInput>()
                },
                new()
                {
                    Name = "get_waiting_queue",
                    Description = "Retrieve patients currently in the live waiting queue.",
                    InputSchema = SchemaGenerator.FromClass<EmptyInput>()
                }, 
                new()
                {
                    Name = "get_next_patient",
                    Description = "Retrieve details and medical snapshot of the next patient in the queue.",
                    InputSchema = SchemaGenerator.FromClass<EmptyInput>()
                },
                new()
                {
                    Name = "get_patient_profile",
                    Description = "Retrieve a patient's core profile, demographics, allergies, and chronic conditions.",
                    InputSchema = SchemaGenerator.FromClass<PatientIdInput>()
                },
                new()
                {
                    Name = "get_patient_visit_history",
                    Description = "Retrieve chronological list of past appointments/visits for a patient.",
                    InputSchema = SchemaGenerator.FromClass<PatientIdInput>()
                },
                new()
                {
                    Name = "get_patient_prescription_history",
                    Description = "Retrieve historical medications and prescriptions prescribed to a patient.",
                    InputSchema = SchemaGenerator.FromClass<PatientIdInput>()
                },
                new()
                {
                    Name = "get_medicine_stock",
                    Description = "Query current stock levels and batch information for a specific medicine by name.",
                    InputSchema = SchemaGenerator.FromClass<MedicineNameInput>()
                },
                new()
                {
                    Name = "get_low_stock_medicines",
                    Description = "Retrieve list of all medicines whose total active stock is below the critical threshold (20 units).",
                    InputSchema = SchemaGenerator.FromClass<EmptyInput>()
                },
                new()
                {
                    Name = "get_expiring_batches",
                    Description = "Retrieve list of all active medicine batches expiring within a specified number of days (defaults to 30 days).",
                    InputSchema = SchemaGenerator.FromClass<ExpiringBatchesInput>()
                },
                new()
                {
                    Name = "create_follow_up_reminder",
                    Description = "Create a follow-up reminder for a patient.",
                    InputSchema = SchemaGenerator.FromClass<CreateFollowUpReminderInput>()
                },
                new()
                {
                    Name = "get_unread_notifications",
                    Description = "Retrieve the 10 most recent system alerts, expiring batches, and inventory notifications. Note: read/unread state is not tracked, so this returns the latest notifications regardless of whether they have been seen.",
                    InputSchema = SchemaGenerator.FromClass<EmptyInput>()
                },
                new()
                {
                    Name = "update_appointment_status",
                    Description = "Update the status of a specific appointment (e.g. 'pending', 'confirmed', 'cancelled', 'completed').",
                    InputSchema = SchemaGenerator.FromClass<UpdateAppointmentStatusInput>()
                },
                new()
                {
                    Name = "cancel_appointments_in_range",
                    Description = "Cancel all appointments scheduled within a specific date/time range. Supports relative dates like 'today' or 'tomorrow' and simple times.",
                    InputSchema = SchemaGenerator.FromClass<CancelAppointmentsInRangeInput>()
                },
                new()
                {
                    Name = "reschedule_appointments_in_range",
                    Description = "Reschedule all appointments scheduled within a source time range by shifting them to a new target start time. Supports relative dates and simple times.",
                    InputSchema = SchemaGenerator.FromClass<RescheduleAppointmentsInRangeInput>()
                },
                new()
                {
                    Name = "update_appointment_status_by_patient_name",
                    Description = "Update the status of an appointment (e.g. 'confirmed', 'cancelled') for a patient by searching for their name (partial or full matches).",
                    InputSchema = SchemaGenerator.FromClass<UpdateAppointmentStatusByPatientNameInput>()
                },
                new()
                {
                    Name = "reschedule_today_appointments",
                    Description = "Reschedule today's active appointments to start from a new target start time. Supports simple times (e.g. '08:30' or '8:30 AM') and relative dates ('today at 08:30').",
                    InputSchema = SchemaGenerator.FromClass<RescheduleTodayAppointmentsInput>()
                },
                new()
                {
                    Name = "get_prescription_templates",
                    Description = "Retrieve saved prescription templates. Supports optional filtering by diseaseId or diseaseName.",
                    InputSchema = SchemaGenerator.FromClass<GetPrescriptionTemplatesInput>()
                },
                new()
                {
                    Name = "create_prescription_template",
                    Description = "Create a new prescription template with medicines, dosage, and days for a specific disease.",
                    InputSchema = SchemaGenerator.FromClass<CreatePrescriptionTemplateInput>()
                },
                new()
                {
                    Name = "delete_prescription_template",
                    Description = "Deletes a prescription template by its ID (marks it as deleted in the system database).",
                    InputSchema = SchemaGenerator.FromClass<DeletePrescriptionTemplateInput>()
                },
                new()
                {
                    Name = "bulk_update_today_appointments_status",
                    Description = "Bulk update the status of all today's appointments (e.g. confirm all today's appointments, cancel all, complete all).",
                    InputSchema = SchemaGenerator.FromClass<BulkUpdateTodayAppointmentsStatusInput>()
                },
                new()
                {
                    Name = "get_patient_kyp_brief",
                    Description = "Retrieve a comprehensive Know Your Patient (KYP) clinical and behavioral intelligence brief for a patient by ID or Name.",
                    InputSchema = SchemaGenerator.FromClass<PatientKypBriefInput>()
                }
            };
        }

        private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };

        public async Task<Result<McpToolCallResponse>> CallToolAsync(McpToolCallRequest request)
        {
            try
            {
                if (!KnownTools.Contains(request.Name))
                {
                    _logger?.LogWarning("MCP tool call rejected: unknown tool '{ToolName}'.", request.Name);
                    return Result<McpToolCallResponse>.Failure($"Unknown tool '{request.Name}'. Call GET /api/mcp/tools for the list of available tools.");
                }

                _logger?.LogInformation("MCP tool '{ToolName}' invoked.", request.Name);

                object? data = request.Name switch
                {
                    "get_dashboard_summary" => await GetDashboardSummaryAsync(request.Arguments),
                    "get_today_appointments" => await GetTodayAppointmentsAsync(),
                    "get_waiting_queue" => await GetWaitingQueueAsync(),
                    "get_next_patient" => await GetNextPatientAsync(),
                    "get_patient_profile" => await GetPatientProfileAsync(request.Arguments),
                    "get_patient_visit_history" => await GetPatientVisitHistoryAsync(request.Arguments),
                    "get_patient_prescription_history" => await GetPatientPrescriptionHistoryAsync(request.Arguments),
                    "get_medicine_stock" => await GetMedicineStockAsync(request.Arguments),
                    "get_low_stock_medicines" => await GetLowStockMedicinesAsync(),
                    "get_expiring_batches" => await GetExpiringBatchesAsync(request.Arguments),
                    "create_follow_up_reminder" => await CreateFollowUpReminderAsync(request.Arguments),
                    "get_unread_notifications" => await GetUnreadNotificationsAsync(),
                    "update_appointment_status" => await UpdateAppointmentStatusAsync(request.Arguments),
                    "cancel_appointments_in_range" => await CancelAppointmentsInRangeAsync(request.Arguments),
                    "reschedule_appointments_in_range" => await RescheduleAppointmentsInRangeAsync(request.Arguments),
                    "update_appointment_status_by_patient_name" => await UpdateAppointmentStatusByPatientNameAsync(request.Arguments),
                    "reschedule_today_appointments" => await RescheduleTodayAppointmentsAsync(request.Arguments),
                    "get_prescription_templates" => await GetPrescriptionTemplatesAsync(request.Arguments),
                    "create_prescription_template" => await CreatePrescriptionTemplateAsync(request.Arguments),
                    "delete_prescription_template" => await DeletePrescriptionTemplateAsync(request.Arguments),
                    "bulk_update_today_appointments_status" => await BulkUpdateTodayAppointmentsStatusAsync(request.Arguments),
                    "get_patient_kyp_brief" => await GetPatientKypBriefAsync(request.Arguments),
                    _ => null
                };

                // A handler returning null means "nothing to report", not "tool missing".
                data ??= new { message = "No data available." };

                var isError = data is ToolError;
                if (isError)
                {
                    _logger?.LogInformation("MCP tool '{ToolName}' returned an error: {Message}", request.Name, ((ToolError)data).Message);
                }

                var response = new McpToolCallResponse
                {
                    Content = new List<McpContentItem>
                    {
                        new()
                        {
                            Type = "text",
                            Text = JsonSerializer.Serialize(data, SerializerOptions)
                        }
                    },
                    IsError = isError
                };

                return Result<McpToolCallResponse>.Success(response);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "MCP tool '{ToolName}' threw an unhandled exception.", request.Name);
                return Result<McpToolCallResponse>.Failure($"Error executing tool {request.Name}: {ex.Message}");
            }
        }

        private async Task<object> GetDashboardSummaryAsync(Dictionary<string, object>? args)
        {
            string period = "daily";
            if (args != null && args.TryGetValue("period", out var pVal) && pVal != null)
            {
                period = pVal.ToString() ?? "daily";
            }

            var result = await _dashboardService.GetDoctorDashboardAsync(period);
            if (result.IsFailure || result.Data == null)
            {
                return Fail("Unable to retrieve dashboard summary.");
            }

            var d = result.Data;
            return new
            {
                period = d.Period,
                totalIncome = d.TotalIncome,
                doctorConsultationFees = d.DoctorConsultationFees,
                totalAppointments = d.TotalAppointmentsCount,
                walkInPatientsCount = d.WalkInPatientsCount,
                onlineBookingCount = d.OnlineBookingCount,
                totalPatientsAttended = d.TotalPatientsCount,
                paymentBreakdown = new
                {
                    cashTotal = d.PaymentBreakdown.CashTotal,
                    digitalTotal = d.PaymentBreakdown.DigitalTotal,
                    cashTransactions = d.PaymentBreakdown.CashCount,
                    digitalTransactions = d.PaymentBreakdown.DigitalCount
                },
                stockHealthStatus = d.StockRiskStatus,
                lowStockMedicines = d.LowStockAlerts,
                expiringBatches = d.ExpiringBatchesAlerts,
                nextQueuedPatients = d.NextPatients.Select(p => new
                {
                    token = p.TokenNumber,
                    code = p.AppointmentCode,
                    patient = p.PatientName,
                    time = p.Datetime,
                    notes = p.Notes
                }).ToList()
            };
        }

        private async Task<object> GetTodayAppointmentsAsync()
        {
            var (today, tomorrow) = ClinicClock.TodayBoundsUtc();

            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow)
                .OrderBy(a => a.Datetime)
                .ToListAsync();

            return appointments.Select((a, idx) => new
            {
                appointmentId = a.Id,
                code = a.AppointmentCode,
                patientId = a.PatientId,
                patientName = a.Patient?.Name ?? "Unknown",
                time = ClinicTime(a.Datetime),
                status = a.Status,
                notes = a.Notes,
                token = idx + 1
            }).ToList();
        }

        private async Task<object> GetWaitingQueueAsync()
        {
            var (today, tomorrow) = ClinicClock.TodayBoundsUtc();

            var todayAppointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status != "cancelled")
                .OrderBy(a => a.Id)
                .ToListAsync();

            var queue = todayAppointments.Select((a, idx) => new
            {
                token = idx + 1,
                appointmentId = a.Id,
                patientName = a.Patient?.Name ?? "Unknown",
                reason = a.Notes ?? "Consultation",
                status = a.Status
            }).Where(q => q.status == "pending" || q.status == "confirmed").ToList();

            var active = todayAppointments.FirstOrDefault(a => a.Status == "confirmed");
            var activeToken = active != null ? todayAppointments.IndexOf(active) + 1 : 0;

            return new
            {
                waitingCount = queue.Count,
                currentActiveToken = activeToken,
                queueList = queue
            };
        }

        private async Task<object?> GetNextPatientAsync()
        {
            var (today, tomorrow) = ClinicClock.TodayBoundsUtc();

            var todayAppointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status != "cancelled")
                .OrderBy(a => a.Id)
                .ToListAsync();

            // First confirmed is active, first pending is next
            var nextAppt = todayAppointments.FirstOrDefault(a => a.Status == "pending");
            if (nextAppt == null) return new { message = "No more pending patients in queue." };

            var token = todayAppointments.IndexOf(nextAppt) + 1;
            var patient = nextAppt.Patient;

            // Get recent prescriptions
            var lastPrescription = await _context.TblPrescriptions
                .Include(p => p.TblPrescriptionItems)
                .ThenInclude(pi => pi.Medicine)
                .Where(p => p.PatientId == patient.PatientId && p.DeleteFlag != true)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            var recentMeds = lastPrescription?.TblPrescriptionItems
                .Where(pi => pi.DeleteFlag != true)
                .Select(pi => pi.Medicine?.Name ?? "Unknown Medicine")
                .ToList() ?? new List<string>();

            return new
            {
                token,
                appointmentId = nextAppt.Id,
                patientId = patient.PatientId,
                name = patient.Name,
                gender = patient.Gender,
                age = GetAge(patient.DateOfBirth),
                notes = nextAppt.Notes,
                recentMedicines = recentMeds
            };
        }

        private async Task<object?> GetPatientProfileAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || !arguments.TryGetValue("patientId", out var idObj) || !int.TryParse(idObj.ToString(), out var patientId))
            {
                return Fail("Invalid or missing patientId.");
            }

            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == patientId && p.DeleteFlag != true);

            if (patient == null) return Fail("Patient not found.");

            var addressMeta = ParsePatientAddress(patient.Address);
            string allergies = string.IsNullOrWhiteSpace(addressMeta.Allergies) ? "No known allergies" : addressMeta.Allergies;
            string chronicConditions = string.IsNullOrWhiteSpace(addressMeta.ChronicConditions) ? "None" : addressMeta.ChronicConditions;

            return new
            {
                patientId = patient.PatientId,
                name = patient.Name,
                gender = patient.Gender,
                dob = patient.DateOfBirth.HasValue ? CalendarDate(patient.DateOfBirth.Value) : "Unknown",
                age = GetAge(patient.DateOfBirth),
                bloodType = patient.BloodType ?? "Unknown",
                mobileNo = patient.MobileNo,
                email = patient.Email,
                allergies,
                chronicConditions
            };
        }

        private async Task<object> GetPatientVisitHistoryAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || !arguments.TryGetValue("patientId", out var idObj) || !int.TryParse(idObj.ToString(), out var patientId))
            {
                return Fail("Invalid or missing patientId.");
            }

            var appointments = await _context.TblAppointments
                .Where(a => a.PatientId == patientId)
                .OrderByDescending(a => a.Datetime)
                .Take(VisitHistoryLimit)
                .ToListAsync();

            return new
            {
                // The model must know this list is capped, or it will report it as the complete history.
                showing = appointments.Count,
                limit = VisitHistoryLimit,
                truncated = appointments.Count == VisitHistoryLimit,
                visits = appointments.Select(a => new
                {
                    appointmentId = a.Id,
                    date = ClinicDate(a.Datetime),
                    time = ClinicTime(a.Datetime),
                    status = a.Status,
                    reason = a.Notes ?? "Consultation"
                }).ToList()
            };
        }

        private async Task<object> GetPatientPrescriptionHistoryAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || !arguments.TryGetValue("patientId", out var idObj) || !int.TryParse(idObj.ToString(), out var patientId))
            {
                return Fail("Invalid or missing patientId.");
            }

            var prescriptions = await _context.TblPrescriptions
                .Include(p => p.TblPrescriptionItems)
                .ThenInclude(pi => pi.Medicine)
                .Where(p => p.PatientId == patientId && p.DeleteFlag != true)
                .OrderByDescending(p => p.CreatedAt)
                .Take(PrescriptionHistoryLimit)
                .ToListAsync();

            return prescriptions.Select(p => new
            {
                prescriptionId = p.Id,
                date = p.CreatedAt.HasValue ? ClinicDate(p.CreatedAt.Value) : "Unknown",
                notes = p.Notes,
                items = p.TblPrescriptionItems
                    .Where(pi => pi.DeleteFlag != true)
                    .Select(pi => new
                    {
                        medicineName = pi.Medicine?.Name ?? "Unknown Medicine",
                        dosage = $"{pi.Dosage} for {pi.Days} days. Instruction: {pi.Instruction}",
                        quantity = pi.Quantity
                    }).ToList()
            }).ToList();
        }

        private async Task<object> GetMedicineStockAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || !arguments.TryGetValue("name", out var nameObj) || string.IsNullOrWhiteSpace(nameObj.ToString()))
            {
                return Fail("Invalid or missing medicine name.");
            }

            var query = nameObj.ToString()!.ToLower().Trim();
            var today = ClinicClock.TodayDateOnly;

            var medicines = await _context.TblMedicines
                .Include(m => m.Category)
                .Include(m => m.TblMedicineBatches)
                .Where(m => m.Name.ToLower().Contains(query) && m.DeleteFlag != true)
                .ToListAsync();

            return medicines.Select(m =>
            {
                var activeBatches = m.TblMedicineBatches
                    .Where(b => b.DeleteFlag != true && b.Status == "active" && b.ExpiryDate > today)
                    .OrderBy(b => b.ExpiryDate)
                    .ToList();

                var totalStock = activeBatches.Sum(b => b.Quantity);

                return new
                {
                    medicineId = m.MedicineId,
                    name = m.Name,
                    description = m.Description,
                    categoryName = m.Category?.Name ?? "None",
                    unitPrice = m.UnitPrice,
                    totalStock,
                    batches = activeBatches.Select(b => new
                    {
                        batchNo = b.BatchNo,
                        quantity = b.Quantity,
                        expiryDate = CalendarDate(b.ExpiryDate),
                        supplier = b.SupplierName ?? "Unknown"
                    }).ToList()
                };
            }).ToList();
        }

        private async Task<object> GetLowStockMedicinesAsync()
        {
            var today = ClinicClock.TodayDateOnly;

            var medicines = await _context.TblMedicines
                .Include(m => m.TblMedicineBatches)
                .Where(m => m.DeleteFlag != true)
                .ToListAsync();

            var result = new List<object>();

            foreach (var m in medicines)
            {
                var totalStock = m.TblMedicineBatches
                    .Where(b => b.DeleteFlag != true && b.Status == "active" && b.ExpiryDate > today)
                    .Sum(b => b.Quantity);

                if (totalStock < LowStockThreshold)
                {
                    result.Add(new
                    {
                        medicineId = m.MedicineId,
                        name = m.Name,
                        totalStock,
                        threshold = LowStockThreshold
                    });
                }
            }

            return result;
        }

        private async Task<object> GetExpiringBatchesAsync(Dictionary<string, object>? arguments)
        {
            int days = DefaultExpiryWindowDays;
            if (arguments != null && arguments.TryGetValue("days", out var daysObj) && daysObj != null && int.TryParse(daysObj.ToString(), out var parsedDays))
            {
                days = parsedDays;
            }

            var today = ClinicClock.TodayDateOnly;
            var targetDate = today.AddDays(days);

            var batches = await _context.TblMedicineBatches
                .Include(b => b.Med)
                .Where(b => b.DeleteFlag != true && b.Status == "active" && b.ExpiryDate > today && b.ExpiryDate <= targetDate)
                .OrderBy(b => b.ExpiryDate)
                .ToListAsync();

            return batches.Select(b => new
            {
                batchId = b.Id,
                batchNo = b.BatchNo,
                medicineName = b.Med?.Name ?? "Unknown",
                quantity = b.Quantity,
                expiryDate = CalendarDate(b.ExpiryDate),
                daysRemaining = b.ExpiryDate.DayNumber - ClinicClock.TodayDateOnly.DayNumber
            }).ToList();
        }

        private async Task<object> CreateFollowUpReminderAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || 
                !arguments.TryGetValue("patientId", out var patientIdObj) || !int.TryParse(patientIdObj.ToString(), out var patientId) ||
                !arguments.TryGetValue("dueInDays", out var dueObj) || !int.TryParse(dueObj.ToString(), out var dueInDays) ||
                !arguments.TryGetValue("recommendation", out var recObj) || string.IsNullOrWhiteSpace(recObj.ToString()))
            {
                return Fail("Invalid or missing arguments. Required: patientId (int), dueInDays (int), recommendation (string).");
            }

            var patientExists = await _context.TblPatients
                .AnyAsync(p => p.PatientId == patientId && p.DeleteFlag != true);

            if (!patientExists) return Fail("Patient not found.");

            var dueAt = DateTime.UtcNow.AddDays(dueInDays);

            var followUp = new TblFollowUp
            {
                PatientId = patientId,
                DueAt = dueAt,
                Recommendation = recObj.ToString()!,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblFollowUps.Add(followUp);
            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = "Follow-up reminder created successfully.",
                followUpId = followUp.Id,
                dueAt = ClinicDateTime(dueAt),
                recommendation = followUp.Recommendation
            };
        }

        private async Task<object> GetUnreadNotificationsAsync()
        {
            var notifications = await _context.TblNotifications
                .Where(n => n.DeleteFlag != true)
                .OrderByDescending(n => n.CreatedAt)
                .Take(NotificationLimit)
                .ToListAsync();

            return notifications.Select(n => new
            {
                notificationId = n.Id,
                title = n.Title,
                description = n.Description,
                createdAt = n.CreatedAt.HasValue ? ClinicDateTime(n.CreatedAt.Value) : "Unknown"
            }).ToList();
        }

        private async Task<object> UpdateAppointmentStatusAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null ||
                !arguments.TryGetValue("appointmentId", out var apptIdObj) || !int.TryParse(apptIdObj.ToString(), out var appointmentId) ||
                !arguments.TryGetValue("status", out var statusObj) || string.IsNullOrWhiteSpace(statusObj.ToString()))
            {
                return Fail("Invalid or missing arguments. Required: appointmentId (int), status (string).");
            }

            var status = statusObj.ToString()!.ToLower().Trim();
            if (!ValidAppointmentStatuses.Contains(status))
            {
                return Fail($"Invalid status '{status}'. Valid statuses are: {string.Join(", ", ValidAppointmentStatuses)}.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == appointmentId);

            if (appointment == null)
            {
                return Fail($"Appointment with ID {appointmentId} not found.");
            }

            var oldStatus = appointment.Status;
            appointment.Status = status;
            appointment.UpdatedAt = DateTime.UtcNow;

            if (arguments.TryGetValue("notes", out var notesObj) && notesObj != null && !string.IsNullOrWhiteSpace(notesObj.ToString()))
            {
                appointment.Notes = notesObj.ToString();
            }

            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Appointment status updated from '{oldStatus}' to '{status}' successfully.",
                appointmentId = appointment.Id,
                patientName = appointment.Patient?.Name ?? "Unknown",
                time = ClinicDateTime(appointment.Datetime),
                newStatus = appointment.Status,
                notes = appointment.Notes
            };
        }

        private async Task<object> CancelAppointmentsInRangeAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null ||
                !arguments.TryGetValue("startTime", out var startObj) ||
                !arguments.TryGetValue("endTime", out var endObj))
            {
                return Fail("Invalid or missing arguments. Required: startTime (string), endTime (string).");
            }

            DateTime startTime, endTime;
            try
            {
                startTime = ParseDateTimeUtc(startObj.ToString()!);
                endTime = ParseDateTimeUtc(endObj.ToString()!);
            }
            catch (Exception ex)
            {
                return Fail(ex.Message);
            }

            if (startTime >= endTime)
            {
                return Fail("startTime must be earlier than endTime.");
            }

            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= startTime && a.Datetime <= endTime && a.Status != "cancelled")
                .ToListAsync();

            if (appointments.Count == 0)
            {
                return new { success = true, message = "No active appointments found in the specified time range.", count = 0 };
            }

            if (appointments.Count > BulkMutationLimit)
            {
                return Fail($"Operation exceeds the maximum safety limit of {BulkMutationLimit} appointments (matched {appointments.Count}). Please narrow your time window.");
            }

            string reason = "Bulk cancelled via AI Assistant";
            if (arguments.TryGetValue("reason", out var reasonObj) && reasonObj != null && !string.IsNullOrWhiteSpace(reasonObj.ToString()))
            {
                reason = reasonObj.ToString()!;
            }

            foreach (var appt in appointments)
            {
                appt.Status = "cancelled";
                appt.Notes = string.IsNullOrWhiteSpace(appt.Notes) ? reason : $"{appt.Notes} | Cancelled: {reason}";
                appt.UpdatedAt = DateTime.UtcNow;

                if (appt.Patient?.UserId != null)
                {
                    _context.TblNotifications.Add(new TblNotification
                    {
                        UserId = appt.Patient.UserId,
                        Title = "Appointment Cancelled",
                        Description = $"Your appointment (Code: {appt.AppointmentCode}) scheduled for {ClinicDateTime(appt.Datetime)} has been cancelled. Reason: {reason}",
                        ActionRoute = $"/appointments/{appt.Id}",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                }
            }

            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Successfully cancelled {appointments.Count} appointment(s) in the range {ClinicDateTime(startTime)} to {ClinicDateTime(endTime)}.",
                count = appointments.Count,
                cancelledAppointments = appointments.Select(a => new
                {
                    appointmentId = a.Id,
                    patientName = a.Patient?.Name ?? "Unknown",
                    time = ClinicTime(a.Datetime),
                    notes = a.Notes
                }).ToList()
            };
        }

        private async Task<object> RescheduleAppointmentsInRangeAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null ||
                !arguments.TryGetValue("sourceStartTime", out var sStartObj) ||
                !arguments.TryGetValue("sourceEndTime", out var sEndObj) ||
                !arguments.TryGetValue("targetStartTime", out var tStartObj))
            {
                return Fail("Invalid or missing arguments. Required: sourceStartTime (string), sourceEndTime (string), targetStartTime (string).");
            }

            DateTime sourceStartTime, sourceEndTime, targetStartTime;
            try
            {
                sourceStartTime = ParseDateTimeUtc(sStartObj.ToString()!);
                sourceEndTime = ParseDateTimeUtc(sEndObj.ToString()!);
                targetStartTime = ParseDateTimeUtc(tStartObj.ToString()!);
            }
            catch (Exception ex)
            {
                return Fail(ex.Message);
            }

            if (sourceStartTime >= sourceEndTime)
            {
                return Fail("sourceStartTime must be earlier than sourceEndTime.");
            }

            if (targetStartTime < DateTime.UtcNow)
            {
                return Fail($"Target start time {ClinicDateTime(targetStartTime)} is in the past. Appointments cannot be rescheduled to a time that has already passed.");
            }

            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= sourceStartTime && a.Datetime <= sourceEndTime && a.Status != "cancelled")
                .OrderBy(a => a.Datetime)
                .ToListAsync();

            if (appointments.Count == 0)
            {
                return new { success = true, message = "No active appointments found in the source time range to reschedule.", count = 0 };
            }

            if (appointments.Count > BulkMutationLimit)
            {
                return Fail($"Operation exceeds the maximum safety limit of {BulkMutationLimit} appointments (matched {appointments.Count}). Please narrow your time window.");
            }

            // Calculate the exact offset shift (difference between targetStartTime and sourceStartTime)
            var offset = targetStartTime - sourceStartTime;

            var rescheduledDetails = new List<object>();

            foreach (var appt in appointments)
            {
                var oldTime = appt.Datetime;
                var newTime = oldTime.Add(offset);
                appt.Datetime = newTime;
                appt.UpdatedAt = DateTime.UtcNow;
                
                var originalNotes = CleanRescheduledNotes(appt.Notes);
                appt.Notes = string.IsNullOrWhiteSpace(originalNotes) 
                    ? $"Rescheduled from {ClinicTime(oldTime)}" 
                    : $"{originalNotes} | Rescheduled from {ClinicTime(oldTime)}";

                if (appt.Patient?.UserId != null)
                {
                    _context.TblNotifications.Add(new TblNotification
                    {
                        UserId = appt.Patient.UserId,
                        Title = "Appointment Rescheduled",
                        Description = $"Your appointment (Code: {appt.AppointmentCode}) has been rescheduled to {ClinicDateTime(newTime)}.",
                        ActionRoute = $"/appointments/{appt.Id}",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                }

                rescheduledDetails.Add(new
                {
                    appointmentId = appt.Id,
                    patientName = appt.Patient?.Name ?? "Unknown",
                    oldTime = ClinicDateTime(oldTime),
                    newTime = ClinicDateTime(newTime)
                });
            }

            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Successfully rescheduled {appointments.Count} appointment(s). Shifted by {offset.TotalMinutes} minutes (+{offset.TotalHours:F1} hours).",
                count = appointments.Count,
                rescheduledAppointments = rescheduledDetails
            };
        }

        private static int GetAge(DateOnly? dateOfBirth)
        {
            if (dateOfBirth == null) return 0;
            var today = ClinicClock.TodayDateOnly;
            var dob = dateOfBirth.Value;
            var age = today.Year - dob.Year;
            if (dob > today.AddYears(-age)) age--;
            return age;
        }

        /// <summary>
        /// Accepted clinic-local input shapes, most specific first. Bare dates land at midnight.
        /// </summary>
        private static readonly string[] AcceptedDateTimeFormats =
        {
            "dd/MM/yyyy HH:mm", "dd/MM/yyyy h:mm tt", "dd/MM/yyyy",
            "d/M/yyyy HH:mm",   "d/M/yyyy h:mm tt",   "d/M/yyyy",
            "dd-MM-yyyy HH:mm", "dd-MM-yyyy h:mm tt", "dd-MM-yyyy",
            "d-M-yyyy HH:mm",   "d-M-yyyy h:mm tt",   "d-M-yyyy",
            "yyyy-MM-dd HH:mm", "yyyy-MM-dd h:mm tt", "yyyy-MM-dd",
            "yyyy/MM/dd HH:mm", "yyyy/MM/dd h:mm tt", "yyyy/MM/dd"
        };

        private static readonly string[] AcceptedTimeOnlyFormats =
        {
            "HH:mm", "H:mm", "HH:mm:ss", "h:mm tt", "h:mmtt", "htt", "h tt"
        };

        /// <summary>
        /// Parse a natural-language date/time the assistant produced into the UTC instant to
        /// store or query with. Input is always interpreted as clinic-local wall-clock time:
        /// "08:30" means half past eight at the clinic, not 08:30 UTC.
        /// </summary>
        private static DateTime ParseDateTimeUtc(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                throw new FormatException("A date or time value is required.");
            }

            var text = input.Trim();

            // ISO-8601 with an explicit offset already pins an exact instant - honour it as given.
            if (DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var offsetValue)
                && HasExplicitOffset(text))
            {
                return offsetValue.UtcDateTime;
            }

            var normalised = text.ToLowerInvariant();

            // Resolve relative day words against the clinic's calendar, not the server's.
            var clinicToday = ClinicClock.Today;
            var relativeDay = clinicToday;
            var sawRelativeWord = false;

            foreach (var (word, dayOffset) in RelativeDayWords)
            {
                if (!ContainsWord(normalised, word)) continue;

                relativeDay = clinicToday.AddDays(dayOffset);
                normalised = RemoveWord(normalised, word);
                sawRelativeWord = true;
                break;
            }

            // Strip the joining words the model tends to emit ("today at 10:00", "on 24/06/2026").
            normalised = RemoveWord(normalised, "at");
            normalised = RemoveWord(normalised, "on");
            normalised = CollapseWhitespace(normalised);

            // Time-only remainder ("10:00", "2 pm"): attach it to the relative day, or today.
            if (TryParseTimeOnly(normalised, out var timeOfDay))
            {
                return ClinicClock.ToUtc(relativeDay.Date.Add(timeOfDay));
            }

            // A relative word with nothing left over means midnight on that day.
            if (sawRelativeWord && normalised.Length == 0)
            {
                return ClinicClock.ToUtc(relativeDay.Date);
            }

            if (DateTime.TryParseExact(normalised, AcceptedDateTimeFormats, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var exact))
            {
                return ClinicClock.ToUtc(exact);
            }

            // Last resort: let the framework try, but still treat the result as clinic-local.
            if (DateTime.TryParse(normalised, CultureInfo.InvariantCulture, DateTimeStyles.None, out var loose))
            {
                return ClinicClock.ToUtc(loose);
            }

            throw new FormatException(
                $"Could not understand the date/time '{input}'. Use a time like '08:30', a relative form like " +
                "'tomorrow at 14:00', or a full date in dd/MM/yyyy format.");
        }

        private static readonly (string Word, int DayOffset)[] RelativeDayWords =
        {
            ("today", 0),
            ("tonight", 0),
            ("tomorrow", 1),
            ("yesterday", -1)
        };

        private static bool TryParseTimeOnly(string value, out TimeSpan timeOfDay)
        {
            timeOfDay = TimeSpan.Zero;
            if (string.IsNullOrWhiteSpace(value)) return false;

            if (DateTime.TryParseExact(value, AcceptedTimeOnlyFormats, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var parsed))
            {
                timeOfDay = parsed.TimeOfDay;
                return true;
            }

            return false;
        }

        private static bool HasExplicitOffset(string text)
        {
            if (text.EndsWith("Z", StringComparison.OrdinalIgnoreCase)) return true;

            // Look for a +HH:mm / -HH:mm suffix, skipping the date's own separators.
            var timeSeparator = text.IndexOf('T');
            if (timeSeparator < 0) return false;

            var tail = text[timeSeparator..];
            return tail.Contains('+') || tail.Contains('-');
        }

        /// <summary>Whole-word containment, so "march" is not mistaken for a relative day and "at" does not match "date".</summary>
        private static bool ContainsWord(string haystack, string word)
        {
            return Regex.IsMatch(haystack, $@"\b{Regex.Escape(word)}\b");
        }

        private static string RemoveWord(string haystack, string word)
        {
            return Regex.Replace(haystack, $@"\b{Regex.Escape(word)}\b", " ");
        }

        private static string CollapseWhitespace(string value)
        {
            return Regex.Replace(value, @"\s+", " ").Trim();
        }

        private async Task<object> UpdateAppointmentStatusByPatientNameAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null ||
                !arguments.TryGetValue("patientName", out var nameObj) || string.IsNullOrWhiteSpace(nameObj.ToString()) ||
                !arguments.TryGetValue("status", out var statusObj) || string.IsNullOrWhiteSpace(statusObj.ToString()))
            {
                return Fail("Invalid or missing arguments. Required: patientName (string), status (string).");
            }

            var patientName = nameObj.ToString()!.ToLower().Trim();
            var status = statusObj.ToString()!.ToLower().Trim();
            if (!ValidAppointmentStatuses.Contains(status))
            {
                return Fail($"Invalid status '{status}'. Valid statuses are: {string.Join(", ", ValidAppointmentStatuses)}.");
            }

            // Find matching patients
            var patients = await _context.TblPatients
                .Where(p => p.Name.ToLower().Contains(patientName) && p.DeleteFlag != true)
                .ToListAsync();

            if (patients.Count == 0)
            {
                return Fail($"No patients found matching the name '{nameObj}'.");
            }

            var patientIds = patients.Select(p => p.PatientId).ToList();
            var (today, tomorrow) = ClinicClock.TodayBoundsUtc();

            // Fetch active appointments
            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => patientIds.Contains(a.PatientId))
                .OrderBy(a => a.Datetime)
                .ToListAsync();

            if (appointments.Count == 0)
            {
                return Fail($"No appointments found for patient(s) matching '{nameObj}'.");
            }

            // Filter for today's active/pending appointments first
            var todayAppts = appointments
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status != "cancelled" && a.Status != "completed")
                .ToList();

            TblAppointment targetAppointment;

            if (todayAppts.Count == 1)
            {
                targetAppointment = todayAppts[0];
            }
            else if (todayAppts.Count > 1)
            {
                // Ambiguity today - return the options
                return new
                {
                    ambiguity = true,
                    message = $"Multiple appointments found for today matching patient '{nameObj}'. Please specify the exact appointment ID.",
                    appointments = todayAppts.Select(a => new
                    {
                        appointmentId = a.Id,
                        patientName = a.Patient?.Name ?? "Unknown",
                        time = ClinicTime(a.Datetime),
                        status = a.Status
                    }).ToList()
                };
            }
            else
            {
                // No appointments today, look at recent/future pending or confirmed appointments
                var pendingFutureAppts = appointments
                    .Where(a => a.Status == "pending" || a.Status == "confirmed")
                    .OrderBy(a => Math.Abs((a.Datetime - DateTime.UtcNow).Ticks))
                    .ToList();

                if (pendingFutureAppts.Count == 1)
                {
                    targetAppointment = pendingFutureAppts[0];
                }
                else if (pendingFutureAppts.Count > 1)
                {
                    return new
                    {
                        ambiguity = true,
                        message = $"Multiple active appointments found for patient '{nameObj}'. Please specify the exact appointment ID.",
                        appointments = pendingFutureAppts.Select(a => new
                        {
                            appointmentId = a.Id,
                            patientName = a.Patient?.Name ?? "Unknown",
                            time = ClinicDateTime(a.Datetime),
                            status = a.Status
                        }).ToList()
                    };
                }
                else
                {
                    // Every appointment for this patient is already cancelled or completed.
                    // Silently rewriting a closed visit would be worse than doing nothing.
                    var latest = appointments.OrderByDescending(a => a.Datetime).First();
                    return Fail(
                        $"Patient '{latest.Patient?.Name ?? nameObj.ToString()}' has no active (pending or confirmed) appointment to update. " +
                        $"Their most recent appointment on {ClinicClock.ToClinic(latest.Datetime).ToString(DateTimeFormat, CultureInfo.InvariantCulture)} is already '{latest.Status}'. " +
                        "Pass an explicit appointmentId to update a closed appointment.");
                }
            }

            // Perform the status update
            var oldStatus = targetAppointment.Status;
            targetAppointment.Status = status;
            targetAppointment.UpdatedAt = DateTime.UtcNow;

            if (arguments.TryGetValue("notes", out var notesObj) && notesObj != null && !string.IsNullOrWhiteSpace(notesObj.ToString()))
            {
                targetAppointment.Notes = notesObj.ToString();
            }

            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Successfully updated appointment status for patient '{targetAppointment.Patient?.Name}' from '{oldStatus}' to '{status}'.",
                appointmentId = targetAppointment.Id,
                patientName = targetAppointment.Patient?.Name ?? "Unknown",
                time = ClinicDateTime(targetAppointment.Datetime),
                newStatus = targetAppointment.Status,
                notes = targetAppointment.Notes
            };
        }

        private async Task<object> RescheduleTodayAppointmentsAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null ||
                !arguments.TryGetValue("targetStartTime", out var tStartObj) || string.IsNullOrWhiteSpace(tStartObj.ToString()))
            {
                return Fail("Invalid or missing arguments. Required: targetStartTime (string).");
            }

            DateTime targetStartTime;
            try
            {
                targetStartTime = ParseDateTimeUtc(tStartObj.ToString()!);
            }
            catch (Exception ex)
            {
                return Fail(ex.Message);
            }

            // Anchor the window to the clinic-local day the target time falls in.
            if (targetStartTime < DateTime.UtcNow)
            {
                return Fail($"Target start time {ClinicDateTime(targetStartTime)} is in the past. Appointments cannot be rescheduled to a time that has already passed.");
            }

            var (today, tomorrow) = ClinicClock.DayBoundsUtc(ClinicClock.ToClinic(targetStartTime));

            // Get all today's active appointments ordered by time
            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status != "cancelled" && a.Status != "completed")
                .OrderBy(a => a.Datetime)
                .ToListAsync();

            if (appointments.Count == 0)
            {
                return new { success = true, message = "No active pending/confirmed appointments found today to reschedule.", count = 0 };
            }

            var earliestAppt = appointments[0];
            var earliestTime = earliestAppt.Datetime;

            // Calculate the exact offset shift (difference between targetStartTime and earliestTime)
            var offset = targetStartTime - earliestTime;

            var rescheduledDetails = new List<object>();

            foreach (var appt in appointments)
            {
                var oldTime = appt.Datetime;
                var newTime = oldTime.Add(offset);
                appt.Datetime = newTime;
                appt.UpdatedAt = DateTime.UtcNow;
                
                var originalNotes = CleanRescheduledNotes(appt.Notes);
                appt.Notes = string.IsNullOrWhiteSpace(originalNotes) 
                    ? $"Rescheduled from {ClinicTime(oldTime)}" 
                    : $"{originalNotes} | Rescheduled from {ClinicTime(oldTime)}";

                rescheduledDetails.Add(new
                {
                    appointmentId = appt.Id,
                    patientName = appt.Patient?.Name ?? "Unknown",
                    oldTime = ClinicDateTime(oldTime),
                    newTime = ClinicDateTime(newTime)
                });
            }

            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Successfully rescheduled {appointments.Count} appointment(s) today. Shifted by {offset.TotalMinutes} minutes (+{offset.TotalHours:F1} hours) to start at {ClinicTime(targetStartTime)}.",
                count = appointments.Count,
                rescheduledAppointments = rescheduledDetails
            };
        }

        private static string CleanRescheduledNotes(string? notes)
        {
            if (string.IsNullOrWhiteSpace(notes)) return string.Empty;

            int index = notes.IndexOf(" | Rescheduled from", StringComparison.OrdinalIgnoreCase);
            if (index >= 0)
            {
                return notes.Substring(0, index).Trim();
            }

            if (notes.StartsWith("Rescheduled from", StringComparison.OrdinalIgnoreCase))
            {
                return string.Empty;
            }

            return notes.Trim();
        }

        private async Task<object> GetPrescriptionTemplatesAsync(Dictionary<string, object>? arguments)
        {
            var query = _context.TblPrescriptionTemplates
                .Include(t => t.Disease)
                .Include(t => t.TblPrescriptionTemplateItems)
                    .ThenInclude(i => i.Medicine)
                .Where(t => t.DeleteFlag != true);

            if (arguments != null)
            {
                if (arguments.TryGetValue("diseaseId", out var diseaseIdObj) && int.TryParse(diseaseIdObj.ToString(), out var diseaseId))
                {
                    query = query.Where(t => t.DiseaseId == diseaseId);
                }
                else if (arguments.TryGetValue("diseaseName", out var diseaseNameObj) && !string.IsNullOrWhiteSpace(diseaseNameObj.ToString()))
                {
                    var nameQuery = diseaseNameObj.ToString()!.ToLower().Trim();
                    query = query.Where(t => t.Disease.Name.ToLower().Contains(nameQuery));
                }
            }

            var templates = await query.OrderBy(t => t.Name).ToListAsync();
            return templates.Select(t => new
            {
                templateId = t.Id,
                name = t.Name,
                diseaseId = t.DiseaseId,
                diseaseName = t.Disease?.Name ?? "Unknown Disease",
                items = t.TblPrescriptionTemplateItems
                    .Where(i => i.DeleteFlag != true)
                    .Select(i => new
                    {
                        medicineId = i.MedicineId,
                        medicineName = i.Medicine?.Name ?? "Unknown Medicine",
                        dosage = i.Dosage,
                        days = i.Days,
                        quantity = i.Quantity,
                        instruction = i.Instruction
                    }).ToList()
            }).ToList();
        }

        private async Task<object> CreatePrescriptionTemplateAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null ||
                !arguments.TryGetValue("name", out var nameObj) || string.IsNullOrWhiteSpace(nameObj.ToString()) ||
                !arguments.TryGetValue("diseaseId", out var diseaseIdObj) || !int.TryParse(diseaseIdObj.ToString(), out var diseaseId) ||
                !arguments.TryGetValue("items", out var itemsObj) || itemsObj == null)
            {
                return Fail("Invalid or missing arguments. Required: name (string), diseaseId (int), items (array).");
            }

            var diseaseExists = await _context.TblDiseases.AnyAsync(d => d.Id == diseaseId && d.DeleteFlag != true);
            if (!diseaseExists)
            {
                return Fail($"Disease with ID {diseaseId} not found.");
            }

            // Parse items list
            var itemsList = new List<TblPrescriptionTemplateItem>();
            try
            {
                var jsonStr = JsonSerializer.Serialize(itemsObj);
                var items = JsonSerializer.Deserialize<List<TemplateItemDto>>(jsonStr);
                if (items == null || items.Count == 0)
                {
                    return Fail("At least one template item is required.");
                }

                var medicineIds = items.Select(i => i.MedicineId).ToList();
                if (medicineIds.Count != medicineIds.Distinct().Count())
                {
                    return Fail("A prescription template cannot contain duplicate medicines.");
                }

                foreach (var item in items)
                {
                    if (item.MedicineId <= 0)
                    {
                        return Fail("medicineId is required for every template item.");
                    }
                    if (item.Quantity <= 0)
                    {
                        return Fail("quantity must be greater than zero.");
                    }
                    if (item.Days <= 0)
                    {
                        return Fail("days must be greater than zero.");
                    }

                    var medicineExists = await _context.TblMedicines.AnyAsync(m => m.MedicineId == item.MedicineId && m.DeleteFlag != true);
                    if (!medicineExists)
                    {
                        return Fail($"Medicine ID {item.MedicineId} not found.");
                    }

                    itemsList.Add(new TblPrescriptionTemplateItem
                    {
                        MedicineId = item.MedicineId,
                        Dosage = item.Dosage ?? "",
                        Days = item.Days,
                        Quantity = item.Quantity,
                        Instruction = item.Instruction ?? "",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                }
            }
            catch (Exception ex)
            {
                return Fail($"Error parsing items array: {ex.Message}");
            }

            var newTemplate = new TblPrescriptionTemplate
            {
                Name = nameObj.ToString()!.Trim(),
                DiseaseId = diseaseId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false,
                TblPrescriptionTemplateItems = itemsList
            };

            _context.TblPrescriptionTemplates.Add(newTemplate);
            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Successfully created prescription template '{newTemplate.Name}'.",
                templateId = newTemplate.Id,
                diseaseId = newTemplate.DiseaseId,
                itemsCount = newTemplate.TblPrescriptionTemplateItems.Count
            };
        }

        private async Task<object> DeletePrescriptionTemplateAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || !arguments.TryGetValue("templateId", out var idObj) || !int.TryParse(idObj.ToString(), out var templateId))
            {
                return Fail("Invalid or missing templateId.");
            }

            var template = await _context.TblPrescriptionTemplates
                .Include(t => t.TblPrescriptionTemplateItems)
                .FirstOrDefaultAsync(t => t.Id == templateId && t.DeleteFlag != true);

            if (template == null)
            {
                return Fail($"Prescription template with ID {templateId} not found.");
            }

            template.DeleteFlag = true;
            template.UpdatedAt = DateTime.UtcNow;

            foreach (var item in template.TblPrescriptionTemplateItems)
            {
                item.DeleteFlag = true;
            }

            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = $"Successfully deleted prescription template '{template.Name}' with ID {templateId}."
            };
        }

        private async Task<object> BulkUpdateTodayAppointmentsStatusAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || !arguments.TryGetValue("status", out var statusObj) || string.IsNullOrWhiteSpace(statusObj.ToString()))
            {
                return Fail("Invalid or missing arguments. Required: status (string).");
            }

            var status = statusObj.ToString()!.ToLower().Trim();
            if (!ValidAppointmentStatuses.Contains(status))
            {
                return Fail($"Invalid status '{status}'. Valid statuses are: {string.Join(", ", ValidAppointmentStatuses)}.");
            }

            var (today, tomorrow) = ClinicClock.TodayBoundsUtc();

            // Fetch all appointments for today
            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow)
                .ToListAsync();

            if (appointments.Count == 0)
            {
                return new { success = true, message = "No appointments found scheduled for today.", count = 0 };
            }

            if (appointments.Count > BulkMutationLimit)
            {
                return Fail($"Operation exceeds the maximum safety limit of {BulkMutationLimit} appointments (matched {appointments.Count}). Update them in smaller batches.");
            }

            var updatedCount = 0;
            var details = new List<object>();

            foreach (var appt in appointments)
            {
                if (appt.Status != status)
                {
                    var oldStatus = appt.Status;
                    appt.Status = status;
                    appt.UpdatedAt = DateTime.UtcNow;
                    updatedCount++;

                    details.Add(new
                    {
                        appointmentId = appt.Id,
                        patientName = appt.Patient?.Name ?? "Unknown",
                        time = ClinicTime(appt.Datetime),
                        oldStatus = oldStatus,
                        newStatus = status
                    });
                }
            }

            if (updatedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            return new
            {
                success = true,
                message = $"Successfully updated {updatedCount} of {appointments.Count} today's appointment(s) to '{status}'.",
                count = updatedCount,
                updatedAppointments = details
            };
        }

        private async Task<object> GetPatientKypBriefAsync(Dictionary<string, object>? arguments)
        {
            if (arguments == null || 
                (!arguments.ContainsKey("patientId") && !arguments.ContainsKey("patientName")))
            {
                return Fail("Invalid or missing arguments. Either patientId (int) or patientName (string) must be provided.");
            }

            TblPatient? patient = null;
            if (arguments.TryGetValue("patientId", out var idObj) && idObj != null && int.TryParse(idObj.ToString(), out var patientId) && patientId > 0)
            {
                patient = await _context.TblPatients
                    .FirstOrDefaultAsync(p => p.PatientId == patientId && p.DeleteFlag != true);
            }
            else if (arguments.TryGetValue("patientName", out var nameObj) && nameObj != null && !string.IsNullOrWhiteSpace(nameObj.ToString()))
            {
                var searchName = nameObj.ToString()!.ToLower().Trim();
                patient = await _context.TblPatients
                    .FirstOrDefaultAsync(p => p.Name.ToLower().Contains(searchName) && p.DeleteFlag != true);
            }

            if (patient == null)
            {
                return Fail("Patient not found. Please provide a valid patientId or patientName.");
            }

            var addressMeta = ParsePatientAddress(patient.Address);

            // 1. Visit Metrics (Pillar 1 Journey & Pillar 2 Adherence)
            var appointments = await _context.TblAppointments
                .Where(a => a.PatientId == patient.PatientId)
                .ToListAsync();

            var totalVisits = appointments.Count;
            var cancelledVisits = appointments.Count(a => a.Status == "cancelled");
            var completedVisits = appointments.Count(a => a.Status == "completed");
            var pendingConfirmed = appointments.Count(a => a.Status == "pending" || a.Status == "confirmed");

            double adherenceRiskRate = 0;
            if (totalVisits > 0)
            {
                adherenceRiskRate = ((double)cancelledVisits / totalVisits) * 100.0;
            }

            string riskLevel = "Low";
            string riskRecommendation = $"{cancelledVisits} of {totalVisits} appointment(s) cancelled. Standard reminders are likely sufficient.";

            if (adherenceRiskRate >= 30.0 || cancelledVisits >= 2)
            {
                riskLevel = "High";
                riskRecommendation = $"{cancelledVisits} of {totalVisits} appointment(s) cancelled ({Math.Round(adherenceRiskRate, 1)}%). Consider confirming by phone before the next appointment.";
            }
            else if (adherenceRiskRate > 10.0)
            {
                riskLevel = "Medium";
                riskRecommendation = $"{cancelledVisits} of {totalVisits} appointment(s) cancelled ({Math.Round(adherenceRiskRate, 1)}%). Consider an extra reminder before the next appointment.";
            }

            // 2. EMR Sentinel Guard (Pillar 3)
            string allergyWarning = "No drug allergies recorded for this patient.";
            string safetyStatus = "NONE_RECORDED";

            if (!string.IsNullOrWhiteSpace(addressMeta.Allergies) && 
                !addressMeta.Allergies.Contains("no known", StringComparison.OrdinalIgnoreCase) && 
                !addressMeta.Allergies.Equals("none", StringComparison.OrdinalIgnoreCase))
            {
                allergyWarning = $"ALLERGIES RECORDED: {addressMeta.Allergies}. Check every prescription against this list before issuing.";
                safetyStatus = "ALLERGIES_RECORDED";
            }

            var interactionTipsList = new List<string>();
            if (!string.IsNullOrWhiteSpace(addressMeta.ChronicConditions))
            {
                var chronicLower = addressMeta.ChronicConditions.ToLower();
                if (chronicLower.Contains("asthma"))
                {
                    interactionTipsList.Add("Asthma recorded: beta-blockers (e.g. Propranolol, Atenolol) carry a bronchospasm risk. Verify against current guidance.");
                }
                if (chronicLower.Contains("diabetes"))
                {
                    interactionTipsList.Add("Diabetes recorded: corticosteroids can raise blood glucose. Verify against current guidance.");
                }
                if (chronicLower.Contains("hypertension"))
                {
                    interactionTipsList.Add("Hypertension recorded: review for duplicate ACE inhibitor / ARB therapy and potassium monitoring.");
                }
            }
            if (interactionTipsList.Count == 0)
            {
                interactionTipsList.Add("No reminders matched this patient's recorded conditions.");
            }
            var drugInteractionTips = string.Join(" | ", interactionTipsList);

            // 3. Payments & Financial Behavior (Pillar 4)
            var appointmentIds = appointments.Select(a => a.Id).ToList();
            var payments = await _context.TblPayments
                .Where(p => appointmentIds.Contains(p.AppointmentId))
                .ToListAsync();

            var totalPaid = payments.Where(p => p.PaymentStatus == "paid").Sum(p => p.Amount + p.Tax + p.Charges);
            var unpaidCount = payments.Count(p => p.PaymentStatus == "pending" || p.PaymentStatus == "partial");

            string budgetSensitivity = "Low";
            string financialBehavior = payments.Count == 0
                ? "No payment records on file."
                : $"All {payments.Count} invoice(s) settled.";

            if (unpaidCount > 0)
            {
                budgetSensitivity = "High";
                financialBehavior = $"{unpaidCount} of {payments.Count} invoice(s) are unpaid or only partially paid.";
            }

            // 4. Anxiety and Caregiver linkages (Pillar 4)
            int age = GetAge(patient.DateOfBirth);

            // Age-banded handling reminders. These follow from the recorded date of birth only -
            // anything beyond that (comfort, phobias, who pays) is not in the system, so it is not asserted.
            string caregiverNotes = "No caregiver information recorded.";
            if (age >= 65)
            {
                caregiverNotes = $"Patient is {age}. Consider copying communications to an emergency contact or caregiver.";
            }
            else if (age > 0 && age < 12)
            {
                caregiverNotes = $"Patient is {age}. Communications and billing should be directed to a parent or guardian.";
            }

            // 5. Prescriptions Vitals History
            var prescriptions = await _context.TblPrescriptions
                .Include(p => p.Disease)
                .Include(p => p.TblPrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .Where(p => p.PatientId == patient.PatientId && p.DeleteFlag != true)
                .OrderBy(p => p.CreatedAt)
                .ToListAsync();

            var vitalsList = new List<VitalsSnapshot>();
            foreach (var p in prescriptions)
            {
                var notesMeta = ParsePrescriptionNotes(p.Notes);
                vitalsList.Add(new VitalsSnapshot
                {
                    RecordedAtUtc = p.CreatedAt,
                    date = p.CreatedAt.HasValue ? ClinicDate(p.CreatedAt.Value) : "Unknown",
                    weight = p.WeightKg,
                    bp = p.BloodPressureSystolic.HasValue && p.BloodPressureDiastolic.HasValue 
                        ? $"{p.BloodPressureSystolic}/{p.BloodPressureDiastolic}" 
                        : null,
                    temp = notesMeta.TemperatureC,
                    pulse = notesMeta.PulseBpm,
                    spo2 = notesMeta.Spo2Percent,
                    bmi = notesMeta.Bmi
                });
            }

            // Order by the underlying timestamp; the formatted date string sorts by day-of-month.
            var lastVitals = vitalsList
                .OrderByDescending(v => v.RecordedAtUtc ?? DateTime.MinValue)
                .FirstOrDefault();

            return new
            {
                patientId = patient.PatientId,
                name = patient.Name,
                gender = patient.Gender,
                age = age,
                dob = patient.DateOfBirth.HasValue ? CalendarDate(patient.DateOfBirth.Value) : "Unknown",
                bloodType = patient.BloodType ?? "Unknown",
                mobileNo = patient.MobileNo,
                email = patient.Email,
                
                // Clinical Snapshot (Pillar 1)
                clinicalJourney = new
                {
                    actualAddress = addressMeta.ActualAddress,
                    allergies = addressMeta.Allergies ?? "No known allergies",
                    chronicConditions = addressMeta.ChronicConditions ?? "None",
                    pastSurgeries = addressMeta.PastSurgeries ?? "None",
                    familyHistory = addressMeta.FamilyHistory ?? "None",
                    vaccinations = addressMeta.VaccinationHistory ?? "None",
                    vitalsHistoryCount = vitalsList.Count,
                    lastVitals = lastVitals
                },

                // Adherence Risk (Pillar 2)
                adherenceProfiling = new
                {
                    totalVisits = totalVisits,
                    completedVisits = completedVisits,
                    cancelledVisits = cancelledVisits,
                    pendingConfirmedVisits = pendingConfirmed,
                    adherenceRiskRate = Math.Round(adherenceRiskRate, 1),
                    riskLevel = riskLevel,
                    actionableRecommendation = riskRecommendation
                },

                // EMR Sentinel Guard (Pillar 3)
                sentinelGuard = new
                {
                    allergyWarning = allergyWarning,
                    drugInteractionTips = drugInteractionTips,
                    safetyStatus = safetyStatus
                },

                // Human & Financial Context (Pillar 4)
                humanContext = new
                {
                    budgetSensitivity = budgetSensitivity,
                    financialBehavior = financialBehavior,
                    totalRevenuePaid = totalPaid,
                    outstandingInvoicesCount = unpaidCount,
                    caregiverLinkNotes = caregiverNotes
                }
            };
        }

        /// <summary>
        /// One vitals reading. Carries the raw timestamp alongside the formatted date so the
        /// list can be sorted chronologically rather than by the display string.
        /// </summary>
        private sealed class VitalsSnapshot
        {
            [JsonIgnore]
            public DateTime? RecordedAtUtc { get; set; }

            public string date { get; set; } = string.Empty;
            public double? weight { get; set; }
            public string? bp { get; set; }
            public double? temp { get; set; }
            public int? pulse { get; set; }
            public int? spo2 { get; set; }
            public double? bmi { get; set; }
        }

        private class PatientAddressMetadata
        {
            public string? ActualAddress { get; set; }
            public string? Allergies { get; set; }
            public string? ChronicConditions { get; set; }
            public string? PastSurgeries { get; set; }
            public string? FamilyHistory { get; set; }
            public string? VaccinationHistory { get; set; }
        }

        private class PrescriptionNotesMetadata
        {
            public string? ActualNotes { get; set; }
            public double? TemperatureC { get; set; }
            public int? PulseBpm { get; set; }
            public int? Spo2Percent { get; set; }
            public double? HeightCm { get; set; }
            public double? Bmi { get; set; }
            public string? LabTestRequests { get; set; }
        }

        private PatientAddressMetadata ParsePatientAddress(string? address)
        {
            if (string.IsNullOrEmpty(address)) return new PatientAddressMetadata();
            try
            {
                if (address.TrimStart().StartsWith("{"))
                {
                    return JsonSerializer.Deserialize<PatientAddressMetadata>(address) ?? new PatientAddressMetadata();
                }
            }
            catch { }
            return new PatientAddressMetadata { ActualAddress = address };
        }

        private PrescriptionNotesMetadata ParsePrescriptionNotes(string? notes)
        {
            if (string.IsNullOrEmpty(notes)) return new PrescriptionNotesMetadata();
            try
            {
                if (notes.TrimStart().StartsWith("{"))
                {
                    return JsonSerializer.Deserialize<PrescriptionNotesMetadata>(notes) ?? new PrescriptionNotesMetadata();
                }
            }
            catch { }
            return new PrescriptionNotesMetadata { ActualNotes = notes };
        }
    }
}
