using System.Collections.Generic;
using SCMS.Domain.Features.Appointments.Models;
using SCMS.Domain.Features.Patients.Models;
using SCMS.Domain.Features.Prescriptions.Models;

namespace SCMS.Domain.Features.Dashboards.Models
{
    /// <summary>
    /// Request parameters for the admin/doctor operational dashboard.
    /// </summary>
    public sealed record GetDoctorDashboardRequest
    {
        /// <summary>
        /// Selected aggregation period: "daily", "weekly", "monthly", or "all". Default is "monthly".
        /// </summary>
        public string Period { get; init; } = "monthly";

        /// <summary>
        /// Specific month number (1 to 12) to analyze. Defaults to current month if omitted.
        /// </summary>
        public int? Month { get; init; }

        /// <summary>
        /// Specific 4-digit calendar year to analyze. Defaults to current year if omitted.
        /// </summary>
        public int? Year { get; init; }
    }

    /// <summary>
    /// Comprehensive operational and clinical dashboard summary response for staff and doctors.
    /// </summary>
    public sealed record DoctorDashboardResponse
    {
        /// <summary>
        /// Selected aggregation period: "daily", "weekly", "monthly", or "all".
        /// </summary>
        public string Period { get; init; } = "monthly";

        /// <summary>
        /// Calendar month number evaluated (1 to 12).
        /// </summary>
        public int Month { get; init; }

        /// <summary>
        /// Calendar year evaluated.
        /// </summary>
        public int Year { get; init; }

        /// <summary>
        /// Formatted month and year title (e.g. "August 2026").
        /// </summary>
        public string MonthName { get; init; } = string.Empty;

        /// <summary>
        /// Total clinic income collected within the specified period.
        /// </summary>
        public decimal TotalIncome { get; init; }

        /// <summary>
        /// Backward-compatible alias for daily collected revenue.
        /// </summary>
        public decimal DailyRevenue { get; init; }

        /// <summary>
        /// All-time collected clinic revenue.
        /// </summary>
        public decimal TotalRevenue { get; init; }

        /// <summary>
        /// Total consultation fees earned by the doctor within the specified period.
        /// </summary>
        public decimal DoctorConsultationFees { get; init; }

        /// <summary>
        /// Total appointments scheduled/made within the specified period.
        /// </summary>
        public int TotalAppointmentsCount { get; init; }

        /// <summary>
        /// Total appointments cancelled within the specified period.
        /// </summary>
        public int CancelledAppointmentsCount { get; init; }

        /// <summary>
        /// Backward-compatible alias for today's appointment count.
        /// </summary>
        public int TodayAppointmentsCount { get; init; }

        /// <summary>
        /// Distinct active patients attended or scheduled within the specified period (excluding patients whose appointments were cancelled).
        /// </summary>
        public int TotalPatientsCount { get; init; }

        /// <summary>
        /// Backward-compatible alias for today's patient count.
        /// </summary>
        public int TodayPatientsCount { get; init; }

        /// <summary>
        /// Walk-in patients registered at the clinic counter on the same day.
        /// </summary>
        public int WalkInPatientsCount { get; init; }

        /// <summary>
        /// Pre-booked online appointments scheduled ahead of time.
        /// </summary>
        public int OnlineBookingCount { get; init; }

        /// <summary>
        /// Breakdown of collected income by payment method (Cash vs Digital).
        /// </summary>
        public PaymentBreakdownDto PaymentBreakdown { get; init; } = new();

        /// <summary>
        /// Daily metrics breakdown for every day of the evaluated month.
        /// </summary>
        public List<DashboardDailyMetricDto> DailyBreakdown { get; init; } = new();

        /// <summary>
        /// Weekly metrics breakdown for the weeks in the evaluated month.
        /// </summary>
        public List<DashboardWeeklyMetricDto> WeeklyBreakdown { get; init; } = new();

        /// <summary>
        /// List of the next queued patients for active consultation.
        /// </summary>
        public List<UpcomingPatientDto> NextPatients { get; init; } = new();

        /// <summary>
        /// Total medicines with stock levels below the minimum threshold.
        /// </summary>
        public int LowStockAlertsCount { get; init; }

        /// <summary>
        /// Total medicine batches nearing expiration within 30 days.
        /// </summary>
        public int ExpiringBatchesCount { get; init; }

