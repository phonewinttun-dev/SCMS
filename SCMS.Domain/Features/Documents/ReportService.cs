using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Shared;
using SCMS.Domain.DTOs.Reports;

namespace SCMS.Domain.Features.Documents
{
    public class ReportService
    {
        private readonly AppDbContext _context;

        public ReportService(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Generates an appointment report for a given period (daily or weekly).
        /// </summary>
        public async Task<Result<AppointmentReportResponse>> GetAppointmentReportAsync(AppointmentReportRequest request)
        {
            var reportType = (request.ReportType ?? "daily").ToLower().Trim();
            var baseDate = request.Date?.Date ?? DateTime.UtcNow.Date;

            DateTime periodStart;
            DateTime periodEnd;
            string title;

            if (reportType == "weekly")
            {
                // Start from Monday of the given week
                int diff = ((int)baseDate.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                periodStart = baseDate.AddDays(-diff);
                periodEnd = periodStart.AddDays(7);
                title = $"Weekly Appointment Report ({periodStart:dd-MM-yyyy} to {periodEnd.AddDays(-1):dd-MM-yyyy})";
            }
            else
            {
                periodStart = baseDate;
                periodEnd = baseDate.AddDays(1);
                title = $"Daily Appointment Report ({baseDate:dd-MM-yyyy})";
            }

            var appointments = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= periodStart && a.Datetime < periodEnd)
                .OrderBy(a => a.Datetime)
                .ThenBy(a => a.Id)
                .ToListAsync();

            // Group by date for token numbering
            var grouped = appointments
                .GroupBy(a => a.Datetime.Date)
                .ToDictionary(g => g.Key, g => g.OrderBy(a => a.Id).ToList());

            var items = new List<AppointmentReportItemDto>();
            foreach (var a in appointments)
            {
                var dayGroup = grouped[a.Datetime.Date];
                var nonCancelled = dayGroup.Where(x => x.Status != "cancelled").ToList();
                var token = nonCancelled.FindIndex(x => x.Id == a.Id) + 1;
                if (token <= 0) token = 0; // cancelled appointments get token 0

                items.Add(new AppointmentReportItemDto
                {
                    AppointmentId = a.Id,
                    AppointmentCode = a.AppointmentCode ?? "-",
                    PatientName = a.Patient?.Name ?? "Unknown",
                    Datetime = a.Datetime,
                    Status = a.Status ?? "unknown",
                    TokenNumber = token,
                    Notes = a.Notes
                });
            }

            var response = new AppointmentReportResponse
            {
                ReportTitle = title,
                ReportType = reportType,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd.AddDays(-1),
                GeneratedAt = DateTime.UtcNow,
                TotalAppointments = items.Count,
                PendingCount = items.Count(i => i.Status == "pending"),
                ConfirmedCount = items.Count(i => i.Status == "confirmed"),
                CompletedCount = items.Count(i => i.Status == "completed"),
                CancelledCount = items.Count(i => i.Status == "cancelled"),
                Items = items
            };

            return Result<AppointmentReportResponse>.Success(response);
        }

        /// <summary>
        /// Generates a revenue report for a given period (daily, weekly, or monthly).
        /// </summary>
        public async Task<Result<RevenueReportResponse>> GetRevenueReportAsync(RevenueReportRequest request)
        {
            var reportType = (request.ReportType ?? "daily").ToLower().Trim();
            var baseDate = request.Date?.Date ?? DateTime.UtcNow.Date;

            DateTime periodStart;
            DateTime periodEnd;
            string title;

            switch (reportType)
            {
                case "weekly":
                    int diff = ((int)baseDate.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                    periodStart = baseDate.AddDays(-diff);
                    periodEnd = periodStart.AddDays(7);
                    title = $"Weekly Revenue Report ({periodStart:dd-MM-yyyy} to {periodEnd.AddDays(-1):dd-MM-yyyy})";
                    break;
                case "monthly":
                    periodStart = new DateTime(baseDate.Year, baseDate.Month, 1);
                    periodEnd = periodStart.AddMonths(1);
                    title = $"Monthly Revenue Report ({periodStart:yyyy MMMM})";
                    break;
                default: // daily
                    periodStart = baseDate;
                    periodEnd = baseDate.AddDays(1);
                    title = $"Daily Revenue Report ({baseDate:dd-MM-yyyy})";
                    break;
            }

            var payments = await _context.TblPayments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .Where(p => p.PaidAt >= periodStart && p.PaidAt < periodEnd
                         && p.PaymentStatus == "paid")
                .OrderBy(p => p.PaidAt)
                .ToListAsync();

            var items = payments.Select(p => new RevenueLineItemDto
            {
                PaymentId = p.Id,
                AppointmentCode = p.Appointment?.AppointmentCode ?? "-",
                PatientName = p.Appointment?.Patient?.Name ?? "Unknown",
                PaymentMethod = p.PaymentMethod ?? "unknown",
                PaymentStatus = p.PaymentStatus ?? "unknown",
                Amount = p.Amount,
                Tax = p.Tax,
                Charges = p.Charges,
                Total = p.Amount + p.Tax + p.Charges,
                PaidAt = p.PaidAt
            }).ToList();

            var byMethod = items
                .GroupBy(i => i.PaymentMethod)
                .Select(g => new RevenueByMethodDto
                {
                    PaymentMethod = g.Key,
                    Count = g.Count(),
                    Amount = g.Sum(x => x.Amount),
                    Tax = g.Sum(x => x.Tax),
                    Charges = g.Sum(x => x.Charges),
                    Total = g.Sum(x => x.Total)
                })
                .OrderByDescending(m => m.Total)
                .ToList();

            var response = new RevenueReportResponse
            {
                ReportTitle = title,
                ReportType = reportType,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd.AddDays(-1),
                GeneratedAt = DateTime.UtcNow,
                TotalTransactions = items.Count,
                TotalAmount = items.Sum(i => i.Amount),
                TotalTax = items.Sum(i => i.Tax),
                TotalCharges = items.Sum(i => i.Charges),
                GrandTotal = items.Sum(i => i.Total),
                ByMethod = byMethod,
                Items = items
            };

            return Result<RevenueReportResponse>.Success(response);
        }

        /// <summary>
        /// Generates a patient list report with age, gender, and blood type.
        /// </summary>
        public async Task<Result<PatientListReportResponse>> GetPatientListReportAsync()
        {
            var patients = await _context.TblPatients
                .Where(p => p.DeleteFlag != true)
                .OrderBy(p => p.Name)
                .ToListAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var items = patients.Select(p =>
            {
                int? age = null;
                if (p.DateOfBirth.HasValue)
                {
                    age = today.Year - p.DateOfBirth.Value.Year;
                    if (p.DateOfBirth.Value > today.AddYears(-age.Value)) age--;
                }

                return new PatientListItemDto
                {
                    PatientId = p.PatientId,
                    Name = p.Name,
                    Age = age,
                    Gender = CapFirst(p.Gender),
                    BloodType = p.BloodType ?? "-",
                    MobileNo = p.MobileNo,
                    Email = p.Email,
                    RegisteredAt = p.CreatedAt ?? DateTime.UtcNow
                };
            }).ToList();

            var response = new PatientListReportResponse
            {
                ReportTitle = "Patient List Report",
                GeneratedAt = DateTime.UtcNow,
                TotalPatients = items.Count,
                MaleCount = items.Count(i => i.Gender.Equals("Male", StringComparison.OrdinalIgnoreCase)),
                FemaleCount = items.Count(i => i.Gender.Equals("Female", StringComparison.OrdinalIgnoreCase)),
                OtherGenderCount = items.Count(i =>
                    !i.Gender.Equals("Male", StringComparison.OrdinalIgnoreCase)
                    && !i.Gender.Equals("Female", StringComparison.OrdinalIgnoreCase)
                    && i.Gender != "-"),
                Items = items
            };

            return Result<PatientListReportResponse>.Success(response);
        }

        /// <summary>
        /// Generates a medicine stock report.
        /// </summary>
        public async Task<Result<MedicineStockReportResponse>> GetMedicineStockReportAsync()
        {
            var medicines = await _context.TblMedicines
                .Include(m => m.Category)
                .Include(m => m.TblMedicineBatches)
                .Where(m => m.DeleteFlag != true)
                .OrderBy(m => m.Name)
                .ToListAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            
            var items = new List<MedicineStockItemDto>();
            int totalBatches = 0;
            int expiredCount = 0;
            int lowStockCount = 0;

            foreach (var m in medicines)
            {
                var batches = m.TblMedicineBatches
                    .Where(b => b.DeleteFlag != true && b.Status != "disposed")
                    .OrderBy(b => b.ExpiryDate)
                    .Select(b =>
                    {
                        var isExpired = b.ExpiryDate <= today;
                        var isLowStock = b.Quantity <= 10 && !isExpired; // Let's say 10 is low stock threshold

                        if (isExpired) expiredCount++;
                        if (isLowStock) lowStockCount++;

                        return new MedicineBatchStockDto
                        {
                            BatchId = b.Id,
                            BatchNo = b.BatchNo,
                            Quantity = b.Quantity,
                            ExpiryDate = b.ExpiryDate,
                            Status = b.Status,
                            IsExpired = isExpired,
                            IsLowStock = isLowStock
                        };
                    }).ToList();

                totalBatches += batches.Count;

                items.Add(new MedicineStockItemDto
                {
                    MedicineId = m.MedicineId,
                    Name = m.Name,
                    Category = m.Category?.Name ?? "Uncategorized",
                    TotalQuantity = batches.Sum(b => b.Quantity),
                    Batches = batches
                });
            }

            var response = new MedicineStockReportResponse
            {
                ReportTitle = "Medicine Stock Report",
                GeneratedAt = DateTime.UtcNow,
                TotalMedicines = items.Count,
                TotalBatches = totalBatches,
                LowStockCount = lowStockCount,
                ExpiredCount = expiredCount,
                Items = items
            };

            return Result<MedicineStockReportResponse>.Success(response);
        }

        /// <summary>
        /// Generates a follow-up report for a given period.
        /// </summary>
        public async Task<Result<FollowUpReportResponse>> GetFollowUpReportAsync(FollowUpReportRequest request)
        {
            var statusFilter = (request.Status ?? "all").ToLower().Trim();

            DateTime? periodStart = request.StartDate?.Date;
            DateTime? periodEnd = request.EndDate?.Date.AddDays(1); // inclusive end

            // If only StartDate provided (single day)
            if (periodStart.HasValue && !request.EndDate.HasValue)
            {
                periodEnd = periodStart.Value.AddDays(1);
            }

            string title;
            if (periodStart.HasValue && request.EndDate.HasValue && request.EndDate.Value.Date != request.StartDate!.Value.Date)
            {
                title = $"Follow-Up Report ({periodStart.Value:dd-MM-yyyy} to {request.EndDate.Value:dd-MM-yyyy})";
            }
            else if (periodStart.HasValue)
            {
                title = $"Follow-Up Report ({periodStart.Value:dd-MM-yyyy})";
            }
            else
            {
                title = "All Follow-Ups Report";
            }

            var query = _context.TblFollowUps
                .Include(f => f.Patient)
                .Where(f => f.DeleteFlag != true);

            if (periodStart.HasValue && periodEnd.HasValue)
            {
                query = query.Where(f => f.DueAt >= periodStart.Value && f.DueAt < periodEnd.Value);
            }

            if (statusFilter != "all")
            {
                query = query.Where(f => f.Status == statusFilter);
            }

            var followUps = await query
                .OrderBy(f => f.DueAt)
                .ToListAsync();

            var now = DateTime.UtcNow;
            
            var items = followUps.Select(f =>
            {
                bool isOverdue = f.Status == "pending" && f.DueAt < now;
                return new FollowUpItemDto
                {
                    FollowUpId = f.Id,
                    PatientId = f.PatientId,
                    PatientName = f.Patient?.Name ?? "Unknown",
                    MobileNo = f.Patient?.MobileNo,
                    DueAt = f.DueAt,
                    Recommendation = f.Recommendation ?? "-",
                    Status = f.Status ?? "pending",
                    IsOverdue = isOverdue,
                    CompletedAt = f.CompletedAt
                };
            }).ToList();

            var response = new FollowUpReportResponse
            {
                ReportTitle = title,
                PeriodStart = periodStart ?? DateTime.MinValue,
                PeriodEnd = request.EndDate?.Date ?? (periodStart.HasValue ? periodStart.Value : (DateTime?)null),
                GeneratedAt = now,
                TotalFollowUps = items.Count,
                PendingCount = items.Count(i => i.Status == "pending"),
                CompletedCount = items.Count(i => i.Status == "completed"),
                OverdueCount = items.Count(i => i.IsOverdue),
                Items = items
            };

            return Result<FollowUpReportResponse>.Success(response);
        }

        /// <summary>
        /// Generates a monthly business summary report.
        /// </summary>
        public async Task<Result<BusinessSummaryReportResponse>> GetBusinessSummaryReportAsync(BusinessSummaryReportRequest request)
        {
            var now = DateTime.UtcNow;
            int month = request.Month ?? now.Month;
            int year = request.Year ?? now.Year;
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1);

            // 1. Total Patients (all-time active) vs New Patients (this month)
            var totalPatients = await _context.TblPatients
                .CountAsync(p => p.DeleteFlag != true);
            
            var newPatients = await _context.TblPatients
                .CountAsync(p => p.DeleteFlag != true && p.CreatedAt >= periodStart && p.CreatedAt < periodEnd);

            // 2. Total Appointments (this month)
            var totalAppointments = await _context.TblAppointments
                .CountAsync(a => a.Datetime >= periodStart && a.Datetime < periodEnd && a.Status != "cancelled");

            // 3. Total Prescriptions (this month)
            var totalPrescriptions = await _context.TblPrescriptions
                .CountAsync(p => p.CreatedAt >= periodStart && p.CreatedAt < periodEnd && p.DeleteFlag != true);

            // 4. Financials (this month, paid only)
            var payments = await _context.TblPayments
                .Where(p => p.PaidAt >= periodStart && p.PaidAt < periodEnd && p.PaymentStatus == "paid")
                .ToListAsync();

            var response = new BusinessSummaryReportResponse
            {
                ReportTitle = $"Business Summary ({periodStart:yyyy MMMM})",
                PeriodStart = periodStart,
                PeriodEnd = periodEnd.AddDays(-1),
                GeneratedAt = DateTime.UtcNow,
                TotalPatients = totalPatients,
                NewPatients = newPatients,
                TotalAppointments = totalAppointments,
                TotalPrescriptions = totalPrescriptions,
                TotalIncome = payments.Sum(p => p.Amount),
                TotalTax = payments.Sum(p => p.Tax),
                TotalCharges = payments.Sum(p => p.Charges)
            };

            return Result<BusinessSummaryReportResponse>.Success(response);
        }

        public async Task<Result<PrescriptionReportResponse>> GetPrescriptionReportAsync()
        {
            var prescriptions = await _context.TblPrescriptions
                .Include(p => p.Patient)
                .Include(p => p.Appointment)
                .Include(p => p.Disease)
                .Include(p => p.TblPrescriptionItems)
                .Where(p => p.DeleteFlag != true)
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            var items = prescriptions.Select(p => new PrescriptionReportItemDto
            {
                Id = p.Id,
                PatientName = p.Patient?.Name ?? "Unknown",
                AppointmentCode = p.Appointment?.AppointmentCode ?? "-",
                DiseaseName = p.Disease?.Name,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow,
                MedicineCount = p.TblPrescriptionItems.Count,
                TotalQuantity = p.TblPrescriptionItems.Sum(i => i.Quantity)
            }).ToList();

            var response = new PrescriptionReportResponse
            {
                ReportTitle = "Prescription Report",
                GeneratedAt = DateTime.UtcNow,
                TotalPrescriptions = items.Count,
                TotalMedicines = items.Sum(i => i.MedicineCount),
                DistinctPatients = items.Select(i => i.PatientName).Distinct().Count(),
                Items = items
            };

            return Result<PrescriptionReportResponse>.Success(response);
        }

        private static string CapFirst(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "-";
            return char.ToUpper(s[0]) + s[1..];
        }
    }
}
