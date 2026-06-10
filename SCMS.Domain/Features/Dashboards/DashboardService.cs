using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.DTOs.Dashboards;
using SCMS.Domain.DTOs.Appointments;
using SCMS.Domain.DTOs.Patients;
using SCMS.Domain.DTOs.Prescriptions;
using SCMS.Shared;

namespace SCMS.Domain.Features.Dashboards
{
    public class DashboardService
    {
        private readonly AppDbContext _context;
        private const int LowStockThreshold = 20;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        // Helper structure for patient address serialization
        public class PatientAddressMetadata
        {
            public string? ActualAddress { get; set; }
            public string? Allergies { get; set; }
            public string? ChronicConditions { get; set; }
            public string? PastSurgeries { get; set; }
            public string? FamilyHistory { get; set; }
            public string? VaccinationHistory { get; set; }
        }

        // Helper structure for vitals serialization
        public class PrescriptionNotesMetadata
        {
            public string? ActualNotes { get; set; }
            public double? TemperatureC { get; set; }
            public int? PulseBpm { get; set; }
            public int? Spo2Percent { get; set; }
            public double? HeightCm { get; set; }
            public double? Bmi { get; set; }
            public string? LabTestRequests { get; set; }
        }

        public async Task<Result<DoctorDashboardResponse>> GetDoctorDashboardAsync()
        {
            var todayUtc = DateTime.UtcNow.Date;
            var tomorrowUtc = todayUtc.AddDays(1);
            var thirtyDaysFromNow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));
            var todayDateOnly = DateOnly.FromDateTime(DateTime.UtcNow);

            var todayAppointments = await GetTodayAppointmentsAsync(todayUtc, tomorrowUtc);
            var upcomingList = GetUpcomingPatients(todayAppointments);
            var (lowStockMeds, expiringBatches) = await GetInventoryAlertsAsync(todayDateOnly, thirtyDaysFromNow);
            var dailyRevenue = await GetDailyRevenueAsync(todayUtc, tomorrowUtc);

            var totalRevenueDouble = await _context.TblPayments
                .Where(p => p.PaymentStatus == "paid")
                .Select(p => (double)p.Amount)
                .SumAsync();

            var totalRevenue = (decimal)totalRevenueDouble;

            var todayPatientsCount = todayAppointments
                .Select(a => a.PatientId)
                .Distinct()
                .Count();

            var totalMedicinesCount = await _context.TblMedicines
                .CountAsync(m => m.DeleteFlag != true);

            var stockRiskStatus = lowStockMeds.Count > 0 ? "At Risk" : "Safe";

