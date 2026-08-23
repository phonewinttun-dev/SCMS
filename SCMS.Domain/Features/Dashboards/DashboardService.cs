using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.Features.Dashboards.Models;
using SCMS.Domain.Features.Appointments.Models;
using SCMS.Domain.Features.Patients.Models;
using SCMS.Domain.Features.Prescriptions.Models;
using SCMS.Shared;

namespace SCMS.Domain.Features.Dashboards
{
    /// <summary>
    /// Implements dashboard metrics and analytics aggregation for doctors, admins, and patients.
    /// </summary>
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;
        private const int LowStockThreshold = 20;

        public DashboardService(AppDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public Task<Result<DoctorDashboardResponse>> GetDoctorDashboardAsync(string period = "daily", CancellationToken cancellationToken = default)
        {
            return GetDoctorDashboardAsync(new GetDoctorDashboardRequest { Period = period }, cancellationToken);
        }

        public async Task<Result<DoctorDashboardResponse>> GetDoctorDashboardAsync(GetDoctorDashboardRequest request, CancellationToken cancellationToken = default)
        {
            request ??= new GetDoctorDashboardRequest();
            var normPeriod = (request.Period ?? "monthly").ToLowerInvariant().Trim();

            var nowUtc = DateTime.UtcNow;
            var todayUtc = nowUtc.Date;
            var tomorrowUtc = todayUtc.AddDays(1);
            var thirtyDaysFromNow = DateOnly.FromDateTime(nowUtc.AddDays(30));
            var todayDateOnly = DateOnly.FromDateTime(nowUtc);

            // Determine Target Month & Year
            int targetYear = request.Year.HasValue && request.Year.Value >= 2000 && request.Year.Value <= 2100
                ? request.Year.Value
                : nowUtc.Year;

            int targetMonth = request.Month.HasValue && request.Month.Value >= 1 && request.Month.Value <= 12
                ? request.Month.Value
                : nowUtc.Month;

            var monthStart = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1);
            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var monthName = monthStart.ToString("MMMM yyyy");

            // Determine Sargable half-open date range [periodStart, periodEnd) for period KPIs
            DateTime periodStart;
            DateTime periodEnd;

            switch (normPeriod)
            {
                case "daily":
                    periodStart = todayUtc;
                    periodEnd = tomorrowUtc;
                    break;
                case "weekly":
                    int diff = ((int)todayUtc.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                    periodStart = todayUtc.AddDays(-diff);
                    periodEnd = periodStart.AddDays(7);
                    break;
                case "all":
                    periodStart = DateTime.MinValue;
                    periodEnd = DateTime.MaxValue;
                    break;
                case "monthly":
                default:
                    normPeriod = "monthly";
                    periodStart = monthStart;
                    periodEnd = monthEnd;
                    break;
            }

            // 1. Appointments Query for the target month
            var monthlyAppointments = await _context.TblAppointments
                .AsNoTracking()
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= monthStart && a.Datetime < monthEnd)
                .OrderBy(a => a.Datetime)
                .ToListAsync(cancellationToken);

            // Period appointments (either monthly or custom period)
            var periodAppointments = normPeriod == "monthly"
                ? monthlyAppointments
                : await _context.TblAppointments
                    .AsNoTracking()
                    .Include(a => a.Patient)
                    .Where(a => a.Datetime >= periodStart && a.Datetime < periodEnd)
                    .OrderBy(a => a.Datetime)
                    .ToListAsync(cancellationToken);

            // 2. Payments Query for the target month
            var monthlyPayments = await _context.TblPayments
                .AsNoTracking()
                .Include(p => p.Appointment)
                .Where(p => (p.PaymentStatus.ToLower() == "paid")
                    && ((p.PaidAt.HasValue && p.PaidAt.Value >= monthStart && p.PaidAt.Value < monthEnd)
                        || (!p.PaidAt.HasValue && p.Appointment != null && p.Appointment.Datetime >= monthStart && p.Appointment.Datetime < monthEnd)))
                .ToListAsync(cancellationToken);

            // Period payments
            var periodPayments = normPeriod == "monthly"
                ? monthlyPayments
                : await _context.TblPayments
                    .AsNoTracking()
                    .Include(p => p.Appointment)
                    .Where(p => (p.PaymentStatus.ToLower() == "paid")
                        && ((p.PaidAt.HasValue && p.PaidAt.Value >= periodStart && p.PaidAt.Value < periodEnd)
                            || (!p.PaidAt.HasValue && p.Appointment != null && p.Appointment.Datetime >= periodStart && p.Appointment.Datetime < periodEnd)))
                    .ToListAsync(cancellationToken);

            // 3. Build Daily Metrics Breakdown for the target month
            var dailyBreakdown = new List<DashboardDailyMetricDto>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dayStart = new DateTime(targetYear, targetMonth, day, 0, 0, 0, DateTimeKind.Utc);
                var dayEnd = dayStart.AddDays(1);

                var dayPayments = monthlyPayments
                    .Where(p => {
                        var paidDate = p.PaidAt ?? p.Appointment?.Datetime;
                        return paidDate.HasValue && paidDate.Value >= dayStart && paidDate.Value < dayEnd;
                    })
                    .ToList();
                var dayIncome = dayPayments.Sum(p => p.Amount);

                var dayAppts = monthlyAppointments
                    .Where(a => a.Datetime >= dayStart && a.Datetime < dayEnd)
                    .ToList();

                int apptsMade = dayAppts.Count;
                int apptsCancelled = dayAppts.Count(a => string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase));

