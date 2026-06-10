using System.Collections.Generic;
using System;

namespace SCMS.Domain.DTOs.Prescriptions
{
    public class CreatePrescriptionRequest
        {
            public int AppointmentId { get; set; }
            public int PatientId { get; set; }
            public int? DiseaseId { get; set; }
            public double? WeightKg { get; set; }
            public int? BloodPressureSystolic { get; set; }
            public int? BloodPressureDiastolic { get; set; }
            public string? Notes { get; set; }

            // Additional Vitals (stored in serialized Notes)
            public double? TemperatureC { get; set; }
            public int? PulseBpm { get; set; }
            public int? Spo2Percent { get; set; }
            public double? HeightCm { get; set; }
            public string? LabTestRequests { get; set; }

            public List<PrescriptionItemDto> Items { get; set; } = new();
        }

    public class PrescriptionItemDto
        {
            public int MedicineId { get; set; }
            public string? Dosage { get; set; }
            public int Days { get; set; }
            public int Quantity { get; set; }
            public string? Instruction { get; set; }

            // Schedule details (maps to TblPrescriptionItemSchedule)
            public string? DoseTime { get; set; } // morning / afternoon / evening / night / bedtime / custom
            public decimal DoseQuantity { get; set; } = 1.0m;
            public string? DoseUnit { get; set; } // tablet / capsule / ml / drop / puff / injection
            public string? MealTiming { get; set; } // before_meal / after_meal / with_meal / anytime
            public string? Route { get; set; } // oral / topical / injection / eye_drop / ear_drop / inhalation
            public int? IntervalHours { get; set; }
            public int? IntervalDays { get; set; }
            public string? DayOfWeek { get; set; }
            public bool IsAsNeeded { get; set; }
            public string? BodySite { get; set; }
            public string? ScheduleNote { get; set; }
        }

    public class PrescriptionResponse
        {
            public int Id { get; set; }
            public int AppointmentId { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public int PatientId { get; set; }
            public string PatientName { get; set; } = null!;
            public int? DiseaseId { get; set; }
            public string? DiseaseName { get; set; }
            public double? WeightKg { get; set; }
            public int? BloodPressureSystolic { get; set; }
            public int? BloodPressureDiastolic { get; set; }
            public string? Notes { get; set; }

            // Vitals parsed from notes
            public double? TemperatureC { get; set; }
            public int? PulseBpm { get; set; }
            public int? Spo2Percent { get; set; }
            public double? HeightCm { get; set; }
            public double? Bmi { get; set; }
            public string? LabTestRequests { get; set; }

            public List<PrescriptionItemResponseDto> Items { get; set; } = new();
            public List<string> Warnings { get; set; } = new();
            public DateTime CreatedAt { get; set; }
        }

        public class PrescriptionItemResponseDto
        {
            public int Id { get; set; }
            public int MedicineId { get; set; }
            public string MedicineName { get; set; } = null!;
            public int? MedicineBatchId { get; set; }
            public string? BatchNo { get; set; }
            public string? Dosage { get; set; }
            public int Days { get; set; }
            public int Quantity { get; set; }
            public string? Instruction { get; set; }

            // Schedule
            public string? DoseTime { get; set; }
            public decimal DoseQuantity { get; set; }
            public string? DoseUnit { get; set; }
            public string? MealTiming { get; set; }
            public string? Route { get; set; }
            public int? IntervalHours { get; set; }
            public int? IntervalDays { get; set; }
            public string? DayOfWeek { get; set; }
            public bool IsAsNeeded { get; set; }
            public string? BodySite { get; set; }
            public string? ScheduleNote { get; set; }
        }

    public class PrescriptionTemplateResponse
        {
            public string Id { get; set; } = null!; // Guid or string identifier
            public string Name { get; set; } = null!;
            public int DiseaseId { get; set; }
            public string DiseaseName { get; set; } = null!;
            public List<TemplateItemResponseDto> Items { get; set; } = new();
        }

        public class TemplateItemResponseDto
        {
            public int MedicineId { get; set; }
            public string MedicineName { get; set; } = null!;
            public string? Dosage { get; set; }
            public int Days { get; set; }
            public int Quantity { get; set; }
            public string? Instruction { get; set; }
        }

    public class SaveTemplateRequest
        {
            public int? Id { get; set; }
            public string Name { get; set; } = null!;
            public int DiseaseId { get; set; }
            public List<TemplateItemDto> Items { get; set; } = new();
        }

        public class TemplateItemDto
        {
            public int MedicineId { get; set; }
            public string? Dosage { get; set; }
            public int Days { get; set; }
            public int Quantity { get; set; }
            public string? Instruction { get; set; }
        }
}
