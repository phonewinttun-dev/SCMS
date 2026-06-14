using SCMS.Domain.DTOs.Appointments;
using SCMS.Domain.DTOs;
using SCMS.Domain.DTOs.Prescriptions;
using System.Collections.Generic;

namespace SCMS.Domain.DTOs.Dashboards
{
    public class DoctorDashboardResponse
        {
            public int TodayAppointmentsCount { get; set; }
            public List<UpcomingPatientDto> NextPatients { get; set; } = new();
            public int LowStockAlertsCount { get; set; }
            public int ExpiringBatchesCount { get; set; }
            public decimal DailyRevenue { get; set; }
            public decimal TotalRevenue { get; set; }
            public int TodayPatientsCount { get; set; }
            public int TotalMedicinesCount { get; set; }
            public string StockRiskStatus { get; set; } = "Safe";

            public List<string> LowStockAlerts { get; set; } = new();
            public List<string> ExpiringBatchesAlerts { get; set; } = new();
        }

        public class UpcomingPatientDto
        {
            public int Id { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public string PatientName { get; set; } = null!;
            public string Datetime { get; set; } = null!;
            public int TokenNumber { get; set; }
            public string? Notes { get; set; }
        }

    public class PatientDashboardResponse
        {
            public List<PatientProfileResponse> PatientProfiles { get; set; } = new();
            public List<AppointmentDetailsResponse> UpcomingAppointments { get; set; } = new();
            public List<PrescriptionResponse> PrescriptionHistory { get; set; } = new();
            public List<UnpaidInvoiceDto> OutstandingBalances { get; set; } = new();
        }

        public class UnpaidInvoiceDto
        {
            public int Id { get; set; }
            public int AppointmentId { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public decimal Amount { get; set; }
            public decimal Tax { get; set; }
            public decimal Charges { get; set; }
            public string PaymentStatus { get; set; } = null!;
            public string PaymentMethod { get; set; } = null!;
        }
}
