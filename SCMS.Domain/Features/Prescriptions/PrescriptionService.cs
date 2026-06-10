using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.DTOs.Prescriptions;
using SCMS.Shared;
using SCMS.Domain.Features.Notifications;

namespace SCMS.Domain.Features.Prescriptions
{
    public class PrescriptionService
    {
        private readonly AppDbContext _context;
        private readonly NotificationService? _notificationService;
        private const int LowStockThreshold = 20;

        public PrescriptionService(AppDbContext context, NotificationService? notificationService = null)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // Helper structure for serialization in Notes
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

        // Helper structure for Patient medical data serialized in Address
        public class PatientAddressMetadata
        {
            public string? ActualAddress { get; set; }
            public string? Allergies { get; set; }
            public string? ChronicConditions { get; set; }
            public string? PastSurgeries { get; set; }
            public string? FamilyHistory { get; set; }
            public string? VaccinationHistory { get; set; }
        }

        public async Task<Result<PrescriptionResponse>> CreatePrescriptionAsync(CreatePrescriptionRequest request)
        {
            if (request.PatientId <= 0)
            {
                return Result<PrescriptionResponse>.Failure("Patient id is required.");
            }
            if (request.AppointmentId <= 0)
            {
                return Result<PrescriptionResponse>.Failure("Appointment id is required.");
            }
            if (request.Items == null)
            {
                request.Items = new List<PrescriptionItemDto>();
            }
            foreach (var item in request.Items)
            {
                if (item.MedicineId <= 0)
                {
                    return Result<PrescriptionResponse>.Failure("Medicine id is required for every prescription item.");
                }
                if (item.Quantity <= 0)
                {
                    return Result<PrescriptionResponse>.Failure("Prescription item quantity must be greater than zero.");
                }
                if (item.Days <= 0)
                {
                    return Result<PrescriptionResponse>.Failure("Prescription item days must be greater than zero.");
                }
                if (item.DoseQuantity <= 0)
                {
                    return Result<PrescriptionResponse>.Failure("Dose quantity must be greater than zero.");
                }
            }

            // Verify patient exists
            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == request.PatientId && p.DeleteFlag != true);
            if (patient == null)
            {
                return Result<PrescriptionResponse>.Failure("Patient not found.");
            }

            // Verify appointment exists
            var appointment = await _context.TblAppointments
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);
            if (appointment == null)
            {
                return Result<PrescriptionResponse>.Failure("Appointment not found.");
            }
            if (appointment.PatientId != request.PatientId)
            {
                return Result<PrescriptionResponse>.Failure("Appointment does not belong to the selected patient.");
            }

            if (request.DiseaseId.HasValue)
            {
                var diseaseExists = await _context.TblDiseases
                    .AnyAsync(d => d.Id == request.DiseaseId.Value && d.DeleteFlag != true);
                if (!diseaseExists)
                {
                    return Result<PrescriptionResponse>.Failure("Disease not found.");
                }
            }

            var warnings = new List<string>();

            // 1. Check Allergies
            var patientMedicalInfo = ParsePatientAddress(patient.Address);
            if (!string.IsNullOrEmpty(patientMedicalInfo.Allergies))
            {
                var allergyList = patientMedicalInfo.Allergies.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(a => a.Trim().ToLower())
                    .ToList();

                foreach (var item in request.Items)
                {
                    var med = await _context.TblMedicines
                        .FirstOrDefaultAsync(m => m.MedicineId == item.MedicineId && m.DeleteFlag != true);
                    if (med != null)
                    {
                        var medNameLower = med.Name.ToLower();
                        foreach (var allergy in allergyList)
                        {
                            if (medNameLower.Contains(allergy))
                            {
                                warnings.Add($"[ALLERGY WARNING] Patient is allergic to '{allergy}', but you prescribed '{med.Name}'.");
                            }
                        }
                    }
                }
            }

