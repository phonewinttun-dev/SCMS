using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.DTOs;
using SCMS.Shared;

using SCMS.Domain.Features.Appointments;
using SCMS.Domain.Features.Prescriptions;

namespace SCMS.Domain.Features.Patients
{
    public class PatientService : IPatientService
    {
        private readonly AppDbContext _context;
        private readonly IAppointmentService _appointmentService;
        private readonly IPrescriptionService _prescriptionService;

        public PatientService(AppDbContext context, IAppointmentService appointmentService, IPrescriptionService prescriptionService)
        {
            _context = context;
            _appointmentService = appointmentService;
            _prescriptionService = prescriptionService;
        }

        // Metadata structures removed as they are now mapped directly as columns

        public async Task<Result<PatientProfileResponse>> AddPatientProfileAsync(
            PatientProfileRequest request,
            int userId,
            bool isStaff = false)
        {
            if (userId <= 0)
            {
                return Result<PatientProfileResponse>.Failure("User id is required.");
            }
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Result<PatientProfileResponse>.Failure("Patient name is required.");
            }

            var ownerUserId = userId;
            if (isStaff)
            {
                var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
                var mobile = string.IsNullOrWhiteSpace(request.MobileNo) ? null : request.MobileNo.Trim();

                if (email == null && mobile == null)
                {
                    return Result<PatientProfileResponse>.Failure("Patient account email or mobile number is required.");
                }

                var owner = await _context.TblUsers
                    .FirstOrDefaultAsync(u => u.DeleteFlag != true && ((u.Email != null && u.Email.ToLower() == email) || (u.MobileNo != null && u.MobileNo == mobile)));

                if (owner == null)
                {
                    return Result<PatientProfileResponse>.Failure("Patient user account not found for the provided email or mobile number.");
                }

                ownerUserId = owner.UserId;
            }

            var patient = new TblPatient
            {
                UserId = ownerUserId,
                Name = request.Name.Trim(),
                MobileNo = request.MobileNo?.Trim(),
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant(),
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                BloodType = request.BloodType,
                ActualAddress = request.ActualAddress,
                Allergies = request.Allergies,
                ChronicConditions = request.ChronicConditions,
                PastSurgeries = request.PastSurgeries,
                FamilyHistory = request.FamilyHistory,
                VaccinationHistory = request.VaccinationHistory,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblPatients.Add(patient);
            await _context.SaveChangesAsync();

            return Result<PatientProfileResponse>.Success(MapToResponse(patient), "Patient profile created successfully.");
        }

        public async Task<PagedResult<PatientProfileResponse>> GetPatientProfilesAsync(int userId, PaginationRequest paginationRequest, bool isStaff = false, string? search = null)
        {
            var query = _context.TblPatients
                .Where(p => p.DeleteFlag != true);

            if (!isStaff)
            {
                query = query.Where(p => p.UserId == userId);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim().ToLower();
                query = query.Where(p => 
                    p.Name.ToLower().Contains(cleanSearch) || 
                    (p.MobileNo != null && p.MobileNo.Contains(cleanSearch)) || 
                    (p.Email != null && p.Email.ToLower().Contains(cleanSearch))
                );
            }

            var totalCount = await query.CountAsync();
            var patients = await query
                .OrderBy(p => p.Name)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = patients.Select(MapToResponse).ToList();
            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);

            return PagedResult<PatientProfileResponse>.Success(list, pagination);
        }

        public async Task<Result> DeletePatientProfileAsync(int id, int userId)
        {
            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == id && p.DeleteFlag != true);

            if (patient == null)
            {
                return Result.Failure("Patient profile not found.");
            }
            if (!await CanAccessPatientAsync(id, userId))
            {
                return Result.Failure("Access denied.");
            }