            return Result<DoctorDashboardResponse>.Success(new DoctorDashboardResponse
            {
                TodayAppointmentsCount = todayAppointments.Count,
                NextPatients = upcomingList,
                LowStockAlertsCount = lowStockMeds.Count,
                ExpiringBatchesCount = expiringBatches.Count,
                DailyRevenue = dailyRevenue,
                TotalRevenue = totalRevenue,
                TodayPatientsCount = todayPatientsCount,
                TotalMedicinesCount = totalMedicinesCount,
                StockRiskStatus = stockRiskStatus,
                LowStockAlerts = lowStockMeds,
                ExpiringBatchesAlerts = expiringBatches
            });
        }

        public async Task<Result<PatientDashboardResponse>> GetPatientDashboardAsync(int userId)
        {
            var patients = await GetPatientProfilesAsync(userId);
            var patientIds = patients.Select(p => p.PatientId).ToList();

            var upcomingResponseList = await GetUpcomingAppointmentsAsync(patientIds);
            var prescriptionResponseList = await GetPrescriptionHistoryAsync(patientIds);
            var outstandingPayments = await GetOutstandingBalancesAsync(patientIds);

            return Result<PatientDashboardResponse>.Success(new PatientDashboardResponse
            {
                PatientProfiles = patients.Select(MapPatientToResponse).ToList(),
                UpcomingAppointments = upcomingResponseList,
                PrescriptionHistory = prescriptionResponseList,
                OutstandingBalances = outstandingPayments
            });
        }

        // --- Private Helper Methods for Doctor Dashboard ---

        private async Task<List<TblAppointment>> GetTodayAppointmentsAsync(DateTime start, DateTime end)
        {
            return await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= start && a.Datetime < end)
                .OrderBy(a => a.Id)
                .ToListAsync();
        }

        private List<UpcomingPatientDto> GetUpcomingPatients(List<TblAppointment> todayAppointments)
        {
            return todayAppointments
                .Where(a => a.Status == "confirmed" || a.Status == "pending")
                .Take(3)
                .Select((a, idx) => new UpcomingPatientDto
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

        private async Task<(List<string> LowStock, List<string> Expiring)> GetInventoryAlertsAsync(DateOnly today, DateOnly thirtyDaysFromNow)
        {
            var activeBatches = await _context.TblMedicineBatches
                .Include(b => b.Med)
                .Where(b => b.Status == "active" && b.ExpiryDate > today && b.DeleteFlag != true)
                .ToListAsync();

            var lowStockMeds = activeBatches
                .GroupBy(b => b.MedId)
                .Where(g => g.Sum(b => b.Quantity) < LowStockThreshold)
                .Select(g => $"{g.First().Med?.Name ?? "Unknown"} (Stock: {g.Sum(b => b.Quantity)})")
                .ToList();

            var expiringBatches = activeBatches
                .Where(b => b.ExpiryDate <= thirtyDaysFromNow && b.ExpiryDate > today)
                .Select(b => $"{b.Med?.Name ?? "Unknown"} Batch {b.BatchNo} (Expires: {b.ExpiryDate:yyyy-MM-dd})")
                .ToList();

            return (lowStockMeds, expiringBatches);
        }

        private async Task<decimal> GetDailyRevenueAsync(DateTime start, DateTime end)
        {
            var amounts = await _context.TblPayments
                .Where(p => p.PaymentStatus == "paid" && p.PaidAt.HasValue && p.PaidAt.Value >= start && p.PaidAt.Value < end)
                .Select(p => p.Amount)
                .ToListAsync();
            return amounts.Sum();
        }

        // --- Private Helper Methods for Patient Dashboard ---

        private async Task<List<TblPatient>> GetPatientProfilesAsync(int userId)
        {
            return await _context.TblPatients
                .Where(p => p.UserId == userId && p.DeleteFlag != true)
                .ToListAsync();
        }

        private async Task<List<AppointmentDetailsResponse>> GetUpcomingAppointmentsAsync(List<int> patientIds)
        {
            var upcomingAppts = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => patientIds.Contains(a.PatientId) && a.Datetime >= DateTime.UtcNow && (a.Status == "pending" || a.Status == "confirmed"))
                .OrderBy(a => a.Datetime)
                .ToListAsync();

            var upcomingResponseList = new List<AppointmentDetailsResponse>();
            foreach (var a in upcomingAppts)
            {
                var today = a.Datetime.Date;
                var tomorrow = today.AddDays(1);
                
                var todayList = await _context.TblAppointments
                    .Where(x => x.Datetime >= today && x.Datetime < tomorrow && x.Status != "cancelled")
                    .OrderBy(x => x.Id)
                    .Select(x => x.Id)
                    .ToListAsync();
                
                var token = todayList.IndexOf(a.Id) + 1;

                upcomingResponseList.Add(new AppointmentDetailsResponse
                {
                    Id = a.Id,
                    AppointmentCode = a.AppointmentCode,
                    PatientId = a.PatientId,
                    PatientName = a.Patient?.Name ?? "Unknown",
                    Datetime = a.Datetime,
                    Status = a.Status,
                    Notes = a.Notes,
                    TokenNumber = token,
                    ClinicDoctorName = "Clinic Doctor",
                    CreatedAt = a.CreatedAt ?? DateTime.UtcNow
                });
            }

            return upcomingResponseList;
        }

        private async Task<List<PrescriptionResponse>> GetPrescriptionHistoryAsync(List<int> patientIds)
        {
            var prescriptions = await _context.TblPrescriptions
                .Include(p => p.Patient)
                .Include(p => p.Appointment)
                .Include(p => p.Disease)
                .Include(p => p.TblPrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .Include(p => p.TblPrescriptionItems)
                    .ThenInclude(i => i.MedicineBatch)
                .Where(p => patientIds.Contains(p.PatientId) && p.DeleteFlag != true)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return prescriptions.Select(MapPrescriptionToResponse).ToList();
        }

        private async Task<List<UnpaidInvoiceDto>> GetOutstandingBalancesAsync(List<int> patientIds)
        {
            var appointmentIds = await _context.TblAppointments
                .Where(a => patientIds.Contains(a.PatientId))
                .Select(a => a.Id)
                .ToListAsync();

            return await _context.TblPayments
                .Where(p => appointmentIds.Contains(p.AppointmentId) && p.PaymentStatus != "paid")
                .Select(p => new UnpaidInvoiceDto
                {
                    Id = p.Id,
                    AppointmentId = p.AppointmentId,
                    AppointmentCode = p.Appointment != null ? p.Appointment.AppointmentCode : "Unknown",
                    Amount = p.Amount,
                    Tax = p.Tax,
                    Charges = p.Charges,
                    PaymentStatus = p.PaymentStatus,
                    PaymentMethod = p.PaymentMethod
                })
                .ToListAsync();
        }

        // --- Mappers & Parsers ---

        private PatientProfileResponse MapPatientToResponse(TblPatient p)
        {
            var addressMeta = ParsePatientAddress(p.Address);
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
                ActualAddress = addressMeta.ActualAddress,
                Allergies = addressMeta.Allergies,
                ChronicConditions = addressMeta.ChronicConditions,
                PastSurgeries = addressMeta.PastSurgeries,
                FamilyHistory = addressMeta.FamilyHistory,
                VaccinationHistory = addressMeta.VaccinationHistory,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow
            };
        }

        private PrescriptionResponse MapPrescriptionToResponse(TblPrescription p)
        {
            var notesMeta = ParsePrescriptionNotes(p.Notes);

            var itemsList = p.TblPrescriptionItems.Select(item => new PrescriptionItemResponseDto
            {
                Id = item.Id,
                MedicineName = item.Medicine.Name,
                Dosage = item.Dosage,
                Days = item.Days,
                Quantity = item.Quantity,
                Instruction = item.Instruction
            }).ToList();

            return new PrescriptionResponse
            {
                Id = p.Id,
                AppointmentId = p.AppointmentId,
                AppointmentCode = p.Appointment != null ? p.Appointment.AppointmentCode : "Unknown",
                PatientId = p.PatientId,
                PatientName = p.Patient != null ? p.Patient.Name : "Unknown",
                DiseaseId = p.DiseaseId,
                DiseaseName = p.Disease?.Name,
                WeightKg = p.WeightKg,
                BloodPressureSystolic = p.BloodPressureSystolic,
                BloodPressureDiastolic = p.BloodPressureDiastolic,
                Notes = notesMeta.ActualNotes,
                TemperatureC = notesMeta.TemperatureC,
                PulseBpm = notesMeta.PulseBpm,
                Spo2Percent = notesMeta.Spo2Percent,
                HeightCm = notesMeta.HeightCm,
                Bmi = notesMeta.Bmi,
                LabTestRequests = notesMeta.LabTestRequests,
                Items = itemsList,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow
            };
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