                // Distinct patients who have at least one active (non-cancelled) appointment on this day
                int activePatients = dayAppts
                    .Where(a => !string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
                    .Select(a => a.PatientId)
                    .Distinct()
                    .Count();

                dailyBreakdown.Add(new DashboardDailyMetricDto
                {
                    Date = dayStart.ToString("yyyy-MM-dd"),
                    DayNumber = day,
                    DayLabel = $"{monthStart:MMM} {day:D2}",
                    Income = dayIncome,
                    AppointmentsMade = apptsMade,
                    AppointmentsCancelled = apptsCancelled,
                    TotalPatients = activePatients
                });
            }

            // 4. Build Weekly Metrics Breakdown for the target month
            var weeklyBreakdown = new List<DashboardWeeklyMetricDto>();
            var weekRanges = new List<(int WeekNum, int StartDay, int EndDay)>
            {
                (1, 1, Math.Min(7, daysInMonth)),
                (2, 8, Math.Min(14, daysInMonth)),
                (3, 15, Math.Min(21, daysInMonth)),
                (4, 22, Math.Min(28, daysInMonth)),
            };
            if (daysInMonth > 28)
            {
                weekRanges.Add((5, 29, daysInMonth));
            }

            foreach (var (weekNum, startDay, endDay) in weekRanges)
            {
                var weekStart = new DateTime(targetYear, targetMonth, startDay, 0, 0, 0, DateTimeKind.Utc);
                var weekEndExclusive = new DateTime(targetYear, targetMonth, endDay, 0, 0, 0, DateTimeKind.Utc).AddDays(1);

                var weekPayments = monthlyPayments
                    .Where(p => {
                        var paidDate = p.PaidAt ?? p.Appointment?.Datetime;
                        return paidDate.HasValue && paidDate.Value >= weekStart && paidDate.Value < weekEndExclusive;
                    })
                    .ToList();
                var weekIncome = weekPayments.Sum(p => p.Amount);

                var weekAppts = monthlyAppointments
                    .Where(a => a.Datetime >= weekStart && a.Datetime < weekEndExclusive)
                    .ToList();

                int weekApptsMade = weekAppts.Count;
                int weekApptsCancelled = weekAppts.Count(a => string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase));

                // Distinct patients who have at least one active (non-cancelled) appointment in this week
                int weekActivePatients = weekAppts
                    .Where(a => !string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
                    .Select(a => a.PatientId)
                    .Distinct()
                    .Count();

                weeklyBreakdown.Add(new DashboardWeeklyMetricDto
                {
                    WeekNumber = weekNum,
                    WeekLabel = $"Week {weekNum} ({monthStart:MMM} {startDay:D2} - {monthStart:MMM} {endDay:D2})",
                    StartDate = weekStart.ToString("yyyy-MM-dd"),
                    EndDate = new DateTime(targetYear, targetMonth, endDay, 0, 0, 0, DateTimeKind.Utc).ToString("yyyy-MM-dd"),
                    Income = weekIncome,
                    AppointmentsMade = weekApptsMade,
                    AppointmentsCancelled = weekApptsCancelled,
                    TotalPatients = weekActivePatients
                });
            }

