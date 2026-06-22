using System;
using System.Collections.Generic;

namespace SCMS.Database.Models;

public partial class TblPatient
{
    public int PatientId { get; set; }

    /// <summary>
    /// User can create family member patient profile
    /// </summary>
    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public string? MobileNo { get; set; }

    public string? Email { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    public string? BloodType { get; set; }

    public string? ActualAddress { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public bool? DeleteFlag { get; set; }

    public string? Allergies { get; set; }

    public string? ChronicConditions { get; set; }

    public string? PastSurgeries { get; set; }

    public string? FamilyHistory { get; set; }

    public string? VaccinationHistory { get; set; }

    public virtual ICollection<TblAppointment> TblAppointments { get; set; } = new List<TblAppointment>();

    public virtual ICollection<TblFollowUp> TblFollowUps { get; set; } = new List<TblFollowUp>();

    public virtual ICollection<TblPrescription> TblPrescriptions { get; set; } = new List<TblPrescription>();

    public virtual TblUser User { get; set; } = null!;
}