            // 2. Check Drug Interactions (Basic Demo logic: e.g., Aspirin + Warfarin, or ibuprofen + aspirin)
            var prescribedMeds = new List<TblMedicine>();
            foreach (var item in request.Items)
            {
                var med = await _context.TblMedicines
                    .FirstOrDefaultAsync(m => m.MedicineId == item.MedicineId && m.DeleteFlag != true);
                if (med != null) prescribedMeds.Add(med);
            }

            for (int i = 0; i < prescribedMeds.Count; i++)
            {
                for (int j = i + 1; j < prescribedMeds.Count; j++)
                {
                    var m1 = prescribedMeds[i].Name.ToLower();
                    var m2 = prescribedMeds[j].Name.ToLower();

                    if ((m1.Contains("aspirin") && m2.Contains("warfarin")) || (m2.Contains("aspirin") && m1.Contains("warfarin")))
                    {
                        warnings.Add($"[DRUG INTERACTION] Aspirin and Warfarin interact (increased risk of bleeding).");
                    }
                    if ((m1.Contains("ibuprofen") && m2.Contains("aspirin")) || (m2.Contains("ibuprofen") && m1.Contains("aspirin")))
                    {
                        warnings.Add($"[DRUG INTERACTION] Ibuprofen may decrease the cardioprotective effect of Aspirin.");
                    }
                }
            }

            // 3. Smart Inventory Deduction (FIFO) & Expiry Warnings
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var prescriptionItemsToCreate = new List<TblPrescriptionItem>();
            var schedulesToCreate = new List<TblPrescriptionItemSchedule>();
            var lowStockAlertsToSend = new List<(int MedicineId, string MedName, int TotalAvailable)>();

