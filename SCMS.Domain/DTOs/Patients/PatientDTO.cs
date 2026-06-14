using SCMS.Shared;
using System;
using System.Collections.Generic;

namespace SCMS.Domain.DTOs;

public class PatientProfilesRequest : PaginationRequest
{
    public string? Search { get; set; }
}

public class PatientProfileRequest
{
    public string Name { get; set; } = null!;
    public string? MobileNo { get; set; }
    public string? Email { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodType { get; set; }
    public string? ActualAddress { get; set; }

    public string? Allergies { get; set; }
    public string? ChronicConditions { get; set; }
    public string? PastSurgeries { get; set; }
    public string? FamilyHistory { get; set; }
    public string? VaccinationHistory { get; set; }
}

public class PatientProfileResponse
{
    public int PatientId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = null!;
    public string? MobileNo { get; set; }
    public string? Email { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodType { get; set; }
    public string? ActualAddress { get; set; }

    public string? Allergies { get; set; }
    public string? ChronicConditions { get; set; }
    public string? PastSurgeries { get; set; }
    public string? FamilyHistory { get; set; }
    public string? VaccinationHistory { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class PatientHistoryResponse
{
    public int PatientId { get; set; }
    public string PatientName { get; set; } = null!;
    public List<TimelineItemDto> Timeline { get; set; } = new();
}

public class TimelineItemDto
{
    public DateTime Date { get; set; }
    public string Type { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public int LinkedId { get; set; }
}

public class MedicalSummaryResponse
{
    public int PatientId { get; set; }
    public string PatientName { get; set; } = null!;
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodType { get; set; }
    
    public string? Allergies { get; set; }
    public string? ChronicConditions { get; set; }
    public string? PastSurgeries { get; set; }
    public string? FamilyHistory { get; set; }
    public string? VaccinationHistory { get; set; }

    public List<PatientVitalsHistoryDto> VitalsHistory { get; set; } = new();
    public List<ActivePrescriptionSummaryDto> ActivePrescriptions { get; set; } = new();
}

public class PatientVitalsHistoryDto
{
    public DateTime Date { get; set; }
    public double? WeightKg { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public double? TemperatureC { get; set; }
    public int? PulseBpm { get; set; }
    public int? Spo2Percent { get; set; }
    public double? HeightCm { get; set; }
    public double? Bmi { get; set; }
}

public class ActivePrescriptionSummaryDto
{
    public int PrescriptionId { get; set; }
    public DateTime Date { get; set; }
    public string DiseaseName { get; set; } = null!;
    public List<string> Medicines { get; set; } = new();
}