            patient.DeleteFlag = true;
            patient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Result.Success("Patient profile deleted successfully.");
        }

        public async Task<Result<PatientProfileResponse>> GetPatientProfileByIdAsync(int id, int userId)
        {
            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == id && p.DeleteFlag != true);

            if (patient == null)
            {
                return Result<PatientProfileResponse>.Failure("Patient profile not found.");
            }
            if (!await CanAccessPatientAsync(patient.PatientId, userId))
            {
                return Result<PatientProfileResponse>.Failure("Patient profile not found.");
            }

            return Result<PatientProfileResponse>.Success(MapToResponse(patient));
        }

        public async Task<Result<PatientHistoryResponse>> GetPatientHistoryAsync(int patientId, int userId)
        {
            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == patientId && p.DeleteFlag != true);
            if (patient == null)
            {
                return Result<PatientHistoryResponse>.Failure("Patient not found.");
            }
            if (!await CanAccessPatientAsync(patientId, userId))
            {
                return Result<PatientHistoryResponse>.Failure("Patient not found.");
            }

            var response = new PatientHistoryResponse
            {
                PatientId = patientId,
                PatientName = patient.Name
            };

            // 1. Fetch Appointments
            var appointmentsResult = await _appointmentService.GetAllAppointmentsForPatientAsync(patientId);
            if (appointmentsResult.IsSuccess && appointmentsResult.Data != null)
            {
                foreach (var a in appointmentsResult.Data)
                {
                    response.Timeline.Add(new TimelineItemDto
                    {
                        Date = a.Datetime,
                        Type = "Appointment",
                        Title = $"Visit scheduled ({a.Status})",
                        Description = $"Reason/Notes: {a.Notes ?? "No notes"}",
                        LinkedId = a.Id
                    });
                }
            }

            // 2. Fetch Prescriptions & Vitals
            var prescriptionsResult = await _prescriptionService.GetAllPrescriptionsForPatientAsync(patientId);
            if (prescriptionsResult.IsSuccess && prescriptionsResult.Data != null)
            {
                foreach (var p in prescriptionsResult.Data)
                {
                    var diseaseName = p.DiseaseName ?? "General Consultation";
                    var medsList = string.Join(", ", p.Items.Select(i => $"{i.MedicineName} ({i.Dosage} x {i.Days}d)"));

                    response.Timeline.Add(new TimelineItemDto
                    {
                        Date = p.CreatedAt,
                        Type = "Prescription",
                        Title = $"Prescribed for {diseaseName}",
                        Description = $"Medicines: {medsList}",
                        LinkedId = p.Id
                    });

                    response.Timeline.Add(new TimelineItemDto
                    {
                        Date = p.CreatedAt,
                        Type = "Diagnosis",
                        Title = $"Diagnosed with {diseaseName}",
                        Description = p.Notes != null && p.Notes.StartsWith("{") ? "Diagnosis recorded during consultation." : (p.Notes ?? "No diagnosis details"),
                        LinkedId = p.Id
                    });

                    // Parse Vitals & Lab requests
                    if (!string.IsNullOrEmpty(p.LabTestRequests))
                    {
                        response.Timeline.Add(new TimelineItemDto
                        {
                            Date = p.CreatedAt,
                            Type = "Lab Request",
                            Title = "Lab test requested",
                            Description = $"Tests: {p.LabTestRequests}",
                            LinkedId = p.Id
                        });
                    }
                }
            }

            // Sort timeline chronologically (latest first)
            response.Timeline = response.Timeline.OrderByDescending(t => t.Date).ToList();

            return Result<PatientHistoryResponse>.Success(response);
        }

        public async Task<Result<MedicalSummaryResponse>> GetMedicalSummaryAsync(int patientId, int userId)
        {
            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == patientId && p.DeleteFlag != true);

            if (patient == null)
            {
                return Result<MedicalSummaryResponse>.Failure("Patient not found.");
            }
            if (!await CanAccessPatientAsync(patientId, userId))
            {
                return Result<MedicalSummaryResponse>.Failure("Patient not found.");
            }

            var summary = new MedicalSummaryResponse
            {
                PatientId = patientId,
                PatientName = patient.Name,
                DateOfBirth = patient.DateOfBirth,
                Gender = patient.Gender,
                BloodType = patient.BloodType,
                Allergies = patient.Allergies,
                ChronicConditions = patient.ChronicConditions,
                PastSurgeries = patient.PastSurgeries,
                FamilyHistory = patient.FamilyHistory,
                VaccinationHistory = patient.VaccinationHistory
            };

            // Fetch prescriptions to aggregate Vitals history and Active prescriptions
            var prescriptionsResult = await _prescriptionService.GetAllPrescriptionsForPatientAsync(patientId);
            if (prescriptionsResult.IsSuccess && prescriptionsResult.Data != null)
            {
                foreach (var p in prescriptionsResult.Data)
                {
                    // Add to vitals history
                    summary.VitalsHistory.Add(new PatientVitalsHistoryDto
                    {
                        Date = p.CreatedAt,
                        WeightKg = p.WeightKg,
                        BloodPressureSystolic = p.BloodPressureSystolic,
                        BloodPressureDiastolic = p.BloodPressureDiastolic,
                        TemperatureC = p.TemperatureC,
                        PulseBpm = p.PulseBpm,
                        Spo2Percent = p.Spo2Percent,
                        HeightCm = p.HeightCm,
                        Bmi = p.Bmi
                    });

                    // Add to active prescriptions if prescribed within past 30 days (as a heuristic)
                    if (p.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                    {
                        summary.ActivePrescriptions.Add(new ActivePrescriptionSummaryDto
                        {
                            PrescriptionId = p.Id,
                            Date = p.CreatedAt,
                            DiseaseName = p.DiseaseName ?? "General Consultation",
                            Medicines = p.Items.Select(i => i.MedicineName).ToList()
                        });
                    }
                }
            }

            // Vitals trends should be newest first
            summary.VitalsHistory = summary.VitalsHistory.OrderByDescending(v => v.Date).ToList();

            return Result<MedicalSummaryResponse>.Success(summary);
        }

        public async Task<string> GenerateMedicalSummaryHtmlAsync(int patientId, int userId)
        {
            var summaryResult = await GetMedicalSummaryAsync(patientId, userId);
            if (!summaryResult.IsSuccess || summaryResult.Data == null)
            {
                return "<h1>Patient Summary Not Found</h1>";
            }

            var s = summaryResult.Data;
            var dobStr = s.DateOfBirth.HasValue ? s.DateOfBirth.Value.ToString("dd-MM-yyyy") : "N/A";
            
            // Build vitals history rows
            var vitalsRows = "";
            foreach (var v in s.VitalsHistory)
            {
                vitalsRows += $@"
                <tr>
                    <td>{v.Date:dd-MM-yyyy HH:mm}</td>
                    <td>{v.WeightKg?.ToString() ?? "-"} kg</td>
                    <td>{(v.BloodPressureSystolic.HasValue && v.BloodPressureDiastolic.HasValue ? $"{v.BloodPressureSystolic}/{v.BloodPressureDiastolic}" : "-")}</td>
                    <td>{v.TemperatureC?.ToString() ?? "-"} C</td>
                    <td>{v.PulseBpm?.ToString() ?? "-"} bpm</td>
                    <td>{v.Spo2Percent?.ToString() ?? "-"}%</td>
                    <td>{v.HeightCm?.ToString() ?? "-"} cm</td>
                    <td>{v.Bmi?.ToString() ?? "-"}</td>
                </tr>";
            }

            // Build active prescriptions rows
            var rxRows = "";
            foreach (var rx in s.ActivePrescriptions)
            {
                rxRows += $@"
                <div class='rx-card'>
                    <div class='rx-header'>
                        <strong>{rx.DiseaseName}</strong> <span style='float:right; font-size: 12px; color: #666;'>{rx.Date:dd-MM-yyyy}</span>
                    </div>
                    <div class='rx-body'>
                        Medicines: {string.Join(", ", rx.Medicines)}
                    </div>
                </div>";
            }

            // Return a wowed CSS HTML structure
            return $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8' />
                <title>Medical Summary - {s.PatientName}</title>
                <style>
                    body {{
                        font-family: 'Outfit', 'Inter', sans-serif;
                        color: #1a1a24;
                        margin: 40px;
                        background: #ffffff;
                    }}
                    .container {{
                        max-width: 900px;
                        margin: 0 auto;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 30px;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                    }}
                    .header {{
                        border-bottom: 2px solid #3b82f6;
                        padding-bottom: 20px;
                        margin-bottom: 25px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-size: 26px;
                        color: #1e3a8a;
                    }}
                    .clinic-title {{
                        font-size: 14px;
                        color: #64748b;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }}
                    .grid {{
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 30px;
                    }}
                    .info-card {{
                        background: #f8fafc;
                        border-radius: 8px;
                        padding: 15px;
                        border: 1px solid #f1f5f9;
                    }}
                    .info-card h3 {{
                        margin-top: 0;
                        margin-bottom: 10px;
                        font-size: 16px;
                        color: #2563eb;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 5px;
                    }}
                    .info-row {{
                        margin-bottom: 8px;
                        font-size: 14px;
                    }}
                    .info-row strong {{
                        color: #475569;
                        width: 130px;
                        display: inline-block;
                    }}
                    table {{
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                        font-size: 13px;
                    }}
                    th, td {{
                        border: 1px solid #e2e8f0;
                        padding: 10px;
                        text-align: left;
                    }}
                    th {{
                        background-color: #3b82f6;
                        color: white;
                        font-weight: 600;
                    }}
                    tr:nth-child(even) {{
                        background-color: #f8fafc;
                    }}
                    .rx-card {{
                        border: 1px solid #e2e8f0;
                        border-left: 4px solid #10b981;
                        border-radius: 6px;
                        padding: 12px;
                        margin-bottom: 12px;
                        background: #f0fdf4;
                    }}
                    .rx-header {{
                        margin-bottom: 6px;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 40px;
                        font-size: 11px;
                        color: #94a3b8;
                        border-top: 1px solid #e2e8f0;
                        padding-top: 15px;
                    }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <div>
                            <span class='clinic-title'>Smart Clinic Management System</span>
                            <h1>Patient Medical Summary</h1>
                        </div>
                        <div style='text-align: right;'>
                            <strong style='color:#3b82f6; font-size: 18px;'>EMR Report</strong><br/>
                            <span style='font-size: 12px; color:#64748b;'>Generated: {DateTime.UtcNow:dd-MM-yyyy HH:mm} UTC</span>
                        </div>
                    </div>

                    <div class='grid'>
                        <div class='info-card'>
                            <h3>Personal Information</h3>
                            <div class='info-row'><strong>Full Name:</strong> {s.PatientName}</div>
                            <div class='info-row'><strong>Date of Birth:</strong> {dobStr}</div>
                            <div class='info-row'><strong>Gender:</strong> {s.Gender ?? "N/A"}</div>
                            <div class='info-row'><strong>Blood Type:</strong> {s.BloodType ?? "N/A"}</div>
                        </div>
                        
                        <div class='info-card'>
                            <h3>Clinical Notes</h3>
                            <div class='info-row'><strong>Allergies:</strong> <span style='color:#ef4444; font-weight:600;'>{s.Allergies ?? "None Known"}</span></div>
                            <div class='info-row'><strong>Chronic Conditions:</strong> {s.ChronicConditions ?? "None"}</div>
                            <div class='info-row'><strong>Past Surgeries:</strong> {s.PastSurgeries ?? "None"}</div>
                            <div class='info-row'><strong>Family History:</strong> {s.FamilyHistory ?? "None"}</div>
                            <div class='info-row'><strong>Vaccinations:</strong> {s.VaccinationHistory ?? "None"}</div>
                        </div>
                    </div>

                    <h2 style='color:#1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; font-size: 18px;'>Vital Signs Trends</h2>
                    {(s.VitalsHistory.Count > 0 ? $@"
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Weight</th>
                                <th>BP (Sys/Dia)</th>
                                <th>Temp</th>
                                <th>Pulse</th>
                                <th>SpO2</th>
                                <th>Height</th>
                                <th>BMI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vitalsRows}
                        </tbody>
                    </table>" : "<p style='font-size:14px; color:#64748b;'>No vitals recorded yet.</p>")}

                    <h2 style='color:#1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; font-size: 18px; margin-top: 30px;'>Active Prescriptions (Past 30 Days)</h2>
                    <div style='margin-top:15px;'>
                        {(s.ActivePrescriptions.Count > 0 ? rxRows : "<p style='font-size:14px; color:#64748b;'>No active prescriptions.</p>")}
                    </div>

                    <div class='footer'>
                        This document is a confidential electronic medical record (EMR). Access is restricted to authorized personnel only.
                    </div>
                </div>
            </body>
            </html>";
        }

        private PatientProfileResponse MapToResponse(TblPatient p)
        {
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
                ActualAddress = p.ActualAddress,
                Allergies = p.Allergies,
                ChronicConditions = p.ChronicConditions,
                PastSurgeries = p.PastSurgeries,
                FamilyHistory = p.FamilyHistory,
                VaccinationHistory = p.VaccinationHistory,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow
            };
        }

        // JSON parsing methods removed

        private async Task<bool> CanAccessPatientAsync(int patientId, int userId)
        {
            if (userId <= 0) return false;

            var ownsPatient = await _context.TblPatients
                .AnyAsync(p => p.PatientId == patientId && p.UserId == userId && p.DeleteFlag != true);
            if (ownsPatient) return true;

            return await _context.TblUserRoles
                .AnyAsync(r => r.UserId == userId
                    && (r.Role.ToLower() == "owner"
                        || r.Role.ToLower() == "admin"
                        || r.Role.ToLower() == "doctor"));
        }
    }
}