            // 5. Walk-in vs Online Booking Analysis (for selected period)
            int walkInCount = 0;
            int onlineCount = 0;
            foreach (var appt in periodAppointments)
            {
                if (appt.CreatedAt.HasValue && appt.CreatedAt.Value.Date == appt.Datetime.Date)
                {
                    walkInCount++;
                }
                else
                {
                    onlineCount++;
                }
            }

            // Distinct active patients for selected period (excluding patients whose appointments are only cancelled)
            var totalPatientsCount = periodAppointments
                .Where(a => !string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
                .Select(a => a.PatientId)
                .Distinct()
                .Count();

            var cancelledAppointmentsCount = periodAppointments
                .Count(a => string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase));

            // 6. Today's active appointments for the live queue and upcoming list
            var todayAppointments = await GetTodayAppointmentsAsync(todayUtc, tomorrowUtc, cancellationToken);
            var upcomingList = GetUpcomingPatients(todayAppointments);

            // 7. Inventory Alerts
            var (lowStockMeds, expiringBatches) = await GetInventoryAlertsAsync(todayDateOnly, thirtyDaysFromNow, cancellationToken);

            // 8. Income calculations for the selected period
            var totalIncome = periodPayments.Sum(p => p.Amount);

            // Doctor consultation fees
            var doctorConsultationFees = periodPayments
                .Where(p => p.PrescriptionId == null || p.Charges > 0)
                .Sum(p => p.Charges > 0 ? p.Charges : p.Amount);

            // Payment Breakdown (Cash vs Digital)
            var cashPayments = periodPayments.Where(p => string.Equals(p.PaymentMethod, "cash", StringComparison.OrdinalIgnoreCase)).ToList();
            var digitalPayments = periodPayments.Where(p => !string.Equals(p.PaymentMethod, "cash", StringComparison.OrdinalIgnoreCase)).ToList();

            var paymentBreakdown = new PaymentBreakdownDto
            {
                CashTotal = cashPayments.Sum(p => p.Amount),
                DigitalTotal = digitalPayments.Sum(p => p.Amount),
                CashCount = cashPayments.Count,
                DigitalCount = digitalPayments.Count
            };

            // Today's daily revenue for backward compatibility
            var dailyRevenue = await GetDailyRevenueAsync(todayUtc, tomorrowUtc, cancellationToken);

            // All-time Total Revenue
            var totalRevenueDouble = await _context.TblPayments
                .AsNoTracking()
                .Where(p => p.PaymentStatus.ToLower() == "paid")
                .Select(p => (double)p.Amount)
                .SumAsync(cancellationToken);

            var totalRevenue = (decimal)totalRevenueDouble;

            // Total registered medicines
            var totalMedicinesCount = await _context.TblMedicines
                .AsNoTracking()
                .CountAsync(m => m.DeleteFlag != true, cancellationToken);

            var stockRiskStatus = lowStockMeds.Count > 0 ? "At Risk" : "Safe";

