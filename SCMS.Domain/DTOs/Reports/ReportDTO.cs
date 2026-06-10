using System.Collections.Generic;
using System;

namespace SCMS.Domain.DTOs.Reports
{
    public class AppointmentReportRequest
        {
            /// <summary>"daily" or "weekly"</summary>
            public string ReportType { get; set; } = "daily";

            /// <summary>The target date for daily report, or the start-of-week date for weekly.</summary>
            public DateTime? Date { get; set; }
        }

    public class AppointmentReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public string ReportType { get; set; } = null!;
            public DateTime PeriodStart { get; set; }
            public DateTime PeriodEnd { get; set; }
            public DateTime GeneratedAt { get; set; }

            public int TotalAppointments { get; set; }
            public int PendingCount { get; set; }
            public int ConfirmedCount { get; set; }
            public int CompletedCount { get; set; }
            public int CancelledCount { get; set; }

            public List<AppointmentReportItemDto> Items { get; set; } = new();
        }

        public class AppointmentReportItemDto
        {
            public int AppointmentId { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public string PatientName { get; set; } = null!;
            public DateTime Datetime { get; set; }
            public string Status { get; set; } = null!;
            public int TokenNumber { get; set; }
            public string? Notes { get; set; }
        }

    public class BusinessSummaryReportRequest
        {
            /// <summary>Month (1-12). Defaults to current month.</summary>
            public int? Month { get; set; }

            /// <summary>Year (e.g. 2026). Defaults to current year.</summary>
            public int? Year { get; set; }
        }

        public class BusinessSummaryReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public DateTime PeriodStart { get; set; }
            public DateTime PeriodEnd { get; set; }
            public DateTime GeneratedAt { get; set; }

            public int NewPatients { get; set; }
            public int TotalPatients { get; set; }
            
            public int TotalAppointments { get; set; }
            public int TotalPrescriptions { get; set; }

            public decimal TotalIncome { get; set; }
            public decimal TotalTax { get; set; }
            public decimal TotalCharges { get; set; }
        }

    public class FollowUpReportRequest
        {
            /// <summary>The start date for the report period.</summary>
            public DateTime? StartDate { get; set; }

            /// <summary>The end date for the report period (inclusive). If null, same as StartDate (single day).</summary>
            public DateTime? EndDate { get; set; }
            
            /// <summary>"pending", "completed", or "all"</summary>
            public string Status { get; set; } = "all";
        }

        public class FollowUpReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public DateTime PeriodStart { get; set; }
            public DateTime? PeriodEnd { get; set; }
            public DateTime GeneratedAt { get; set; }

            // ── Summary ─────────────────────────────────────────
            public int TotalFollowUps { get; set; }
            public int PendingCount { get; set; }
            public int CompletedCount { get; set; }
            public int OverdueCount { get; set; }

            public List<FollowUpItemDto> Items { get; set; } = new();
        }

        public class FollowUpItemDto
        {
            public int FollowUpId { get; set; }
            public int PatientId { get; set; }
            public string PatientName { get; set; } = null!;
            public string? MobileNo { get; set; }
            public DateTime DueAt { get; set; }
            public string Recommendation { get; set; } = null!;
            public string Status { get; set; } = null!;
            public bool IsOverdue { get; set; }
            public DateTime? CompletedAt { get; set; }
        }

    public class MedicineStockReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public DateTime GeneratedAt { get; set; }

            // ── Summary ─────────────────────────────────────────
            public int TotalMedicines { get; set; }
            public int TotalBatches { get; set; }
            public int LowStockCount { get; set; }
            public int ExpiredCount { get; set; }

            public List<MedicineStockItemDto> Items { get; set; } = new();
        }

        public class MedicineStockItemDto
        {
            public int MedicineId { get; set; }
            public string Name { get; set; } = null!;
            public string Category { get; set; } = null!;
            public int TotalQuantity { get; set; }
            
            public List<MedicineBatchStockDto> Batches { get; set; } = new();
        }

        public class MedicineBatchStockDto
        {
            public int BatchId { get; set; }
            public string BatchNo { get; set; } = null!;
            public int Quantity { get; set; }
            public DateOnly ExpiryDate { get; set; }
            public string Status { get; set; } = null!;
            public bool IsExpired { get; set; }
            public bool IsLowStock { get; set; }
        }

    public class PatientListReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public DateTime GeneratedAt { get; set; }

            // ── Summary ─────────────────────────────────────────
            public int TotalPatients { get; set; }
            public int MaleCount { get; set; }
            public int FemaleCount { get; set; }
            public int OtherGenderCount { get; set; }

            public List<PatientListItemDto> Items { get; set; } = new();
        }

        public class PatientListItemDto
        {
            public int PatientId { get; set; }
            public string Name { get; set; } = null!;
            public int? Age { get; set; }
            public string Gender { get; set; } = null!;
            public string BloodType { get; set; } = null!;
            public string? MobileNo { get; set; }
            public string? Email { get; set; }
            public DateTime RegisteredAt { get; set; }
        }

    public class PrescriptionReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public DateTime GeneratedAt { get; set; }
            public int TotalPrescriptions { get; set; }
            public int TotalMedicines { get; set; }
            public int DistinctPatients { get; set; }
            public List<PrescriptionReportItemDto> Items { get; set; } = new();
        }

        public class PrescriptionReportItemDto
        {
            public int Id { get; set; }
            public string PatientName { get; set; } = null!;
            public string AppointmentCode { get; set; } = null!;
            public string? DiseaseName { get; set; }
            public DateTime CreatedAt { get; set; }
            public int MedicineCount { get; set; }
            public int TotalQuantity { get; set; }
        }

    public class RevenueReportRequest
        {
            /// <summary>"daily", "weekly", or "monthly"</summary>
            public string ReportType { get; set; } = "daily";

            /// <summary>The target date (used to derive the day, week, or month period).</summary>
            public DateTime? Date { get; set; }
        }

        public class RevenueReportResponse
        {
            public string ReportTitle { get; set; } = null!;
            public string ReportType { get; set; } = null!;
            public DateTime PeriodStart { get; set; }
            public DateTime PeriodEnd { get; set; }
            public DateTime GeneratedAt { get; set; }

            // ── Totals ──────────────────────────────────────────
            public int TotalTransactions { get; set; }
            public decimal TotalAmount { get; set; }
            public decimal TotalTax { get; set; }
            public decimal TotalCharges { get; set; }
            public decimal GrandTotal { get; set; }

            // ── By payment method ───────────────────────────────
            public List<RevenueByMethodDto> ByMethod { get; set; } = new();

            // ── Individual payment line items ───────────────────
            public List<RevenueLineItemDto> Items { get; set; } = new();
        }

        public class RevenueByMethodDto
        {
            public string PaymentMethod { get; set; } = null!;
            public int Count { get; set; }
            public decimal Amount { get; set; }
            public decimal Tax { get; set; }
            public decimal Charges { get; set; }
            public decimal Total { get; set; }
        }

        public class RevenueLineItemDto
        {
            public int PaymentId { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public string PatientName { get; set; } = null!;
            public string PaymentMethod { get; set; } = null!;
            public string PaymentStatus { get; set; } = null!;
            public decimal Amount { get; set; }
            public decimal Tax { get; set; }
            public decimal Charges { get; set; }
            public decimal Total { get; set; }
            public DateTime? PaidAt { get; set; }
        }
}