        /// <summary>
        /// Total active medicines registered in the clinic inventory.
        /// </summary>
        public int TotalMedicinesCount { get; init; }

        /// <summary>
        /// Overall stock health status ("Safe" or "At Risk").
        /// </summary>
        public string StockRiskStatus { get; init; } = "Safe";

        /// <summary>
        /// Itemized warnings for low-stock medicines.
        /// </summary>
        public List<string> LowStockAlerts { get; init; } = new();

        /// <summary>
        /// Itemized warnings for near-expiry medicine batches.
        /// </summary>
        public List<string> ExpiringBatchesAlerts { get; init; } = new();
    }

    /// <summary>
    /// Daily aggregation metrics for income, appointments made, cancelled, and distinct active patients.
    /// </summary>
    public sealed record DashboardDailyMetricDto
    {
        /// <summary>Formatted date string (yyyy-MM-dd).</summary>
        public string Date { get; init; } = string.Empty;

        /// <summary>Day of month (1 to 31).</summary>
        public int DayNumber { get; init; }

        /// <summary>Short label representation (e.g. "Aug 01" or "01").</summary>
        public string DayLabel { get; init; } = string.Empty;

        /// <summary>Total collected income for the day.</summary>
        public decimal Income { get; init; }

        /// <summary>Total appointments made/scheduled for the day.</summary>
        public int AppointmentsMade { get; init; }

        /// <summary>Total appointments cancelled for the day.</summary>
        public int AppointmentsCancelled { get; init; }

        /// <summary>Distinct active patients for the day (excluding patients with cancelled appointments).</summary>
        public int TotalPatients { get; init; }
    }

    /// <summary>
    /// Weekly aggregation metrics for income, appointments made, cancelled, and distinct active patients.
    /// </summary>
    public sealed record DashboardWeeklyMetricDto
    {
        /// <summary>Week index within the month (1 to 5).</summary>
        public int WeekNumber { get; init; }

        /// <summary>Human-readable week label (e.g. "Week 1 (Aug 01 - Aug 07)").</summary>
        public string WeekLabel { get; init; } = string.Empty;

        /// <summary>Start date for this week segment (yyyy-MM-dd).</summary>
        public string StartDate { get; init; } = string.Empty;

        /// <summary>End date for this week segment (yyyy-MM-dd).</summary>
        public string EndDate { get; init; } = string.Empty;

        /// <summary>Total collected income for this week.</summary>
        public decimal Income { get; init; }

        /// <summary>Total appointments made/scheduled in this week.</summary>
        public int AppointmentsMade { get; init; }

        /// <summary>Total appointments cancelled in this week.</summary>
        public int AppointmentsCancelled { get; init; }

        /// <summary>Distinct active patients in this week (excluding patients with cancelled appointments).</summary>
        public int TotalPatients { get; init; }
    }

    /// <summary>
    /// Breakdown of payment methods and transaction volumes.
    /// </summary>
    public sealed record PaymentBreakdownDto
    {
        public decimal CashTotal { get; init; }
        public decimal DigitalTotal { get; init; }
        public int CashCount { get; init; }
        public int DigitalCount { get; init; }
    }

    /// <summary>
    /// Represents an upcoming patient in the consultation queue.
    /// </summary>
    public sealed record UpcomingPatientDto
    {
        public int Id { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public string Datetime { get; init; } = null!;
        public int TokenNumber { get; init; }
        public string? Notes { get; init; }
    }

    /// <summary>
    /// Summary response for the patient mobile/web dashboard.
    /// </summary>
    public sealed record PatientDashboardResponse
    {
        public List<PatientProfileResponse> PatientProfiles { get; init; } = new();
        public List<AppointmentDetailsResponse> UpcomingAppointments { get; init; } = new();
        public List<PrescriptionResponse> PrescriptionHistory { get; init; } = new();
        public List<UnpaidInvoiceDto> OutstandingBalances { get; init; } = new();
    }

    /// <summary>
    /// Details of an unpaid invoice or pending balance.
    /// </summary>
    public sealed record UnpaidInvoiceDto
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public int PatientId { get; init; }
        public string? PatientName { get; init; }
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentStatus { get; init; } = null!;
        public string PaymentMethod { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }
}