            foreach (var item in request.Items)
            {
                var med = prescribedMeds.FirstOrDefault(m => m.MedicineId == item.MedicineId);
                if (med == null)
                {
                    return Result<PrescriptionResponse>.Failure($"Medicine ID {item.MedicineId} not found.");
                }

                // Get active non-expired batches ordered by expiry date (FIFO)
                var batches = await _context.TblMedicineBatches
                    .Where(b => b.MedId == item.MedicineId && b.Status == "active" && b.ExpiryDate > today && b.Quantity > 0 && b.DeleteFlag != true)
                    .OrderBy(b => b.ExpiryDate)
                    .ToListAsync();

                var totalAvailable = batches.Sum(b => b.Quantity);
                if (totalAvailable < item.Quantity)
                {
                    return Result<PrescriptionResponse>.Failure($"Insufficient stock for {med.Name}. Requested: {item.Quantity}, Available: {totalAvailable}.");
                }

                // Warn if total stock is low
                if (totalAvailable < LowStockThreshold)
                {
                    warnings.Add($"[LOW STOCK WARNING] '{med.Name}' is low in stock ({totalAvailable} left).");
                    lowStockAlertsToSend.Add((med.MedicineId, med.Name, totalAvailable));
                }

                // Deduct stock FIFO
                var remainingToDeduct = item.Quantity;
                foreach (var batch in batches)
                {
                    if (remainingToDeduct <= 0) break;

                    // Warn if batch is nearing expiry (within 30 days)
                    if (batch.ExpiryDate <= today.AddDays(30))
                    {
                        warnings.Add($"[EXPIRY WARNING] Batch '{batch.BatchNo}' of '{med.Name}' is nearing expiry ({batch.ExpiryDate:yyyy-MM-dd}).");
                    }

                    var pItem = new TblPrescriptionItem
                    {
                        MedicineId = item.MedicineId,
                        MedicineBatchId = batch.Id,
                        Dosage = item.Dosage,
                        Days = item.Days,
                        Quantity = Math.Min(batch.Quantity, remainingToDeduct),
                        Instruction = item.Instruction,
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    };

                    if (batch.Quantity >= remainingToDeduct)
                    {
                        batch.Quantity -= remainingToDeduct;
                        remainingToDeduct = 0;
                    }
                    else
                    {
                        remainingToDeduct -= batch.Quantity;
                        batch.Quantity = 0;
                    }

                    batch.UpdatedAt = DateTime.UtcNow;
                    prescriptionItemsToCreate.Add(pItem);

                    // Add schedule
                    var schedule = new TblPrescriptionItemSchedule
                    {
                        StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                        EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(item.Days)),
                        DoseTime = item.DoseTime,
                        DoseQuantity = item.DoseQuantity,
                        DoseUnit = item.DoseUnit,
                        MealTiming = item.MealTiming,
                        Route = item.Route,
                        IntervalHours = item.IntervalHours,
                        IntervalDays = item.IntervalDays,
                        DayOfWeek = item.DayOfWeek,
                        IsAsNeeded = item.IsAsNeeded,
                        BodySite = item.BodySite,
                        Note = item.ScheduleNote,
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    };
                    schedulesToCreate.Add(schedule);
                }
            }

            // 4. Calculate BMI & Serialize extra vitals into Notes
            double? bmi = null;
            if (request.WeightKg.HasValue && request.HeightCm.HasValue && request.HeightCm.Value > 0)
            {
                var heightMeters = request.HeightCm.Value / 100.0;
                bmi = Math.Round(request.WeightKg.Value / (heightMeters * heightMeters), 2);
            }

            var notesMeta = new PrescriptionNotesMetadata
            {
                ActualNotes = request.Notes,
                TemperatureC = request.TemperatureC,
                PulseBpm = request.PulseBpm,
                Spo2Percent = request.Spo2Percent,
                HeightCm = request.HeightCm,
                Bmi = bmi,
                LabTestRequests = request.LabTestRequests
            };
            var serializedNotes = JsonSerializer.Serialize(notesMeta);

            // Save prescription
            var prescription = new TblPrescription
            {
                AppointmentId = request.AppointmentId,
                PatientId = request.PatientId,
                DiseaseId = request.DiseaseId,
                WeightKg = request.WeightKg,
                BloodPressureSystolic = request.BloodPressureSystolic,
                BloodPressureDiastolic = request.BloodPressureDiastolic,
                Notes = serializedNotes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            try
            {
                _context.TblPrescriptions.Add(prescription);
                await _context.SaveChangesAsync(); // Generates prescription.Id

                // Link prescription items & schedules
                int scheduleIndex = 0;
                foreach (var pItem in prescriptionItemsToCreate)
                {
                    pItem.PrescriptionId = prescription.Id;
                    _context.TblPrescriptionItems.Add(pItem);
                    await _context.SaveChangesAsync(); // Generates pItem.Id

                    var schedule = schedulesToCreate[scheduleIndex++];
                    schedule.PrescriptionItemId = pItem.Id;
                    _context.TblPrescriptionItemSchedules.Add(schedule);
                }

                // Set appointment status to Completed
                appointment.Status = "completed";
                appointment.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Broadcast low stock alerts after successful commit
                foreach (var alert in lowStockAlertsToSend)
                {
                    if (_notificationService != null)
                    {
                        await _notificationService.CreateNotificationAsync(
                            null,
                            "Low Stock Alert",
                            $"Medicine '{alert.MedName}' has dropped below threshold with {alert.TotalAvailable} units remaining.",
                            $"/inventory"
                        );
                    }
                    else
                    {
                        _context.TblNotifications.Add(new TblNotification
                        {
                            UserId = null,
                            Title = "Low Stock Alert",
                            Description = $"Medicine '{alert.MedName}' has dropped below threshold with {alert.TotalAvailable} units remaining.",
                            ActionRoute = $"/inventory",
                            CreatedAt = DateTime.UtcNow,
                            DeleteFlag = false
                        });
                        await _context.SaveChangesAsync();
                    }
                }
            }
            catch (DbUpdateException)
            {
                return Result<PrescriptionResponse>.Failure("Prescription could not be saved safely. Please retry.");
            }

            // Format response
            var response = await GetPrescriptionDetailsAsync(prescription.Id);
            if (response.IsSuccess && response.Data != null)
            {
                response.Data.Warnings.AddRange(warnings);
                return Result<PrescriptionResponse>.Success(response.Data, "Prescription created and stock deducted.");
            }

            return Result<PrescriptionResponse>.Failure("Prescription created but failed to load response details.");
        }

        public async Task<Result<PrescriptionResponse>> GetPrescriptionDetailsAsync(int id)
        {
            var p = await _context.TblPrescriptions
                .Include(x => x.Patient)
                .Include(x => x.Appointment)
                .Include(x => x.Disease)
                .Include(x => x.TblPrescriptionItems)
                    .ThenInclude(i => i.Medicine)
                .Include(x => x.TblPrescriptionItems)
                    .ThenInclude(i => i.MedicineBatch)
                .Include(x => x.TblPrescriptionItems)
                    .ThenInclude(i => i.TblPrescriptionItemSchedules)
                .FirstOrDefaultAsync(x => x.Id == id && x.DeleteFlag != true);

            if (p == null)
            {
                return Result<PrescriptionResponse>.Failure("Prescription not found.");
            }

            // Deserialize Notes
            var notesMeta = new PrescriptionNotesMetadata();
            try
            {
                if (!string.IsNullOrEmpty(p.Notes))
                {
                    notesMeta = JsonSerializer.Deserialize<PrescriptionNotesMetadata>(p.Notes) ?? new PrescriptionNotesMetadata();
                }
            }
            catch
            {
                notesMeta.ActualNotes = p.Notes; // Fallback
            }

            var itemResponseDtos = new List<PrescriptionItemResponseDto>();
            foreach (var item in p.TblPrescriptionItems)
            {
                var sched = item.TblPrescriptionItemSchedules.FirstOrDefault();

                itemResponseDtos.Add(new PrescriptionItemResponseDto
                {
                    Id = item.Id,
                    MedicineId = item.MedicineId,
                    MedicineName = item.Medicine.Name,
                    MedicineBatchId = item.MedicineBatchId,
                    BatchNo = item.MedicineBatch?.BatchNo,
                    Dosage = item.Dosage,
                    Days = item.Days,
                    Quantity = item.Quantity,
                    Instruction = item.Instruction,
                    DoseTime = sched?.DoseTime,
                    DoseQuantity = sched?.DoseQuantity ?? 1.0m,
                    DoseUnit = sched?.DoseUnit,
                    MealTiming = sched?.MealTiming,
                    Route = sched?.Route,
                    IntervalHours = sched?.IntervalHours,
                    IntervalDays = sched?.IntervalDays,
                    DayOfWeek = sched?.DayOfWeek,
                    IsAsNeeded = sched?.IsAsNeeded ?? false,
                    BodySite = sched?.BodySite,
                    ScheduleNote = sched?.Note
                });
            }

            return Result<PrescriptionResponse>.Success(new PrescriptionResponse
            {
                Id = p.Id,
                AppointmentId = p.AppointmentId,
                AppointmentCode = p.Appointment.AppointmentCode,
                PatientId = p.PatientId,
                PatientName = p.Patient.Name,
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
                Items = itemResponseDtos,
                CreatedAt = p.CreatedAt ?? DateTime.UtcNow
            });
        }

        public async Task<PagedResult<PrescriptionResponse>> GetPrescriptionsAsync(int? patientId, PaginationRequest paginationRequest)
        {
            var query = _context.TblPrescriptions.Where(p => p.DeleteFlag != true);

            if (patientId.HasValue)
            {
                query = query.Where(p => p.PatientId == patientId.Value);
            }

            var totalCount = await query.CountAsync();
            var ids = await query
                .OrderByDescending(p => p.Id)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .Select(p => p.Id)
                .ToListAsync();

            var list = new List<PrescriptionResponse>();
            foreach (var id in ids)
            {
                var r = await GetPrescriptionDetailsAsync(id);
                if (r.IsSuccess && r.Data != null)
                {
                    list.Add(r.Data);
                }
            }

            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<PrescriptionResponse>.Success(list, pagination);
        }

        public async Task<Result<PrescriptionTemplateResponse>> SaveTemplateAsync(SaveTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Result<PrescriptionTemplateResponse>.Failure("Template name is required.");
            }
            if (request.Items == null || request.Items.Count == 0)
            {
                return Result<PrescriptionTemplateResponse>.Failure("At least one template item is required.");
            }

            var medIdsToCheck = request.Items.Select(i => i.MedicineId).ToList();
            if (medIdsToCheck.Count != medIdsToCheck.Distinct().Count())
            {
                return Result<PrescriptionTemplateResponse>.Failure("A prescription template cannot contain duplicate medicines.");
            }

            foreach (var item in request.Items)
            {
                if (item.MedicineId <= 0)
                {
                    return Result<PrescriptionTemplateResponse>.Failure("Medicine id is required for every template item.");
                }
                if (item.Quantity <= 0)
                {
                    return Result<PrescriptionTemplateResponse>.Failure("Template item quantity must be greater than zero.");
                }
                if (item.Days <= 0)
                {
                    return Result<PrescriptionTemplateResponse>.Failure("Template item days must be greater than zero.");
                }
            }

            var disease = await _context.TblDiseases
                .FirstOrDefaultAsync(d => d.Id == request.DiseaseId && d.DeleteFlag != true);
            if (disease == null)
            {
                return Result<PrescriptionTemplateResponse>.Failure("Disease not found.");
            }

            var medicineIds = request.Items.Select(i => i.MedicineId).Distinct().ToList();
            var existingMedicineIds = await _context.TblMedicines
                .Where(m => medicineIds.Contains(m.MedicineId) && m.DeleteFlag != true)
                .Select(m => m.MedicineId)
                .ToListAsync();
            var missingMedicineId = medicineIds.FirstOrDefault(id => !existingMedicineIds.Contains(id));
            if (missingMedicineId > 0)
            {
                return Result<PrescriptionTemplateResponse>.Failure($"Medicine ID {missingMedicineId} not found.");
            }

            // Check if we are updating an existing template
            TblPrescriptionTemplate? existingTemplate = null;
            if (request.Id.HasValue && request.Id.Value > 0)
            {
                existingTemplate = await _context.TblPrescriptionTemplates
                    .Include(t => t.TblPrescriptionTemplateItems)
                    .FirstOrDefaultAsync(t => t.Id == request.Id.Value && t.DeleteFlag != true);
            }
            else
            {
                existingTemplate = await _context.TblPrescriptionTemplates
                    .Include(t => t.TblPrescriptionTemplateItems)
                    .FirstOrDefaultAsync(t => t.Name.ToLower() == request.Name.Trim().ToLower() && t.DiseaseId == request.DiseaseId && t.DeleteFlag != true);
            }

            if (existingTemplate != null)
            {
                existingTemplate.Name = request.Name.Trim();
                existingTemplate.DiseaseId = request.DiseaseId;
                existingTemplate.UpdatedAt = DateTime.UtcNow;

                // Soft delete old template items
                foreach (var oldItem in existingTemplate.TblPrescriptionTemplateItems)
                {
                    oldItem.DeleteFlag = true;
                }

                // Add new template items
                foreach (var item in request.Items)
                {
                    existingTemplate.TblPrescriptionTemplateItems.Add(new TblPrescriptionTemplateItem
                    {
                        MedicineId = item.MedicineId,
                        Dosage = item.Dosage,
                        Days = item.Days,
                        Quantity = item.Quantity,
                        Instruction = item.Instruction,
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                }

                await _context.SaveChangesAsync();
                return Result<PrescriptionTemplateResponse>.Success(await MapToTemplateResponseAsync(existingTemplate.Id), "Prescription template updated.");
            }

            var newTemplate = new TblPrescriptionTemplate
            {
                Name = request.Name.Trim(),
                DiseaseId = request.DiseaseId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            foreach (var item in request.Items)
            {
                newTemplate.TblPrescriptionTemplateItems.Add(new TblPrescriptionTemplateItem
                {
                    MedicineId = item.MedicineId,
                    Dosage = item.Dosage,
                    Days = item.Days,
                    Quantity = item.Quantity,
                    Instruction = item.Instruction,
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
            }

            _context.TblPrescriptionTemplates.Add(newTemplate);
            await _context.SaveChangesAsync();

            return Result<PrescriptionTemplateResponse>.Success(await MapToTemplateResponseAsync(newTemplate.Id), "Prescription template saved.");
        }

        public async Task<Result<bool>> DeleteTemplateAsync(int id)
        {
            var template = await _context.TblPrescriptionTemplates
                .Include(t => t.TblPrescriptionTemplateItems)
                .FirstOrDefaultAsync(t => t.Id == id && t.DeleteFlag != true);

            if (template == null)
            {
                return Result<bool>.Failure("Prescription template not found.");
            }

            template.DeleteFlag = true;
            template.UpdatedAt = DateTime.UtcNow;

            foreach (var item in template.TblPrescriptionTemplateItems)
            {
                item.DeleteFlag = true;
            }

            await _context.SaveChangesAsync();
            return Result<bool>.Success(true, "Prescription template removed successfully.");
        }

        public async Task<PagedResult<PrescriptionTemplateResponse>> GetTemplatesAsync(int? diseaseId, PaginationRequest paginationRequest)
        {
            var query = _context.TblPrescriptionTemplates
                .Include(t => t.Disease)
                .Include(t => t.TblPrescriptionTemplateItems)
                    .ThenInclude(i => i.Medicine)
                .Where(t => t.DeleteFlag != true);

            if (diseaseId.HasValue)
            {
                query = query.Where(t => t.DiseaseId == diseaseId.Value);
            }

            var totalCount = await query.CountAsync();
            var templates = await query
                .OrderBy(t => t.Name)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = templates.Select(MapToTemplateResponse).ToList();
            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<PrescriptionTemplateResponse>.Success(list, pagination);
        }

        private async Task<PrescriptionTemplateResponse> MapToTemplateResponseAsync(int id)
        {
            var template = await _context.TblPrescriptionTemplates
                .Include(t => t.Disease)
                .Include(t => t.TblPrescriptionTemplateItems)
                    .ThenInclude(i => i.Medicine)
                .FirstAsync(t => t.Id == id);

            return MapToTemplateResponse(template);
        }

        private static PrescriptionTemplateResponse MapToTemplateResponse(TblPrescriptionTemplate template)
        {
            return new PrescriptionTemplateResponse
            {
                Id = template.Id.ToString(),
                Name = template.Name,
                DiseaseId = template.DiseaseId,
                DiseaseName = template.Disease?.Name ?? "Unknown Disease",
                Items = template.TblPrescriptionTemplateItems
                    .Where(i => i.DeleteFlag != true)
                    .Select(item => new TemplateItemResponseDto
                    {
                        MedicineId = item.MedicineId,
                        MedicineName = item.Medicine?.Name ?? "Unknown Medicine",
                        Dosage = item.Dosage,
                        Days = item.Days,
                        Quantity = item.Quantity,
                        Instruction = item.Instruction
                    })
                    .ToList()
            };
        }

        private static IEnumerable<string> SplitLabRequests(string? labTestRequests)
        {
            if (string.IsNullOrWhiteSpace(labTestRequests))
            {
                return Enumerable.Empty<string>();
            }

            return labTestRequests
                .Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase);
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
            catch
            {
                // Fallback if address is plain text
            }

            return new PatientAddressMetadata { ActualAddress = address };
        }
    }
}