            return Result<DoctorDashboardResponse>.Success(new DoctorDashboardResponse
            {
                Period = normPeriod,
                Month = targetMonth,
                Year = targetYear,
                MonthName = monthName,
                TotalIncome = totalIncome,
                DailyRevenue = dailyRevenue,
                TotalRevenue = totalRevenue,
                DoctorConsultationFees = doctorConsultationFees,
                TotalAppointmentsCount = periodAppointments.Count,
                CancelledAppointmentsCount = cancelledAppointmentsCount,
                TodayAppointmentsCount = todayAppointments
                    .Count(a => !string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase)),
                TotalPatientsCount = totalPatientsCount,
                TodayPatientsCount = todayAppointments
                    .Where(a => !string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
                    .Select(a => a.PatientId)
                    .Distinct()
                    .Count(),
                WalkInPatientsCount = walkInCount,
                OnlineBookingCount = onlineCount,
                PaymentBreakdown = paymentBreakdown,
                DailyBreakdown = dailyBreakdown,
                WeeklyBreakdown = weeklyBreakdown,
                NextPatients = upcomingList,
                LowStockAlertsCount = lowStockMeds.Count,
                ExpiringBatchesCount = expiringBatches.Count,
                TotalMedicinesCount = totalMedicinesCount,
                StockRiskStatus = stockRiskStatus,
                LowStockAlerts = lowStockMeds,
                ExpiringBatchesAlerts = expiringBatches
            });
        }

        public async Task<Result<PatientDashboardResponse>> GetPatientDashboardAsync(int userId, CancellationToken cancellationToken = default)
        {
            var patients = await GetPatientProfilesAsync(userId, cancellationToken);
            var patientIds = patients.Select(p => p.PatientId).ToList();

            var upcomingResponseList = await GetUpcomingAppointmentsAsync(patientIds, cancellationToken);
            var prescriptionResponseList = await GetPrescriptionHistoryAsync(patientIds, cancellationToken);
            var outstandingPayments = await GetOutstandingBalancesAsync(patientIds, cancellationToken);

            return Result<PatientDashboardResponse>.Success(new PatientDashboardResponse
            {
                PatientProfiles = patients.Select(MapPatientToResponse).ToList(),
                UpcomingAppointments = upcomingResponseList,
                PrescriptionHistory = prescriptionResponseList,
                OutstandingBalances = outstandingPayments
            });
        }

        // --- Private Helper Methods for Doctor Dashboard ---

        private async Task<List<TblAppointment>> GetTodayAppointmentsAsync(DateTime start, DateTime end, CancellationToken cancellationToken)
        {
            return await _context.TblAppointments
                .AsNoTracking()
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= start && a.Datetime < end)
                .OrderBy(a => a.Id)
                .ToListAsync(cancellationToken);
        }

        private static List<UpcomingPatientDto> GetUpcomingPatients(List<TblAppointment> todayAppointments)
        {
            return todayAppointments
                .Where(a => a.Status == "confirmed" || a.Status == "pending")
                .Take(3)
                .Select(a => new UpcomingPatientDto
                {
                    Id = a.Id,
                    AppointmentCode = a.AppointmentCode,
                    PatientName = a.Patient?.Name ?? "Unknown",
                    Datetime = a.Datetime.ToString("t"),
                    TokenNumber = todayAppointments.IndexOf(a) + 1,
                    Notes = a.Notes
                })
                .ToList();
        }

        private async Task<(List<string> LowStock, List<string> Expiring)> GetInventoryAlertsAsync(DateOnly today, DateOnly thirtyDaysFromNow, CancellationToken cancellationToken)
        {
            var activeBatches = await _context.TblMedicineBatches
                .AsNoTracking()
                .Include(b => b.Med)
                .Where(b => b.Status == "active" && b.ExpiryDate > today && b.DeleteFlag != true)
                .ToListAsync(cancellationToken);

            var lowStockMeds = activeBatches
                .GroupBy(b => b.MedId)
                .Where(g => g.Sum(b => b.Quantity) < LowStockThreshold)
                .Select(g => $"{g.First().Med?.Name ?? "Unknown"} (Stock: {g.Sum(b => b.Quantity)})")
                .ToList();

            var expiringBatches = activeBatches
                .Where(b => b.ExpiryDate <= thirtyDaysFromNow && b.ExpiryDate > today)
                .Select(b => $"{b.Med?.Name ?? "Unknown"} Batch {b.BatchNo} (Expires: {b.ExpiryDate.ToString(Common.FormatHelper.DateFormat)})")
                .ToList();

            return (lowStockMeds, expiringBatches);
        }

        private async Task<decimal> GetDailyRevenueAsync(DateTime start, DateTime end, CancellationToken cancellationToken)
        {
            var payments = await _context.TblPayments
                .AsNoTracking()
                .Include(p => p.Appointment)
                .Where(p => p.PaymentStatus.ToLower() == "paid")
                .ToListAsync(cancellationToken);

            return payments
                .Where(p => {
                    var paidDate = p.PaidAt ?? p.Appointment?.Datetime;
                    return paidDate.HasValue && paidDate.Value >= start && paidDate.Value < end;
                })
                .Sum(p => p.Amount);
        }

        // --- Private Helper Methods for Patient Dashboard ---

        private async Task<List<TblPatient>> GetPatientProfilesAsync(int userId, CancellationToken cancellationToken)
        {
            var user = await _context.TblUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId, cancellationToken);

            if (user == null)
            {
                return await _context.TblPatients
                    .AsNoTracking()
                    .Where(p => p.UserId == userId && p.DeleteFlag != true)
                    .OrderBy(p => p.PatientId)
                    .ToListAsync(cancellationToken);
            }

            var userEmail = !string.IsNullOrWhiteSpace(user.Email) ? user.Email.Trim().ToLowerInvariant() : null;
            var userMobile = !string.IsNullOrWhiteSpace(user.MobileNo) ? user.MobileNo.Trim() : null;

            return await _context.TblPatients
                .AsNoTracking()
                .Where(p => p.DeleteFlag != true &&
                    (p.UserId == userId ||
                     (userEmail != null && p.Email != null && p.Email.ToLower() == userEmail) ||
                     (userMobile != null && p.MobileNo != null && p.MobileNo == userMobile)))
                .OrderBy(p => p.PatientId)
                .ToListAsync(cancellationToken);
        }

        private async Task<List<AppointmentDetailsResponse>> GetUpcomingAppointmentsAsync(List<int> patientIds, CancellationToken cancellationToken)
        {
            if (patientIds == null || patientIds.Count == 0)
            {
                return new List<AppointmentDetailsResponse>();
            }

            var upcomingAppts = await _context.TblAppointments
                .AsNoTracking()
                .Include(a => a.Patient)
                .Where(a => patientIds.Contains(a.PatientId) && a.Status != "cancelled")
                .OrderBy(a => a.Datetime)
                .ToListAsync(cancellationToken);

            if (upcomingAppts.Count == 0)
            {
                return new List<AppointmentDetailsResponse>();
            }

            var dates = upcomingAppts.Select(a => a.Datetime.Date).Distinct().ToList();
            var minDate = dates.Min();
            var maxDate = dates.Max().AddDays(1);

            var dailyActiveAppts = await _context.TblAppointments
                .AsNoTracking()
                .Where(x => x.Datetime >= minDate && x.Datetime < maxDate && x.Status != "cancelled")
                .OrderBy(x => x.Datetime)
                .ThenBy(x => x.Id)
                .Select(x => new { x.Id, x.Datetime })
                .ToListAsync(cancellationToken);

            var tokenMap = new Dictionary<int, int>();
            foreach (var group in dailyActiveAppts.GroupBy(x => x.Datetime.Date))
            {
                int seq = 1;
                foreach (var item in group)
                {
                    tokenMap[item.Id] = seq++;
                }
            }

            return upcomingAppts.Select(a => new AppointmentDetailsResponse
            {
                Id = a.Id,
                AppointmentCode = a.AppointmentCode,
                PatientId = a.PatientId,
                PatientName = a.Patient?.Name ?? "Unknown",
                Datetime = a.Datetime,
                Status = a.Status,
                Notes = a.Notes,
                TokenNumber = tokenMap.TryGetValue(a.Id, out var tok) ? tok : 0,
                ClinicDoctorName = "Clinic Doctor",
                CreatedAt = a.CreatedAt ?? DateTime.UtcNow
            }).ToList();
        }

        private async Task<List<PrescriptionResponse>> GetPrescriptionHistoryAsync(List<int> patientIds, CancellationToken cancellationToken)
        {
            if (patientIds == null || patientIds.Count == 0)
            {
                return new List<PrescriptionResponse>();
            }

            var prescriptions = await _context.TblPrescriptions
                .AsNoTracking()
                .Include(p => p.Patient)
                .Include(p => p.Appointment)
                .Include(p => p.Disease)
                .Include(p => p.TblPrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .Include(p => p.TblPrescriptionItems)
                    .ThenInclude(i => i.MedicineBatch)
                .Where(p => patientIds.Contains(p.PatientId) && p.DeleteFlag != true)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(cancellationToken);

            return prescriptions.Select(MapPrescriptionToResponse).ToList();
        }

        private async Task<List<UnpaidInvoiceDto>> GetOutstandingBalancesAsync(List<int> patientIds, CancellationToken cancellationToken)
        {
            if (patientIds == null || patientIds.Count == 0)
            {
                return new List<UnpaidInvoiceDto>();
            }

            return await _context.TblPayments
                .AsNoTracking()
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .Where(p => p.Appointment != null && patientIds.Contains(p.Appointment.PatientId) && p.PaymentStatus != "paid")
                .Select(p => new UnpaidInvoiceDto
                {
                    Id = p.Id,
                    AppointmentId = p.AppointmentId,
                    AppointmentCode = p.Appointment != null ? p.Appointment.AppointmentCode : "Unknown",
                    PatientId = p.Appointment != null ? p.Appointment.PatientId : 0,
                    PatientName = p.Appointment != null && p.Appointment.Patient != null ? p.Appointment.Patient.Name : "Unknown",
                    Amount = p.Amount,
                    Tax = p.Tax,
                    Charges = p.Charges,
                    PaymentStatus = p.PaymentStatus,
                    PaymentMethod = p.PaymentMethod
                })
                .ToListAsync(cancellationToken);
        }

        // --- Mappers ---

        private static PatientProfileResponse MapPatientToResponse(TblPatient p)
        {
            var addressText = p.Address;
            if (!string.IsNullOrEmpty(addressText) && addressText.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = JsonDocument.Parse(addressText);
                    if (doc.RootElement.TryGetProperty("ActualAddress", out var actualProp))
                    {
                        addressText = actualProp.GetString();
                    }
                }
                catch { }
            }

            return new PatientProfileResponse
            {
                PatientId = p.PatientId,
                UserId = p.UserId,
                Name = p.Name,
                MobileNo = p.MobileNo,
                Email = p.Email,
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender,
                BloodType = p.BloodType,
                ActualAddress = addressText,
                Allergies = p.Allergies,
                ChronicConditions = p.ChronicConditions,
                PastSurgeries = p.PastSurgeries,
                FamilyHistory = p.FamilyHistory,
                VaccinationHistory = p.VaccinationHistory,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow
            };
        }

        private static PrescriptionResponse MapPrescriptionToResponse(TblPrescription p)
        {
            var itemsList = p.TblPrescriptionItems.Select(item => new PrescriptionItemResponseDto
            {
                Id = item.Id,
                MedicineName = item.Medicine?.Name ?? "Unknown",
                Dosage = item.Dosage,
                Days = item.Days,
                Quantity = item.Quantity,
                Instruction = item.Instruction
            }).ToList();

            var notesText = p.Notes;
            double? tempC = p.TemperatureC;
            int? pulse = p.PulseBpm;
            int? spo2 = p.Spo2Percent;
            double? height = p.HeightCm;
            double? bmi = p.Bmi;
            string? labTests = p.LabTestRequests;

            if (!string.IsNullOrEmpty(notesText) && notesText.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = JsonDocument.Parse(notesText);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("ActualNotes", out var anProp))
                    {
                        notesText = anProp.GetString();
                    }
                    if (root.TryGetProperty("TemperatureC", out var tcProp) && !tempC.HasValue && tcProp.TryGetDouble(out var tcVal))
                    {
                        tempC = tcVal;
                    }
                    if (root.TryGetProperty("PulseBpm", out var pbProp) && !pulse.HasValue && pbProp.TryGetInt32(out var pbVal))
                    {
                        pulse = pbVal;
                    }
                    if (root.TryGetProperty("Spo2Percent", out var spProp) && !spo2.HasValue && spProp.TryGetInt32(out var spVal))
                    {
                        spo2 = spVal;
                    }
                    if (root.TryGetProperty("HeightCm", out var hProp) && !height.HasValue && hProp.TryGetDouble(out var hVal))
                    {
                        height = hVal;
                    }
                    if (root.TryGetProperty("Bmi", out var bmiProp) && !bmi.HasValue && bmiProp.TryGetDouble(out var bmiVal))
                    {
                        bmi = bmiVal;
                    }
                    if (root.TryGetProperty("LabTestRequests", out var ltProp) && string.IsNullOrEmpty(labTests))
                    {
                        labTests = ltProp.GetString();
                    }
                }
                catch { }
            }

            return new PrescriptionResponse
            {
                Id = p.Id,
                AppointmentId = p.AppointmentId,
                AppointmentCode = p.Appointment?.AppointmentCode ?? "Unknown",
                PatientId = p.PatientId,
                PatientName = p.Patient?.Name ?? "Unknown",
                DiseaseId = p.DiseaseId,
                DiseaseName = p.Disease?.Name,
                WeightKg = p.WeightKg,
                BloodPressureSystolic = p.BloodPressureSystolic,
                BloodPressureDiastolic = p.BloodPressureDiastolic,
                Notes = notesText,
                TemperatureC = tempC,
                PulseBpm = pulse,
                Spo2Percent = spo2,
                HeightCm = height,
                Bmi = bmi,
                LabTestRequests = labTests,
                Items = itemsList,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow
            };
        }
    }
}
